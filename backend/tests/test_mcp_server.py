"""Tests du serveur MCP : outils exposés et client HTTP local injectable."""

from __future__ import annotations

import asyncio
import inspect
import json
from collections.abc import Callable, Iterator

import httpx
import pytest

pytest.importorskip("mcp")

from mcp_server import server as mcp_module  # noqa: E402

TOKEN = "lra_token_de_test"
API_URL = "http://127.0.0.1:8000/api"
EXPECTED_TOOLS = {"get_context", "list_my_proposals", "propose_quests"}


@pytest.fixture(autouse=True)
def _isolate_client() -> Iterator[None]:
    mcp_module.set_client(None)
    yield
    mcp_module.set_client(None)


def _client(handler: Callable[[httpx.Request], httpx.Response]) -> mcp_module.LifeRpgClient:
    return mcp_module.LifeRpgClient(
        api_url=API_URL,
        token=TOKEN,
        transport=httpx.MockTransport(handler),
    )


def _registered_tool_names() -> set[str]:
    """Lit les noms réellement exposés par MCPServer, avec repli sur le registre local."""
    candidates: list[object] = [mcp_module.server]
    manager = getattr(mcp_module.server, "_tool_manager", None)
    if manager is not None:
        candidates.append(manager)

    for candidate in candidates:
        for attribute in ("list_tools", "get_tools"):
            method = getattr(candidate, attribute, None)
            if not callable(method):
                continue
            try:
                result = method()
                if inspect.isawaitable(result):
                    result = asyncio.run(result)
            except (TypeError, RuntimeError, AttributeError):
                continue
            if isinstance(result, dict):
                return set(result)
            try:
                return {getattr(tool, "name", tool) for tool in result}
            except TypeError:
                continue
    return set(mcp_module.TOOL_NAMES)


def test_get_context_sends_bearer_token_and_context_path() -> None:
    requests: list[httpx.Request] = []

    def handler(request: httpx.Request) -> httpx.Response:
        requests.append(request)
        return httpx.Response(200, json={"agent": "Claude Code", "scopes": ["quests"]})

    mcp_module.set_client(_client(handler))
    result = mcp_module.get_context()

    assert len(requests) == 1
    assert requests[0].method == "GET"
    assert requests[0].url.path == "/api/agent/context/"
    assert requests[0].headers["Authorization"] == f"Bearer {TOKEN}"
    assert requests[0].content == b""
    assert "Claude Code" in result


def test_list_my_proposals_sends_bearer_token_and_proposals_path() -> None:
    requests: list[httpx.Request] = []

    def handler(request: httpx.Request) -> httpx.Response:
        requests.append(request)
        return httpx.Response(200, json=[{"id": 7, "status": "PENDING"}])

    mcp_module.set_client(_client(handler))
    result = mcp_module.list_my_proposals()

    assert requests[0].method == "GET"
    assert requests[0].url.path == "/api/agent/quest-proposals/"
    assert requests[0].headers["Authorization"] == f"Bearer {TOKEN}"
    assert requests[0].content == b""
    assert "PENDING" in result


def test_propose_quests_wraps_the_proposals_in_the_request_body() -> None:
    requests: list[httpx.Request] = []
    proposals = [
        {
            "title": "Lire 20 pages",
            "territory": "KNOWLEDGE",
            "quest_type": "DAILY",
            "difficulty": "EASY",
            "rationale": "Ton territoire Savoir n'a pas bougé depuis 12 jours.",
        }
    ]

    def handler(request: httpx.Request) -> httpx.Response:
        requests.append(request)
        return httpx.Response(201, json=[{"id": 7, "status": "PENDING", **proposals[0]}])

    mcp_module.set_client(_client(handler))
    result = mcp_module.propose_quests(proposals)

    assert requests[0].method == "POST"
    assert requests[0].url.path == "/api/agent/quest-proposals/"
    assert requests[0].headers["Authorization"] == f"Bearer {TOKEN}"
    assert json.loads(requests[0].content) == {"proposals": proposals}
    assert "PENDING" in result


@pytest.mark.parametrize(
    ("status", "detail"),
    [
        (403, "Cette action est réservée à l'utilisateur."),
        (401, "Jeton révoqué."),
    ],
)
def test_api_errors_are_readable_without_traceback(status: int, detail: str) -> None:
    def handler(request: httpx.Request) -> httpx.Response:
        return httpx.Response(status, json={"detail": detail})

    mcp_module.set_client(_client(handler))
    result = mcp_module.list_my_proposals()

    assert str(status) in result
    assert detail in result
    assert "Traceback" not in result


def test_remote_api_url_is_refused(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv("LIFE_RPG_AGENT_TOKEN", TOKEN)
    monkeypatch.setenv("LIFE_RPG_API_URL", "https://api.life-rpg.example/api")

    with pytest.raises(mcp_module.ConfigurationError, match="locale"):
        mcp_module.load_config()


def test_missing_token_is_reported_on_stderr(
    monkeypatch: pytest.MonkeyPatch,
    capsys: pytest.CaptureFixture[str],
) -> None:
    monkeypatch.delenv("LIFE_RPG_AGENT_TOKEN", raising=False)

    assert mcp_module.main() == 1
    error = capsys.readouterr().err
    assert "LIFE_RPG_AGENT_TOKEN" in error
    assert "lra_" in error


def test_exposed_tools_are_exactly_the_three_agent_tools() -> None:
    assert set(mcp_module.TOOL_NAMES) == EXPECTED_TOOLS
    assert _registered_tool_names() == EXPECTED_TOOLS
