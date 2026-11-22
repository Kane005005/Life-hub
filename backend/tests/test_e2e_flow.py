"""Parcours complet de la phase 1 exclusivement via l'API."""

import pytest
from rest_framework.test import APIClient

from apps.accounts.models import User
from apps.character.models import Character

pytestmark = pytest.mark.django_db


def test_full_player_flow_survives_a_simulated_restart(user: User) -> None:
    api = APIClient()

    login = api.post(
        "/api/auth/login/",
        {"username": "kane", "password": "mot-de-passe"},
        format="json",
    )
    assert login.status_code == 200
    api.credentials(HTTP_AUTHORIZATION=f"Token {login.json()['token']}")

    onboarding = api.patch(
        "/api/character/",
        {"pseudonym": "Kane", "is_onboarded": True, "character_class": "STRATEGIST"},
        format="json",
    )
    assert onboarding.status_code == 200
    assert onboarding.json()["is_onboarded"] is True

    quest_ids = []
    for title, difficulty in (("Lire un chapitre", "MEDIUM"), ("Réussir un défi", "LEGENDARY")):
        created = api.post(
            "/api/quests/",
            {
                "title": title,
                "description": "",
                "territory": "KNOWLEDGE",
                "quest_type": "SIDE",
                "difficulty": difficulty,
                "priority": "NORMAL",
                "estimated_minutes": 30,
            },
            format="json",
        )
        assert created.status_code == 201
        quest_id = created.json()["id"]
        quest_ids.append(quest_id)
        assert api.post(f"/api/quests/{quest_id}/accept/").status_code == 200

    first = api.post(f"/api/quests/{quest_ids[0]}/complete/").json()
    assert first["result"]["level_after"] == 1
    assert first["result"]["xp"] == 30

    second = api.post(f"/api/quests/{quest_ids[1]}/complete/")
    assert second.status_code == 200
    result = second.json()["result"]
    assert result["xp"] == 200
    assert (result["level_before"], result["level_after"]) == (1, 2)
    assert result["levels_gained"] == 1
    assert result["skill_points_gained"] == 1
    assert result["message"] == "Mission validée. +200 XP en Savoir."
    assert result["level_message"] == "Niveau 2 atteint. 150 XP pour le suivant."

    character_data = api.get("/api/character/").json()
    assert (character_data["level"], character_data["xp_in_level"]) == (2, 130)
    assert character_data["xp_required"] == 150
    assert character_data["total_xp"] == 230
    assert character_data["credits"] == 230
    assert character_data["skill_points"] == {"available": 1, "spent": 0}

    history = api.get("/api/progression/history/").json()
    assert history["count"] == 2
    assert sum(item["amount"] for item in history["results"]) == 230
    assert {item["level_after"] for item in history["results"]} == {1, 2}

    skills = api.get("/api/progression/skills/").json()
    assert skills["available"] == 1
    assert len(skills["transactions"]) == 1
    assert skills["transactions"][0]["reason"] == "Niveau 2 atteint."

    progression = api.get("/api/progression/").json()
    assert set(progression) == {
        "level",
        "xp_in_level",
        "xp_required",
        "total_xp",
        "rank",
        "skill_points",
    }
    assert api.get("/api/settings/game/").json()["credits_per_xp"] == 1
    assert api.get("/api/economy/wallet/").json() == {"credits": 230}
    assert api.get("/api/economy/transactions/").json()["count"] == 2

    events = {item["event_type"] for item in api.get("/api/journal/").json()["results"]}
    assert {"QUEST_COMPLETED", "XP_AWARDED", "LEVEL_UP", "SKILL_POINTS_EARNED"} <= events

    reloaded = Character.objects.get(user=user)
    assert (reloaded.pseudonym, reloaded.is_onboarded) == ("Kane", True)
    assert (reloaded.level, reloaded.xp_in_level, reloaded.total_xp) == (2, 130, 230)
    assert reloaded.skill_points_available == 1
    assert api.get("/api/character/").json() == character_data
