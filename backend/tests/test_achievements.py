"""Tests du moteur de succès (phase 2)."""

from __future__ import annotations

import pytest

from apps.achievements.models import PlayerAchievement
from engine.achievements import seed_achievements
from engine.seed import seed_world
from engine.services import complete_quest, create_quest

pytestmark = pytest.mark.django_db


def complete(user, *, territory="KNOWLEDGE", quest_type="SIDE", difficulty="EASY"):
    quest = create_quest(
        user,
        {
            "title": "Mission",
            "territory": territory,
            "quest_type": quest_type,
            "difficulty": difficulty,
        },
    )
    return complete_quest(quest)


def test_achievements_at_exact_threshold(world, character) -> None:
    seed_achievements()
    for _ in range(4):
        complete(character.user, territory="KNOWLEDGE", quest_type="MAIN")
    assert not PlayerAchievement.objects.filter(
        character=character, achievement__code="KNOWLEDGE_SEEKER"
    ).exists()
    complete(character.user, territory="KNOWLEDGE", quest_type="MAIN")
    assert PlayerAchievement.objects.filter(
        character=character, achievement__code="KNOWLEDGE_SEEKER"
    ).exists()


def test_achievement_unlocked_once(world, character) -> None:
    seed_achievements()
    complete(character.user, territory="KNOWLEDGE", quest_type="SIDE")
    complete(character.user, territory="KNOWLEDGE", quest_type="MAIN")
    assert (
        PlayerAchievement.objects.filter(
            character=character, achievement__code="FIRST_QUEST"
        ).count()
        == 1
    )


def test_completion_result_has_achievements(world, character) -> None:
    seed_achievements()
    result = complete(character.user, territory="KNOWLEDGE", quest_type="SIDE")
    codes = {a["code"] for a in result.achievements}
    assert {"FIRST_QUEST", "EXPLORER"}.issubset(codes)
    # second completion should not return same achievements
    result2 = complete(character.user, territory="CREATION", quest_type="MAIN")
    codes2 = {a["code"] for a in result2.achievements}
    assert "FIRST_QUEST" not in codes2
    assert "CREATOR" in codes2


def test_seed_world_catches_up_without_duplicate(world, character) -> None:
    seed_achievements()
    complete(character.user, territory="KNOWLEDGE", quest_type="SIDE")
    # simulate missing PlayerAchievement by deleting it? easier: ensure seed_world evaluates
    PlayerAchievement.objects.filter(character=character).delete()
    seed_world()
    assert (
        PlayerAchievement.objects.filter(
            character=character, achievement__code="FIRST_QUEST"
        ).count()
        == 1
    )
    seed_world()
    assert (
        PlayerAchievement.objects.filter(
            character=character, achievement__code="FIRST_QUEST"
        ).count()
        == 1
    )
