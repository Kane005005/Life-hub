"""Parcours E2E phase 2 via l'API seule."""

from __future__ import annotations

from datetime import timedelta

import pytest
from django.utils import timezone
from rest_framework.authtoken.models import Token
from rest_framework.test import APIClient

from apps.accounts.models import User
from apps.character.models import Character
from engine.economy import seed_shop

pytestmark = pytest.mark.django_db


@pytest.fixture
def api(user: User) -> APIClient:
    token = Token.objects.create(user=user)
    client = APIClient()
    client.credentials(HTTP_AUTHORIZATION=f"Token {token.key}")
    return client


def test_phase2_end_to_end(api: APIClient, character: Character) -> None:
    seed_shop()
    today = timezone.localdate()

    # Create season
    season = api.post(
        "/api/seasons/",
        {
            "name": "Saison 1",
            "start_date": (today - timedelta(days=1)).isoformat(),
            "objectives": [{"title": "Lire", "is_main": True}],
        },
        format="json",
    ).json()
    assert season["status"] == "ACTIVE"

    # Create mission attached to reading branch
    quest = api.post(
        "/api/quests/",
        {
            "title": "Lire 20 pages",
            "territory": "KNOWLEDGE",
            "quest_type": "SIDE",
            "difficulty": "EPIC",
            "skill_branch": "reading",
        },
        format="json",
    ).json()
    assert quest["skill_branch"] == "reading"

    # Complete quest: achievements, credits, skill point
    completed = api.post(f"/api/quests/{quest['id']}/complete/").json()
    codes = {a["code"] for a in completed["result"]["achievements"]}
    assert {"FIRST_QUEST", "EXPLORER"}.issubset(codes)

    character.refresh_from_db()
    assert character.credits == 100  # EPIC = 100 XP, 1 crédit par XP
    assert character.level == 2
    assert character.skill_points_available >= 1

    # Unlock reading t1
    unlock = api.post("/api/skills/knowledge.reading.t1/unlock/")
    assert unlock.status_code == 200
    assert unlock.json()["message"] == "Compétence débloquée : Lecteur régulier."

    # Buy personal reward
    character.refresh_from_db()
    if character.credits < 10:
        character.credits = 10
        character.save(update_fields=["credits"])
    reward = api.post(
        "/api/economy/rewards/",
        {"name": "Pause café", "description": "", "cost": 10},
        format="json",
    ).json()
    purchase = api.post(f"/api/economy/rewards/{reward['id']}/purchase/")
    assert purchase.status_code == 200

    # Equip artifact if enough credits, else verify refusal
    artifact = api.get("/api/economy/rewards/?category=ARTIFACT&slot=AURA").json()[0]
    character.refresh_from_db()
    if character.credits >= artifact["cost"]:
        buy = api.post(f"/api/economy/rewards/{artifact['id']}/purchase/")
        assert buy.status_code == 200
        equip = api.post(f"/api/economy/inventory/{artifact['id']}/equip/")
        assert equip.status_code == 200
        assert equip.json()["equipment"]["AURA"]["id"] == artifact["id"]
    else:
        refused = api.post(f"/api/economy/rewards/{artifact['id']}/purchase/")
        assert refused.status_code == 400
        assert "Crédits insuffisants" in refused.json()["detail"]

    # Season summary coherent
    current = api.get("/api/seasons/current/").json()
    summary = current["summary"]
    assert summary["xp_total"] >= 30
    assert summary["completions"] >= 1
    assert "FIRST_QUEST" in summary["achievements_unlocked"]
    assert "knowledge.reading.t1" in summary["skills_unlocked"]

    # Early close -> new season active, nothing lost
    closed = api.post(f"/api/seasons/{current['id']}/close/").json()
    assert closed["closed"]["status"] == "CLOSED"
    assert closed["next"]["status"] == "ACTIVE"

    character.refresh_from_db()
    assert character.total_xp >= 30
    skills = api.get("/api/progression/skills/").json()
    assert any(item["code"] == "knowledge.reading.t1" for item in skills["unlocked"])
    achievements = api.get("/api/achievements/").json()
    assert any(a["code"] == "FIRST_QUEST" and a["unlocked"] for a in achievements)
    inventory = api.get("/api/economy/inventory/").json()
    assert "Pause café" in [purchase["item_name"] for purchase in inventory["purchases"]]
