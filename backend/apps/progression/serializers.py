"""Sérialiseurs de la progression, des historiques et des paramètres."""

from rest_framework import serializers

from apps.progression.models import GameSettings, XPTransaction
from apps.skills.models import SkillPointTransaction


class RankSerializer(serializers.Serializer):
    """Rang du personnage, avec son libellé français."""

    code = serializers.CharField()
    label = serializers.CharField()


class SkillPointsSerializer(serializers.Serializer):
    """Points de compétence disponibles et dépensés."""

    available = serializers.IntegerField()
    spent = serializers.IntegerField()


class ProgressionSerializer(serializers.Serializer):
    """Résumé de progression générale du personnage."""

    level = serializers.IntegerField()
    xp_in_level = serializers.IntegerField()
    xp_required = serializers.IntegerField()
    total_xp = serializers.IntegerField()
    rank = RankSerializer()
    skill_points = SkillPointsSerializer()


class XPTransactionSerializer(serializers.ModelSerializer):
    """Ligne de l'historique des gains d'XP."""

    uuid = serializers.UUIDField(read_only=True)
    territory = serializers.CharField(source="territory.code", read_only=True)
    quest_title = serializers.CharField(source="quest_completion.quest.title", read_only=True)

    class Meta:
        model = XPTransaction
        fields = (
            "uuid",
            "amount",
            "territory",
            "level_before",
            "level_after",
            "quest_title",
            "created_at",
        )
        read_only_fields = ("amount", "level_before", "level_after", "created_at")


class SkillPointTransactionSerializer(serializers.ModelSerializer):
    """Ligne de l'historique des points de compétence."""

    class Meta:
        model = SkillPointTransaction
        fields = ("uuid", "amount", "kind", "reason", "balance_after", "created_at")
        read_only_fields = (
            "uuid",
            "amount",
            "kind",
            "reason",
            "balance_after",
            "created_at",
        )


class UnlockedSkillSerializer(serializers.Serializer):
    """Compétence débloquée renvoyée dans la progression."""

    code = serializers.CharField()
    name = serializers.CharField()
    territory = serializers.CharField()
    unlocked_at = serializers.DateTimeField()


class SkillPointsResponseSerializer(serializers.Serializer):
    """Solde de points, compétences débloquées et transactions."""

    available = serializers.IntegerField()
    spent = serializers.IntegerField()
    unlocked = UnlockedSkillSerializer(many=True)
    transactions = SkillPointTransactionSerializer(many=True)


class GameSettingsSerializer(serializers.ModelSerializer):
    """Paramètres du jeu exposés en lecture seule."""

    class Meta:
        model = GameSettings
        fields = (
            "xp_by_difficulty",
            "credits_per_xp",
            "skill_points_per_level",
            "territory_stat_divisor",
            "territory_stat_display_max",
            "territory_state_thresholds",
            "ranks",
        )
        read_only_fields = (
            "xp_by_difficulty",
            "credits_per_xp",
            "skill_points_per_level",
            "territory_stat_divisor",
            "territory_stat_display_max",
            "territory_state_thresholds",
            "ranks",
        )
