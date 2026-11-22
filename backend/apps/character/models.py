"""Modèles du personnage (phase 1)."""

from django.conf import settings
from django.core.validators import RegexValidator
from django.db import models


class CharacterClass(models.TextChoices):
    """Orientations possibles du personnage."""

    ARCHITECT = "ARCHITECT", "Architecte"
    CREATOR = "CREATOR", "Créateur"
    EXPLORER = "EXPLORER", "Explorateur"
    STRATEGIST = "STRATEGIST", "Stratège"
    INNOVATOR = "INNOVATOR", "Innovateur"


class Silhouette(models.TextChoices):
    """Silhouettes minimalistes de l'avatar."""

    A = "A", "Silhouette A"
    B = "B", "Silhouette B"
    C = "C", "Silhouette C"


color_validator = RegexValidator(
    regex=r"^#[0-9A-Fa-f]{6}$",
    message="La couleur doit être au format #RRGGBB.",
)


class Character(models.Model):
    """Personnage d'un utilisateur : seule source de vérité de sa progression."""

    user = models.OneToOneField(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="character",
    )
    pseudonym = models.CharField(max_length=40)
    bio = models.TextField(blank=True, default="")
    character_class = models.CharField(
        max_length=20,
        choices=CharacterClass.choices,
        default=CharacterClass.EXPLORER,
    )
    is_onboarded = models.BooleanField(default=False)
    level = models.PositiveIntegerField(default=1)
    xp_in_level = models.PositiveIntegerField(default=0)
    total_xp = models.PositiveIntegerField(default=0)
    credits = models.PositiveIntegerField(default=0)
    skill_points_available = models.PositiveIntegerField(default=0)
    skill_points_spent = models.PositiveIntegerField(default=0)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self) -> str:
        return self.pseudonym


class AvatarConfiguration(models.Model):
    """Apparence minimaliste de l'avatar d'un personnage."""

    character = models.OneToOneField(
        "character.Character",
        on_delete=models.CASCADE,
        related_name="avatar",
    )
    silhouette = models.CharField(
        max_length=1,
        choices=Silhouette.choices,
        default=Silhouette.A,
    )
    color = models.CharField(
        max_length=7,
        default="#2FD08B",
        validators=[color_validator],
    )
    accent = models.CharField(
        max_length=7,
        default="#EDE9DF",
        validators=[color_validator],
    )
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self) -> str:
        return f"Avatar de {self.character.pseudonym}"
