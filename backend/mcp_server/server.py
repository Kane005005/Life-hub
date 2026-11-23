"""Serveur MCP de LIFE RPG (stdio), client de l'API locale uniquement.

Aucun accès à la base de données, aucun import Django : les outils parlent à
``http://127.0.0.1:8000/api`` avec un jeton d'agent à portées limitées. L'agent
ne peut que lire le contexte et proposer des missions : l'utilisateur décide.
"""

from __future__ import annotations

import json
import os
import sys
from collections.abc import Callable
from dataclasses import dataclass
from typing import Any
from urllib.parse import urlsplit

import httpx
from mcp.server.mcpserver import MCPServer

DEFAULT_API_URL = "http://127.0.0.1:8000/api"
ALLOWED_HOSTS = frozenset({"127.0.0.1", "localhost"})
TIMEOUT_SECONDS = 10.0

GET_CONTEXT_DESCRIPTION = (
    "Lit le contexte de jeu de Kane depuis l'API locale : profil, progression, missions, "
    "compétences, saison, journal et bilans énergétiques selon les portées du jeton. "
    "Lecture seule : ne modifie rien et ne valide rien. Certaines clés sont absentes si "
    "le jeton n'a pas la portée correspondante (les données BODY sont masquées sans 'body')."
)

LIST_PROPOSALS_DESCRIPTION = (
    "Liste les propositions de missions de cet agent et leur statut (PENDING, ACCEPTED, "
    "REJECTED). Nécessite la portée 'proposals'. Lecture seule : la décision appartient "
    "à l'utilisateur, qui accepte, modifie ou refuse chaque proposition."
)

PROPOSE_QUESTS_DESCRIPTION = (
    "Propose une ou plusieurs missions (10 maximum) à Kane. Chaque proposition est un objet "
    "avec title, description, territory, quest_type, difficulty, priority, "
    "estimated_minutes, due_date, skill_branch, rationale et steps. Nécessite la portée "
    "'proposals' ; une proposition BODY nécessite aussi 'body'. L'utilisateur accepte, "
    "modifie ou refuse chaque proposition : rien n'est attribué à la création "
    "(xp_preview n'est qu'une indication) et l'agent ne peut rien valider : ni mission, "
    "ni XP, ni crédits, ni points, ni compétence, ni achat, ni suppression."
)


class ConfigurationError(ValueError):
    """Configuration MCP invalide : jeton absent ou URL distante."""


@dataclass(frozen=True, slots=True)
class Config:
    token: str
    api_url: str


def validate_api_url(url: str) -> str:
    """N'accepte qu'une URL d'API locale (hôte 127.0.0.1 ou localhost)."""
    parsed = urlsplit(url)
    if parsed.scheme not in {"http", "https"} or parsed.hostname not in ALLOWED_HOSTS:
        raise ConfigurationError(
            "URL de l'API refusée : seule une adresse locale est acceptée. Utilise "
            f"http://127.0.0.1:8000/api ou http://localhost:8000/api (reçu : {url!r})."
        )
    return url.rstrip("/")


def load_config() -> Config:
    """Lit la configuration depuis l'environnement."""
    token = os.environ.get("LIFE_RPG_AGENT_TOKEN", "").strip()
    if not token:
        raise ConfigurationError(
            "Jeton d'agent manquant : définissez LIFE_RPG_AGENT_TOKEN=lra_… "
            "(jeton créé dans Réglages ou via POST /api/auth/agent-tokens/)."
        )
    api_url = os.environ.get("LIFE_RPG_API_URL", DEFAULT_API_URL).strip() or DEFAULT_API_URL
    return Config(token=token, api_url=validate_api_url(api_url))


def _format_error(response: httpx.Response) -> str:
    """Transforme une erreur de l'API en phrase lisible, sans trace Python."""
    try:
        data: Any = response.json()
    except ValueError:
        data = None

    detail: Any = data.get("detail") if isinstance(data, dict) else None
    if detail is None:
        detail = data if data not in (None, "", [], {}) else response.text.strip()
    message = detail if isinstance(detail, str) else json.dumps(detail, ensure_ascii=False)
    reason = response.reason_phrase or "Erreur"
    return f"Erreur API {response.status_code} ({reason}) : {message}"


class LifeRpgClient:
    """Client HTTP de l'API locale. ``transport`` permet d'injecter httpx.MockTransport."""

    def __init__(
        self,
        api_url: str,
        token: str,
        transport: httpx.BaseTransport | None = None,
    ) -> None:
        self.api_url = validate_api_url(api_url)
        self._http = httpx.Client(
            base_url=f"{self.api_url}/",
            headers={"Authorization": f"Bearer {token}", "Accept": "application/json"},
            timeout=TIMEOUT_SECONDS,
            transport=transport,
        )

    def close(self) -> None:
        self._http.close()

    def get(self, path: str) -> str:
        return self._request("GET", path)

    def post(self, path: str, payload: dict[str, Any]) -> str:
        return self._request("POST", path, payload=payload)

    def _request(self, method: str, path: str, payload: dict[str, Any] | None = None) -> str:
        try:
            response = self._http.request(method, path, json=payload)
        except httpx.RequestError:
            return (
                f"Impossible de joindre l'API locale {self.api_url}. "
                "Vérifie que LIFE RPG tourne sur 127.0.0.1:8000."
            )
        if response.is_error:
            return _format_error(response)
        try:
            data: Any = response.json()
        except ValueError:
            return response.text or "Réponse vide de l'API."
        return json.dumps(data, ensure_ascii=False, indent=2)


_client: LifeRpgClient | None = None


def set_client(client: LifeRpgClient | None) -> None:
    """Injecte un client (tests) ou libère le client courant."""
    global _client
    _client = client


def create_client(config: Config | None = None) -> LifeRpgClient:
    config = config or load_config()
    return LifeRpgClient(api_url=config.api_url, token=config.token)


def get_client() -> LifeRpgClient:
    if _client is None:
        set_client(create_client())
    return _client


def get_context() -> str:
    """Renvoie le contexte de jeu borné aux portées du jeton d'agent."""
    return get_client().get("agent/context/")


def list_my_proposals() -> str:
    """Renvoie les propositions de missions de l'agent et leur statut."""
    return get_client().get("agent/quest-proposals/")


def propose_quests(proposals: list[dict[str, Any]]) -> str:
    """Envoie une liste de propositions ; l'utilisateur seul décide ensuite."""
    return get_client().post("agent/quest-proposals/", {"proposals": proposals})


TOOL_DEFINITIONS: tuple[tuple[str, Callable[..., str], str], ...] = (
    ("get_context", get_context, GET_CONTEXT_DESCRIPTION),
    ("list_my_proposals", list_my_proposals, LIST_PROPOSALS_DESCRIPTION),
    ("propose_quests", propose_quests, PROPOSE_QUESTS_DESCRIPTION),
)
TOOL_NAMES: frozenset[str] = frozenset(name for name, _, _ in TOOL_DEFINITIONS)

server = MCPServer(
    name="life-rpg",
    instructions=(
        "LIFE RPG : l'agent propose, l'utilisateur décide. Lis le contexte et propose des "
        "missions ; ne valide, n'attribue et ne modifie rien d'existant."
    ),
)

server.tool(name="get_context", description=GET_CONTEXT_DESCRIPTION)(get_context)
server.tool(name="list_my_proposals", description=LIST_PROPOSALS_DESCRIPTION)(list_my_proposals)
server.tool(name="propose_quests", description=PROPOSE_QUESTS_DESCRIPTION)(propose_quests)


def main() -> int:
    """Point d'entrée : valide la configuration puis lance le transport stdio."""
    try:
        set_client(create_client())
    except ConfigurationError as exc:
        print(f"Configuration du serveur MCP LIFE RPG : {exc}", file=sys.stderr)
        return 1
    server.run(transport="stdio")
    return 0
