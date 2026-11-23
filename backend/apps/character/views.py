"""Vues du personnage et de son avatar."""

from drf_spectacular.utils import extend_schema
from rest_framework.request import Request
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.character.models import Character
from apps.character.serializers import (
    AvatarUpdateSerializer,
    CharacterSerializer,
    CharacterUpdateSerializer,
)
from engine.services import character_snapshot, ensure_character, update_avatar, update_character


class CharacterView(APIView):
    """Lecture et mise à jour du profil du personnage."""

    @extend_schema(responses=CharacterSerializer)
    def get(self, request: Request) -> Response:
        """Renvoie le personnage complet de l'utilisateur connecté."""
        character = ensure_character(request.user)
        return Response(character_snapshot(character))

    @extend_schema(request=CharacterUpdateSerializer, responses=CharacterSerializer)
    def patch(self, request: Request) -> Response:
        """Modifie les seules données de profil autorisées."""
        character = ensure_character(request.user)
        serializer = CharacterUpdateSerializer(data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        character = update_character(character, serializer.validated_data)
        return Response(character_snapshot(character))


class AvatarView(APIView):
    """Mise à jour de l'apparence de l'avatar."""

    @extend_schema(request=AvatarUpdateSerializer, responses=CharacterSerializer)
    def patch(self, request: Request) -> Response:
        """Modifie l'avatar puis renvoie le personnage complet."""
        character = ensure_character(request.user)
        serializer = AvatarUpdateSerializer(data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        update_avatar(character, serializer.validated_data)
        character = Character.objects.select_related("avatar").get(pk=character.pk)
        return Response(character_snapshot(character))
