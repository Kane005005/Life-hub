"""Tests de l'analyse par règles : charge, négligence, suggestions, lecture seule."""

from __future__ import annotations

from datetime import timedelta

import pytest
from django.utils import timezone
from rest_framework.authtoken.models import Token
from rest_framework.test import APIClient

from apps.accounts.models import User
from apps.analytics.models import EnergyCheckIn
from apps.character.models import Character
from apps.journal.models import JournalEntry
from apps.progression.models import XPTransaction
from apps.quests.models import Quest
from apps.world.models import Territory
from engine.energy import record_energy
from engine.insights import compute_insights
from engine.services import complete_quest, create_quest

pytestmark = pytest.mark.django_db


@pytest.fixture
def api(user: User) -> APIClient:
    token = Token.objects.create(user=user)
    client = APIClient()
    client.credentials(HTTP_AUTHORIZATION=f"Token {token.key}")
    return client


def kinds(insights: dict) -> set[str]:
    """Ensemble des types de suggestions renvoyées."""
    return {item["kind"] for item in insights["suggestions"]}


def test_empty_player_insights(user: User, character: Character) -> None:
    data = compute_insights(user)
    assert data["energy"] is None
    assert data["load"] == {"active_quests": 0, "hard_quests": 0, "overdue": 0}
    assert len(data["neglected_territories"]) == 6
    assert all(item["days_since_xp"] is None for item in data["neglected_territories"])
    assert kinds(data) == {"BALANCE"}
    assert len(data["suggestions"]) == 6


def test_api_endpoint_shape(api: APIClient, character: Character) -> None:
    response = api.get("/api/analytics/insights/")
    assert response.status_code == 200
    data = response.json()
    assert set(data) == {
        "generated_at",
        "energy",
        "load",
        "neglected_territories",
        "suggestions",
    }
    assert data["energy"] is None


def test_recovery_rule(user: User, character: Character) -> None:
    record_energy(user, 2)
    create_quest(user, {"title": "Une", "territory": "KNOWLEDGE", "difficulty": "HARD"})
    create_quest(user, {"title": "Deux", "territory": "CAREER", "difficulty": "EPIC"})
    data = compute_insights(user)
    assert data["load"]["hard_quests"] == 2
    assert "RECOVERY" in kinds(data)
    message = next(item["message"] for item in data["suggestions"] if item["kind"] == "RECOVERY")
    assert "2 missions difficiles" in message
    assert data["energy"]["label"] == "Faible"


def test_recovery_requires_two_hard_quests(user: User, character: Character) -> None:
    record_energy(user, 1)
    create_quest(user, {"title": "Une", "territory": "KNOWLEDGE", "difficulty": "HARD"})
    assert "RECOVERY" not in kinds(compute_insights(user))


def test_recovery_requires_low_energy(user: User, character: Character) -> None:
    record_energy(user, 3)
    create_quest(user, {"title": "Une", "territory": "KNOWLEDGE", "difficulty": "HARD"})
    create_quest(user, {"title": "Deux", "territory": "CAREER", "difficulty": "LEGENDARY"})
    assert "RECOVERY" not in kinds(compute_insights(user))


def test_overload_rule(user: User, character: Character) -> None:
    for index in range(8):
        create_quest(user, {"title": f"Mission {index}", "territory": "KNOWLEDGE"})
    assert "OVERLOAD" not in kinds(compute_insights(user))
    create_quest(user, {"title": "Neuvième", "territory": "KNOWLEDGE"})
    data = compute_insights(user)
    assert data["load"]["active_quests"] == 9
    assert "OVERLOAD" in kinds(data)


def test_balance_rule_neglected_and_recent(user: User, character: Character) -> None:
    old = create_quest(user, {"title": "Vieille lecture", "territory": "KNOWLEDGE"})
    complete_quest(old)
    XPTransaction.objects.filter(character=character, territory__code="KNOWLEDGE").update(
        created_at=timezone.now() - timedelta(days=20)
    )
    recent = create_quest(user, {"title": "Création récente", "territory": "CREATION"})
    complete_quest(recent)

    data = compute_insights(user)
    neglected = {item["code"]: item["days_since_xp"] for item in data["neglected_territories"]}
    assert neglected["KNOWLEDGE"] == 20
    assert "CREATION" not in neglected
    assert neglected["BODY"] is None
    name = Territory.objects.get(code="KNOWLEDGE").name
    message = next(
        item["message"]
        for item in data["suggestions"]
        if item["kind"] == "BALANCE" and name in item["message"]
    )
    assert "20 jours" in message


def test_overdue_rule(user: User, character: Character) -> None:
    today = timezone.localdate()
    create_quest(
        user,
        {
            "title": "En retard",
            "territory": "KNOWLEDGE",
            "due_date": (today - timedelta(days=1)).isoformat(),
        },
    )
    create_quest(
        user,
        {"title": "Pour aujourd'hui", "territory": "CAREER", "due_date": today.isoformat()},
    )
    data = compute_insights(user)
    assert data["load"]["overdue"] == 1
    assert "OVERDUE" in kinds(data)


def test_momentum_rule(user: User, character: Character) -> None:
    record_energy(user, 4)
    create_quest(user, {"title": "Douce", "territory": "KNOWLEDGE", "difficulty": "EASY"})
    assert "MOMENTUM" in kinds(compute_insights(user))
    create_quest(user, {"title": "Dur", "territory": "CAREER", "difficulty": "HARD"})
    assert "MOMENTUM" not in kinds(compute_insights(user))


def test_energy_uses_the_latest_checkin(user: User, character: Character) -> None:
    today = timezone.localdate()
    record_energy(user, 1, today=today - timedelta(days=1))
    record_energy(user, 5)
    data = compute_insights(user)
    assert data["energy"]["level"] == 5
    assert data["energy"]["label"] == "Excellente"
    assert data["energy"]["date"] == today.isoformat()


def test_insights_are_read_only(api: APIClient, user: User, character: Character) -> None:
    today = timezone.localdate()
    quest = create_quest(
        user,
        {
            "title": "Lecture",
            "territory": "KNOWLEDGE",
            "due_date": (today + timedelta(days=3)).isoformat(),
        },
    )
    record_energy(user, 2)
    before = {
        "quests": Quest.objects.count(),
        "journal": JournalEntry.objects.count(),
        "energy": EnergyCheckIn.objects.count(),
        "xp": XPTransaction.objects.count(),
    }
    response = api.get("/api/analytics/insights/")
    assert response.status_code == 200
    assert {
        "quests": Quest.objects.count(),
        "journal": JournalEntry.objects.count(),
        "energy": EnergyCheckIn.objects.count(),
        "xp": XPTransaction.objects.count(),
    } == before
    quest.refresh_from_db()
    assert quest.due_date == today + timedelta(days=3)
    assert quest.status == "AVAILABLE"


def test_include_body_false_strips_body(user: User, character: Character) -> None:
    record_energy(user, 2)
    create_quest(user, {"title": "Sport", "territory": "BODY", "difficulty": "HARD"})
    create_quest(user, {"title": "Travail", "territory": "CAREER", "difficulty": "HARD"})
    with_body = compute_insights(user)
    without_body = compute_insights(user, include_body=False)
    assert with_body["load"]["hard_quests"] == 2
    assert "RECOVERY" in kinds(with_body)
    assert without_body["load"]["hard_quests"] == 1
    assert "RECOVERY" not in kinds(without_body)
    assert any(item["code"] == "BODY" for item in with_body["neglected_territories"])
    assert all(item["code"] != "BODY" for item in without_body["neglected_territories"])


def test_suggestions_are_calm_french(user: User, character: Character) -> None:
    record_energy(user, 2)
    for index in range(9):
        difficulty = "HARD" if index < 2 else "MEDIUM"
        create_quest(
            user, {"title": f"Mission {index}", "territory": "KNOWLEDGE", "difficulty": difficulty}
        )
    data = compute_insights(user)
    assert {"RECOVERY", "OVERLOAD", "BALANCE"} <= kinds(data)
    for item in data["suggestions"]:
        assert "!" not in item["message"]
        for forbidden in ("tu dois", "il faut", "urgent", "rattrape"):
            assert forbidden not in item["message"].lower()


def test_anonymous_is_refused(db: None) -> None:
    assert APIClient().get("/api/analytics/insights/").status_code == 401
