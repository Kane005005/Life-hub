"""Vues du monde, des territoires et de la progression du monde."""

from drf_spectacular.utils import extend_schema
from rest_framework.exceptions import NotFound
from rest_framework.request import Request
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.quests.models import Quest
from apps.quests.serializers import QuestSerializer
from apps.world.serializers import (
    TerritoryDetailSerializer,
    TerritoryStatSerializer,
    WorldProgressSerializer,
)
from engine.services import ACTIVE_STATUSES, character_snapshot, ensure_character, territory_stats


class TerritoryListView(APIView):
    """Liste non paginée des six statistiques de territoire."""

    @extend_schema(responses=TerritoryStatSerializer(many=True))
    def get(self, request: Request) -> Response:
        """Renvoie les six territoires du personnage."""
        character = ensure_character(request.user)
        return Response(territory_stats(character))


class TerritoryDetailView(APIView):
    """Statistique d'un territoire avec ses missions actives."""

    @extend_schema(responses=TerritoryDetailSerializer)
    def get(self, request: Request, pk: int) -> Response:
        """Renvoie le territoire demandé et les missions encore actives."""
        character = ensure_character(request.user)
        matching = [stat for stat in territory_stats(character) if stat["id"] == pk]
        if not matching:
            raise NotFound("Territoire introuvable.")
        data = dict(matching[0])
        quests = Quest.objects.filter(
            owner=request.user,
            territory_id=pk,
            status__in=ACTIVE_STATUSES,
        ).prefetch_related("steps")
        data["quests"] = QuestSerializer(quests, many=True).data
        return Response(data)


class WorldProgressView(APIView):
    """Résumé de progression affiché sur la page Monde."""

    @extend_schema(responses=WorldProgressSerializer)
    def get(self, request: Request) -> Response:
        """Renvoie le niveau, le rang et les territoires du personnage."""
        snapshot = character_snapshot(ensure_character(request.user))
        keys = ("level", "xp_in_level", "xp_required", "total_xp", "rank")
        data = {key: snapshot[key] for key in keys}
        data["territories"] = snapshot["stats"]
        return Response(data)
