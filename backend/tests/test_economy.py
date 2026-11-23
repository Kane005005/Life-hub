"""Tests du moteur économie/boutique (phase 2)."""

from __future__ import annotations

import pytest

from apps.character.models import Character
from apps.economy.models import CreditTransaction, InventoryItem, ShopItem
from engine.economy import create_reward, equip, purchase, seed_shop, unequip, update_reward
from engine.exceptions import AlreadyOwned, InsufficientCredits, NotOwnedError
from engine.services import character_snapshot, ensure_character

pytestmark = pytest.mark.django_db


@pytest.fixture
def shop(world):
    seed_shop()
    return ShopItem.objects.all()


def test_purchase_insufficient_credits(world, character: Character) -> None:
    seed_shop()
    item = ShopItem.objects.get(name="Aura d'émeraude")
    character.credits = 50
    character.save(update_fields=["credits"])

    with pytest.raises(
        InsufficientCredits, match="Crédits insuffisants : il te manque 100 crédits."
    ):
        purchase(character.user, item)

    character.refresh_from_db()
    assert character.credits == 50
    assert CreditTransaction.objects.filter(character=character, kind="SPEND").count() == 0


def test_purchase_success(world, character: Character) -> None:
    seed_shop()
    item = ShopItem.objects.get(name="Aura d'émeraude")
    character.credits = 200
    character.save(update_fields=["credits"])

    result = purchase(character.user, item)

    character.refresh_from_db()
    assert character.credits == 50
    assert result["credits"] == 50
    tx = CreditTransaction.objects.get(character=character, kind="SPEND")
    assert tx.amount == -150
    assert tx.reason == "Récompense obtenue : Aura d'émeraude."
    assert tx.balance_after == 50
    assert InventoryItem.objects.filter(character=character, item=item).exists()
    from apps.journal.models import JournalEntry

    assert JournalEntry.objects.filter(owner=character.user, event_type="REWARD_PURCHASED").exists()


def test_artifact_cannot_be_bought_twice(world, character: Character) -> None:
    seed_shop()
    item = ShopItem.objects.get(name="Aura d'émeraude")
    character.credits = 500
    character.save(update_fields=["credits"])
    purchase(character.user, item)
    with pytest.raises(AlreadyOwned, match="Tu possèdes déjà cet objet."):
        purchase(character.user, item)
    character.refresh_from_db()
    assert character.credits == 350


def test_personal_reward_can_be_purchased_multiple_times(world, character: Character) -> None:
    reward = create_reward(character.user, {"name": "Un livre", "description": "", "cost": 30})
    item = ShopItem.objects.get(pk=reward["id"])
    character.credits = 100
    character.save(update_fields=["credits"])
    purchase(character.user, item)
    purchase(character.user, item)
    character.refresh_from_db()
    assert character.credits == 40
    assert CreditTransaction.objects.filter(character=character, kind="SPEND").count() == 2


def test_personal_reward_is_private(world, character: Character, other_user) -> None:
    reward = create_reward(character.user, {"name": "Secret", "description": "", "cost": 10})
    item = ShopItem.objects.get(pk=reward["id"])
    ensure_character(other_user)

    from engine.economy import shop_items

    assert all(i["id"] != item.id for i in shop_items(other_user))
    with pytest.raises(NotOwnedError):
        update_reward(other_user, item, {"name": "Hack"})


def test_equip_replaces_same_slot(world, character: Character) -> None:
    seed_shop()
    aura1 = ShopItem.objects.get(name="Aura d'émeraude")
    aura2 = ShopItem.objects.get(name="Aura de brume")
    character.credits = 1000
    character.save(update_fields=["credits"])
    purchase(character.user, aura1)
    purchase(character.user, aura2)
    inv1 = InventoryItem.objects.get(character=character, item=aura1)
    inv2 = InventoryItem.objects.get(character=character, item=aura2)

    equip(character, inv1)
    snap = character_snapshot(Character.objects.get(pk=character.pk))
    assert snap["equipment"]["AURA"]["name"] == "Aura d'émeraude"

    equip(character, inv2)
    snap = character_snapshot(Character.objects.get(pk=character.pk))
    assert snap["equipment"]["AURA"]["name"] == "Aura de brume"


def test_cannot_equip_unowned_item(world, character: Character, other_user) -> None:
    seed_shop()
    item = ShopItem.objects.get(name="Aura d'émeraude")
    # create inventory item for other user
    other = ensure_character(other_user)
    other.credits = 500
    other.save(update_fields=["credits"])
    purchase(other_user, item)
    other_inv = InventoryItem.objects.get(character=other, item=item)
    with pytest.raises(InventoryItem.DoesNotExist):
        equip(character, other_inv)


def test_purchase_does_not_change_xp_or_level(world, character: Character) -> None:
    seed_shop()
    item = ShopItem.objects.get(name="Aura d'émeraude")
    character.credits = 200
    character.total_xp = 50
    character.level = 1
    character.xp_in_level = 50
    character.save(update_fields=["credits", "total_xp", "level", "xp_in_level"])
    purchase(character.user, item)
    character.refresh_from_db()
    assert (character.total_xp, character.level, character.xp_in_level) == (50, 1, 50)


def test_unequip(world, character: Character) -> None:
    seed_shop()
    item = ShopItem.objects.get(name="Aura d'émeraude")
    character.credits = 200
    character.save(update_fields=["credits"])
    purchase(character.user, item)
    inv = InventoryItem.objects.get(character=character, item=item)
    equip(character, inv)
    unequip(character, inv)
    snap = character_snapshot(Character.objects.get(pk=character.pk))
    assert snap["equipment"]["AURA"] is None
