"""Tests de l'export complet des données du joueur, sans aucun secret d'agent."""

from __future__ import annotations

import pytest
from django.utils import timezone
from rest_framework.authtoken.models import Token
from rest_framework.test import APIClient

from apps.accounts.models import User
from apps.ai_engine.models import AgentToken, QuestProposal
from apps.analytics.models import EnergyCheckIn
from apps.character.models import Character
from apps.economy.models import InventoryItem, ShopItem
from apps.journal.models import JournalEntry
from apps.progression.models import XPTransaction
from apps.quests.models import Quest, QuestCompletion
from apps.seasons.models import Season
from engine.agents import accept_proposal, create_agent_token, create_proposals
from engine.economy import equip, purchase, seed_shop
from engine.energy import record_energy
from engine.seasons import create_season
from engine.services import complete_quest, create_quest

pytestmark = pytest.mark.django_db

EXPECTED_KEYS = {
    "exported_at",
    "user",
    "character",
    "territories",
    "quests",
    "completions",
    "xp_transactions",
    "credit_transactions",
    "skill_point_transactions",
    "skills",
    "achievements",
    "items",
    "seasons",
    "journal",
    "energy",
    "proposals",
}


@pytest.fixture
def api(user: User) -> APIClient:
    token = Token.objects.create(user=user)
    client = APIClient()
    client.credentials(HTTP_AUTHORIZATION=f"Token {token.key}")
    return client


@pytest.fixture
def full_data(user: User, character: Character) -> dict:
    """Un compte vivant : missions, économie, saison, énergie, propositions."""
    seed_shop()
    quest = create_quest(
        user,
        {
            "title": "Lire 20 pages",
            "territory": "KNOWLEDGE",
            "difficulty": "EASY",
        },
        steps=[{"title": "Choisir le livre", "is_required": False}],
    )
    complete_quest(quest)
    create_quest(user, {"title": "Marcher", "territory": "BODY"})
    character.credits = 1000
    character.save(update_fields=["credits"])
    item = ShopItem.objects.first()
    purchase(user, item)
    inventory = InventoryItem.objects.get(character=character, item=item)
    equip(character, inventory)
    record_energy(user, 4, note="Bonne forme.")
    create_season(user, {"name": "Saison 1"})
    token, secret = create_agent_token(user, "Claude Code", ["proposals"])
    pending, accepted = create_proposals(
        token,
        [
            {"title": "Proposée", "territory": "KNOWLEDGE"},
            {"title": "Acceptée", "territory": "CREATION"},
        ],
    )
    accept_proposal(user, accepted)
    return {"secret": secret, "token": token, "quest": quest, "item": item}


def test_export_is_a_json_attachment(api: APIClient, full_data: dict) -> None:
    response = api.get("/api/export/")
    assert response.status_code == 200
    assert response["Content-Type"].startswith("application/json")
    filename = f"life-rpg-export-{timezone.localdate().isoformat()}.json"
    assert response["Content-Disposition"] == f'attachment; filename="{filename}"'
    assert response.json()["user"]["username"] == "kane"


def test_export_contains_all_sections(api: APIClient, full_data: dict) -> None:
    data = api.get("/api/export/").json()
    assert set(data) == EXPECTED_KEYS
    assert data["exported_at"] is not None
    assert len(data["territories"]) == 6
    assert data["character"]["pseudonym"] is not None


def test_export_never_contains_agent_secrets(api: APIClient, full_data: dict) -> None:
    response = api.get("/api/export/")
    text = response.content.decode()
    assert full_data["secret"] not in text
    assert full_data["token"].key_hash not in text
    assert "key_hash" not in text
    data = response.json()
    assert "agent_tokens" not in data
    assert "tokens" not in data


def test_export_quests_steps_and_completions(api: APIClient, full_data: dict) -> None:
    data = api.get("/api/export/").json()
    titles = [quest["title"] for quest in data["quests"]]
    assert "Lire 20 pages" in titles
    assert "Marcher" in titles
    assert "Acceptée" in titles

    quest = next(item for item in data["quests"] if item["title"] == "Lire 20 pages")
    assert quest["origin"] == "USER"
    assert quest["status"] == "COMPLETED"
    assert quest["steps"][0]["title"] == "Choisir le livre"

    ai_quest = next(item for item in data["quests"] if item["title"] == "Acceptée")
    assert ai_quest["origin"] == "AI"
    assert ai_quest["status"] == "AVAILABLE"

    assert len(data["completions"]) == 1
    completion = data["completions"][0]
    assert completion["quest_title"] == "Lire 20 pages"
    assert completion["xp_awarded"] == 15
    assert data["xp_transactions"][0]["amount"] == 15
    assert data["xp_transactions"][0]["territory"] == "KNOWLEDGE"


def test_export_economy_and_equipment(api: APIClient, full_data: dict) -> None:
    data = api.get("/api/export/").json()
    item_name = full_data["item"].name
    assert any(entry["name"] == item_name for entry in data["items"]["inventory"])
    assert any(entry["item"] == item_name for entry in data["items"]["purchases"])
    assert data["items"]["equipment"] == [{"slot": "AURA", "item": item_name}]
    kinds = {entry["kind"] for entry in data["credit_transactions"]}
    assert {"EARN", "SPEND"} <= kinds


def test_export_energy_seasons_proposals_and_journal(api: APIClient, full_data: dict) -> None:
    data = api.get("/api/export/").json()
    assert data["energy"][0]["level"] == 4
    assert data["energy"][0]["label"] == "Bonne"
    assert data["seasons"][0]["name"] == "Saison 1"
    assert data["seasons"][0]["status"] == "ACTIVE"

    proposals = {item["title"]: item for item in data["proposals"]}
    assert proposals["Proposée"]["status"] == "PENDING"
    assert proposals["Acceptée"]["status"] == "ACCEPTED"
    assert proposals["Acceptée"]["quest"] is not None

    events = {(entry["event_type"], entry["actor"]) for entry in data["journal"]}
    assert ("AGENT_TOKEN_CREATED", "user") in events
    assert ("QUEST_PROPOSED", "Claude Code") in events
    assert ("PROPOSAL_ACCEPTED", "user") in events


def test_export_is_isolated_per_user(api: APIClient, full_data: dict, other_user: User) -> None:
    create_quest(other_user, {"title": "Mission privée", "territory": "KNOWLEDGE"})
    data = api.get("/api/export/").json()
    assert data["user"]["username"] == "kane"
    assert all(quest["title"] != "Mission privée" for quest in data["quests"])


def test_export_is_read_only(api: APIClient, full_data: dict) -> None:
    def counts() -> dict:
        return {
            "quests": Quest.objects.count(),
            "completions": QuestCompletion.objects.count(),
            "journal": JournalEntry.objects.count(),
            "energy": EnergyCheckIn.objects.count(),
            "tokens": AgentToken.objects.count(),
            "proposals": QuestProposal.objects.count(),
            "seasons": Season.objects.count(),
            "xp": XPTransaction.objects.count(),
            "inventory": InventoryItem.objects.count(),
        }

    before = counts()
    assert api.get("/api/export/").status_code == 200
    assert counts() == before


def test_export_minimal_account(api: APIClient, user: User, character: Character) -> None:
    data = api.get("/api/export/").json()
    assert set(data) == EXPECTED_KEYS
    assert data["quests"] == []
    assert data["completions"] == []
    assert data["energy"] == []
    assert data["proposals"] == []
    assert data["seasons"] == []
    assert data["skills"] == []
    assert data["achievements"] == []
    assert data["items"] == {"inventory": [], "purchases": [], "equipment": []}
    assert len(data["territories"]) == 6


def test_agent_token_is_refused_on_export(user: User, full_data: dict) -> None:
    client = APIClient()
    client.credentials(HTTP_AUTHORIZATION=f"Bearer {full_data['secret']}")
    response = client.get("/api/export/")
    assert response.status_code == 403
    assert response.json()["detail"] == "Cette action est réservée à l'utilisateur."


def test_anonymous_is_refused(db: None) -> None:
    assert APIClient().get("/api/export/").status_code == 401
