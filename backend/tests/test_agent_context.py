"""Tests du contexte d'agent : portées, filtrage BODY et bornes."""

from __future__ import annotations

from datetime import timedelta

import pytest
from django.utils import timezone
from rest_framework.authtoken.models import Token
from rest_framework.test import APIClient

from apps.accounts.models import User
from apps.character.models import Character
from apps.journal.models import JournalEntry
from engine.agents import SCOPES, create_agent_token, create_proposals
from engine.energy import record_energy
from engine.seasons import create_season
from engine.services import complete_quest, create_quest
from engine.skills import load_skill_tree

pytestmark = pytest.mark.django_db

META_KEYS = {"agent", "scopes", "generated_at"}


def agent_client(user: User, scopes: list[str], name: str = "Claude Code") -> APIClient:
    """Client Bearer avec les portées demandées."""
    _, secret = create_agent_token(user, name, scopes)
    client = APIClient()
    client.credentials(HTTP_AUTHORIZATION=f"Bearer {secret}")
    return client


def test_default_scopes_context_keys(user: User, character: Character) -> None:
    client = agent_client(user, ["profile", "progression", "quests"])
    response = client.get("/api/agent/context/")
    assert response.status_code == 200
    data = response.json()
    assert set(data) == META_KEYS | {"profile", "progression", "quests"}
    assert data["agent"] == "Claude Code"
    assert data["scopes"] == ["profile", "progression", "quests"]
    assert data["profile"]["pseudonym"] == character.pseudonym
    assert data["profile"]["rank"]["code"] == "INITIATE"
    assert data["progression"]["level"] == 1
    # Sans la portée body, le territoire BODY est retiré des statistiques.
    assert len(data["progression"]["territories"]) == 5
    assert "insights" in data["progression"]


def test_all_scopes_context_keys(user: User, character: Character) -> None:
    load_skill_tree()
    client = agent_client(user, list(SCOPES))
    data = client.get("/api/agent/context/").json()
    assert set(data) == META_KEYS | {
        "profile",
        "progression",
        "quests",
        "skills",
        "seasons",
        "journal",
        "energy",
        "proposals",
    }
    assert data["seasons"]["current"] is None
    assert data["proposals"]["pending"] == 0
    assert data["skills"]["available_points"] == 0
    assert len(data["skills"]["trees"]) == 6


def test_only_scoped_keys_are_present(user: User, character: Character) -> None:
    client = agent_client(user, ["profile"])
    data = client.get("/api/agent/context/").json()
    assert set(data) == META_KEYS | {"profile"}


def test_body_is_stripped_everywhere_without_scope(user: User, character: Character) -> None:
    load_skill_tree()
    body_quest = create_quest(user, {"title": "Nager", "territory": "BODY"})
    complete_quest(body_quest)
    create_quest(user, {"title": "Marcher", "territory": "BODY"})
    create_quest(user, {"title": "Lire", "territory": "KNOWLEDGE"})
    client = agent_client(user, ["profile", "progression", "quests", "skills", "journal"])
    data = client.get("/api/agent/context/").json()

    assert all(stat["code"] != "BODY" for stat in data["progression"]["territories"])
    assert all(quest["territory"] != "BODY" for quest in data["quests"]["active"])
    assert all(item["territory"] != "BODY" for item in data["quests"]["recent_completions"])
    assert all(tree["territory"] != "BODY" for tree in data["skills"]["trees"])
    assert all(entry["message"].find("Corps") == -1 for entry in data["journal"])
    neglected = data["progression"]["insights"]["neglected_territories"]
    assert all(item["code"] != "BODY" for item in neglected)


def test_body_is_visible_with_scope(user: User, character: Character) -> None:
    load_skill_tree()
    body_quest = create_quest(user, {"title": "Nager", "territory": "BODY"})
    complete_quest(body_quest)
    create_quest(user, {"title": "Marcher", "territory": "BODY"})
    client = agent_client(user, list(SCOPES))
    data = client.get("/api/agent/context/").json()

    assert any(stat["code"] == "BODY" for stat in data["progression"]["territories"])
    assert any(quest["territory"] == "BODY" for quest in data["quests"]["active"])
    assert any(item["territory"] == "BODY" for item in data["quests"]["recent_completions"])
    assert any(tree["territory"] == "BODY" for tree in data["skills"]["trees"])


def test_context_bounds(user: User, character: Character) -> None:
    for index in range(60):
        create_quest(user, {"title": f"Mission {index}", "territory": "KNOWLEDGE"})
    daily = create_quest(
        user, {"title": "Quotidienne", "territory": "KNOWLEDGE", "quest_type": "DAILY"}
    )
    today = timezone.localdate()
    for offset in range(25):
        complete_quest(daily, today=today - timedelta(days=offset))
    for offset in range(10):
        record_energy(user, 3, today=today - timedelta(days=offset))

    client = agent_client(user, list(SCOPES))
    data = client.get("/api/agent/context/").json()
    assert len(data["quests"]["active"]) == 50
    assert len(data["quests"]["recent_completions"]) == 20
    assert len(data["journal"]) == 50
    assert len(data["energy"]) == 7


def test_context_read_is_journaled_with_agent_name(user: User, character: Character) -> None:
    client = agent_client(user, ["profile"], name="Mon Agent")
    assert client.get("/api/agent/context/").status_code == 200
    entry = JournalEntry.objects.get(event_type="AGENT_CONTEXT_READ")
    assert entry.actor == "Mon Agent"
    assert entry.owner_id == user.id


def test_seasons_scope_returns_current_season(user: User, character: Character) -> None:
    season = create_season(user, {"name": "Saison 1"})
    client = agent_client(user, ["seasons"])
    data = client.get("/api/agent/context/").json()
    assert data["seasons"]["current"]["id"] == season.id
    assert data["seasons"]["current"]["status"] == "ACTIVE"


def test_proposals_scope_counts_pending(user: User, character: Character) -> None:
    token, secret = create_agent_token(user, "Claude Code", ["proposals"])
    create_proposals(
        token,
        [
            {"title": "Une", "territory": "KNOWLEDGE"},
            {"title": "Deux", "territory": "KNOWLEDGE"},
        ],
    )
    client = APIClient()
    client.credentials(HTTP_AUTHORIZATION=f"Bearer {secret}")
    data = client.get("/api/agent/context/").json()
    assert data["proposals"]["pending"] == 2


def test_energy_scope_labels(user: User, character: Character) -> None:
    record_energy(user, 2, note="Fatigué")
    client = agent_client(user, ["energy"])
    data = client.get("/api/agent/context/").json()
    assert data["energy"][0]["level"] == 2
    assert data["energy"][0]["label"] == "Faible"
    assert data["energy"][0]["note"] == "Fatigué"


def test_user_token_is_refused_on_agent_context(user: User, character: Character) -> None:
    token = Token.objects.create(user=user)
    client = APIClient()
    client.credentials(HTTP_AUTHORIZATION=f"Token {token.key}")
    response = client.get("/api/agent/context/")
    assert response.status_code == 403
    assert response.json()["detail"] == "Réservé aux agents."


def test_anonymous_is_refused_on_agent_context(db: None) -> None:
    response = APIClient().get("/api/agent/context/")
    assert response.status_code == 401
