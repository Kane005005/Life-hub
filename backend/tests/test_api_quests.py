"""Tests de l'API des missions : filtres, actions, conflits et isolation."""

from datetime import date, timedelta
from typing import Any

import pytest
from rest_framework.authtoken.models import Token
from rest_framework.test import APIClient

from apps.accounts.models import User
from apps.character.models import Character

pytestmark = pytest.mark.django_db


@pytest.fixture
def api(user: User) -> APIClient:
    """Client authentifié avec le jeton de l'utilisateur principal."""
    token = Token.objects.create(user=user)
    client = APIClient()
    client.credentials(HTTP_AUTHORIZATION=f"Token {token.key}")
    return client


def new_quest(api: APIClient, **extra: Any) -> dict[str, Any]:
    """Crée une mission via l'API et renvoie sa représentation JSON."""
    payload: dict[str, Any] = {
        "title": "Mission de test",
        "territory": "KNOWLEDGE",
        "difficulty": "MEDIUM",
    }
    payload.update(extra)
    response = api.post("/api/quests/", payload, format="json")
    assert response.status_code == 201, response.content
    return response.json()


def test_create_ignores_server_controlled_fields(api: APIClient) -> None:
    quest = new_quest(
        api,
        difficulty="HARD",
        xp_reward=9999,
        credit_reward=9999,
        status="COMPLETED",
        origin="AI",
    )

    assert (quest["xp_reward"], quest["credit_reward"]) == (60, 60)
    assert quest["status"] == "AVAILABLE"
    assert quest["origin"] == "USER"
    assert quest["is_recurring"] is False
    assert quest["period_key"] == "once"
    assert quest["completed_this_period"] is False
    assert quest["completions_count"] == 0


def test_quest_filters(api: APIClient) -> None:
    knowledge = new_quest(api, title="Savoir")
    body = new_quest(api, title="Corps", territory="BODY", quest_type="WEEKLY")
    accepted = new_quest(api, title="Acceptée", difficulty="EASY")
    assert api.post(f"/api/quests/{accepted['id']}/accept/").status_code == 200

    by_territory = api.get("/api/quests/?territory=KNOWLEDGE").json()
    assert {item["id"] for item in by_territory["results"]} == {knowledge["id"], accepted["id"]}

    by_type = api.get("/api/quests/?quest_type=WEEKLY").json()
    assert {item["id"] for item in by_type["results"]} == {body["id"]}

    by_status = api.get("/api/quests/?status=ACCEPTED&status=AVAILABLE").json()
    assert {item["id"] for item in by_status["results"]} == {
        knowledge["id"],
        body["id"],
        accepted["id"],
    }

    by_difficulty = api.get("/api/quests/?difficulty=EASY").json()
    assert {item["id"] for item in by_difficulty["results"]} == {accepted["id"]}


def test_today_filter_keeps_recurring_and_due_quests(api: APIClient) -> None:
    today = date.today()
    daily = new_quest(api, title="Quotidienne", quest_type="DAILY")
    weekly = new_quest(api, title="Hebdomadaire", quest_type="WEEKLY")
    due = new_quest(api, title="Échéance", due_date=today.isoformat())
    late = new_quest(api, title="En retard", due_date=(today - timedelta(days=1)).isoformat())
    new_quest(api, title="Sans échéance")
    completed = new_quest(api, title="Terminée", due_date=today.isoformat())
    api.post(f"/api/quests/{completed['id']}/complete/")

    result = api.get("/api/quests/?today=1").json()["results"]
    assert {item["id"] for item in result} == {daily["id"], weekly["id"], due["id"], late["id"]}


def test_complete_returns_exact_result_and_is_idempotent(
    api: APIClient,
    user: User,
) -> None:
    quest = new_quest(api)
    api.post(f"/api/quests/{quest['id']}/accept/")

    response = api.post(
        f"/api/quests/{quest['id']}/complete/",
        {"note": "Fait"},
        format="json",
    )

    assert response.status_code == 200
    data = response.json()
    assert data["result"] == {
        "xp": 30,
        "credits": 30,
        "territory": "KNOWLEDGE",
        "level_before": 1,
        "level_after": 1,
        "levels_gained": 0,
        "skill_points_gained": 0,
        "message": "Mission validée. +30 XP en Savoir.",
        "level_message": None,
    }
    assert data["quest"]["status"] == "COMPLETED"

    conflict = api.post(f"/api/quests/{quest['id']}/complete/")
    assert conflict.status_code == 409
    assert conflict.json() == {"detail": "Mission déjà validée."}

    character = Character.objects.get(user=user)
    assert (character.total_xp, character.credits, character.level) == (30, 30, 1)


def test_daily_quest_is_marked_completed_for_the_current_period(api: APIClient) -> None:
    quest = new_quest(api, quest_type="DAILY")

    assert api.post(f"/api/quests/{quest['id']}/complete/").status_code == 200
    listed = api.get("/api/quests/?quest_type=DAILY").json()["results"]
    assert listed[0]["completed_this_period"] is True
    assert listed[0]["status"] == "ACCEPTED"
    assert listed[0]["completions_count"] == 1

    conflict = api.post(f"/api/quests/{quest['id']}/complete/")
    assert conflict.status_code == 409
    assert conflict.json() == {"detail": "Mission déjà validée aujourd'hui."}


def test_required_steps_block_completion_until_toggled(api: APIClient) -> None:
    quest = new_quest(
        api,
        steps=[{"title": "Obligatoire", "is_required": True}],
    )
    step_id = quest["steps"][0]["id"]

    blocked = api.post(f"/api/quests/{quest['id']}/complete/")
    assert blocked.status_code == 400
    assert blocked.json() == {"detail": "Il reste 1 étape(s) obligatoire(s)."}

    toggled = api.post(f"/api/quests/{quest['id']}/steps/{step_id}/toggle/")
    assert toggled.status_code == 200
    assert toggled.json()["steps"][0]["is_done"] is True
    assert api.post(f"/api/quests/{quest['id']}/complete/").status_code == 200


def test_completed_quest_cannot_be_patched_or_deleted(api: APIClient) -> None:
    quest = new_quest(api)
    api.post(f"/api/quests/{quest['id']}/complete/")

    patch = api.patch(f"/api/quests/{quest['id']}/", {"title": "Trop tard"}, format="json")
    assert patch.status_code == 409
    assert "detail" in patch.json()

    assert api.delete(f"/api/quests/{quest['id']}/").status_code == 405


def test_abandon_keeps_progress(api: APIClient, user: User) -> None:
    quest = new_quest(api)
    api.post(f"/api/quests/{quest['id']}/accept/")

    response = api.post(f"/api/quests/{quest['id']}/abandon/")

    assert response.status_code == 200
    assert response.json()["status"] == "ABANDONED"
    character = Character.objects.get(user=user)
    assert (character.total_xp, character.level, character.credits) == (0, 1, 0)


def test_other_user_cannot_see_or_access_a_quest(
    api: APIClient,
    other_user: User,
) -> None:
    quest = new_quest(api)
    other_token = Token.objects.create(user=other_user)
    other_api = APIClient()
    other_api.credentials(HTTP_AUTHORIZATION=f"Token {other_token.key}")

    assert other_api.get(f"/api/quests/{quest['id']}/").status_code == 404
    assert other_api.post(f"/api/quests/{quest['id']}/complete/").status_code == 404
    listed = other_api.get("/api/quests/").json()
    assert listed["count"] == 0
