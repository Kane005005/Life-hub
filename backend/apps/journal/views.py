"""Vues du journal des événements et du repos."""

from django.db.models import Q
from drf_spectacular.utils import OpenApiParameter, extend_schema
from rest_framework.generics import ListAPIView
from rest_framework.request import Request
from rest_framework.response import Response
from rest_framework.status import HTTP_201_CREATED, HTTP_400_BAD_REQUEST
from rest_framework.views import APIView

from apps.journal.models import JournalEntry
from apps.journal.serializers import (
    JournalEntrySerializer,
    JournalSummarySerializer,
    RestResponseSerializer,
)
from engine.journal import journal_summary
from engine.services import record_rest


class JournalEntryListView(ListAPIView):
    """Historique paginé des événements de l'utilisateur connecté."""

    serializer_class = JournalEntrySerializer

    @extend_schema(
        parameters=[
            OpenApiParameter(
                name="event_type", many=True, type=str, location=OpenApiParameter.QUERY
            ),
            OpenApiParameter(name="date_from", type=str, location=OpenApiParameter.QUERY),
            OpenApiParameter(name="date_to", type=str, location=OpenApiParameter.QUERY),
            OpenApiParameter(name="territory", type=str, location=OpenApiParameter.QUERY),
            OpenApiParameter(name="q", type=str, location=OpenApiParameter.QUERY),
        ],
        responses=JournalEntrySerializer(many=True),
    )
    def get(self, request: Request, *args: object, **kwargs: object) -> Response:
        """Renvoie la liste paginée filtrée du journal."""
        return super().get(request, *args, **kwargs)

    def get_queryset(self):
        """Filtre les événements sur le compte et les critères demandés."""
        queryset = JournalEntry.objects.filter(owner=self.request.user).select_related(
            "quest__territory"
        )
        params = self.request.query_params
        event_types = params.getlist("event_type")
        if event_types:
            queryset = queryset.filter(event_type__in=event_types)
        date_from = params.get("date_from")
        if date_from:
            queryset = queryset.filter(created_at__date__gte=date_from)
        date_to = params.get("date_to")
        if date_to:
            queryset = queryset.filter(created_at__date__lte=date_to)
        territory = params.get("territory")
        if territory:
            queryset = queryset.filter(quest__territory__code=territory)
        q = params.get("q")
        if q:
            queryset = queryset.filter(Q(message__icontains=q) | Q(quest__title__icontains=q))
        return queryset.order_by("-created_at", "-id")


class RestView(APIView):
    """Enregistre un jour de repos sans modifier la progression."""

    @extend_schema(request=None, responses={201: RestResponseSerializer})
    def post(self, request: Request) -> Response:
        """Consigne l'événement REST et renvoie son message."""
        entry = record_rest(request.user)
        return Response({"message": entry.message}, status=HTTP_201_CREATED)


class JournalSummaryView(APIView):
    """Résumé du journal sur une période."""

    @extend_schema(
        parameters=[
            OpenApiParameter(name="period", type=str, location=OpenApiParameter.QUERY),
        ],
        responses=JournalSummarySerializer,
    )
    def get(self, request: Request) -> Response:
        """Renvoie un résumé journalier hebdomadaire ou mensuel."""
        period = request.query_params.get("period", "week")
        if period not in {"week", "month"}:
            return Response(
                {"detail": "Période invalide. Utilise week ou month."},
                status=HTTP_400_BAD_REQUEST,
            )
        return Response(journal_summary(request.user, period=period))
