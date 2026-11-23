"""Vues du journal des événements et du repos."""

from drf_spectacular.utils import extend_schema
from rest_framework.generics import ListAPIView
from rest_framework.request import Request
from rest_framework.response import Response
from rest_framework.status import HTTP_201_CREATED
from rest_framework.views import APIView

from apps.journal.models import JournalEntry
from apps.journal.serializers import JournalEntrySerializer, RestResponseSerializer
from engine.services import record_rest


class JournalEntryListView(ListAPIView):
    """Historique paginé des événements de l'utilisateur connecté."""

    serializer_class = JournalEntrySerializer

    def get_queryset(self):
        """Filtre les événements sur le compte et le type demandé."""
        queryset = JournalEntry.objects.filter(owner=self.request.user).select_related("quest")
        event_type = self.request.query_params.get("event_type")
        if event_type:
            queryset = queryset.filter(event_type=event_type)
        return queryset


class RestView(APIView):
    """Enregistre un jour de repos sans modifier la progression."""

    @extend_schema(request=None, responses={201: RestResponseSerializer})
    def post(self, request: Request) -> Response:
        """Consigne l'événement REST et renvoie son message."""
        entry = record_rest(request.user)
        return Response({"message": entry.message}, status=HTTP_201_CREATED)
