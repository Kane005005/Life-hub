"""Sérialiseurs des territoires et de la progression du monde."""

from rest_framework import serializers

from apps.progression.serializers import RankSerializer
from apps.quests.serializers import QuestSerializer


class TerritoryStatSerializer(serializers.Serializer):
    """Statistique d'un territoire pour un personnage."""

    id = serializers.IntegerField()
    code = serializers.CharField()
    stat_code = serializers.CharField()
    name = serializers.CharField()
    english = serializers.CharField()
    place = serializers.CharField()
    domain = serializers.CharField()
    color = serializers.CharField()
    total_xp = serializers.IntegerField()
    stat = serializers.IntegerField()
    stat_display = serializers.IntegerField()
    state = serializers.CharField()
    active_quests = serializers.IntegerField()


class TerritoryDetailSerializer(TerritoryStatSerializer):
    """Statistique d'un territoire avec ses missions actives."""

    quests = QuestSerializer(many=True, read_only=True)


class WorldProgressSerializer(serializers.Serializer):
    """Résumé de progression affiché sur la page Monde."""

    level = serializers.IntegerField()
    xp_in_level = serializers.IntegerField()
    xp_required = serializers.IntegerField()
    total_xp = serializers.IntegerField()
    rank = RankSerializer()
    territories = TerritoryStatSerializer(many=True)
