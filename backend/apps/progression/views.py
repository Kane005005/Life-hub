"""Vues de la progression, des historiques et des paramètres du jeu."""

from drf_spectacular.utils import extend_schema
from rest_framework.generics import ListAPIView
from rest_framework.request import Request
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.progression.models import GameSettings, XPTransaction
from apps.progression.serializers import (
    GameSettingsSerializer,
    ProgressionSerializer,
    SkillPointsResponseSerializer,
    SkillPointTransactionSerializer,
    XPTransactionSerializer,
)
from apps.skills.models import SkillPointTransaction
from engine.services import character_snapshot, ensure_character


class ProgressionView(APIView):
    """Résumé de la progression générale du personnage."""

    @extend_schema(responses=ProgressionSerializer)
    def get(self, request: Request) -> Response:
        """Renvoie niveau, rang, XP et points de compétence."""
        snapshot = character_snapshot(ensure_character(request.user))
        keys = ("level", "xp_in_level", "xp_required", "total_xp", "rank", "skill_points")
        return Response({key: snapshot[key] for key in keys})


class XPHistoryView(ListAPIView):
    """Historique paginé des gains d'XP du personnage."""

    serializer_class = XPTransactionSerializer

    def get_queryset(self):
        """Ne renvoie que les transactions du personnage connecté."""
        character = ensure_character(self.request.user)
        return (
            XPTransaction.objects.filter(character=character)
            .select_related(
                "territory",
                "quest_completion__quest",
            )
            .order_by("-created_at", "-id")
        )


class SkillPointsView(APIView):
    """Solde et historique des points de compétence."""

    @extend_schema(responses=SkillPointsResponseSerializer)
    def get(self, request: Request) -> Response:
        """Renvoie le solde et les transactions de points."""
        character = ensure_character(request.user)
        transactions = SkillPointTransaction.objects.filter(character=character).order_by(
            "-created_at", "-id"
        )
        return Response(
            {
                "available": character.skill_points_available,
                "spent": character.skill_points_spent,
                "transactions": SkillPointTransactionSerializer(transactions, many=True).data,
            },
        )


class GameSettingsView(APIView):
    """Paramètres du jeu, exposés en lecture seule."""

    @extend_schema(responses=GameSettingsSerializer)
    def get(self, request: Request) -> Response:
        """Renvoie les barèmes et seuils utilisés par le moteur."""
        return Response(GameSettingsSerializer(GameSettings.load()).data)
