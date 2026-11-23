"""Tests de l'API du personnage et de son avatar."""

import pytest
from rest_framework.authtoken.models import Token
from rest_framework.test import APIClient

from apps.accounts.models import User
from apps.character.models import Character

pytestmark = pytest.mark.django_db


@pytest.fixture
def api(user: User) -> APIClient:
    """Client authentifié avec le jeton de l'utilisateur principal."""
    token = Token.objects.create(user=user)
    client = APIClient()
    client.credentials(HTTP_AUTHORIZATION=f"Token {token.key}")
    return client


def test_get_character_returns_the_full_contract(api: APIClient) -> None:
    response = api.get("/api/character/")

    assert response.status_code == 200
    data = response.json()
    assert set(data) == {
        "pseudonym",
        "bio",
        "character_class",
        "is_onboarded",
        "level",
        "xp_in_level",
        "xp_required",
        "total_xp",
        "rank",
        "credits",
        "skill_points",
        "avatar",
        "stats",
    }
    assert data["pseudonym"] == "kane"
    assert data["level"] == 1
    assert data["xp_required"] == 100
    assert data["rank"] == {"code": "INITIATE", "label": "Initié"}
    assert len(data["stats"]) == 6


def test_patch_ignores_progress_fields(api: APIClient, user: User) -> None:
    response = api.patch(
        "/api/character/",
        {
            "pseudonym": "Nouveau nom",
            "bio": "Biographie",
            "character_class": "ARCHITECT",
            "is_onboarded": True,
            "level": 99,
            "credits": 9999,
            "total_xp": 9999,
            "xp_reward": 9999,
        },
        format="json",
    )

    assert response.status_code == 200
    data = response.json()
    assert data["pseudonym"] == "Nouveau nom"
    assert data["bio"] == "Biographie"
    assert data["character_class"] == "ARCHITECT"
    assert data["is_onboarded"] is True
    assert (data["level"], data["total_xp"], data["credits"]) == (1, 0, 0)

    character = Character.objects.get(user=user)
    assert (character.level, character.total_xp, character.credits) == (1, 0, 0)


def test_avatar_patch_validates_color(api: APIClient) -> None:
    invalid = api.patch("/api/character/avatar/", {"color": "rouge"}, format="json")
    assert invalid.status_code == 400

    response = api.patch(
        "/api/character/avatar/",
        {"silhouette": "C", "color": "#123456", "accent": "#ABCDEF"},
        format="json",
    )
    assert response.status_code == 200
    assert response.json()["avatar"] == {
        "silhouette": "C",
        "color": "#123456",
        "accent": "#ABCDEF",
    }
