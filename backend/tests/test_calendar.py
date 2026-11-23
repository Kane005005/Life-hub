"""Tests du calendrier journalier : récurrences, planification, fuseaux et limites."""

from __future__ import annotations

from datetime import UTC, date, datetime, time, timedelta
from typing import Any
from unittest.mock import patch

import pytest
from rest_framework.authtoken.models import Token
from rest_framework.test import APIClient

from apps.accounts.models import User
from apps.character.models import Character
from apps.economy.models import CreditTransaction
from apps.journal.models import JournalEntry
from apps.progression.models import XPTransaction
from apps.quests.models import Quest, QuestCompletion
from engine.rules import period_key

pytestmark = pytest.mark.django_db

FROZEN = datetime(2026, 11, 24, 12, 0, tzinfo=UTC)
TODAY = FROZEN.date()
WEEK_START = date(2026, 11, 23)
WEEK_END = date(2026, 11, 29)


@pytest.fixture
def frozen() -> Any:
    """Fixe l'heure à midi UTC, un mardi de la semaine 48."""
    with patch("django.utils.timezone.now", return_value=FROZEN):
        yield FROZEN


@pytest.fixture
def api(user: User) -> APIClient:
    """Client authentifié avec le jeton personnel de l'utilisateur."""
    token = Token.objects.create(user=user)
    client = APIClient()
    client.credentials(HTTP_AUTHORIZATION=f"Token {token.key}")
    return client


def new_quest(api: APIClient, **extra: Any) -> dict[str, Any]:
    """Crée une mission via l'API, avec un début de semaine explicite."""
    payload: dict[str, Any] = {
        "title": "Mission de test",
        "territory": "KNOWLEDGE",
        "difficulty": "EASY",
        "start_date": WEEK_START.isoformat(),
    }
    payload.update(extra)
    response = api.post("/api/quests/", payload, format="json")
    assert response.status_code == 201, response.content
    return response.json()


def add_completion(
    quest_id: int,
    day: date,
    xp: int,
    credits: int,
    *,
    moment: datetime | None = None,
) -> None:
    """Enregistre une validation réelle, avec les montants demandés."""
    quest = Quest.objects.get(pk=quest_id)
    completed_at = moment or datetime.combine(day, time(7, 12), tzinfo=UTC)
    QuestCompletion.objects.create(
        quest=quest,
        period_key=period_key(quest.quest_type, day),
        xp_awarded=xp,
        credits_awarded=credits,
        completed_at=completed_at,
    )


def test_daily_and_weekly_appear_on_every_relevant_day(api: APIClient, frozen: Any) -> None:
    """Une Daily chaque jour, une Weekly sur les sept jours de sa semaine ISO."""
    daily = new_quest(api, title="Méditer 10 minutes", quest_type="DAILY")
    weekly = new_quest(api, title="Bilan de la semaine", quest_type="WEEKLY")
    add_completion(daily["id"], TODAY, 5, 5)
    add_completion(weekly["id"], TODAY, 15, 15)

    response = api.get(f"/api/calendar/?from={WEEK_START}&to={WEEK_END}")

    assert response.status_code == 200, response.content
    data = response.json()
    assert [item["date"] for item in data["days"]] == [
        (WEEK_START + timedelta(days=index)).isoformat() for index in range(7)
    ]
    assert data["today"] == TODAY.isoformat()
    assert data["time_zone"] == "Africa/Bamako"
    for item in data["days"]:
        day = date.fromisoformat(item["date"])
        daily_entries = [
            entry
            for entry in item["entries"]
            if entry["kind"] == "DAILY" and entry["quest"]["id"] == daily["id"]
        ]
        weekly_entries = [
            entry
            for entry in item["entries"]
            if entry["kind"] == "WEEKLY" and entry["quest"]["id"] == weekly["id"]
        ]
        assert len(daily_entries) == 1
        assert len(weekly_entries) == 1
        assert daily_entries[0]["period_key"] == day.isoformat()
        assert daily_entries[0]["done"] is (day == TODAY)
        assert weekly_entries[0]["period_key"] == period_key("WEEKLY", day)
        assert weekly_entries[0]["done"] is True


def test_empty_day_has_no_punishment_keys(api: APIClient, frozen: Any) -> None:
    """Un jour sans validation reste neutre, sans clé de manque ni de série."""
    new_quest(api, quest_type="DAILY")

    response = api.get(f"/api/calendar/?from={TODAY}&to={TODAY}")
    data = response.json()
    day = data["days"][0]

    assert day["completions"] == []
    assert day["summary"] == {
        "completions": 0,
        "xp": 0,
        "credits": 0,
        "dominant_territory": None,
    }
    raw = response.content.decode("utf-8")
    for forbidden in ("missed", "streak", "failed", "penalty"):
        assert forbidden not in raw


def test_completions_summary_and_dominant_territory(api: APIClient, frozen: Any) -> None:
    """Le résumé additionne les montants enregistrés et départage les territoires."""
    knowledge = new_quest(api, title="Lecture", territory="KNOWLEDGE")
    knowledge_bis = new_quest(api, title="Note", territory="KNOWLEDGE", difficulty="TRIVIAL")
    inner = new_quest(api, title="Prière", territory="INNER_WORLD", difficulty="HARD")
    add_completion(knowledge["id"], TODAY, 15, 15)
    add_completion(knowledge_bis["id"], TODAY, 5, 5)
    add_completion(inner["id"], TODAY, 60, 60)

    data = api.get(f"/api/calendar/?from={TODAY}&to={TODAY}").json()
    day = data["days"][0]

    assert day["summary"] == {
        "completions": 3,
        "xp": 80,
        "credits": 80,
        "dominant_territory": "KNOWLEDGE",
    }
    assert sorted(item["xp"] for item in day["completions"]) == [5, 15, 60]
    assert all(item["completed_at"].endswith("Z") for item in day["completions"])
    assert {item["territory"] for item in day["completions"]} == {"KNOWLEDGE", "INNER_WORLD"}


def _progress_snapshot(user: User, quest: Quest) -> dict[str, Any]:
    """État complet des gains et du statut, avant et après une replanification."""
    character = Character.objects.get(user=user)
    quest.refresh_from_db()
    return {
        "level": character.level,
        "total_xp": character.total_xp,
        "xp_in_level": character.xp_in_level,
        "credits": character.credits,
        "skill_points": character.skill_points_available,
        "status": quest.status,
        "xp_reward": quest.xp_reward,
        "credit_reward": quest.credit_reward,
        "completions": QuestCompletion.objects.count(),
        "xp_transactions": XPTransaction.objects.count(),
        "credit_transactions": CreditTransaction.objects.count(),
    }


def test_rescheduling_a_quest_keeps_all_rewards_and_status(
    api: APIClient,
    user: User,
    frozen: Any,
) -> None:
    """Replanifier une mission n'écrit qu'un seul événement QUEST_RESCHEDULED."""
    created = new_quest(api, difficulty="EASY")
    quest = Quest.objects.get(pk=created["id"])
    before = _progress_snapshot(user, quest)
    before_events = JournalEntry.objects.count()

    response = api.patch(
        f"/api/quests/{quest.pk}/",
        {"scheduled_date": "2026-11-25"},
        format="json",
    )

    assert response.status_code == 200, response.content
    assert response.json()["scheduled_date"] == "2026-11-25"
    assert _progress_snapshot(user, quest) == before
    assert JournalEntry.objects.count() == before_events + 1
    event = JournalEntry.objects.order_by("-id").first()
    assert event is not None
    assert event.event_type == "QUEST_RESCHEDULED"
    assert event.message == "Mission replanifiée au 25/11/2026."


def test_clearing_a_schedule_logs_the_right_message(api: APIClient, frozen: Any) -> None:
    """Retirer une planification utilise le message prévu par le contrat."""
    created = new_quest(api, scheduled_date="2026-11-25")

    response = api.patch(f"/api/quests/{created['id']}/", {"scheduled_date": None}, format="json")

    assert response.status_code == 200
    assert response.json()["scheduled_date"] is None
    event = JournalEntry.objects.order_by("-id").first()
    assert event is not None
    assert event.event_type == "QUEST_RESCHEDULED"
    assert event.message == "Planification retirée."


def test_rescheduling_a_step_keeps_all_rewards_and_status(
    api: APIClient,
    user: User,
    frozen: Any,
) -> None:
    """Replanifier une étape ne modifie ni la mission ni la progression."""
    created = new_quest(api, steps=[{"title": "Choisir le livre n°1"}])
    step_id = created["steps"][0]["id"]
    quest = Quest.objects.get(pk=created["id"])
    before = _progress_snapshot(user, quest)
    before_events = JournalEntry.objects.count()

    response = api.patch(
        f"/api/quests/{quest.pk}/steps/{step_id}/",
        {"scheduled_date": "2026-11-25"},
        format="json",
    )

    assert response.status_code == 200, response.content
    payload = response.json()
    assert payload["steps"][0]["scheduled_date"] == "2026-11-25"
    assert _progress_snapshot(user, quest) == before
    assert JournalEntry.objects.count() == before_events + 1
    event = JournalEntry.objects.order_by("-id").first()
    assert event is not None
    assert event.event_type == "QUEST_RESCHEDULED"


def test_scheduled_step_and_due_entries(api: APIClient, frozen: Any) -> None:
    """Les entrées SCHEDULED, STEP et DUE respectent les règles d'affichage."""
    scheduled = new_quest(api, title="Rendez-vous", scheduled_date=TODAY.isoformat())
    stepped = new_quest(
        api,
        title="Projet",
        steps=[{"title": "Étape du jour"}],
    )
    step_id = stepped["steps"][0]["id"]
    assert (
        api.patch(
            f"/api/quests/{stepped['id']}/steps/{step_id}/",
            {"scheduled_date": TODAY.isoformat()},
            format="json",
        ).status_code
        == 200
    )
    due = new_quest(api, title="Échéance du jour", due_date=TODAY.isoformat())
    late = new_quest(api, title="Échéance passée", due_date=(TODAY - timedelta(days=1)).isoformat())
    done_late = new_quest(
        api,
        title="Échéance passée terminée",
        due_date=(TODAY - timedelta(days=1)).isoformat(),
    )
    assert api.post(f"/api/quests/{done_late['id']}/complete/").status_code == 200

    data = api.get(f"/api/calendar/?from={TODAY}&to={TODAY}").json()
    entries = data["days"][0]["entries"]
    by_id = {entry["quest"]["id"]: entry for entry in entries}

    assert by_id[scheduled["id"]]["kind"] == "SCHEDULED"
    assert by_id[scheduled["id"]]["period_key"] == "once"
    assert by_id[scheduled["id"]]["done"] is False
    assert by_id[scheduled["id"]]["due_passed"] is False
    assert by_id[stepped["id"]]["kind"] == "STEP"
    assert by_id[stepped["id"]]["step"]["id"] == step_id
    assert by_id[stepped["id"]]["done"] is False
    assert by_id[due["id"]]["kind"] == "DUE"
    assert by_id[due["id"]]["due_passed"] is False
    assert by_id[late["id"]]["kind"] == "DUE"
    assert by_id[late["id"]]["due_passed"] is True
    assert done_late["id"] not in by_id


def test_time_zone_controls_today_and_is_validated(api: APIClient, frozen: Any) -> None:
    """Le jour de l'utilisateur suit son fuseau ; un fuseau inconnu est refusé."""
    today = api.get("/api/calendar/today/").json()
    assert today["date"] == "2026-11-24"
    assert today["time_zone"] == "Africa/Bamako"
    assert today["is_today"] is True

    changed = api.patch(
        "/api/auth/me/",
        {"time_zone": "Pacific/Kiritimati"},
        format="json",
    )
    assert changed.status_code == 200
    assert changed.json()["time_zone"] == "Pacific/Kiritimati"
    assert api.get("/api/calendar/today/").json()["date"] == "2026-11-25"

    invalid = api.patch("/api/auth/me/", {"time_zone": "Mars/Olympus"}, format="json")
    assert invalid.status_code == 400
    assert invalid.json() == {"time_zone": ["Fuseau horaire inconnu."]}

    ignored = api.patch("/api/auth/me/", {"username": "pirate"}, format="json")
    assert ignored.status_code == 200
    assert ignored.json()["username"] == "kane"


def test_range_limits_are_enforced(api: APIClient, frozen: Any) -> None:
    """Une plage trop longue ou inversée est refusée avec un message clair."""
    too_long = api.get(f"/api/calendar/?from={WEEK_START}&to={WEEK_START + timedelta(days=100)}")
    assert too_long.status_code == 400
    assert too_long.json() == {"detail": "La plage est limitée à 100 jours."}

    reversed_range = api.get("/api/calendar/?from=2026-11-30&to=2026-11-23")
    assert reversed_range.status_code == 400
    assert "detail" in reversed_range.json()


def test_due_entry_is_not_copied_onto_future_days(api: APIClient, frozen: Any) -> None:
    """Une échéance passée apparaît son jour et aujourd'hui, jamais les jours suivants."""
    late = new_quest(api, title="Échéance passée", due_date=(TODAY - timedelta(days=1)).isoformat())
    data = api.get(f"/api/calendar/?from={WEEK_START}&to={WEEK_END}").json()
    due_days = [
        day["date"]
        for day in data["days"]
        if any(e["kind"] == "DUE" and e["quest"]["id"] == late["id"] for e in day["entries"])
    ]
    assert due_days == [(TODAY - timedelta(days=1)).isoformat(), TODAY.isoformat()]


def test_weekly_created_mid_week_covers_its_whole_iso_week(api: APIClient, frozen: Any) -> None:
    """Une hebdomadaire commencée un mardi s'affiche dès le lundi de sa semaine."""
    weekly = new_quest(api, title="Hebdo", quest_type="WEEKLY", start_date=TODAY.isoformat())
    data = api.get(f"/api/calendar/?from={WEEK_START - timedelta(days=7)}&to={WEEK_END}").json()
    shown = [
        day["date"]
        for day in data["days"]
        if any(e["quest"]["id"] == weekly["id"] for e in day["entries"])
    ]
    assert shown == [(WEEK_START + timedelta(days=i)).isoformat() for i in range(7)]
