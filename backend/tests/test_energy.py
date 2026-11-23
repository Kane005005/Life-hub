"""Tests des bilans énergétiques : échelle française, unicité quotidienne, isolation."""

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
from engine.energy import ENERGY_LABELS, energy_snapshot, record_energy
from engine.exceptions import EngineError

pytestmark = pytest.mark.django_db


@pytest.fixture
def api(user: User) -> APIClient:
    token = Token.objects.create(user=user)
    client = APIClient()
    client.credentials(HTTP_AUTHORIZATION=f"Token {token.key}")
    return client


def test_post_returns_checkin_with_french_label(api: APIClient, user: User) -> None:
    response = api.post("/api/energy/", {"level": 2, "note": "Nuit courte."}, format="json")
    assert response.status_code == 201
    data = response.json()
    assert data["level"] == 2
    assert data["label"] == "Faible"
    assert data["note"] == "Nuit courte."
    assert data["date"] == timezone.localdate().isoformat()
    assert data["created_at"] is not None
    checkin = EnergyCheckIn.objects.get(pk=data["id"])
    assert checkin.owner_id == user.id


@pytest.mark.parametrize(("level", "label"), list(ENERGY_LABELS.items()))
def test_labels_follow_the_scale(api: APIClient, level: int, label: str) -> None:
    response = api.post("/api/energy/", {"level": level}, format="json")
    assert response.status_code == 201
    assert response.json()["label"] == label


def test_last_checkin_of_the_day_replaces_the_previous(api: APIClient) -> None:
    first = api.post("/api/energy/", {"level": 1, "note": "Difficile."}, format="json").json()
    second = api.post("/api/energy/", {"level": 5, "note": "Mieux."}, format="json")
    assert second.status_code == 201
    data = second.json()
    assert data["id"] == first["id"]
    assert data["level"] == 5
    assert data["note"] == "Mieux."
    assert EnergyCheckIn.objects.count() == 1


def test_one_checkin_per_day(api: APIClient, user: User) -> None:
    today = timezone.localdate()
    record_energy(user, 3, today=today - timedelta(days=1))
    assert api.post("/api/energy/", {"level": 4}, format="json").status_code == 201
    assert EnergyCheckIn.objects.count() == 2
    listing = api.get("/api/energy/").json()
    assert listing["count"] == 2


def test_invalid_levels_are_refused(api: APIClient) -> None:
    for payload in ({}, {"level": 0}, {"level": 6}, {"level": -1}, {"level": "abc"}):
        assert api.post("/api/energy/", payload, format="json").status_code == 400
    assert EnergyCheckIn.objects.count() == 0


def test_note_is_optional(api: APIClient) -> None:
    response = api.post("/api/energy/", {"level": 3}, format="json")
    assert response.status_code == 201
    assert response.json()["note"] == ""


def test_list_is_paginated_and_recent_first(api: APIClient, user: User) -> None:
    today = timezone.localdate()
    for offset in range(3):
        record_energy(user, 3, today=today - timedelta(days=offset))
    response = api.get("/api/energy/")
    assert response.status_code == 200
    data = response.json()
    assert data["count"] == 3
    dates = [item["date"] for item in data["results"]]
    assert dates == sorted(dates, reverse=True)
    assert dates[0] == today.isoformat()


def test_checkin_is_journaled(api: APIClient, user: User) -> None:
    api.post("/api/energy/", {"level": 4}, format="json")
    entry = JournalEntry.objects.get(event_type="ENERGY_CHECKIN")
    assert entry.actor == "user"
    assert entry.owner_id == user.id
    assert "Bonne (4/5)" in entry.message


def test_checkin_does_not_touch_progression(api: APIClient, character: Character) -> None:
    before = (
        character.level,
        character.total_xp,
        character.credits,
        character.skill_points_available,
    )
    assert api.post("/api/energy/", {"level": 1}, format="json").status_code == 201
    character.refresh_from_db()
    assert (
        character.level,
        character.total_xp,
        character.credits,
        character.skill_points_available,
    ) == before
    assert XPTransaction.objects.count() == 0


def test_other_user_checkins_are_hidden(api: APIClient, other_user: User) -> None:
    record_energy(other_user, 5)
    data = api.get("/api/energy/").json()
    assert data["count"] == 0


def test_engine_refuses_invalid_levels(user: User) -> None:
    for level in (0, 6, -1, True):
        with pytest.raises(EngineError):
            record_energy(user, level)
    assert EnergyCheckIn.objects.count() == 0


def test_energy_snapshot_shape(user: User) -> None:
    checkin = record_energy(user, 5, note="Belle journée.")
    snapshot = energy_snapshot(checkin)
    assert snapshot == {
        "id": checkin.id,
        "level": 5,
        "label": "Excellente",
        "note": "Belle journée.",
        "date": checkin.date,
        "created_at": checkin.created_at,
    }


def test_anonymous_is_refused(db: None) -> None:
    client = APIClient()
    assert client.get("/api/energy/").status_code == 401
    assert client.post("/api/energy/", {"level": 3}, format="json").status_code == 401
