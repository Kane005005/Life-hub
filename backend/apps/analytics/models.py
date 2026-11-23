"""Modèles d'analyse et de tendances (phases 2 et 3)."""

from django.conf import settings
from django.core.validators import MaxValueValidator, MinValueValidator
from django.db import models


class EnergyCheckIn(models.Model):
    """Bilan énergétique personnel d'un jour, sur l'échelle 1 à 5 du cahier §8.3.

    Un seul bilan par jour : le dernier de la journée remplace le précédent.
    """

    owner = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="energy_checkins",
    )
    level = models.PositiveIntegerField(
        validators=[MinValueValidator(1), MaxValueValidator(5)],
    )
    note = models.TextField(blank=True, default="")
    date = models.DateField()
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=["owner", "date"],
                name="unique_energy_checkin_per_owner_day",
            )
        ]
        ordering = ["-date", "-id"]

    def __str__(self) -> str:
        return f"{self.owner} : énergie {self.level} le {self.date}"
