"""Tests de l'API du journal, des filtres et du résumé."""

from __future__ import annotations

from datetime import datetime, timedelta

import pytest
from django.utils import timezone
from rest_framework.authtoken.models import Token
from rest_framework.test import APIClient

from apps.accounts.models import User
from apps.journal.models import JournalEntry
from apps.progression.models import XPTransaction
from apps.quests.models import QuestCompletion
from engine.services import complete_quest, create_quest

pytestmark = pytest.mark.django_db


@pytest.fixture
def api(user: User) -> APIClient:
    token = Token.objects.create(user=user)
    client = APIClient()
    client.credentials(HTTP_AUTHORIZATION=f"Token {token.key}")
    return client


def test_journal_filters(api: APIClient, user: User) -> None:
    today = timezone.localdate()
    q1 = create_quest(
        user,
        {"title": "Lire", "territory": "KNOWLEDGE", "quest_type": "SIDE", "difficulty": "EASY"},
    )
    q2 = create_quest(
        user,
        {"title": "Courir", "territory": "BODY", "quest_type": "SIDE", "difficulty": "EASY"},
    )
    complete_quest(q1, today=today - timedelta(days=2))
    complete_quest(q2, today=today)

    # Force dates for filtering
    old_ts = timezone.make_aware(
        datetime.combine(today - timedelta(days=2), datetime.min.time().replace(hour=12))
    )
    JournalEntry.objects.filter(owner=user, quest=q1).update(created_at=old_ts)

    by_type = api.get("/api/journal/?event_type=QUEST_COMPLETED&event_type=XP_AWARDED")
    assert by_type.status_code == 200
    assert all(
        e["event_type"] in {"QUEST_COMPLETED", "XP_AWARDED"} for e in by_type.json()["results"]
    )

    by_date = api.get(f"/api/journal/?date_from={today.isoformat()}&date_to={today.isoformat()}")
    assert by_date.status_code == 200
    assert all(e["created_at"][:10] == today.isoformat() for e in by_date.json()["results"])

    by_q = api.get("/api/journal/?q=lire")
    assert by_q.status_code == 200
    assert any(
        "Lire" in e["message"] or "Savoir" in e["message"] or "lire" in e["message"].lower()
        for e in by_q.json()["results"]
    )

    by_territory = api.get("/api/journal/?territory=BODY")
    assert by_territory.status_code == 200
    assert by_territory.json()["count"] >= 1


def test_journal_summary_week_month_and_invalid(api: APIClient, user: User) -> None:
    today = timezone.localdate()
    day = today - timedelta(days=1)
    q = create_quest(
        user,
        {"title": "Q", "territory": "KNOWLEDGE", "quest_type": "DAILY", "difficulty": "MEDIUM"},
    )
    completion = complete_quest(q, today=day).quest.completions.get(period_key=day.isoformat())
    ts = timezone.make_aware(datetime.combine(day, datetime.min.time().replace(hour=12)))
    QuestCompletion.objects.filter(pk=completion.pk).update(completed_at=ts, created_at=ts)
    XPTransaction.objects.filter(quest_completion=completion).update(created_at=ts)
    JournalEntry.objects.filter(owner=user, quest=q, created_at__date=today).update(created_at=ts)

    week = api.get("/api/journal/summary/?period=week")
    assert week.status_code == 200
    assert week.json()["period"] == "week"
    assert len(week.json()["xp_by_day"]) == 7

    month = api.get("/api/journal/summary/?period=month")
    assert month.status_code == 200
    assert month.json()["period"] == "month"
    assert len(month.json()["xp_by_day"]) == 30

    invalid = api.get("/api/journal/summary/?period=year")
    assert invalid.status_code == 400
    assert invalid.json() == {"detail": "Période invalide. Utilise week ou month."}
