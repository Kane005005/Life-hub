"""Moteur des succès : définition, attribution et consultation."""

from __future__ import annotations

from typing import TYPE_CHECKING

from django.db import IntegrityError, transaction

from apps.achievements.models import Achievement, PlayerAchievement
from apps.quests.models import QuestCompletion
from engine.events import log_event

if TYPE_CHECKING:
    from apps.character.models import Character

DEFAULT_ACHIEVEMENTS: list[dict] = [
    {
        "code": "FIRST_QUEST",
        "name": "First Quest",
        "label": "Premier pas",
        "description": "Valider une première mission.",
        "condition": {"count": 1},
        "order": 1,
    },
    {
        "code": "FIRST_BOSS",
        "name": "First Boss",
        "label": "Premier boss",
        "description": "Valider une première mission de type boss.",
        "condition": {"quest_type": "BOSS", "count": 1},
        "order": 2,
    },
    {
        "code": "KNOWLEDGE_SEEKER",
        "name": "Knowledge Seeker",
        "label": "Chercheur de savoir",
        "description": "Valider cinq missions dans le territoire Savoir.",
        "condition": {"territory": "KNOWLEDGE", "count": 5},
        "order": 3,
    },
    {
        "code": "CREATOR",
        "name": "Creator",
        "label": "Créateur",
        "description": "Valider une première mission dans le territoire Création.",
        "condition": {"territory": "CREATION", "count": 1},
        "order": 4,
    },
    {
        "code": "EXPLORER",
        "name": "Explorer",
        "label": "Explorateur",
        "description": "Valider une première mission secondaire.",
        "condition": {"quest_type": "SIDE", "count": 1},
        "order": 5,
    },
]


def seed_achievements() -> None:
    """Crée ou met à jour les succès par défaut."""
    for data in DEFAULT_ACHIEVEMENTS:
        Achievement.objects.update_or_create(
            code=data["code"],
            defaults={
                "name": data["name"],
                "label": data["label"],
                "description": data["description"],
                "condition": data["condition"],
                "order": data["order"],
                "is_active": True,
            },
        )


def _completion_queryset(character: Character, condition: dict):
    qs = QuestCompletion.objects.filter(quest__owner_id=character.user_id)
    quest_type = condition.get("quest_type")
    territory = condition.get("territory")
    if quest_type:
        qs = qs.filter(quest__quest_type=quest_type)
    if territory:
        qs = qs.filter(quest__territory__code=territory)
    return qs


@transaction.atomic
def evaluate_achievements(character: Character) -> list[PlayerAchievement]:
    """Attribue les succès nouvellement atteints, une seule fois chacun."""
    unlocked_ids = set(
        PlayerAchievement.objects.filter(character=character).values_list(
            "achievement_id", flat=True
        )
    )
    newly_unlocked: list[PlayerAchievement] = []
    for achievement in Achievement.objects.filter(is_active=True).order_by("order", "id"):
        if achievement.id in unlocked_ids:
            continue
        count = int(achievement.condition.get("count", 1))
        if _completion_queryset(character, achievement.condition).count() < count:
            continue
        try:
            with transaction.atomic():
                player_achievement = PlayerAchievement.objects.create(
                    character=character,
                    achievement=achievement,
                )
        except IntegrityError:
            continue
        log_event(
            character.user,
            "ACHIEVEMENT_UNLOCKED",
            f"Succès débloqué : {achievement.label}.",
            payload={"achievement": achievement.code},
        )
        newly_unlocked.append(player_achievement)
    return newly_unlocked


def achievements_for(character: Character) -> list[dict]:
    """Renvoie la liste des succès avec leur état pour le personnage."""
    unlocked = {
        item.achievement_id: item.unlocked_at
        for item in PlayerAchievement.objects.filter(character=character).select_related(
            "achievement"
        )
    }
    result = []
    for achievement in Achievement.objects.filter(is_active=True).order_by("order", "id"):
        unlocked_at = unlocked.get(achievement.id)
        result.append(
            {
                "code": achievement.code,
                "name": achievement.name,
                "label": achievement.label,
                "description": achievement.description,
                "unlocked": unlocked_at is not None,
                "unlocked_at": unlocked_at,
            }
        )
    return result
