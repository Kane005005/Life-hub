"""Modèles de l'économie, boutique, inventaire et équipement (phases 1 et 2)."""

from uuid import uuid4

from django.conf import settings
from django.core.validators import MinValueValidator
from django.db import models


class CreditTransactionKind(models.TextChoices):
    """Sens d'une transaction de crédits."""

    EARN = "EARN", "Gain"
    SPEND = "SPEND", "Dépense"


class ShopItemCategory(models.TextChoices):
    """Catégorie d'objet de la boutique."""

    REWARD = "REWARD", "Récompense"
    ARTIFACT = "ARTIFACT", "Artefact"


class EquipmentSlot(models.TextChoices):
    """Emplacement d'équipement cosmétique."""

    AURA = "AURA", "Aura"
    FRAME = "FRAME", "Cadre"
    EMBLEM = "EMBLEM", "Emblème"


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

    class Meta:
        ordering = ["-created_at"]

    def __str__(self) -> str:
        return f"{self.kind} : {self.amount} crédits"


class ShopItem(models.Model):
    """Objet disponible dans la boutique."""

    name = models.CharField(max_length=120)
    description = models.TextField(blank=True, default="")
    category = models.CharField(
        max_length=20,
        choices=ShopItemCategory.choices,
        default=ShopItemCategory.ARTIFACT,
    )
    slot = models.CharField(
        max_length=20,
        choices=EquipmentSlot.choices,
        blank=True,
        default="",
    )
    cost = models.PositiveIntegerField(validators=[MinValueValidator(1)])
    is_available = models.BooleanField(default=True)
    owner = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="custom_rewards",
        null=True,
        blank=True,
    )
    visual = models.JSONField(default=dict, blank=True)
    order = models.PositiveIntegerField(default=0)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["order", "id"]

    def __str__(self) -> str:
        return self.name


class RewardPurchase(models.Model):
    """Achat d'une récompense ou d'un artefact."""

    uuid = models.UUIDField(default=uuid4, unique=True, editable=False)
    character = models.ForeignKey(
        "character.Character",
        on_delete=models.CASCADE,
        related_name="reward_purchases",
    )
    item = models.ForeignKey(
        ShopItem,
        on_delete=models.PROTECT,
        related_name="purchases",
    )
    cost = models.PositiveIntegerField()
    credit_transaction = models.OneToOneField(
        CreditTransaction,
        on_delete=models.PROTECT,
        related_name="reward_purchase",
    )
    purchased_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-purchased_at"]

    def __str__(self) -> str:
        return f"{self.character.pseudonym} : {self.item.name}"


class InventoryItem(models.Model):
    """Objet possédé par un personnage."""

    character = models.ForeignKey(
        "character.Character",
        on_delete=models.CASCADE,
        related_name="inventory_items",
    )
    item = models.ForeignKey(
        ShopItem,
        on_delete=models.PROTECT,
        related_name="inventory_entries",
    )
    acquired_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=["character", "item"],
                name="unique_inventory_item_per_character",
            ),
        ]
        ordering = ["acquired_at"]

    def __str__(self) -> str:
        return f"{self.character.pseudonym} : {self.item.name}"


class Equipment(models.Model):
    """Objet équipé dans un emplacement cosmétique."""

    character = models.ForeignKey(
        "character.Character",
        on_delete=models.CASCADE,
        related_name="equipment",
    )
    slot = models.CharField(max_length=20, choices=EquipmentSlot.choices)
    item = models.ForeignKey(
        InventoryItem,
        on_delete=models.CASCADE,
        related_name="equipped_in",
    )

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=["character", "slot"],
                name="unique_equipment_slot_per_character",
            ),
        ]

    def __str__(self) -> str:
        return f"{self.character.pseudonym} : {self.slot}"
