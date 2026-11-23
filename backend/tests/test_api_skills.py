"""Tests de l'API des compétences."""

from __future__ import annotations

import pytest
from rest_framework.authtoken.models import Token
from rest_framework.test import APIClient

from apps.accounts.models import User
from apps.character.models import Character
from apps.journal.models import JournalEntry
from apps.skills.models import SkillPointTransaction

pytestmark = pytest.mark.django_db


@pytest.fixture
def api(user: User) -> APIClient:
    token = Token.objects.create(user=user)
    client = APIClient()
    client.credentials(HTTP_AUTHORIZATION=f"Token {token.key}")
    return client


def test_skill_trees_shape(api: APIClient) -> None:
    response = api.get("/api/skills/trees/")
    assert response.status_code == 200
    trees = response.json()
    assert len(trees) == 6
    knowledge = next(tree for tree in trees if tree["territory"] == "KNOWLEDGE")
    assert len(knowledge["branches"]) == 3
    assert all(len(branch["skills"]) == 4 for branch in knowledge["branches"])
    node = knowledge["branches"][0]["skills"][1]
    assert node["state"] in {"LOCKED", "UNLOCKABLE", "UNLOCKED"}
    assert isinstance(node["missing"], list)


def test_unlock_success(api: APIClient, character: Character) -> None:
    character.skill_points_available = 1
    character.save(update_fields=["skill_points_available"])

    response = api.post("/api/skills/knowledge.reading.t1/unlock/")

    assert response.status_code == 200
    data = response.json()
    assert data["message"] == "Compétence débloquée : Lecteur régulier."
    assert data["skill_points"] == {"available": 0, "spent": 1}
    assert data["skill"]["state"] == "UNLOCKED"
    assert SkillPointTransaction.objects.filter(character=character, kind="SPEND").count() == 1
    assert JournalEntry.objects.filter(owner=character.user, event_type="SKILL_UNLOCKED").exists()


def test_unlock_missing_returns_400(api: APIClient) -> None:
    response = api.post("/api/skills/knowledge.reading.t2/unlock/")
    assert response.status_code == 400
    detail = response.json()["detail"]
    assert "Impossible de débloquer Lecteur critique." in detail
    assert "Il te manque 1 point(s) de compétence." in detail
    assert "Débloque d'abord Lecteur régulier." in detail
    assert "Statistique Savoir : 15 requise, 0 actuelle." in detail
    assert "Il te manque 3 validations dans Lecture & culture." in detail


def test_unlock_twice_returns_409_and_single_debit(api: APIClient, character: Character) -> None:
    character.skill_points_available = 2
    character.save(update_fields=["skill_points_available"])
    assert api.post("/api/skills/knowledge.reading.t1/unlock/").status_code == 200

    response = api.post("/api/skills/knowledge.reading.t1/unlock/")

    assert response.status_code == 409
    assert response.json() == {"detail": "Compétence déjà débloquée."}
    character.refresh_from_db()
    assert character.skill_points_available == 1
    assert character.skill_points_spent == 1
    assert SkillPointTransaction.objects.filter(character=character, kind="SPEND").count() == 1


def test_skill_trees_require_auth(world) -> None:
    client = APIClient()
    response = client.get("/api/skills/trees/")
    assert response.status_code == 401
