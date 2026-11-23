"""Sérialiseurs du portefeuille et des transactions de crédits."""

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
