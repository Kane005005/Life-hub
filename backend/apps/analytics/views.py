"""Vues des bilans énergétiques, de l'analyse et de l'export des données."""

from django.http import JsonResponse
from django.utils import timezone
from drf_spectacular.utils import OpenApiTypes, extend_schema
from rest_framework.generics import ListCreateAPIView
from rest_framework.request import Request
from rest_framework.response import Response
from rest_framework.status import HTTP_201_CREATED
from rest_framework.views import APIView

from apps.analytics.models import EnergyCheckIn
from apps.analytics.serializers import (
    EnergyCheckInInputSerializer,
    EnergyCheckInSerializer,
    InsightsSerializer,
)
from engine.energy import energy_snapshot, record_energy
from engine.export import export_user_data
from engine.insights import compute_insights


class EnergyListCreateView(ListCreateAPIView):
    """Bilans énergétiques paginés du joueur ; le POST remplace celui du jour."""

    serializer_class = EnergyCheckInSerializer

    def get_queryset(self):
        """Renvoie les bilans du compte connecté, du plus récent au plus ancien."""
        return EnergyCheckIn.objects.filter(owner=self.request.user)

    @extend_schema(operation_id="energy_list", responses=EnergyCheckInSerializer(many=True))
    def get(self, request: Request, *args: object, **kwargs: object) -> Response:
        """Renvoie la liste paginée des bilans énergétiques."""
        return super().get(request, *args, **kwargs)

    @extend_schema(
        operation_id="energy_create",
        request=EnergyCheckInInputSerializer,
        responses={201: EnergyCheckInSerializer},
    )
    def create(self, request: Request, *args: object, **kwargs: object) -> Response:
        """Enregistre le bilan du jour, en remplaçant celui déjà saisi."""
        serializer = EnergyCheckInInputSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        checkin = record_energy(
            request.user,
            serializer.validated_data["level"],
            serializer.validated_data.get("note", ""),
        )
        return Response(energy_snapshot(checkin), status=HTTP_201_CREATED)


class InsightsView(APIView):
    """Analyse de progression par règles, sans effet sur les données."""

    @extend_schema(operation_id="analytics_insights", responses=InsightsSerializer)
    def get(self, request: Request) -> Response:
        """Renvoie charge, territoires négligés et suggestions du jour."""
        return Response(compute_insights(request.user))


class ExportView(APIView):
    """Export JSON complet des données du joueur, à télécharger."""

    @extend_schema(
        operation_id="export",
        description="Export JSON complet des données du joueur, sans aucun secret d'agent.",
        responses={200: OpenApiTypes.OBJECT},
    )
    def get(self, request: Request) -> JsonResponse:
        """Renvoie l'export en pièce jointe life-rpg-export-AAAA-MM-JJ.json."""
        data = export_user_data(request.user)
        filename = f"life-rpg-export-{timezone.localdate().isoformat()}.json"
        response = JsonResponse(data, json_dumps_params={"ensure_ascii": False})
        response["Content-Disposition"] = f'attachment; filename="{filename}"'
        return response
