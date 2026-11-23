"""Vues des saisons."""

from django.shortcuts import get_object_or_404
from drf_spectacular.utils import extend_schema
from rest_framework.pagination import PageNumberPagination
from rest_framework.request import Request
from rest_framework.response import Response
from rest_framework.status import HTTP_201_CREATED, HTTP_404_NOT_FOUND, HTTP_409_CONFLICT
from rest_framework.views import APIView

from apps.seasons.models import Season
from apps.seasons.serializers import (
    SeasonCloseResponseSerializer,
    SeasonCreateSerializer,
    SeasonListResponseSerializer,
    SeasonSerializer,
    SeasonUpdateSerializer,
)
from engine.exceptions import SeasonError
from engine.seasons import (
    close_season,
    create_season,
    current_season,
    season_snapshot,
    update_season,
)


class SeasonListCreateView(APIView):
    """Liste et création des saisons du joueur."""

    @extend_schema(operation_id="seasons_list", responses=SeasonListResponseSerializer)
    def get(self, request: Request) -> Response:
        """Renvoie les saisons du joueur, la plus récente d'abord."""
        seasons = Season.objects.filter(owner=request.user).prefetch_related(
            "objectives", "priority_territories"
        )
        paginator = PageNumberPagination()
        page = paginator.paginate_queryset(seasons, request, view=self)
        data = [season_snapshot(season) for season in (page or seasons)]
        if page is not None:
            return paginator.get_paginated_response(data)
        return Response(data)

    @extend_schema(request=SeasonCreateSerializer, responses={201: SeasonSerializer})
    def post(self, request: Request) -> Response:
        """Crée une nouvelle saison."""
        serializer = SeasonCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        try:
            season = create_season(request.user, serializer.validated_data)
        except SeasonError as exc:
            if "objectif" in str(exc):
                return Response({"detail": str(exc)}, status=400)
            raise
        season = Season.objects.prefetch_related("objectives", "priority_territories").get(
            pk=season.pk
        )
        return Response(season_snapshot(season), status=HTTP_201_CREATED)


class SeasonCurrentView(APIView):
    """Saison active du joueur."""

    @extend_schema(responses=SeasonSerializer)
    def get(self, request: Request) -> Response:
        """Renvoie la saison active après clôture/ouverture automatiques."""
        season = current_season(request.user)
        if season is None:
            return Response({"detail": "Aucune saison active."}, status=HTTP_404_NOT_FOUND)
        season = Season.objects.prefetch_related("objectives", "priority_territories").get(
            pk=season.pk
        )
        return Response(season_snapshot(season))


class SeasonDetailView(APIView):
    """Détail et mise à jour d'une saison."""

    @extend_schema(responses=SeasonSerializer)
    def get(self, request: Request, pk: int) -> Response:
        """Renvoie une saison du joueur."""
        season = get_object_or_404(
            Season.objects.prefetch_related("objectives", "priority_territories"),
            pk=pk,
            owner=request.user,
        )
        return Response(season_snapshot(season))

    @extend_schema(request=SeasonUpdateSerializer, responses=SeasonSerializer)
    def patch(self, request: Request, pk: int) -> Response:
        """Met à jour une saison active."""
        season = get_object_or_404(Season, pk=pk, owner=request.user)
        if season.status == "CLOSED":
            return Response(
                {"detail": "Cette saison est terminée."},
                status=HTTP_409_CONFLICT,
            )
        serializer = SeasonUpdateSerializer(data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        try:
            season = update_season(season, serializer.validated_data)
        except SeasonError as exc:
            if "objectif" in str(exc):
                return Response({"detail": str(exc)}, status=400)
            raise
        season = Season.objects.prefetch_related("objectives", "priority_territories").get(
            pk=season.pk
        )
        return Response(season_snapshot(season))


class SeasonCloseView(APIView):
    """Clôture anticipée d'une saison."""

    @extend_schema(request=None, responses=SeasonCloseResponseSerializer)
    def post(self, request: Request, pk: int) -> Response:
        """Clôt la saison et ouvre la suivante."""
        season = get_object_or_404(Season, pk=pk, owner=request.user)
        closed, nxt = close_season(season)
        closed = Season.objects.prefetch_related("objectives", "priority_territories").get(
            pk=closed.pk
        )
        nxt = Season.objects.prefetch_related("objectives", "priority_territories").get(pk=nxt.pk)
        return Response({"closed": season_snapshot(closed), "next": season_snapshot(nxt)})
