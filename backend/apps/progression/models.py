"""Modèles de la progression et de l'expérience (phase 1)."""

from __future__ import annotations

from uuid import uuid4

from django.core.validators import MinValueValidator
from django.db import models

from engine.rules import DIFFICULTY_XP_DEFAULT, RANKS_DEFAULT, STATE_THRESHOLDS_DEFAULT


def default_xp_by_difficulty() -> dict[str, int]:
    """Renvoie une copie indépendante du barème d'XP par difficulté."""
    return dict(DIFFICULTY_XP_DEFAULT)


def default_state_thresholds() -> dict[str, int]:
    """Renvoie une copie indépendante des seuils d'état des territoires."""
    return dict(STATE_THRESHOLDS_DEFAULT)


def default_ranks() -> list[dict[str, int | str]]:
    """Renvoie une copie indépendante de la liste des rangs."""
    return [dict(rank) for rank in RANKS_DEFAULT]


class GameSettings(models.Model):
    """Paramètres uniques du jeu, enregistrés sous la clé primaire 1."""

    xp_by_difficulty = models.JSONField(default=default_xp_by_difficulty)
    credits_per_xp = models.PositiveIntegerField(default=1)
    skill_points_per_level = models.PositiveIntegerField(default=1)
    territory_stat_divisor = models.PositiveIntegerField(
        default=10, validators=[MinValueValidator(1)]
    )
    territory_stat_display_max = models.PositiveIntegerField(default=100)
    territory_state_thresholds = models.JSONField(default=default_state_thresholds)
    ranks = models.JSONField(default=default_ranks)
    season_length_days = models.PositiveIntegerField(
        default=90,
        validators=[MinValueValidator(1)],
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self) -> str:
        return "Paramètres du jeu"

    @classmethod
    def load(cls) -> GameSettings:
        """Renvoie les paramètres du jeu, en les créant au besoin."""
        instance, _ = cls.objects.get_or_create(pk=1)
        return instance


class XPTransaction(models.Model):
    """Attribution d'XP liée de façon unique à une validation de mission."""

    uuid = models.UUIDField(default=uuid4, unique=True, editable=False)
    character = models.ForeignKey(
        "character.Character",
        on_delete=models.PROTECT,
        related_name="xp_transactions",
    )
    amount = models.PositiveIntegerField()
    territory = models.ForeignKey(
        "world.Territory",
        on_delete=models.PROTECT,
        related_name="xp_transactions",
    )
    quest_completion = models.OneToOneField(
        "quests.QuestCompletion",
        on_delete=models.PROTECT,
        related_name="xp_transaction",
    )
    level_before = models.PositiveIntegerField()
    level_after = models.PositiveIntegerField()
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self) -> str:
        return f"+{self.amount} XP"
