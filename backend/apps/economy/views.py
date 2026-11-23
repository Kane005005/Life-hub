"""Vues du portefeuille de crédits et de son historique."""

from drf_spectacular.utils import extend_schema
from rest_framework.generics import ListAPIView
from rest_framework.request import Request
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.economy.models import CreditTransaction
from apps.economy.serializers import CreditTransactionSerializer, WalletSerializer
from engine.services import ensure_character


class WalletView(APIView):
    """Solde de crédits du personnage connecté."""

    @extend_schema(responses=WalletSerializer)
    def get(self, request: Request) -> Response:
        """Renvoie le nombre de crédits actuellement détenus."""
        character = ensure_character(request.user)
        return Response({"credits": character.credits})


class CreditTransactionListView(ListAPIView):
    """Historique paginé des transactions de crédits."""

    serializer_class = CreditTransactionSerializer

    def get_queryset(self):
        """Ne renvoie que les transactions du personnage connecté."""
        character = ensure_character(self.request.user)
        return CreditTransaction.objects.filter(character=character).order_by("-created_at", "-id")
