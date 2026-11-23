"""Moteur de la boutique, des achats, de l'inventaire et de l'équipement."""

from __future__ import annotations

from typing import TYPE_CHECKING

from django.db import transaction

from apps.economy.models import (
    CreditTransaction,
    Equipment,
    InventoryItem,
    RewardPurchase,
    ShopItem,
)
from engine.events import log_event
from engine.exceptions import AlreadyOwned, EngineError, InsufficientCredits, NotOwnedError

if TYPE_CHECKING:
    from apps.accounts.models import User
    from apps.character.models import Character

DEFAULT_ARTIFACTS: list[dict] = [
    {
        "name": "Aura d'émeraude",
        "description": "Une aura discrète aux reflets d'émeraude.",
        "category": "ARTIFACT",
        "slot": "AURA",
        "cost": 150,
        "visual": {"color": "#2FD08B"},
        "order": 1,
    },
    {
        "name": "Aura de brume",
        "description": "Une aura légère aux tons de brume.",
        "category": "ARTIFACT",
        "slot": "AURA",
        "cost": 200,
        "visual": {"color": "#A08DD0"},
        "order": 2,
    },
    {
        "name": "Aura d'or discret",
        "description": "Une aura chaude à l'éclat doré.",
        "category": "ARTIFACT",
        "slot": "AURA",
        "cost": 300,
        "visual": {"color": "#D0A94A"},
        "order": 3,
    },
    {
        "name": "Cadre argenté",
        "description": "Un cadre sobre aux reflets argentés.",
        "category": "ARTIFACT",
        "slot": "FRAME",
        "cost": 250,
        "visual": {"style": "silver"},
        "order": 4,
    },
    {
        "name": "Cadre double",
        "description": "Un cadre double pour mettre l'avatar en valeur.",
        "category": "ARTIFACT",
        "slot": "FRAME",
        "cost": 400,
        "visual": {"style": "double"},
        "order": 5,
    },
    {
        "name": "Emblème de la citadelle",
        "description": "Un emblème symbolique de la citadelle.",
        "category": "ARTIFACT",
        "slot": "EMBLEM",
        "cost": 500,
        "visual": {"glyph": "mark"},
        "order": 6,
    },
]


def seed_shop() -> None:
    """Crée ou met à jour le catalogue d'artefacts par défaut."""
    for data in DEFAULT_ARTIFACTS:
        ShopItem.objects.update_or_create(
            name=data["name"],
            owner=None,
            defaults={
                "description": data["description"],
                "category": data["category"],
                "slot": data["slot"],
                "cost": data["cost"],
                "is_available": True,
                "visual": data["visual"],
                "order": data["order"],
            },
        )


def _item_snapshot(item: ShopItem, *, owned: bool, equipped: bool, purchases_count: int) -> dict:
    return {
        "id": item.id,
        "name": item.name,
        "description": item.description,
        "category": item.category,
        "slot": item.slot or None,
        "cost": item.cost,
        "is_available": item.is_available,
        "is_custom": item.owner_id is not None,
        "visual": item.visual,
        "owned": owned,
        "equipped": equipped,
        "purchases_count": purchases_count,
    }


def shop_items(user: User, category: str | None = None, slot: str | None = None) -> list[dict]:
    """Renvoie le catalogue public et les récompenses personnelles du joueur."""
    from apps.character.models import Character

    character = Character.objects.filter(user=user).first()
    qs = ShopItem.objects.filter(is_available=True).filter(models_q_owner_or_catalog(user))
    if category:
        qs = qs.filter(category=category)
    if slot:
        qs = qs.filter(slot=slot)

    owned_ids: set[int] = set()
    equipped_ids: set[int] = set()
    purchase_counts: dict[int, int] = {}
    if character is not None:
        owned_ids = set(
            InventoryItem.objects.filter(character=character).values_list("item_id", flat=True)
        )
        equipped_ids = set(
            Equipment.objects.filter(character=character).values_list("item__item_id", flat=True)
        )
        from django.db.models import Count

        purchase_counts = {
            row["item_id"]: row["total"]
            for row in RewardPurchase.objects.filter(character=character)
            .values("item_id")
            .annotate(total=Count("id"))
        }
    items = []
    for item in qs:
        items.append(
            _item_snapshot(
                item,
                owned=item.id in owned_ids,
                equipped=item.id in equipped_ids,
                purchases_count=purchase_counts.get(item.id, 0),
            )
        )
    return items


def models_q_owner_or_catalog(user: User):
    from django.db.models import Q

    return Q(owner__isnull=True) | Q(owner=user)


@transaction.atomic
def create_reward(user: User, data: dict) -> dict:
    """Crée une récompense personnelle pour le joueur."""
    item = ShopItem.objects.create(
        name=str(data.get("name", "")).strip(),
        description=str(data.get("description", "")),
        category="REWARD",
        slot="",
        cost=int(data.get("cost", 1)),
        is_available=True,
        owner=user,
        visual={},
    )
    return _item_snapshot(item, owned=False, equipped=False, purchases_count=0)


@transaction.atomic
def update_reward(user: User, item: ShopItem, data: dict) -> dict:
    """Modifie une récompense personnelle du joueur."""
    item = ShopItem.objects.select_for_update().get(pk=item.pk)
    if item.owner_id != user.id:
        raise NotOwnedError("Tu ne peux pas modifier cet objet.")
    for field in ("name", "description", "cost", "is_available"):
        if field in data:
            setattr(item, field, data[field])
    item.save(update_fields=["name", "description", "cost", "is_available", "updated_at"])
    return _item_snapshot(item, owned=False, equipped=False, purchases_count=0)


@transaction.atomic
def purchase(user: User, item: ShopItem) -> dict:
    """Achète un objet de la boutique pour le personnage du joueur."""
    from apps.character.models import Character

    item = ShopItem.objects.select_for_update().get(pk=item.pk)
    character = Character.objects.select_for_update().get(user=user)

    if not item.is_available:
        raise EngineError("Cet objet n'est pas disponible.")
    if item.owner_id is not None and item.owner_id != user.id:
        raise NotOwnedError("Tu ne peux pas acheter cet objet.")
    if (
        item.category == "ARTIFACT"
        and InventoryItem.objects.filter(character=character, item=item).exists()
    ):
        raise AlreadyOwned()
    if character.credits < item.cost:
        missing = item.cost - character.credits
        raise InsufficientCredits(f"Crédits insuffisants : il te manque {missing} crédits.")

    character.credits -= item.cost
    character.save(update_fields=["credits", "updated_at"])

    credit_transaction = CreditTransaction.objects.create(
        character=character,
        amount=-item.cost,
        kind="SPEND",
        reason=f"Récompense obtenue : {item.name}.",
        balance_after=character.credits,
    )
    RewardPurchase.objects.create(
        character=character,
        item=item,
        cost=item.cost,
        credit_transaction=credit_transaction,
    )

    owned = False
    equipped = False
    if item.category == "ARTIFACT":
        InventoryItem.objects.create(character=character, item=item)
        owned = True

    log_event(
        user,
        "REWARD_PURCHASED",
        f"Récompense obtenue : {item.name}. -{item.cost} crédits.",
        payload={"item_id": item.id, "cost": item.cost},
    )
    return {
        "item": _item_snapshot(item, owned=owned, equipped=equipped, purchases_count=1),
        "credits": character.credits,
        "message": f"Récompense obtenue : {item.name}. -{item.cost} crédits.",
    }


@transaction.atomic
def equip(character: Character, inventory_item: InventoryItem) -> Character:
    """Équipe un artefact possédé dans son emplacement."""
    inventory_item = InventoryItem.objects.select_related("item", "character").get(
        pk=inventory_item.pk, character=character
    )
    item = inventory_item.item
    if item.category != "ARTIFACT" or not item.slot:
        raise EngineError("Cet objet ne peut pas être équipé.")
    Equipment.objects.update_or_create(
        character=character,
        slot=item.slot,
        defaults={"item": inventory_item},
    )
    log_event(
        character.user,
        "ITEM_EQUIPPED",
        f"Objet équipé : {item.name}.",
        payload={"item_id": item.id, "slot": item.slot},
    )
    return character


@transaction.atomic
def unequip(character: Character, inventory_item: InventoryItem) -> Character:
    """Retire un objet équipé."""
    deleted, _ = Equipment.objects.filter(character=character, item=inventory_item).delete()
    if not deleted:
        raise EngineError("Cet objet n'est pas équipé.")
    log_event(
        character.user,
        "ITEM_UNEQUIPPED",
        f"Objet retiré : {inventory_item.item.name}.",
        payload={"item_id": inventory_item.item_id},
    )
    return character
