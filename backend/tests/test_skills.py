"""Tests du moteur de compétences (phase 2)."""

from __future__ import annotations

from datetime import date, timedelta

import pytest

from apps.character.models import Character
from apps.journal.models import JournalEntry
from apps.skills.models import Skill, SkillPointTransaction, SkillUnlock
from engine.exceptions import AlreadyUnlocked, QuestStateError, SkillLockedError
from engine.seed import seed_world
from engine.services import complete_quest, create_quest
from engine.skills import branch_validated_count, load_skill_tree, unlock_skill

pytestmark = pytest.mark.django_db


def make_daily(user, territory="KNOWLEDGE", skill_branch="reading"):
    return create_quest(
        user,
        {
            "title": "Lecture",
            "territory": territory,
            "quest_type": "DAILY",
            "difficulty": "EASY",
            "skill_branch": skill_branch,
        },
    )


def test_load_skill_tree_counts_and_idempotent(db: None) -> None:
    seed_world()
    result = load_skill_tree()
    assert result == {"trees": 6, "branches": 18, "skills": 72}
    result2 = load_skill_tree()
    assert result2 == {"trees": 6, "branches": 18, "skills": 72}
    assert Skill.objects.count() == 72


def test_unlock_tier_one_with_point(world: None, character: Character) -> None:
    load_skill_tree()
    character.skill_points_available = 1
    character.save(update_fields=["skill_points_available"])

    result = unlock_skill(character, "knowledge.reading.t1")

    character.refresh_from_db()
    assert character.skill_points_available == 0
    assert character.skill_points_spent == 1
    assert result["skill"]["state"] == "UNLOCKED"
    assert result["message"] == "Compétence débloquée : Lecteur régulier."
    tx = SkillPointTransaction.objects.get(character=character, kind="SPEND")
    assert tx.amount == 1
    assert tx.reason == "Compétence débloquée : Lecteur régulier."
    assert tx.balance_after == 0
    assert SkillUnlock.objects.filter(
        character=character, skill__code="knowledge.reading.t1"
    ).exists()
    assert JournalEntry.objects.filter(owner=character.user, event_type="SKILL_UNLOCKED").exists()


def test_unlock_refused_missing_points_stats_prereq_and_validations(
    world: None, character: Character
) -> None:
    load_skill_tree()

    with pytest.raises(SkillLockedError) as exc:
        unlock_skill(character, "knowledge.reading.t2")

    message = str(exc.value)
    assert "Impossible de débloquer Lecteur critique." in message
    assert "Il te manque 1 point(s) de compétence." in message
    assert "Débloque d'abord Lecteur régulier." in message
    assert "Statistique Savoir : 15 requise, 0 actuelle." in message
    assert "Il te manque 3 validations dans Lecture & culture." in message


def test_daily_validations_each_count(world: None, character: Character) -> None:
    load_skill_tree()
    quest = make_daily(character.user)
    day = date(2026, 11, 20)
    for i in range(3):
        complete_quest(quest, today=day + timedelta(days=i))
    assert branch_validated_count(character, "reading") == 3


def test_double_unlock_refused_and_single_debit(world: None, character: Character) -> None:
    load_skill_tree()
    character.skill_points_available = 2
    character.save(update_fields=["skill_points_available"])
    unlock_skill(character, "knowledge.reading.t1")
    with pytest.raises(AlreadyUnlocked, match="Compétence déjà débloquée."):
        unlock_skill(character, "knowledge.reading.t1")
    character.refresh_from_db()
    assert character.skill_points_available == 1
    assert character.skill_points_spent == 1
    assert SkillPointTransaction.objects.filter(character=character, kind="SPEND").count() == 1


def test_skill_branch_must_belong_to_territory(world: None, character: Character) -> None:
    load_skill_tree()
    with pytest.raises(QuestStateError, match="Branche de compétence inconnue pour ce territoire."):
        create_quest(
            character.user,
            {
                "title": "Mauvaise branche",
                "territory": "BODY",
                "quest_type": "SIDE",
                "difficulty": "EASY",
                "skill_branch": "reading",
            },
        )
