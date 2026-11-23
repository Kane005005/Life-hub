"""Tests de l'API des succès."""

from __future__ import annotations

import pytest
from rest_framework.authtoken.models import Token
from rest_framework.test import APIClient

from apps.accounts.models import User

pytestmark = pytest.mark.django_db


@pytest.fixture
def api(user: User) -> APIClient:
    token = Token.objects.create(user=user)
    client = APIClient()
    client.credentials(HTTP_AUTHORIZATION=f"Token {token.key}")
    return client


def test_achievements_list(api: APIClient) -> None:
    response = api.get("/api/achievements/")
    assert response.status_code == 200
    data = response.json()
    assert len(data) == 5
    first = next(item for item in data if item["code"] == "FIRST_QUEST")
    assert first["label"] == "Premier pas"
    assert first["unlocked"] is False
    assert first["unlocked_at"] is None


def test_achievement_unlocked_via_complete(api: APIClient) -> None:
    quest = api.post(
        "/api/quests/",
        {"title": "Q", "territory": "KNOWLEDGE", "difficulty": "EASY", "quest_type": "SIDE"},
        format="json",
    ).json()
    response = api.post(f"/api/quests/{quest['id']}/complete/")
    assert response.status_code == 200
    achievements = response.json()["result"]["achievements"]
    codes = {item["code"] for item in achievements}
    assert {"FIRST_QUEST", "EXPLORER"}.issubset(codes)

    listed = api.get("/api/achievements/").json()
    assert next(item for item in listed if item["code"] == "FIRST_QUEST")["unlocked"] is True

    quest2 = api.post(
        "/api/quests/",
        {"title": "Q2", "territory": "BODY", "difficulty": "EASY", "quest_type": "MAIN"},
        format="json",
    ).json()
    response2 = api.post(f"/api/quests/{quest2['id']}/complete/")
    codes2 = {item["code"] for item in response2.json()["result"]["achievements"]}
    assert "FIRST_QUEST" not in codes2
