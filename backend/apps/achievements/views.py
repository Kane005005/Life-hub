"""Vues des succès."""

from drf_spectacular.utils import extend_schema
from rest_framework.request import Request
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.achievements.serializers import AchievementSerializer
from engine.achievements import achievements_for
from engine.services import ensure_character


class AchievementListView(APIView):
    """Liste des succès du personnage connecté."""

    @extend_schema(responses=AchievementSerializer(many=True))
    def get(self, request: Request) -> Response:
        """Renvoie tous les succès avec leur état."""
        character = ensure_character(request.user)
        return Response(achievements_for(character))
