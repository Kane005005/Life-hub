"""Tests de l'API des saisons."""

from __future__ import annotations

from datetime import timedelta

import pytest
from django.utils import timezone
from rest_framework.authtoken.models import Token
from rest_framework.test import APIClient

from apps.accounts.models import User
from apps.seasons.models import Season

pytestmark = pytest.mark.django_db


@pytest.fixture
def api(user: User) -> APIClient:
    token = Token.objects.create(user=user)
    client = APIClient()
    client.credentials(HTTP_AUTHORIZATION=f"Token {token.key}")
    return client


def test_create_season(api: APIClient) -> None:
    response = api.post(
        "/api/seasons/",
        {
            "name": "Saison 1",
            "theme": "Focus",
            "start_date": timezone.localdate().isoformat(),
            "priority_territories": ["TECHNOLOGY"],
            "objectives": [{"title": "Principal", "is_main": True}],
        },
        format="json",
    )
    assert response.status_code == 201
    data = response.json()
    assert data["status"] == "ACTIVE"
    assert data["priority_territories"] == ["TECHNOLOGY"]
    assert len(data["objectives"]) == 1


def test_second_create_returns_409(api: APIClient) -> None:
    payload = {
        "name": "Saison 1",
        "start_date": timezone.localdate().isoformat(),
        "objectives": [],
    }
    assert api.post("/api/seasons/", payload, format="json").status_code == 201
    response = api.post("/api/seasons/", payload, format="json")
    assert response.status_code == 409
    assert response.json() == {"detail": "Une saison est déjà en cours."}


def test_current_without_season_returns_404(api: APIClient) -> None:
    response = api.get("/api/seasons/current/")
    assert response.status_code == 404
    assert response.json() == {"detail": "Aucune saison active."}


def test_automatic_close_and_next_on_current(api: APIClient, user: User) -> None:
    today = timezone.localdate()
    season = Season.objects.create(
        owner=user,
        number=1,
        name="Saison 1",
        status="ACTIVE",
        start_date=today - timedelta(days=120),
        end_date=today - timedelta(days=1),
    )
    response = api.get("/api/seasons/current/")
    assert response.status_code == 200
    data = response.json()
    assert data["number"] == 2
    assert data["status"] == "ACTIVE"
    old = Season.objects.get(pk=season.pk)
    assert old.status == "CLOSED"


def test_early_close_returns_closed_and_next(api: APIClient) -> None:
    created = api.post(
        "/api/seasons/",
        {"name": "Saison 1", "start_date": timezone.localdate().isoformat(), "objectives": []},
        format="json",
    ).json()
    response = api.post(f"/api/seasons/{created['id']}/close/")
    assert response.status_code == 200
    data = response.json()
    assert data["closed"]["status"] == "CLOSED"
    assert data["next"]["status"] == "ACTIVE"
    assert data["next"]["number"] == 2


def test_patch_closed_season_returns_409(api: APIClient) -> None:
    created = api.post(
        "/api/seasons/",
        {"name": "Saison 1", "start_date": timezone.localdate().isoformat(), "objectives": []},
        format="json",
    ).json()
    api.post(f"/api/seasons/{created['id']}/close/")
    response = api.patch(
        f"/api/seasons/{created['id']}/",
        {"name": "Nope"},
        format="json",
    )
    assert response.status_code == 409


def test_objective_limits_return_400(api: APIClient) -> None:
    response = api.post(
        "/api/seasons/",
        {
            "name": "Saison 1",
            "start_date": timezone.localdate().isoformat(),
            "objectives": [
                {"title": "A", "is_main": True},
                {"title": "B", "is_main": True},
            ],
        },
        format="json",
    )
    assert response.status_code == 400
    assert "objectif principal" in response.json()["detail"]
