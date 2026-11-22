"""Tests d'intégration du Life Engine et de l'idempotence des récompenses."""

from __future__ import annotations

import io
import re
import sys
from datetime import date, timedelta
from pathlib import Path

import pytest
from django.contrib.auth import get_user_model
from django.core.management import call_command

from apps.accounts.models import User
from apps.character.models import Character
from apps.economy.models import CreditTransaction
from apps.journal.models import JournalEntry
from apps.progression.models import GameSettings, XPTransaction
from apps.quests.models import Quest, QuestCompletion
from apps.skills.models import SkillPointTransaction
from apps.world.models import TerritoryProgress
from engine.exceptions import AlreadyCompleted, QuestStateError
from engine.services import (
    abandon_quest,
    accept_quest,
    character_snapshot,
    complete_quest,
    create_quest,
    record_rest,
    territory_stats,
    toggle_step,
    update_quest,
)

pytestmark = pytest.mark.django_db


def make_quest(
    user: User,
    *,
    territory: str = "KNOWLEDGE",
    quest_type: str = "SIDE",
    difficulty: str = "MEDIUM",
    steps: list[dict] | None = None,
) -> Quest:
    """Crée une mission de test avec les récompenses calculées par le moteur."""
    return create_quest(
        user,
        {
            "title": "Mission de test",
            "territory": territory,
            "quest_type": quest_type,
            "difficulty": difficulty,
        },
        steps=steps,
    )


def test_complete_quest_awards_xp_credits_and_logs(user: User, character: Character) -> None:
    quest = accept_quest(make_quest(user))
    result = complete_quest(quest, note="Fait")

    assert (result.xp, result.credits, result.territory) == (30, 30, "KNOWLEDGE")
    assert (result.level_before, result.level_after, result.levels_gained) == (1, 1, 0)
    assert result.skill_points_gained == 0
    assert result.message == "Mission validée. +30 XP en Savoir."
    assert result.level_message is None

    character.refresh_from_db()
    assert (character.total_xp, character.xp_in_level, character.credits) == (30, 30, 30)
    progress = TerritoryProgress.objects.get(character=character, territory__code="KNOWLEDGE")
    assert progress.total_xp == 30

    completion = QuestCompletion.objects.get(quest=quest)
    assert (completion.period_key, completion.note) == ("once", "Fait")
    assert (completion.xp_awarded, completion.credits_awarded) == (30, 30)
    assert XPTransaction.objects.filter(
        quest_completion=completion,
        amount=30,
        level_before=1,
        level_after=1,
    ).exists()
    assert CreditTransaction.objects.filter(
        kind="EARN",
        amount=30,
        balance_after=30,
        quest_completion=completion,
    ).exists()

    events = set(JournalEntry.objects.values_list("event_type", flat=True))
    assert {
        "QUEST_CREATED",
        "QUEST_ACCEPTED",
        "QUEST_COMPLETED",
        "XP_AWARDED",
        "CREDITS_EARNED",
    } <= events
    assert territory_stats(character)[0]["stat"] == 3


def test_side_quest_cannot_be_completed_twice(user: User, character: Character) -> None:
    quest = accept_quest(make_quest(user))
    complete_quest(quest)

    with pytest.raises(AlreadyCompleted, match="Mission déjà validée"):
        complete_quest(quest)

    assert XPTransaction.objects.count() == 1
    assert QuestCompletion.objects.count() == 1
    character.refresh_from_db()
    assert character.total_xp == 30
    assert character.xp_in_level == 30
    assert character.credits == 30


def test_daily_quest_is_completed_once_per_day(user: User, character: Character) -> None:
    quest = make_quest(user, quest_type="DAILY")
    day = date(2026, 11, 22)

    complete_quest(quest, today=day)
    with pytest.raises(AlreadyCompleted, match="aujourd'hui"):
        complete_quest(quest, today=day)

    result = complete_quest(quest, today=day + timedelta(days=1))
    assert result.xp == 30
    assert QuestCompletion.objects.filter(quest=quest).count() == 2
    quest.refresh_from_db()
    assert quest.status == "ACCEPTED"
    character.refresh_from_db()
    assert character.total_xp == 60


def test_weekly_quest_is_completed_once_per_iso_week(user: User) -> None:
    quest = make_quest(user, quest_type="WEEKLY")

    complete_quest(quest, today=date(2026, 11, 23))
    with pytest.raises(AlreadyCompleted, match="cette semaine"):
        complete_quest(quest, today=date(2026, 11, 27))

    result = complete_quest(quest, today=date(2026, 11, 30))
    assert result.xp == 30
    assert QuestCompletion.objects.filter(quest=quest).count() == 2
    assert set(QuestCompletion.objects.values_list("period_key", flat=True)) == {
        "2026-W48",
        "2026-W49",
    }


def test_level_up_with_carry_over(user: User, character: Character) -> None:
    character.level = 1
    character.xp_in_level = 90
    character.total_xp = 90
    character.save()

    result = complete_quest(accept_quest(make_quest(user)))

    assert (result.level_before, result.level_after, result.levels_gained) == (1, 2, 1)
    assert result.skill_points_gained == 1
    assert result.level_message == "Niveau 2 atteint. 150 XP pour le suivant."
    character.refresh_from_db()
    assert character.level == 2
    assert character.xp_in_level == 20
    assert character.skill_points_available == 1

    transaction = SkillPointTransaction.objects.get()
    assert (transaction.amount, transaction.kind, transaction.balance_after) == (1, "GAIN", 1)
    assert transaction.reason == "Niveau 2 atteint."
    assert JournalEntry.objects.filter(event_type="LEVEL_UP").count() == 1
    assert JournalEntry.objects.filter(event_type="SKILL_POINTS_EARNED").count() == 1


def test_legendary_quest_from_zero_reaches_level_two(user: User, character: Character) -> None:
    result = complete_quest(make_quest(user, difficulty="LEGENDARY"))

    assert (result.xp, result.level_after, result.levels_gained) == (200, 2, 1)
    assert result.skill_points_gained == 1
    character.refresh_from_db()
    assert character.xp_in_level == 100


def test_several_levels_give_one_skill_point_transaction_each(
    user: User,
    character: Character,
) -> None:
    settings = GameSettings.load()
    table = dict(settings.xp_by_difficulty)
    table["LEGENDARY"] = 500
    settings.xp_by_difficulty = table
    settings.save()

    result = complete_quest(make_quest(user, difficulty="LEGENDARY"))

    assert result.levels_gained == 3
    assert result.level_after == 4
    assert result.level_message == "Niveau 4 atteint. 250 XP pour le suivant."
    assert result.skill_points_gained == 3
    character.refresh_from_db()
    assert character.xp_in_level == 50
    assert [tx.reason for tx in SkillPointTransaction.objects.order_by("id")] == [
        "Niveau 2 atteint.",
        "Niveau 3 atteint.",
        "Niveau 4 atteint.",
    ]


def test_required_step_blocks_completion_until_done(user: User) -> None:
    quest = create_quest(
        user,
        {
            "title": "Mission à étapes",
            "territory": "BODY",
            "quest_type": "MAIN",
            "difficulty": "MEDIUM",
        },
        steps=[
            {"title": "Obligatoire"},
            {"title": "Facultative", "is_required": False},
        ],
    )

    with pytest.raises(QuestStateError, match=r"Il reste 1 étape\(s\) obligatoire\(s\)"):
        complete_quest(quest)

    step = quest.steps.get(is_required=True)
    toggle_step(step)
    step.refresh_from_db()
    assert step.is_done
    assert step.done_at is not None
    assert JournalEntry.objects.filter(event_type="QUEST_STEP_DONE").exists()

    result = complete_quest(quest)
    assert result.xp == 30

    with pytest.raises(QuestStateError, match="terminée"):
        toggle_step(step)


def test_optional_step_does_not_block_completion(user: User) -> None:
    quest = create_quest(
        user,
        {
            "title": "Mission simple",
            "territory": "CREATION",
            "quest_type": "SIDE",
            "difficulty": "EASY",
        },
        steps=[{"title": "Facultative", "is_required": False}],
    )
    result = complete_quest(quest)
    assert result.xp == 15


def test_abandon_keeps_xp_and_blocks_completion(user: User, character: Character) -> None:
    quest = accept_quest(make_quest(user))

    assert abandon_quest(quest).status == "ABANDONED"
    character.refresh_from_db()
    assert character.total_xp == 0
    assert character.credits == 0
    with pytest.raises(QuestStateError, match="abandonnée"):
        complete_quest(quest)
    assert XPTransaction.objects.count() == 0


def test_rest_changes_nothing(user: User, character: Character) -> None:
    complete_quest(accept_quest(make_quest(user)))
    before = character_snapshot(Character.objects.get(pk=character.pk))
    counts = (
        XPTransaction.objects.count(),
        CreditTransaction.objects.count(),
        SkillPointTransaction.objects.count(),
        JournalEntry.objects.count(),
    )

    entry = record_rest(user)

    assert entry.event_type == "REST"
    assert entry.message == "Repos enregistré. Ta progression est intacte."
    assert character_snapshot(Character.objects.get(pk=character.pk)) == before
    assert (
        XPTransaction.objects.count(),
        CreditTransaction.objects.count(),
        SkillPointTransaction.objects.count(),
        JournalEntry.objects.count(),
    ) == (counts[0], counts[1], counts[2], counts[3] + 1)


def test_game_settings_are_honoured(user: User, character: Character) -> None:
    settings = GameSettings.load()
    settings.credits_per_xp = 2
    table = dict(settings.xp_by_difficulty)
    table["MEDIUM"] = 42
    settings.xp_by_difficulty = table
    settings.save()

    quest = make_quest(user)
    assert (quest.xp_reward, quest.credit_reward) == (42, 84)
    result = complete_quest(quest)
    assert (result.xp, result.credits) == (42, 84)
    character.refresh_from_db()
    assert (character.total_xp, character.credits) == (42, 84)


def test_update_quest_ignores_server_fields_and_recomputes_rewards(user: User) -> None:
    quest = make_quest(user, difficulty="EASY")
    assert (quest.xp_reward, quest.credit_reward) == (15, 15)

    updated = update_quest(
        quest,
        {
            "title": "Nouveau titre",
            "difficulty": "HARD",
            "status": "COMPLETED",
            "origin": "AI",
            "xp_reward": 1,
        },
    )
    assert updated.title == "Nouveau titre"
    assert updated.status == "AVAILABLE"
    assert updated.origin == "USER"
    assert (updated.xp_reward, updated.credit_reward) == (60, 60)
    assert JournalEntry.objects.filter(event_type="QUEST_UPDATED").exists()

    result = complete_quest(updated)
    with pytest.raises(QuestStateError):
        update_quest(result.quest, {"title": "Trop tard"})


def test_character_snapshot_matches_api_contract(user: User, character: Character) -> None:
    make_quest(user)

    snapshot = character_snapshot(character)
    assert set(snapshot) == {
        "pseudonym",
        "bio",
        "character_class",
        "is_onboarded",
        "level",
        "xp_in_level",
        "xp_required",
        "total_xp",
        "rank",
        "credits",
        "skill_points",
        "avatar",
        "stats",
    }
    assert snapshot["rank"] == {"code": "INITIATE", "label": "Initié"}
    assert snapshot["avatar"] == {"silhouette": "A", "color": "#2FD08B", "accent": "#EDE9DF"}
    assert len(snapshot["stats"]) == 6

    knowledge = next(stat for stat in snapshot["stats"] if stat["code"] == "KNOWLEDGE")
    assert set(knowledge) == {
        "id",
        "code",
        "stat_code",
        "name",
        "english",
        "place",
        "domain",
        "color",
        "total_xp",
        "stat",
        "stat_display",
        "state",
        "active_quests",
    }
    assert (knowledge["stat"], knowledge["stat_display"], knowledge["state"]) == (
        0,
        0,
        "DISCOVERY",
    )
    assert knowledge["active_quests"] == 1


def test_create_player_creates_character_and_progress(
    monkeypatch: pytest.MonkeyPatch,
    world: None,
) -> None:
    monkeypatch.setattr(sys, "stdin", io.StringIO("mot-de-passe\n"))
    call_command(
        "create_player",
        "--username",
        "kane",
        "--password-stdin",
        stdout=io.StringIO(),
    )

    user = get_user_model().objects.get(username="kane")
    character = Character.objects.get(user=user)
    assert character.pseudonym == "kane"
    assert character.avatar.silhouette == "A"
    assert TerritoryProgress.objects.filter(character=character).count() == 6


def test_no_function_removes_progress() -> None:
    backend = Path(__file__).resolve().parents[1]
    forbidden = re.compile(r"(?:total_xp|xp_in_level|credits|level)\s*-=")
    sources = list((backend / "engine").rglob("*.py")) + list((backend / "apps").rglob("*.py"))
    for path in sources:
        assert not forbidden.search(path.read_text(encoding="utf-8")), (
            f"{path.name} modifie la progression à la baisse"
        )
