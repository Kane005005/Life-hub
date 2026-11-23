"""Tests du résumé journal (phase 2)."""

from __future__ import annotations

from datetime import datetime, timedelta

import pytest
from django.utils import timezone

from apps.journal.models import JournalEntry
from apps.progression.models import XPTransaction
from apps.quests.models import QuestCompletion
from engine.journal import journal_summary
from engine.services import complete_quest, create_quest

pytestmark = pytest.mark.django_db


def test_journal_summary_week_with_empty_days(world, character) -> None:
    today = timezone.localdate()
    day1 = today - timedelta(days=3)
    day2 = today - timedelta(days=1)

    q1 = create_quest(
        character.user,
        {"title": "Q1", "territory": "KNOWLEDGE", "quest_type": "DAILY", "difficulty": "MEDIUM"},
    )
    q2 = create_quest(
        character.user,
        {"title": "Q2", "territory": "BODY", "quest_type": "DAILY", "difficulty": "EASY"},
    )
    c1 = complete_quest(q1, today=day1).quest.completions.get(period_key=day1.isoformat())
    c2 = complete_quest(q2, today=day1).quest.completions.get(period_key=day1.isoformat())
    c3 = complete_quest(q1, today=day2).quest.completions.get(period_key=day2.isoformat())

    for completion, day in ((c1, day1), (c2, day1), (c3, day2)):
        ts = timezone.make_aware(datetime.combine(day, datetime.min.time().replace(hour=12)))
        QuestCompletion.objects.filter(pk=completion.pk).update(completed_at=ts, created_at=ts)
        XPTransaction.objects.filter(quest_completion=completion).update(created_at=ts)
        JournalEntry.objects.filter(
            owner=character.user,
            quest=completion.quest,
            event_type__in=["QUEST_COMPLETED", "XP_AWARDED", "CREDITS_EARNED"],
            created_at__date=timezone.localdate(),
        ).update(created_at=ts)

    summary = journal_summary(character.user, period="week", today=today)

    assert summary["period"] == "week"
    assert summary["from"] == (today - timedelta(days=6)).isoformat()
    assert summary["to"] == today.isoformat()
    assert len(summary["xp_by_day"]) == 7
    by_day = {item["date"]: item["xp"] for item in summary["xp_by_day"]}
    assert by_day[(today - timedelta(days=6)).isoformat()] == 0
    assert by_day[day1.isoformat()] == 45  # 30 + 15
    assert by_day[day2.isoformat()] == 30
    assert by_day[today.isoformat()] == 0
    assert summary["xp_by_territory"]["KNOWLEDGE"] == 60
    assert summary["xp_by_territory"]["BODY"] == 15
    assert summary["completions"] == 3
