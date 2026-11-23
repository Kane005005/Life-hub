"""Sérialiseurs de l'économie, boutique, inventaire et équipement."""

from rest_framework import serializers

from apps.economy.models import CreditTransaction


class WalletSerializer(serializers.Serializer):
    """Solde de crédits du personnage."""

    credits = serializers.IntegerField()


class CreditTransactionSerializer(serializers.ModelSerializer):
    """Ligne de l'historique des crédits."""

    class Meta:
        model = CreditTransaction
        fields = ("uuid", "amount", "kind", "reason", "balance_after", "created_at")
        read_only_fields = (
            "uuid",
            "amount",
            "kind",
            "reason",
            "balance_after",
            "created_at",
        )


class ShopItemSerializer(serializers.Serializer):
    """Objet boutique renvoyé par l'API."""

    id = serializers.IntegerField()
    name = serializers.CharField()
    description = serializers.CharField()
    category = serializers.CharField()
    slot = serializers.CharField(allow_null=True)
    cost = serializers.IntegerField()
    is_available = serializers.BooleanField()
    is_custom = serializers.BooleanField()
    visual = serializers.DictField()
    owned = serializers.BooleanField()
    equipped = serializers.BooleanField()
    purchases_count = serializers.IntegerField()


class RewardCreateSerializer(serializers.Serializer):
    """Création d'une récompense personnelle."""

    name = serializers.CharField(max_length=120)
    description = serializers.CharField(required=False, allow_blank=True, default="")
    cost = serializers.IntegerField(min_value=1)


class RewardUpdateSerializer(serializers.Serializer):
    """Mise à jour d'une récompense personnelle."""

    name = serializers.CharField(max_length=120, required=False)
    description = serializers.CharField(required=False, allow_blank=True)
    cost = serializers.IntegerField(min_value=1, required=False)
    is_available = serializers.BooleanField(required=False)


class PurchaseResponseSerializer(serializers.Serializer):
    """Réponse d'achat."""

    item = ShopItemSerializer()
    credits = serializers.IntegerField()
    message = serializers.CharField()


class InventoryPurchaseSerializer(serializers.Serializer):
    """Historique d'achat dans l'inventaire."""

    uuid = serializers.UUIDField()
    item_name = serializers.CharField()
    cost = serializers.IntegerField()
    purchased_at = serializers.DateTimeField()


class InventoryResponseSerializer(serializers.Serializer):
    """Inventaire du joueur."""

    items = ShopItemSerializer(many=True)
    purchases = InventoryPurchaseSerializer(many=True)
