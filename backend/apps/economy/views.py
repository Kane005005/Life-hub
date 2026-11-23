"""Vues de l'économie, boutique, inventaire et équipement."""

from django.shortcuts import get_object_or_404
from drf_spectacular.utils import OpenApiParameter, extend_schema
from rest_framework.generics import ListAPIView
from rest_framework.request import Request
from rest_framework.response import Response
from rest_framework.status import HTTP_201_CREATED
from rest_framework.views import APIView

from apps.character.serializers import CharacterSerializer
from apps.economy.models import CreditTransaction, InventoryItem, RewardPurchase, ShopItem
from apps.economy.serializers import (
    CreditTransactionSerializer,
    InventoryResponseSerializer,
    PurchaseResponseSerializer,
    RewardCreateSerializer,
    RewardUpdateSerializer,
    ShopItemSerializer,
    WalletSerializer,
)
from engine.economy import create_reward, equip, purchase, shop_items, unequip, update_reward
from engine.services import character_snapshot, ensure_character


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


class RewardListCreateView(APIView):
    """Catalogue boutique et création de récompense personnelle."""

    @extend_schema(
        parameters=[
            OpenApiParameter(name="category", type=str, location=OpenApiParameter.QUERY),
            OpenApiParameter(name="slot", type=str, location=OpenApiParameter.QUERY),
        ],
        responses=ShopItemSerializer(many=True),
    )
    def get(self, request: Request) -> Response:
        """Renvoie les objets boutique visibles par le joueur."""
        return Response(
            shop_items(
                request.user,
                category=request.query_params.get("category"),
                slot=request.query_params.get("slot"),
            )
        )

    @extend_schema(request=RewardCreateSerializer, responses={201: ShopItemSerializer})
    def post(self, request: Request) -> Response:
        """Crée une récompense personnelle."""
        serializer = RewardCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        item = create_reward(request.user, serializer.validated_data)
        return Response(item, status=HTTP_201_CREATED)


class RewardDetailView(APIView):
    """Modification d'une récompense personnelle."""

    @extend_schema(request=RewardUpdateSerializer, responses=ShopItemSerializer)
    def patch(self, request: Request, pk: int) -> Response:
        """Modifie une récompense personnelle appartenant au joueur."""
        item = get_object_or_404(ShopItem, pk=pk)
        serializer = RewardUpdateSerializer(data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        return Response(update_reward(request.user, item, serializer.validated_data))


class RewardPurchaseView(APIView):
    """Achat d'un objet boutique."""

    @extend_schema(request=None, responses=PurchaseResponseSerializer)
    def post(self, request: Request, pk: int) -> Response:
        """Achète un objet via le moteur."""
        item = get_object_or_404(ShopItem, pk=pk)
        if item.owner_id is not None and item.owner_id != request.user.id:
            return Response({"detail": "Non trouvé."}, status=404)
        return Response(purchase(request.user, item))


class InventoryView(APIView):
    """Inventaire et historique d'achats du joueur."""

    @extend_schema(responses=InventoryResponseSerializer)
    def get(self, request: Request) -> Response:
        """Renvoie les objets possédés et l'historique d'achats."""
        character = ensure_character(request.user)
        inventory = (
            InventoryItem.objects.filter(character=character)
            .select_related("item")
            .order_by("acquired_at", "id")
        )
        from django.db.models import Count

        from apps.economy.models import Equipment

        equipped_ids = set(
            Equipment.objects.filter(character=character).values_list("item__item_id", flat=True)
        )
        purchases_counts = {
            row["item_id"]: row["total"]
            for row in RewardPurchase.objects.filter(character=character)
            .values("item_id")
            .annotate(total=Count("id"))
        }

        items = []
        for inv in inventory:
            item = inv.item
            items.append(
                {
                    "id": item.id,
                    "name": item.name,
                    "description": item.description,
                    "category": item.category,
                    "slot": item.slot or None,
                    "cost": item.cost,
                    "is_available": item.is_available,
                    "is_custom": item.owner_id is not None,
                    "visual": item.visual,
                    "owned": True,
                    "equipped": item.id in equipped_ids,
                    "purchases_count": purchases_counts.get(item.id, 0),
                }
            )

        purchases = [
            {
                "uuid": p.uuid,
                "item_name": p.item.name,
                "cost": p.cost,
                "purchased_at": p.purchased_at,
            }
            for p in RewardPurchase.objects.filter(character=character)
            .select_related("item")
            .order_by("-purchased_at", "-id")
        ]
        return Response({"items": items, "purchases": purchases})


class InventoryEquipView(APIView):
    """Équipement d'un objet possédé."""

    @extend_schema(request=None, responses=CharacterSerializer)
    def post(self, request: Request, pk: int) -> Response:
        """Équipe l'objet possédé correspondant."""
        character = ensure_character(request.user)
        inv = get_object_or_404(InventoryItem, character=character, item_id=pk)
        equip(character, inv)
        character.refresh_from_db()
        return Response(character_snapshot(character))


class InventoryUnequipView(APIView):
    """Retrait d'un objet équipé."""

    @extend_schema(request=None, responses=CharacterSerializer)
    def post(self, request: Request, pk: int) -> Response:
        """Retire l'objet équipé correspondant."""
        character = ensure_character(request.user)
        inv = get_object_or_404(InventoryItem, character=character, item_id=pk)
        unequip(character, inv)
        character.refresh_from_db()
        return Response(character_snapshot(character))
