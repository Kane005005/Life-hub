"""Sérialiseurs de l'authentification par jeton."""

from django.contrib.auth import get_user_model
from django.core.exceptions import ValidationError as DjangoValidationError
from rest_framework import serializers

from apps.accounts.timezones import check_time_zone


class LoginSerializer(serializers.Serializer):
    """Identifiants acceptés par la route de connexion."""

    username = serializers.CharField(max_length=150)
    password = serializers.CharField(write_only=True)


class UserSerializer(serializers.ModelSerializer):
    """Identité minimale d'un compte renvoyée par l'API."""

    class Meta:
        model = get_user_model()
        fields = ("id", "username")
        read_only_fields = ("id", "username")


class MeSerializer(serializers.ModelSerializer):
    """Identité du compte connecté ; seul le fuseau horaire est modifiable."""

    time_zone = serializers.CharField(max_length=64)

    class Meta:
        model = get_user_model()
        fields = ("id", "username", "time_zone")
        read_only_fields = ("id", "username")

    def validate_time_zone(self, value: str) -> str:
        """Refuse un fuseau IANA inconnu avec le message du contrat."""
        try:
            check_time_zone(value)
        except DjangoValidationError:
            raise serializers.ValidationError("Fuseau horaire inconnu.") from None
        return value


class LoginResponseSerializer(serializers.Serializer):
    """Jeton créé et identité du compte connecté."""

    token = serializers.CharField()
    user = UserSerializer()
