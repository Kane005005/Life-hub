"""Sérialiseurs des bilans énergétiques et de l'analyse par règles."""

from rest_framework import serializers

from apps.analytics.models import EnergyCheckIn
from engine.energy import ENERGY_LABELS


class EnergyCheckInSerializer(serializers.Serializer):
    """Bilan énergétique renvoyé par l'API, avec son libellé français."""

    id = serializers.IntegerField()
    level = serializers.IntegerField()
    label = serializers.SerializerMethodField()
    note = serializers.CharField()
    date = serializers.DateField()
    created_at = serializers.DateTimeField()

    def get_label(self, obj: EnergyCheckIn | dict) -> str:
        """Renvoie le libellé du niveau sur l'échelle du cahier §8.3."""
        level = obj["level"] if isinstance(obj, dict) else obj.level
        return ENERGY_LABELS[level]


class EnergyCheckInInputSerializer(serializers.Serializer):
    """Données acceptées pour enregistrer le bilan du jour."""

    level = serializers.IntegerField(min_value=1, max_value=5)
    note = serializers.CharField(required=False, allow_blank=True, default="")


class InsightEnergySerializer(serializers.Serializer):
    """Dernier bilan énergétique résumé dans l'analyse."""

    level = serializers.IntegerField()
    label = serializers.CharField()
    date = serializers.DateField()


class InsightLoadSerializer(serializers.Serializer):
    """Charge de missions actives du joueur."""

    active_quests = serializers.IntegerField()
    hard_quests = serializers.IntegerField()
    overdue = serializers.IntegerField()


class NeglectedTerritorySerializer(serializers.Serializer):
    """Territoire sans XP depuis au moins 14 jours (ou jamais)."""

    code = serializers.CharField()
    days_since_xp = serializers.IntegerField(allow_null=True)


class InsightSuggestionSerializer(serializers.Serializer):
    """Suggestion en lecture seule : elle ne change rien."""

    kind = serializers.CharField()
    message = serializers.CharField()


class InsightsSerializer(serializers.Serializer):
    """Analyse de progression par règles fixes."""

    generated_at = serializers.DateTimeField()
    energy = InsightEnergySerializer(allow_null=True)
    load = InsightLoadSerializer()
    neglected_territories = NeglectedTerritorySerializer(many=True)
    suggestions = InsightSuggestionSerializer(many=True)
