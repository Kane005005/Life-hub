"""Modèles des succès (phase 2)."""

from uuid import uuid4

from django.db import models


class Achievement(models.Model):
    """Succès attribuable une seule fois par joueur."""

    code = models.CharField(max_length=40, unique=True)
    name = models.CharField(max_length=120)
    label = models.CharField(max_length=120)
    description = models.TextField(blank=True, default="")
    condition = models.JSONField(default=dict)
    order = models.PositiveIntegerField(default=0)
    is_active = models.BooleanField(default=True)

    class Meta:
        ordering = ["order", "id"]

    def __str__(self) -> str:
        return self.label


class PlayerAchievement(models.Model):
    """Attribution définitive d'un succès à un personnage."""

    uuid = models.UUIDField(default=uuid4, unique=True, editable=False)
    character = models.ForeignKey(
        "character.Character",
        on_delete=models.CASCADE,
        related_name="achievements",
    )
    achievement = models.ForeignKey(
        Achievement,
        on_delete=models.PROTECT,
        related_name="player_achievements",
    )
    unlocked_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=["character", "achievement"],
                name="unique_achievement_per_character",
            ),
        ]
        ordering = ["unlocked_at"]

    def __str__(self) -> str:
        return f"{self.character.pseudonym} : {self.achievement.label}"
