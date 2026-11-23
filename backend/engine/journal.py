"""Agrégations du journal pour les résumés de période."""

from __future__ import annotations

from datetime import timedelta
from typing import TYPE_CHECKING

from django.db.models import Sum
from django.utils import timezone

from apps.journal.models import JournalEntry
from apps.progression.models import XPTransaction

if TYPE_CHECKING:
    from apps.accounts.models import User


def journal_summary(user: User, period: str = "week", today=None) -> dict:
    """Construit un résumé journalier de la période demandée."""
    day = today or timezone.localdate()
    days = 7 if period == "week" else 30
    start = day - timedelta(days=days - 1)

    xp_rows = (
        XPTransaction.objects.filter(
            character__user_id=user.id,
            created_at__date__gte=start,
            created_at__date__lte=day,
        )
        .values("created_at__date")
        .annotate(xp=Sum("amount"))
    )
    xp_by_day_map = {row["created_at__date"]: row["xp"] or 0 for row in xp_rows}
    xp_by_day = []
    cursor = start
    while cursor <= day:
        xp_by_day.append({"date": cursor.isoformat(), "xp": xp_by_day_map.get(cursor, 0)})
        cursor += timedelta(days=1)

    from apps.world.models import Territory

    xp_by_territory = {territory.code: 0 for territory in Territory.objects.all()}
    territory_rows = (
        XPTransaction.objects.filter(
            character__user_id=user.id,
            created_at__date__gte=start,
            created_at__date__lte=day,
        )
        .values("territory__code")
        .annotate(xp=Sum("amount"))
    )
    for row in territory_rows:
        xp_by_territory[row["territory__code"]] = row["xp"] or 0

    entries = JournalEntry.objects.filter(
        owner=user, created_at__date__gte=start, created_at__date__lte=day
    )
    completions = entries.filter(event_type="QUEST_COMPLETED").count()
    rests = entries.filter(event_type="REST").count()
    achievements_count = entries.filter(event_type="ACHIEVEMENT_UNLOCKED").count()
    skills_count = entries.filter(event_type="SKILL_UNLOCKED").count()

    return {
        "period": period,
        "from": start.isoformat(),
        "to": day.isoformat(),
        "xp_by_day": xp_by_day,
        "xp_by_territory": xp_by_territory,
        "completions": completions,
        "rests": rests,
        "achievements": achievements_count,
        "skills": skills_count,
    }
