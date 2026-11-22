"""Modèles des points de compétence et de leurs transactions (phase 1)."""

from uuid import uuid4

from django.db import models


class SkillPointTransactionKind(models.TextChoices):
    """Sens d'une transaction de points de compétence."""

    GAIN = "GAIN", "Gain"
    SPEND = "SPEND", "Dépense"


class SkillPointTransaction(models.Model):
    """Historique des points de compétence gagnés ou dépensés."""

    uuid = models.UUIDField(default=uuid4, unique=True, editable=False)
    character = models.ForeignKey(
        "character.Character",
        on_delete=models.CASCADE,
        related_name="skill_point_transactions",
    )
    amount = models.IntegerField()
    kind = models.CharField(
        max_length=10,
        choices=SkillPointTransactionKind.choices,
        default=SkillPointTransactionKind.GAIN,
    )
    reason = models.CharField(max_length=200, blank=True, default="")
    balance_after = models.PositiveIntegerField(default=0)
    xp_transaction = models.ForeignKey(
        "progression.XPTransaction",
        on_delete=models.PROTECT,
        related_name="skill_point_transactions",
        null=True,
        blank=True,
    )
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self) -> str:
        return f"{self.kind} : {self.amount} points"
