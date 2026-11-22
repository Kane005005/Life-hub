"""Tests de l'API du journal des événements et du repos."""

import pytest
from rest_framework.authtoken.models import Token
from rest_framework.test import APIClient

from apps.accounts.models import User

pytestmark = pytest.mark.django_db


@pytest.fixture
def api(user: User) -> APIClient:
    """Client authentifié avec le jeton de l'utilisateur principal."""
    token = Token.objects.create(user=user)
    client = APIClient()
    client.credentials(HTTP_AUTHORIZATION=f"Token {token.key}")
    return client


def test_engine_events_are_listed_and_filterable(api: APIClient) -> None:
    quest = api.post(
        "/api/quests/",
        {"title": "Mission journal", "territory": "KNOWLEDGE", "difficulty": "MEDIUM"},
        format="json",
    ).json()
    assert api.post(f"/api/quests/{quest['id']}/complete/").status_code == 200

    events = api.get("/api/journal/").json()
    assert events["count"] >= 4
    types = {event["event_type"] for event in events["results"]}
    assert {
        "QUEST_CREATED",
        "QUEST_COMPLETED",
        "XP_AWARDED",
        "CREDITS_EARNED",
    } <= types

    filtered = api.get("/api/journal/?event_type=QUEST_COMPLETED").json()
    assert filtered["count"] == 1
    assert filtered["results"][0]["message"] == "Mission validée. +30 XP en Savoir."
    assert filtered["results"][0]["quest"] == quest["id"]


def test_rest_returns_201_without_changing_progress(api: APIClient) -> None:
    before = api.get("/api/character/").json()

    response = api.post("/api/journal/rest/")

    assert response.status_code == 201
    assert response.json() == {"message": "Repos enregistré. Ta progression est intacte."}
    assert api.get("/api/character/").json() == before

    rest = api.get("/api/journal/?event_type=REST").json()
    assert rest["count"] == 1
    assert rest["results"][0]["message"] == "Repos enregistré. Ta progression est intacte."
