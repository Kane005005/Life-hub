"""Tests de l'API économie/boutique."""

from __future__ import annotations

import pytest
from rest_framework.authtoken.models import Token
from rest_framework.test import APIClient

from apps.accounts.models import User
from apps.character.models import Character
from apps.economy.models import ShopItem
from engine.economy import seed_shop

pytestmark = pytest.mark.django_db


@pytest.fixture
def api(user: User) -> APIClient:
    token = Token.objects.create(user=user)
    client = APIClient()
    client.credentials(HTTP_AUTHORIZATION=f"Token {token.key}")
    return client


@pytest.fixture
def other_api(other_user: User) -> APIClient:
    token = Token.objects.create(user=other_user)
    client = APIClient()
    client.credentials(HTTP_AUTHORIZATION=f"Token {token.key}")
    return client


def test_purchase_insufficient_credits(api: APIClient, character: Character) -> None:
    seed_shop()
    item = ShopItem.objects.get(name="Aura d'émeraude")
    character.credits = 50
    character.save(update_fields=["credits"])

    response = api.post(f"/api/economy/rewards/{item.id}/purchase/")

    assert response.status_code == 400
    assert response.json() == {"detail": "Crédits insuffisants : il te manque 100 crédits."}
    character.refresh_from_db()
    assert character.credits == 50


def test_purchase_success(api: APIClient, character: Character) -> None:
    seed_shop()
    item = ShopItem.objects.get(name="Aura d'émeraude")
    character.credits = 200
    character.save(update_fields=["credits"])

    response = api.post(f"/api/economy/rewards/{item.id}/purchase/")

    assert response.status_code == 200
    data = response.json()
    assert data["credits"] == 50
    assert data["message"] == "Récompense obtenue : Aura d'émeraude. -150 crédits."


def test_artifact_already_owned(api: APIClient, character: Character) -> None:
    seed_shop()
    item = ShopItem.objects.get(name="Aura d'émeraude")
    character.credits = 500
    character.save(update_fields=["credits"])
    assert api.post(f"/api/economy/rewards/{item.id}/purchase/").status_code == 200

    response = api.post(f"/api/economy/rewards/{item.id}/purchase/")
    assert response.status_code == 409
    assert response.json() == {"detail": "Tu possèdes déjà cet objet."}


def test_personal_reward_create_and_purchase_twice(api: APIClient, character: Character) -> None:
    character.credits = 100
    character.save(update_fields=["credits"])
    created = api.post(
        "/api/economy/rewards/",
        {"name": "Un livre", "description": "Plaisir", "cost": 30},
        format="json",
    )
    assert created.status_code == 201
    item_id = created.json()["id"]

    r1 = api.post(f"/api/economy/rewards/{item_id}/purchase/")
    r2 = api.post(f"/api/economy/rewards/{item_id}/purchase/")
    assert r1.status_code == 200
    assert r2.status_code == 200
    character.refresh_from_db()
    assert character.credits == 40


def test_patch_catalog_reward_forbidden(api: APIClient) -> None:
    seed_shop()
    item = ShopItem.objects.get(name="Aura d'émeraude")
    response = api.patch(
        f"/api/economy/rewards/{item.id}/",
        {"name": "Hack"},
        format="json",
    )
    assert response.status_code == 403
    assert response.json() == {"detail": "Tu ne peux pas modifier cet objet."}


def test_reward_isolation_between_users(api: APIClient, other_api: APIClient) -> None:
    created = api.post(
        "/api/economy/rewards/",
        {"name": "Secret", "description": "", "cost": 10},
        format="json",
    ).json()
    item_id = created["id"]

    other_list = other_api.get("/api/economy/rewards/").json()
    assert all(item["id"] != item_id for item in other_list)

    patch = other_api.patch(f"/api/economy/rewards/{item_id}/", {"name": "Nope"}, format="json")
    assert patch.status_code == 403


def test_equip_unequip_and_character_equipment(api: APIClient, character: Character) -> None:
    seed_shop()
    item = ShopItem.objects.get(name="Aura d'émeraude")
    character.credits = 200
    character.save(update_fields=["credits"])
    api.post(f"/api/economy/rewards/{item.id}/purchase/")

    equip = api.post(f"/api/economy/inventory/{item.id}/equip/")
    assert equip.status_code == 200
    assert equip.json()["equipment"]["AURA"]["name"] == "Aura d'émeraude"

    unequip = api.post(f"/api/economy/inventory/{item.id}/unequip/")
    assert unequip.status_code == 200
    assert unequip.json()["equipment"]["AURA"] is None


def test_purchase_does_not_change_xp_or_level(api: APIClient, character: Character) -> None:
    seed_shop()
    item = ShopItem.objects.get(name="Aura d'émeraude")
    character.credits = 200
    character.total_xp = 50
    character.level = 1
    character.xp_in_level = 50
    character.save(update_fields=["credits", "total_xp", "level", "xp_in_level"])

    api.post(f"/api/economy/rewards/{item.id}/purchase/")

    character.refresh_from_db()
    assert (character.total_xp, character.level, character.xp_in_level) == (50, 1, 50)
