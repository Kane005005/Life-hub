"""Calendrier journalier de LIFE RPG (phase 4b).

Ce module affiche et planifie : il ne calcule aucune récompense et ne punit
jamais un jour sans validation. Les XP et crédits affichés sont ceux déjà
enregistrés sur les missions et les validations. Les données de la plage sont
chargées en peu de requêtes, jamais une requête par jour.
"""

from __future__ import annotations

from collections import defaultdict
from dataclasses import dataclass
from datetime import date, datetime, time, timedelta
from typing import TYPE_CHECKING
from zoneinfo import ZoneInfo

from django.db.models import Q
from django.utils import timezone

from apps.accounts.timezones import user_zone_info
from apps.quests.models import Quest, QuestCompletion, QuestStep
from apps.world.models import Territory
from engine.exceptions import EngineError
from engine.rules import period_key

if TYPE_CHECKING:
    from apps.accounts.models import User

MAX_RANGE_DAYS = 100
RECURRING_TYPES = ("DAILY", "WEEKLY")
ACTIVE_STATUSES = ("AVAILABLE", "ACCEPTED", "IN_PROGRESS")
TERMINAL_STATUSES = ("COMPLETED", "ABANDONED")
ENTRY_TYPE_ORDER = {"BOSS": 0, "MAIN": 1, "SIDE": 2, "WEEKLY": 3, "DAILY": 4}


class CalendarRangeError(EngineError):
    """La plage demandée ne peut pas être lue."""

    def __init__(self, message: str = "Plage de calendrier invalide.") -> None:
        super().__init__(message)


@dataclass(frozen=True)
class _CalendarData:
    """Données de la plage, chargées une seule fois."""

    zone: ZoneInfo
    quests: list[Quest]
    territory_order: dict[str, int]
    done_keys: dict[int, set[str]]
    completions_by_day: dict[date, list[QuestCompletion]]


def user_today(user: User) -> date:
    """Renvoie le jour de l'utilisateur, même sans fuseau actif dans le thread."""
    return timezone.now().astimezone(user_zone_info(user)).date()


def _validate_range(start: date, end: date) -> None:
    """Refuse une plage inversée ou plus longue que la limite du contrat."""
    if start > end:
        raise CalendarRangeError("La date de début doit précéder la date de fin.")
    if (end - start).days + 1 > MAX_RANGE_DAYS:
        raise CalendarRangeError("La plage est limitée à 100 jours.")


def resolve_range(user: User, raw_from: str | None, raw_to: str | None) -> tuple[date, date]:
    """Interprète les paramètres ``from`` et ``to``, avec la semaine ISO par défaut."""
    today = user_today(user)
    iso = today.isocalendar()
    monday = date.fromisocalendar(iso.year, iso.week, 1)
    sunday = monday + timedelta(days=6)
    try:
        start = date.fromisoformat(raw_from) if raw_from else monday
        end = date.fromisoformat(raw_to) if raw_to else sunday
    except (TypeError, ValueError):
        raise CalendarRangeError("Dates invalides. Utilise le format AAAA-MM-JJ.") from None
    _validate_range(start, end)
    return start, end


def _load_data(
    user: User,
    start: date,
    end: date,
    *,
    include_body: bool,
    zone: ZoneInfo,
) -> _CalendarData:
    """Charge les missions, étapes et validations utiles à la plage."""
    keys: set[str] = set()
    cursor = start
    while cursor <= end:
        keys.add(period_key("DAILY", cursor))
        keys.add(period_key("WEEKLY", cursor))
        keys.add(period_key("SIDE", cursor))
        cursor += timedelta(days=1)

    planned_step_quests = QuestStep.objects.filter(scheduled_date__range=(start, end)).values(
        "quest_id"
    )
    quests = (
        Quest.objects.filter(owner=user)
        .filter(
            Q(quest_type__in=RECURRING_TYPES)
            | Q(scheduled_date__range=(start, end))
            | Q(due_date__lte=end)
            | Q(pk__in=planned_step_quests)
        )
        .select_related("territory")
        .prefetch_related("steps")
    )
    lower = datetime.combine(start, time.min, tzinfo=zone)
    upper = datetime.combine(end + timedelta(days=1), time.min, tzinfo=zone)
    completions = (
        QuestCompletion.objects.filter(quest__owner=user)
        .filter(Q(completed_at__gte=lower, completed_at__lt=upper) | Q(period_key__in=keys))
        .select_related("quest__territory")
        .order_by("completed_at", "id")
    )
    if not include_body:
        quests = quests.exclude(territory__code="BODY")
        completions = completions.exclude(quest__territory__code="BODY")

    territory_order = {
        code: index for index, code in enumerate(Territory.objects.values_list("code", flat=True))
    }
    done_keys: dict[int, set[str]] = defaultdict(set)
    completions_by_day: dict[date, list[QuestCompletion]] = defaultdict(list)
    for completion in completions:
        done_keys[completion.quest_id].add(completion.period_key)
        day = completion.completed_at.astimezone(zone).date()
        if start <= day <= end:
            completions_by_day[day].append(completion)
    return _CalendarData(
        zone=zone,
        quests=list(quests),
        territory_order=territory_order,
        done_keys=done_keys,
        completions_by_day=completions_by_day,
    )


def _quest_start(quest: Quest, zone: ZoneInfo) -> date:
    """Premier jour d'apparition d'une mission récurrente."""
    if quest.start_date is not None:
        return quest.start_date
    return quest.created_at.astimezone(zone).date()


def _quest_payload(quest: Quest) -> dict:
    """Objet Quest réduit, conforme au contrat du calendrier."""
    return {
        "id": quest.id,
        "title": quest.title,
        "quest_type": quest.quest_type,
        "difficulty": quest.difficulty,
        "territory": quest.territory.code,
        "status": quest.status,
        "xp_reward": quest.xp_reward,
        "credit_reward": quest.credit_reward,
        "scheduled_date": quest.scheduled_date,
        "scheduled_time": quest.scheduled_time,
        "due_date": quest.due_date,
    }


def _entry(
    quest: Quest,
    day: date,
    *,
    kind: str,
    done: bool,
    step: QuestStep | None = None,
    due_passed: bool = False,
) -> dict:
    """Construit une entrée du calendrier."""
    step_payload = None
    if step is not None:
        step_payload = {"id": step.id, "title": step.title, "is_done": step.is_done}
    return {
        "kind": kind,
        "quest": _quest_payload(quest),
        "step": step_payload,
        "period_key": period_key(quest.quest_type, day),
        "done": done,
        "due_passed": due_passed,
    }


def _entry_sort_key(entry: dict, territory_order: dict[str, int]) -> tuple:
    """Trie par territoire, type de mission, titre puis nature de l'entrée."""
    quest = entry["quest"]
    return (
        territory_order.get(quest["territory"], len(territory_order)),
        ENTRY_TYPE_ORDER.get(quest["quest_type"], len(ENTRY_TYPE_ORDER)),
        quest["title"],
        entry["kind"],
        entry["step"]["id"] if entry["step"] else 0,
    )


def _entries_for_day(data: _CalendarData, day: date, today: date) -> list[dict]:
    """Liste les missions attendues un jour donné, sans aucune règle de gain."""
    entries: list[dict] = []
    for quest in data.quests:
        if quest.status in TERMINAL_STATUSES and quest.quest_type in RECURRING_TYPES:
            continue
        if quest.status == "ABANDONED":
            continue
        if day < _quest_start(quest, data.zone):
            continue
        keys = data.done_keys.get(quest.id, set())
        if quest.quest_type in RECURRING_TYPES:
            if quest.status == "PAUSED" and day >= today:
                continue
            key = period_key(quest.quest_type, day)
            entries.append(
                _entry(quest, day, kind=quest.quest_type, done=key in keys),
            )
            continue

        if quest.scheduled_date == day:
            entries.append(
                _entry(
                    quest,
                    day,
                    kind="SCHEDULED",
                    done=quest.status == "COMPLETED" or "once" in keys,
                ),
            )
        for step in quest.steps.all():
            if step.scheduled_date == day:
                entries.append(
                    _entry(quest, day, kind="STEP", done=step.is_done, step=step),
                )
        if (
            quest.due_date is not None
            and quest.due_date <= day
            and quest.scheduled_date != day
            and quest.status != "COMPLETED"
        ):
            entries.append(
                _entry(
                    quest,
                    day,
                    kind="DUE",
                    done=False,
                    due_passed=quest.due_date < today,
                ),
            )
    entries.sort(key=lambda entry: _entry_sort_key(entry, data.territory_order))
    return entries


def _completion_payload(completion: QuestCompletion) -> dict:
    """Validation réelle du jour, avec les montants enregistrés."""
    return {
        "quest_id": completion.quest_id,
        "title": completion.quest.title,
        "territory": completion.quest.territory.code,
        "quest_type": completion.quest.quest_type,
        "xp": completion.xp_awarded,
        "credits": completion.credits_awarded,
        "completed_at": completion.completed_at,
    }


def _summary(
    completions: list[QuestCompletion],
    territory_order: dict[str, int],
) -> dict:
    """Résumé neutre d'une journée, sans notion de série ni d'échec."""
    by_territory: dict[str, list[int]] = {}
    for completion in completions:
        code = completion.quest.territory.code
        row = by_territory.setdefault(code, [0, 0])
        row[0] += 1
        row[1] += completion.xp_awarded
    dominant = None
    if by_territory:
        dominant = min(
            by_territory,
            key=lambda code: (
                -by_territory[code][0],
                -by_territory[code][1],
                territory_order.get(code, len(territory_order)),
            ),
        )
    return {
        "completions": len(completions),
        "xp": sum(completion.xp_awarded for completion in completions),
        "credits": sum(completion.credits_awarded for completion in completions),
        "dominant_territory": dominant,
    }


def calendar_range(
    user: User,
    start: date,
    end: date,
    *,
    include_body: bool = True,
    today: date | None = None,
) -> dict:
    """Construit la réponse d'une plage inclusive de dates du calendrier."""
    _validate_range(start, end)
    today = today or user_today(user)
    zone = user_zone_info(user)
    with timezone.override(zone):
        data = _load_data(user, start, end, include_body=include_body, zone=zone)
        days: list[dict] = []
        cursor = start
        while cursor <= end:
            completions = data.completions_by_day.get(cursor, [])
            days.append(
                {
                    "date": cursor,
                    "is_today": cursor == today,
                    "iso_week": period_key("WEEKLY", cursor),
                    "entries": _entries_for_day(data, cursor, today),
                    "completions": [_completion_payload(item) for item in completions],
                    "summary": _summary(completions, data.territory_order),
                }
            )
            cursor += timedelta(days=1)
    return {
        "from": start,
        "to": end,
        "today": today,
        "time_zone": user.time_zone,
        "days": days,
    }


def calendar_today(
    user: User,
    *,
    include_body: bool = True,
    today: date | None = None,
) -> dict:
    """Construit la vue du jour avec les hebdomadaires de la semaine en cours."""
    today = today or user_today(user)
    iso = today.isocalendar()
    monday = date.fromisocalendar(iso.year, iso.week, 1)
    sunday = monday + timedelta(days=6)
    week = calendar_range(
        user,
        monday,
        sunday,
        include_body=include_body,
        today=today,
    )
    day = next(item for item in week["days"] if item["date"] == today)
    days_left = 7 - iso.weekday
    weekly_by_id: dict[int, dict] = {}
    for item in week["days"]:
        for entry in item["entries"]:
            if entry["kind"] != "WEEKLY":
                continue
            quest_id = entry["quest"]["id"]
            row = weekly_by_id.setdefault(
                quest_id,
                {
                    "quest": entry["quest"],
                    "done": False,
                    "days_left_in_week": days_left,
                },
            )
            row["done"] = row["done"] or entry["done"]
    weekly = sorted(
        weekly_by_id.values(),
        key=lambda row: (row["quest"]["territory"], row["quest"]["title"], row["quest"]["id"]),
    )
    return {**day, "time_zone": week["time_zone"], "weekly": weekly}
