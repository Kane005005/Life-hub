"""Modèles du monde et des territoires (phase 1)."""

from django.db import models


class TerritoryCode(models.TextChoices):
    """Codes des six territoires du monde."""

    KNOWLEDGE = "KNOWLEDGE", "Savoir"
    BODY = "BODY", "Corps"
    CAREER = "CAREER", "Carrière"
    TECHNOLOGY = "TECHNOLOGY", "Technologie"
    CREATION = "CREATION", "Création"
    INNER_WORLD = "INNER_WORLD", "Monde intérieur"


class Territory(models.Model):
    """Territoire du monde, identifiable par son code et sa statistique."""

    code = models.CharField(max_length=20, choices=TerritoryCode.choices, unique=True)
    stat_code = models.CharField(max_length=3, unique=True)
    name = models.CharField(max_length=60)
    english = models.CharField(max_length=60)
    place = models.CharField(max_length=60)
    domain = models.CharField(max_length=120)
    color = models.CharField(max_length=7)
    order = models.PositiveIntegerField(default=0)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["order"]

    def __str__(self) -> str:
        return self.name


class TerritoryProgress(models.Model):
    """XP cumulée d'un personnage dans un territoire."""

    character = models.ForeignKey(
        "character.Character",
        on_delete=models.CASCADE,
        related_name="progress",
    )
    territory = models.ForeignKey(
        "world.Territory",
        on_delete=models.PROTECT,
        related_name="progress",
    )
    total_xp = models.PositiveIntegerField(default=0)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=["character", "territory"],
                name="unique_character_territory_progress",
            )
        ]

    def __str__(self) -> str:
        return f"{self.character.pseudonym} : {self.territory.name}"
