"""Tests du moteur des saisons (phase 2)."""

from __future__ import annotations

from datetime import timedelta

import pytest
from django.utils import timezone

from apps.quests.models import Quest
from apps.seasons.models import Season
from engine.exceptions import SeasonError
from engine.seasons import close_season, create_season, current_season, update_season
from engine.services import complete_quest, create_quest

pytestmark = pytest.mark.django_db


def test_create_season_default_end_date(world, character) -> None:
    today = timezone.localdate()
    season = create_season(character.user, {"start_date": today, "objectives": []})
    assert season.end_date == today + timedelta(days=89)
    assert season.number == 1


def test_refuse_second_active_season(world, character) -> None:
    today = timezone.localdate()
    create_season(character.user, {"start_date": today, "objectives": []})
    with pytest.raises(SeasonError, match="Une saison est déjà en cours."):
        create_season(character.user, {"start_date": today + timedelta(days=1), "objectives": []})


def test_automatic_close_and_next_opens(world, character) -> None:
    today = timezone.localdate()
    start = today - timedelta(days=10)
    season = create_season(
        character.user,
        {
            "start_date": start,
            "objectives": [{"title": "Principal", "is_main": True}],
        },
    )

    quest = create_quest(
        character.user,
        {"title": "Q", "territory": "KNOWLEDGE", "quest_type": "SIDE", "difficulty": "MEDIUM"},
    )
    complete_quest(quest, today=start + timedelta(days=2))

    next_day = season.end_date + timedelta(days=1)
    active = current_season(character.user, today=next_day)
    assert active is not None
    assert active.number == 2
    assert active.start_date == next_day

    old = Season.objects.get(pk=season.pk)
    assert old.status == "CLOSED"
    assert old.summary["xp_total"] == 30


def test_early_close_next_starts_today(world, character) -> None:
    today = timezone.localdate()
    season = create_season(
        character.user, {"start_date": today - timedelta(days=5), "objectives": []}
    )
    closed, nxt = close_season(season, today=today)
    assert closed.status == "CLOSED"
    assert nxt.start_date == today
    assert nxt.status == "ACTIVE"


def test_prolonged_absence_starts_today(world, character) -> None:
    today = timezone.localdate()
    create_season(character.user, {"start_date": today - timedelta(days=220), "objectives": []})
    check_day = today
    active = current_season(character.user, today=check_day)
    assert active is not None
    assert active.start_date == check_day
    assert Season.objects.filter(owner=character.user).count() == 2


def test_objective_limits(world, character) -> None:
    today = timezone.localdate()
    with pytest.raises(SeasonError, match="objectif principal"):
        create_season(
            character.user,
            {
                "start_date": today,
                "objectives": [
                    {"title": "A", "is_main": True},
                    {"title": "B", "is_main": True},
                ],
            },
        )
    with pytest.raises(SeasonError, match="objectifs secondaires"):
        create_season(
            character.user,
            {
                "start_date": today,
                "objectives": [{"title": f"S{i}", "is_main": False} for i in range(4)],
            },
        )


def test_quest_attached_to_active_season(world, character) -> None:
    today = timezone.localdate()
    season = create_season(character.user, {"start_date": today, "objectives": []})
    quest = create_quest(
        character.user,
        {"title": "Q", "territory": "KNOWLEDGE", "quest_type": "SIDE", "difficulty": "EASY"},
    )
    assert quest.season_id == season.id


def test_close_does_not_delete_data(world, character) -> None:
    today = timezone.localdate()
    season = create_season(
        character.user, {"start_date": today - timedelta(days=5), "objectives": []}
    )
    quest = create_quest(
        character.user,
        {"title": "Q", "territory": "KNOWLEDGE", "quest_type": "SIDE", "difficulty": "EASY"},
    )

    complete_quest(quest, today=today - timedelta(days=1))
    close_season(season, today=today)
    from apps.quests.models import QuestCompletion

    assert QuestCompletion.objects.filter(quest=quest).count() == 1
    quest.refresh_from_db()
    assert Quest.objects.filter(pk=quest.pk).exists()


def test_update_season_toggle_objective(world, character) -> None:
    today = timezone.localdate()
    season = create_season(
        character.user,
        {
            "start_date": today,
            "objectives": [{"title": "Obj", "is_main": True}],
        },
    )
    obj = season.objectives.first()
    update_season(season, {"objectives": [{"id": obj.id, "is_done": True}]})
    obj.refresh_from_db()
    assert obj.is_done is True
