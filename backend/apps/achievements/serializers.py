"""Sérialiseurs des succès."""

from rest_framework import serializers


class AchievementSerializer(serializers.Serializer):
    """Succès avec état de déblocage pour le joueur."""

    code = serializers.CharField()
    name = serializers.CharField()
    label = serializers.CharField()
    description = serializers.CharField()
    unlocked = serializers.BooleanField()
    unlocked_at = serializers.DateTimeField(allow_null=True)
