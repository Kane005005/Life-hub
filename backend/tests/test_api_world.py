"""Tests de l'API du monde, des états de territoire et des statistiques."""

import pytest
from rest_framework.authtoken.models import Token
from rest_framework.test import APIClient

from apps.accounts.models import User
from apps.world.models import TerritoryProgress

pytestmark = pytest.mark.django_db


@pytest.fixture
def api(user: User) -> APIClient:
    """Client authentifié avec le jeton de l'utilisateur principal."""
    token = Token.objects.create(user=user)
    client = APIClient()
    client.credentials(HTTP_AUTHORIZATION=f"Token {token.key}")
    return client


def test_territories_are_six_and_not_paginated(api: APIClient) -> None:
    response = api.get("/api/world/territories/")

    assert response.status_code == 200
    data = response.json()
    assert isinstance(data, list)
    assert len(data) == 6
    assert {item["code"] for item in data} == {
        "KNOWLEDGE",
        "BODY",
        "CAREER",
        "TECHNOLOGY",
        "CREATION",
        "INNER_WORLD",
    }
    assert data[0]["stat_code"] == "INT"
    assert data[0]["state"] == "DISCOVERY"


def test_territory_state_and_stat_follow_completed_quests(api: APIClient) -> None:
    for index in range(10):
        response = api.post(
            "/api/quests/",
            {
                "title": f"Mission Savoir {index}",
                "territory": "KNOWLEDGE",
                "difficulty": "MEDIUM",
            },
            format="json",
        )
        assert response.status_code == 201
        quest_id = response.json()["id"]
        assert api.post(f"/api/quests/{quest_id}/complete/").status_code == 200

    territories = api.get("/api/world/territories/").json()
    knowledge = next(item for item in territories if item["code"] == "KNOWLEDGE")
    assert knowledge["total_xp"] == 300
    assert (knowledge["stat"], knowledge["stat_display"]) == (30, 30)
    assert knowledge["state"] == "DEVELOPMENT"

    active = api.post(
        "/api/quests/",
        {"title": "Mission active", "territory": "KNOWLEDGE", "difficulty": "EASY"},
        format="json",
    )
    assert active.status_code == 201

    detail = api.get(f"/api/world/territories/{knowledge['id']}/").json()
    assert detail["stat"] == 30
    assert [quest["id"] for quest in detail["quests"]] == [active.json()["id"]]


def test_stat_display_is_capped_at_one_hundred(api: APIClient, user: User) -> None:
    assert api.get("/api/world/territories/").status_code == 200
    progress = TerritoryProgress.objects.get(
        character__user=user,
        territory__code="KNOWLEDGE",
    )
    progress.total_xp = 15_000
    progress.save(update_fields=["total_xp"])

    territories = api.get("/api/world/territories/").json()
    knowledge = next(item for item in territories if item["code"] == "KNOWLEDGE")
    assert knowledge["total_xp"] == 15_000
    assert knowledge["stat"] == 1500
    assert knowledge["stat_display"] == 100
    assert knowledge["state"] == "MASTERY"


def test_world_progress_matches_character_snapshot(api: APIClient) -> None:
    response = api.get("/api/world/progress/")

    assert response.status_code == 200
    data = response.json()
    assert set(data) == {"level", "xp_in_level", "xp_required", "total_xp", "rank", "territories"}
    assert len(data["territories"]) == 6
