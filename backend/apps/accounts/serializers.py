"""Sérialiseurs de l'authentification par jeton."""

from django.contrib.auth import get_user_model
from rest_framework import serializers


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


class LoginResponseSerializer(serializers.Serializer):
    """Jeton créé et identité du compte connecté."""

    token = serializers.CharField()
    user = UserSerializer()
