"""Tests agents du calendrier : portée quests, masquage BODY et refus d'écriture."""

from __future__ import annotations

import json
from datetime import UTC, date, datetime, time
from typing import Any
from unittest.mock import patch

import pytest
from rest_framework.authtoken.models import Token
from rest_framework.test import APIClient

from apps.accounts.models import User
from apps.character.models import Character
from apps.economy.models import CreditTransaction
from apps.journal.models import JournalEntry
from apps.progression.models import XPTransaction
from apps.quests.models import Quest, QuestCompletion, QuestStep
from engine.agents import create_agent_token
from engine.rules import period_key

pytestmark = pytest.mark.django_db

FROZEN = datetime(2026, 11, 24, 12, 0, tzinfo=UTC)
TODAY = FROZEN.date()


@pytest.fixture
def frozen() -> Any:
    """Fixe l'heure à midi UTC du 24 novembre 2026."""
    with patch("django.utils.timezone.now", return_value=FROZEN):
        yield FROZEN


@pytest.fixture
def api(user: User) -> APIClient:
    """Client authentifié avec le jeton personnel de l'utilisateur."""
    token = Token.objects.create(user=user)
    client = APIClient()
    client.credentials(HTTP_AUTHORIZATION=f"Token {token.key}")
    return client


def agent_client(user: User, scopes: list[str], name: str = "Agent Calendrier") -> APIClient:
    """Crée un jeton d'agent avec les portées demandées et son client HTTP."""
    _, secret = create_agent_token(user, name, scopes)
    client = APIClient()
    client.credentials(HTTP_AUTHORIZATION=f"Bearer {secret}")
    return client


def new_quest(api: APIClient, **extra: Any) -> dict[str, Any]:
    """Crée une mission planifiée aujourd'hui via l'API utilisateur."""
    payload: dict[str, Any] = {
        "title": "Mission du jour",
        "territory": "KNOWLEDGE",
        "difficulty": "EASY",
        "scheduled_date": TODAY.isoformat(),
    }
    payload.update(extra)
    response = api.post("/api/quests/", payload, format="json")
    assert response.status_code == 201, response.content
    return response.json()


def add_completion(quest_id: int, xp: int, credits: int) -> None:
    """Ajoute une validation du jour avec des montants connus."""
    quest = Quest.objects.get(pk=quest_id)
    QuestCompletion.objects.create(
        quest=quest,
        period_key=period_key(quest.quest_type, TODAY),
        xp_awarded=xp,
        credits_awarded=credits,
        completed_at=datetime.combine(TODAY, time(7, 12), tzinfo=UTC),
    )


def test_agent_with_quests_scope_reads_the_calendar_and_logs_it(
    api: APIClient,
    user: User,
    frozen: Any,
) -> None:
    """La portée quests suffit : la lecture est tracée au nom de l'agent."""
    new_quest(api)
    agent = agent_client(user, ["quests"])
    before = JournalEntry.objects.filter(event_type="AGENT_CONTEXT_READ").count()

    response = agent.get(f"/api/agent/calendar/?from={TODAY}&to={TODAY}")

    assert response.status_code == 200, response.content
    data = response.json()
    assert data["today"] == TODAY.isoformat()
    assert len(data["days"][0]["entries"]) == 1
    assert JournalEntry.objects.filter(event_type="AGENT_CONTEXT_READ").count() == before + 1
    event = JournalEntry.objects.filter(event_type="AGENT_CONTEXT_READ").order_by("-id").first()
    assert event is not None
    assert event.actor == "Agent Calendrier"
    assert event.message == "Agent Calendrier a lu le calendrier."


def test_agent_without_quests_scope_is_denied(user: User, frozen: Any) -> None:
    """Sans la portée quests, la lecture du calendrier est refusée."""
    agent = agent_client(user, ["profile", "progression"])

    response = agent.get("/api/agent/calendar/")

    assert response.status_code == 403
    assert "detail" in response.json()


def test_agent_without_body_scope_drops_body_entries_and_completions(
    api: APIClient,
    user: User,
    frozen: Any,
) -> None:
    """Sans body, aucune entrée ni validation BODY, et résumé recalculé."""
    body = new_quest(api, title="Sport", territory="BODY")
    knowledge = new_quest(api, title="Lecture", territory="KNOWLEDGE")
    add_completion(body["id"], 99, 99)
    add_completion(knowledge["id"], 5, 5)
    agent = agent_client(user, ["quests"])

    data = agent.get(f"/api/agent/calendar/?from={TODAY}&to={TODAY}").json()
    day = data["days"][0]

    assert all(entry["quest"]["territory"] != "BODY" for entry in day["entries"])
    assert all(item["territory"] != "BODY" for item in day["completions"])
    assert day["summary"] == {
        "completions": 1,
        "xp": 5,
        "credits": 5,
        "dominant_territory": "KNOWLEDGE",
    }
    with_body = agent_client(user, ["quests", "body"], name="Agent Corps").get(
        f"/api/agent/calendar/?from={TODAY}&to={TODAY}"
    )
    assert any(
        entry["quest"]["territory"] == "BODY" for entry in with_body.json()["days"][0]["entries"]
    )


def _state(user: User, quest: Quest, step: QuestStep) -> dict[str, Any]:
    """Instantané des données qui ne doivent jamais changer sous l'effet d'un agent."""
    character = Character.objects.get(user=user)
    quest.refresh_from_db()
    step.refresh_from_db()
    return {
        "status": quest.status,
        "scheduled_date": quest.scheduled_date,
        "step_scheduled_date": step.scheduled_date,
        "level": character.level,
        "total_xp": character.total_xp,
        "credits": character.credits,
        "skill_points": character.skill_points_available,
        "time_zone": user.time_zone,
        "completions": QuestCompletion.objects.count(),
        "xp_transactions": XPTransaction.objects.count(),
        "credit_transactions": CreditTransaction.objects.count(),
        "journal": JournalEntry.objects.count(),
    }


def test_agent_cannot_write_user_endpoints(
    api: APIClient,
    user: User,
    frozen: Any,
) -> None:
    """Un jeton d'agent est refusé partout hors /api/agent/, sans aucun effet."""
    created = new_quest(api, steps=[{"title": "Étape à protéger"}])
    quest = Quest.objects.get(pk=created["id"])
    step = QuestStep.objects.get(pk=created["steps"][0]["id"])
    agent = agent_client(user, ["quests", "proposals", "body", "profile"])
    before = _state(user, quest, step)

    calls = [
        ("PATCH", f"/api/quests/{quest.pk}/", {"scheduled_date": "2026-11-25"}),
        ("PATCH", f"/api/quests/{quest.pk}/steps/{step.pk}/", {"scheduled_date": "2026-11-25"}),
        ("POST", f"/api/quests/{quest.pk}/complete/", {}),
        ("PATCH", "/api/auth/me/", {"time_zone": "Europe/Paris"}),
        ("GET", "/api/calendar/", None),
    ]
    for method, path, payload in calls:
        if payload is None:
            response = agent.generic(method, path)
        else:
            response = agent.generic(
                method,
                path,
                json.dumps(payload),
                content_type="application/json",
            )
        assert response.status_code == 403, (method, path, response.content)
        assert response.json()["detail"] == "Cette action est réservée à l'utilisateur."

    assert _state(user, quest, step) == before


def test_proposal_scheduled_date_is_kept_until_acceptance(
    api: APIClient,
    user: User,
    frozen: Any,
) -> None:
    """Agent propose une date, utilisateur la corrige, acceptation sans récompense."""
    agent = agent_client(user, ["proposals", "quests"], name="Agent Propositions")
    response = agent.post(
        "/api/agent/quest-proposals/",
        {
            "title": "Lire 20 pages",
            "territory": "KNOWLEDGE",
            "quest_type": "SIDE",
            "difficulty": "EASY",
            "rationale": "Une lecture tranquille si ça te va.",
            "scheduled_date": "2026-11-25",
        },
        format="json",
    )
    assert response.status_code == 201, response.content
    proposal = response.json()[0]
    assert proposal["status"] == "PENDING"
    assert proposal["scheduled_date"] == "2026-11-25"

    edited = api.patch(
        f"/api/quest-proposals/{proposal['id']}/",
        {"scheduled_date": "2026-11-26"},
        format="json",
    )
    assert edited.status_code == 200
    assert edited.json()["scheduled_date"] == "2026-11-26"

    accepted = api.post(f"/api/quest-proposals/{proposal['id']}/accept/")
    assert accepted.status_code == 200, accepted.content
    quest = accepted.json()["quest"]
    assert quest["scheduled_date"] == "2026-11-26"
    assert Quest.objects.get(pk=quest["id"]).scheduled_date == date(2026, 11, 26)

    character = Character.objects.get(user=user)
    assert (character.level, character.total_xp, character.credits) == (1, 0, 0)
    assert QuestCompletion.objects.count() == 0
    assert XPTransaction.objects.count() == 0
    assert CreditTransaction.objects.count() == 0
