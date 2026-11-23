"""Modèles de l'économie et des transactions de crédits (phase 1)."""

from uuid import uuid4

from django.db import models


class CreditTransactionKind(models.TextChoices):
    """Sens d'une transaction de crédits."""

    EARN = "EARN", "Gain"
    SPEND = "SPEND", "Dépense"


class CreditTransaction(models.Model):
    """Historique des gains et dépenses de crédits du personnage."""

    uuid = models.UUIDField(default=uuid4, unique=True, editable=False)
    character = models.ForeignKey(
        "character.Character",
        on_delete=models.CASCADE,
        related_name="credit_transactions",
    )
    amount = models.IntegerField()
    kind = models.CharField(
        max_length=10,
        choices=CreditTransactionKind.choices,
        default=CreditTransactionKind.EARN,
    )
    reason = models.CharField(max_length=200, blank=True, default="")
    balance_after = models.PositiveIntegerField(default=0)
    quest_completion = models.ForeignKey(
        "quests.QuestCompletion",
        on_delete=models.PROTECT,
        related_name="credit_transactions",
        null=True,
        blank=True,
    )
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self) -> str:
        return f"{self.kind} : {self.amount} crédits"
