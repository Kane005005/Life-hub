"""Moteur des saisons : création, clôture, bilan et consultation."""

from __future__ import annotations

from datetime import date, timedelta
from typing import TYPE_CHECKING

from django.db import transaction
from django.utils import timezone

from apps.seasons.models import Season, SeasonObjective
from apps.world.models import Territory
from engine.events import log_event
from engine.exceptions import SeasonError

if TYPE_CHECKING:
    from apps.accounts.models import User


def _season_length_days() -> int:
    from apps.progression.models import GameSettings

    return GameSettings.load().season_length_days


def season_summary(season: Season) -> dict:
    """Calcule le bilan d'une saison."""
    from apps.achievements.models import PlayerAchievement
    from apps.progression.models import XPTransaction
    from apps.quests.models import QuestCompletion
    from apps.skills.models import SkillUnlock

    start = season.start_date
    end = season.end_date
    owner_id = season.owner_id

    xp_qs = XPTransaction.objects.filter(
        character__user_id=owner_id,
        created_at__date__gte=start,
        created_at__date__lte=end,
    )
    from django.db.models import Sum

    xp_total = xp_qs.aggregate(total=Sum("amount"))["total"] or 0
    xp_by_territory = {territory.code: 0 for territory in Territory.objects.all()}
    for code in xp_by_territory:
        value = xp_qs.filter(territory__code=code).aggregate(total=Sum("amount"))["total"] or 0
        xp_by_territory[code] = value

    completions_qs = QuestCompletion.objects.filter(
        quest__owner_id=owner_id,
        completed_at__date__gte=start,
        completed_at__date__lte=end,
    )
    completions = completions_qs.count()
    completions_by_type = {key: 0 for key in ["DAILY", "WEEKLY", "MAIN", "SIDE", "BOSS"]}
    from django.db.models import Count

    for row in completions_qs.values("quest__quest_type").annotate(total=Count("id")):
        completions_by_type[row["quest__quest_type"]] = row["total"]

    levels_gained = 0
    for tx in xp_qs:
        levels_gained += max(0, tx.level_after - tx.level_before)

    objectives = season.objectives.all()
    objectives_done = sum(1 for obj in objectives if obj.is_done)
    objectives_total = objectives.count()

    achievements = list(
        PlayerAchievement.objects.filter(
            character__user_id=owner_id,
            unlocked_at__date__gte=start,
            unlocked_at__date__lte=end,
        )
        .select_related("achievement")
        .order_by("unlocked_at")
        .values_list("achievement__code", flat=True)
    )
    skills = list(
        SkillUnlock.objects.filter(
            character__user_id=owner_id,
            unlocked_at__date__gte=start,
            unlocked_at__date__lte=end,
        )
        .select_related("skill")
        .order_by("unlocked_at")
        .values_list("skill__code", flat=True)
    )

    return {
        "xp_total": xp_total,
        "xp_by_territory": xp_by_territory,
        "completions": completions,
        "completions_by_type": completions_by_type,
        "levels_gained": levels_gained,
        "objectives_done": objectives_done,
        "objectives_total": objectives_total,
        "achievements_unlocked": achievements,
        "skills_unlocked": skills,
    }


def season_snapshot(season: Season, today: date | None = None) -> dict:
    """Renvoie la représentation API d'une saison."""
    day = today or timezone.localdate()
    summary = season.summary if season.status == "CLOSED" else season_summary(season)
    days_left = max(0, (season.end_date - day).days) if season.status == "ACTIVE" else 0
    return {
        "id": season.id,
        "number": season.number,
        "name": season.name,
        "theme": season.theme,
        "status": season.status,
        "start_date": season.start_date.isoformat(),
        "end_date": season.end_date.isoformat(),
        "days_left": days_left,
        "closed_at": season.closed_at,
        "priority_territories": list(season.priority_territories.values_list("code", flat=True)),
        "objectives": [
            {
                "id": obj.id,
                "title": obj.title,
                "is_main": obj.is_main,
                "is_done": obj.is_done,
                "order": obj.order,
            }
            for obj in season.objectives.all()
        ],
        "summary": summary,
    }


def _validate_objectives(objectives: list[dict]) -> None:
    main = sum(1 for obj in objectives if obj.get("is_main"))
    secondary = sum(1 for obj in objectives if not obj.get("is_main"))
    if main > 1:
        raise SeasonError("Une saison ne peut avoir qu'un objectif principal.")
    if secondary > 3:
        raise SeasonError("Une saison ne peut avoir que trois objectifs secondaires.")


def _replace_objectives(season: Season, objectives: list[dict]) -> None:
    season.objectives.all().delete()
    for index, obj in enumerate(objectives):
        SeasonObjective.objects.create(
            season=season,
            title=str(obj.get("title", "")).strip(),
            is_main=bool(obj.get("is_main", False)),
            is_done=bool(obj.get("is_done", False)),
            order=int(obj.get("order", index)),
        )


@transaction.atomic
def create_season(user: User, data: dict) -> Season:
    """Crée une saison active pour le joueur."""
    if Season.objects.filter(owner=user, status="ACTIVE").exists():
        raise SeasonError("Une saison est déjà en cours.")

    start_date = data.get("start_date")
    if start_date is None or start_date == "":
        start_date = timezone.localdate()
    elif isinstance(start_date, str):
        start_date = date.fromisoformat(start_date)
    length = _season_length_days()
    end_date = start_date + timedelta(days=length - 1)
    number = (Season.objects.filter(owner=user).count() or 0) + 1
    name = str(data.get("name") or f"Saison {number}")

    objectives = data.get("objectives", [])
    _validate_objectives(objectives)

    season = Season.objects.create(
        owner=user,
        number=number,
        name=name,
        theme=str(data.get("theme", "")),
        status="ACTIVE",
        start_date=start_date,
        end_date=end_date,
    )
    priority_codes = data.get("priority_territories", [])
    if priority_codes:
        season.priority_territories.set(Territory.objects.filter(code__in=priority_codes))
    _replace_objectives(season, objectives)
    log_event(
        user, "SEASON_STARTED", f"Saison {season.number} commencée.", payload={"season": season.id}
    )
    return season


@transaction.atomic
def update_season(season: Season, data: dict) -> Season:
    """Met à jour une saison active."""
    season = Season.objects.select_for_update().get(pk=season.pk)
    if season.status == "CLOSED":
        raise SeasonError("Cette saison est terminée.")

    for field in ("name", "theme"):
        if field in data:
            setattr(season, field, data[field])
    if "priority_territories" in data:
        season.priority_territories.set(
            Territory.objects.filter(code__in=data["priority_territories"])
        )

    if "objectives" in data:
        objectives = data["objectives"]
        # toggle mode: {"id", "is_done"} only; otherwise replace the full objectives list
        is_toggle = (
            isinstance(objectives, list)
            and objectives
            and all(isinstance(o, dict) and "id" in o and "title" not in o for o in objectives)
        )
        if is_toggle:
            for obj_data in objectives:
                SeasonObjective.objects.filter(season=season, id=obj_data["id"]).update(
                    is_done=bool(obj_data.get("is_done", False))
                )
        else:
            _validate_objectives(objectives)
            _replace_objectives(season, objectives)

    season.save()
    log_event(
        season.owner,
        "SEASON_UPDATED",
        f"Saison {season.number} mise à jour.",
        payload={"season": season.id},
    )
    return season


@transaction.atomic
def close_season(
    season: Season, today: date | None = None, *, automatic: bool = False
) -> tuple[Season, Season]:
    """Clôt une saison et ouvre la suivante."""
    day = today or timezone.localdate()
    season = Season.objects.select_for_update().get(pk=season.pk)
    if season.status == "CLOSED":
        raise SeasonError("Cette saison est déjà terminée.")

    season.summary = season_summary(season)
    season.status = "CLOSED"
    season.closed_at = timezone.now()
    season.save(update_fields=["summary", "status", "closed_at", "updated_at"])
    log_event(
        season.owner,
        "SEASON_CLOSED",
        f"Saison {season.number} terminée. {season.summary.get('xp_total', 0)} XP gagnés.",
        payload={"season": season.id},
    )

    next_start = day
    if automatic:
        candidate = season.end_date + timedelta(days=1)
        if candidate == day:
            next_start = candidate
        elif candidate < day:
            # prolonged absence: next starts today, no empty series
            next_start = day
        else:
            next_start = candidate

    next_number = season.number + 1
    next_season = Season.objects.create(
        owner=season.owner,
        number=next_number,
        name=f"Saison {next_number}",
        theme="",
        status="ACTIVE",
        start_date=next_start,
        end_date=next_start + timedelta(days=_season_length_days() - 1),
    )
    next_season.priority_territories.set(season.priority_territories.all())
    log_event(
        season.owner,
        "SEASON_STARTED",
        f"Saison {next_season.number} commencée.",
        payload={"season": next_season.id},
    )
    return season, next_season


def current_season(user: User, today: date | None = None) -> Season | None:
    """Renvoie la saison active, en clôturant automatiquement si nécessaire."""
    day = today or timezone.localdate()
    while True:
        season = Season.objects.filter(owner=user, status="ACTIVE").first()
        if season is None:
            return None
        if season.end_date >= day:
            return season
        # automatic close; if prolonged absence, close_season will create next starting today
        season, _next = close_season(season, today=day, automatic=True)
        # if next season also expired? unlikely given we set start=today, but guard
        if _next.end_date < day:
            # should not happen, but avoid infinite loop by returning None-safe
            continue
        return _next
