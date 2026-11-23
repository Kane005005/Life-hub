"""Modèles des saisons et de leurs objectifs (phase 2)."""

from uuid import uuid4

from django.conf import settings
from django.db import models
from django.db.models import Q


class SeasonStatus(models.TextChoices):
    """Statut d'une saison."""

    ACTIVE = "ACTIVE", "Active"
    CLOSED = "CLOSED", "Close"


class Season(models.Model):
    """Saison de progression d'un joueur."""

    uuid = models.UUIDField(default=uuid4, unique=True, editable=False)
    owner = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="seasons",
    )
    number = models.PositiveIntegerField(default=1)
    name = models.CharField(max_length=120)
    theme = models.CharField(max_length=200, blank=True, default="")
    status = models.CharField(
        max_length=20,
        choices=SeasonStatus.choices,
        default=SeasonStatus.ACTIVE,
    )
    start_date = models.DateField()
    end_date = models.DateField()
    closed_at = models.DateTimeField(null=True, blank=True)
    priority_territories = models.ManyToManyField(
        "world.Territory",
        related_name="priority_seasons",
        blank=True,
    )
    summary = models.JSONField(default=dict, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=["owner"],
                condition=Q(status="ACTIVE"),
                name="unique_active_season_per_owner",
            ),
        ]
        ordering = ["-start_date", "-number"]

    def __str__(self) -> str:
        return self.name


class SeasonObjective(models.Model):
    """Objectif lié à une saison."""

    season = models.ForeignKey(
        Season,
        on_delete=models.CASCADE,
        related_name="objectives",
    )
    title = models.CharField(max_length=200)
    is_main = models.BooleanField(default=False)
    is_done = models.BooleanField(default=False)
    order = models.PositiveIntegerField(default=0)

    class Meta:
        ordering = ["order", "id"]

    def __str__(self) -> str:
        return self.title
