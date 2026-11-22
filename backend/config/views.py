"""Vues de base de l'API et point d'entrée du frontend construit."""

from pathlib import Path

from django.conf import settings
from django.http import FileResponse, HttpRequest, HttpResponse
from drf_spectacular.utils import extend_schema
from rest_framework import serializers
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView


class HealthResponseSerializer(serializers.Serializer):
    """Forme de la réponse de l'endpoint de santé."""

    status = serializers.CharField()
    app = serializers.CharField()
    version = serializers.CharField()


class HealthView(APIView):
    """Endpoint public de santé de l'API LIFE RPG."""

    authentication_classes = []
    permission_classes = [AllowAny]

    @extend_schema(
        summary="Santé de l'API",
        description="Renvoie l'état de santé de l'application LIFE RPG.",
        responses={200: HealthResponseSerializer},
    )
    def get(self, request: HttpRequest) -> Response:
        """Renvoie un état constant, sans accès à la base de données."""
        return Response({"status": "ok", "app": "LIFE RPG", "version": "0.1.0"})


def frontend_index(request: HttpRequest) -> HttpResponse:
    """Sert l'index du build React, ou indique qu'il n'est pas encore construit."""
    index = Path(settings.FRONTEND_DIST) / "index.html"
    if index.is_file():
        return FileResponse(index.open("rb"))
    message = "Le front n'est pas construit. Lance make build."
    return HttpResponse(message, status=503, content_type="text/plain; charset=utf-8")
