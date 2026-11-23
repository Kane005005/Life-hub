"""Sérialiseurs des arbres de compétences et des déblocages."""

from rest_framework import serializers


class SkillNodeSerializer(serializers.Serializer):
    """Nœud de compétence dans un arbre."""

    code = serializers.CharField()
    name = serializers.CharField()
    tier = serializers.IntegerField()
    cost = serializers.IntegerField()
    requires = serializers.ListField(child=serializers.CharField())
    min_territory_stat = serializers.IntegerField()
    min_validated_quests = serializers.IntegerField()
    state = serializers.CharField()
    unlocked_at = serializers.DateTimeField(allow_null=True)
    missing = serializers.ListField(child=serializers.CharField())


class SkillBranchSerializer(serializers.Serializer):
    """Branche de compétences."""

    code = serializers.CharField()
    name = serializers.CharField()
    validated_quests = serializers.IntegerField()
    skills = SkillNodeSerializer(many=True)


class SkillTreeSerializer(serializers.Serializer):
    """Arbre de compétences d'un territoire."""

    territory = serializers.CharField()
    name = serializers.CharField()
    color = serializers.CharField()
    stat = serializers.IntegerField()
    branches = SkillBranchSerializer(many=True)


class SkillPointsBalanceSerializer(serializers.Serializer):
    """Solde de points de compétence."""

    available = serializers.IntegerField()
    spent = serializers.IntegerField()


class SkillUnlockResponseSerializer(serializers.Serializer):
    """Réponse du déblocage d'une compétence."""

    skill = SkillNodeSerializer()
    skill_points = SkillPointsBalanceSerializer()
    message = serializers.CharField()
