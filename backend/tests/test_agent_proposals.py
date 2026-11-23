"""Tests des propositions de missions : création agent, décision utilisateur."""

from __future__ import annotations

import pytest
from rest_framework.authtoken.models import Token
from rest_framework.test import APIClient

from apps.accounts.models import User
from apps.ai_engine.models import AgentToken, QuestProposal
from apps.character.models import Character
from apps.journal.models import JournalEntry
from apps.progression.models import XPTransaction
from apps.quests.models import Quest, QuestCompletion
from engine.agents import SCOPES, create_agent_token, create_proposals
from engine.skills import load_skill_tree

pytestmark = pytest.mark.django_db


@pytest.fixture
def api(user: User) -> APIClient:
    token = Token.objects.create(user=user)
    client = APIClient()
    client.credentials(HTTP_AUTHORIZATION=f"Token {token.key}")
    return client


@pytest.fixture
def agent(user: User) -> APIClient:
    _, secret = create_agent_token(user, "Claude Code", list(SCOPES))
    client = APIClient()
    client.credentials(HTTP_AUTHORIZATION=f"Bearer {secret}")
    return client


def test_single_proposal_is_created_pending(agent: APIClient) -> None:
    response = agent.post(
        "/api/agent/quest-proposals/",
        {
            "title": "Lire 20 pages",
            "territory": "KNOWLEDGE",
            "difficulty": "EASY",
            "rationale": "Ton territoire Savoir n'a pas bougé depuis 12 jours.",
        },
        format="json",
    )
    assert response.status_code == 201
    data = response.json()
    assert isinstance(data, list)
    assert len(data) == 1
    proposal = data[0]
    assert proposal["status"] == "PENDING"
    assert proposal["agent_name"] == "Claude Code"
    assert proposal["xp_preview"] == 15
    assert proposal["quest"] is None
    assert proposal["decided_at"] is None
    assert proposal["rationale"] == "Ton territoire Savoir n'a pas bougé depuis 12 jours."


def test_batch_proposals_and_journal_message(agent: APIClient, user: User) -> None:
    items = [{"title": f"Mission {i}", "territory": "KNOWLEDGE"} for i in range(3)]
    response = agent.post("/api/agent/quest-proposals/", {"proposals": items}, format="json")
    assert response.status_code == 201
    assert len(response.json()) == 3
    entry = JournalEntry.objects.get(event_type="QUEST_PROPOSED")
    assert entry.actor == "Claude Code"
    assert entry.message == "Claude Code propose 3 missions. Accepte, modifie ou refuse chacune."


def test_single_proposal_journal_message(agent: APIClient) -> None:
    agent.post(
        "/api/agent/quest-proposals/",
        {"title": "Une", "territory": "KNOWLEDGE"},
        format="json",
    )
    entry = JournalEntry.objects.get(event_type="QUEST_PROPOSED")
    assert entry.message == "Claude Code propose 1 mission. Accepte, modifie ou refuse chacune."


def test_batch_limits(agent: APIClient) -> None:
    items = [{"title": f"Mission {i}", "territory": "KNOWLEDGE"} for i in range(11)]
    assert (
        agent.post("/api/agent/quest-proposals/", {"proposals": items}, format="json").status_code
        == 400
    )
    assert (
        agent.post("/api/agent/quest-proposals/", {"proposals": []}, format="json").status_code
        == 400
    )
    assert QuestProposal.objects.count() == 0


def test_proposals_scope_is_required(user: User, character: Character) -> None:
    _, secret = create_agent_token(user, "Lecture seule", ["profile", "quests"])
    client = APIClient()
    client.credentials(HTTP_AUTHORIZATION=f"Bearer {secret}")
    response = client.post(
        "/api/agent/quest-proposals/",
        {"title": "Lire", "territory": "KNOWLEDGE"},
        format="json",
    )
    assert response.status_code == 403
    assert QuestProposal.objects.count() == 0


def test_body_proposal_requires_body_scope(user: User, character: Character) -> None:
    _, secret = create_agent_token(user, "Agent", ["proposals"])
    client = APIClient()
    client.credentials(HTTP_AUTHORIZATION=f"Bearer {secret}")
    response = client.post(
        "/api/agent/quest-proposals/",
        {"title": "Nager", "territory": "BODY"},
        format="json",
    )
    assert response.status_code == 403
    assert QuestProposal.objects.count() == 0


def test_body_proposal_allowed_with_body_scope(agent: APIClient) -> None:
    response = agent.post(
        "/api/agent/quest-proposals/",
        {"title": "Nager", "territory": "BODY"},
        format="json",
    )
    assert response.status_code == 201
    assert response.json()[0]["territory"] == "BODY"


def test_server_fields_are_ignored(agent: APIClient) -> None:
    response = agent.post(
        "/api/agent/quest-proposals/",
        {
            "title": "Lire",
            "territory": "KNOWLEDGE",
            "status": "ACCEPTED",
            "xp_preview": 999,
            "quest": 1,
            "agent_name": "Pirate",
        },
        format="json",
    )
    assert response.status_code == 201
    proposal = response.json()[0]
    assert proposal["status"] == "PENDING"
    assert proposal["xp_preview"] == 30
    assert proposal["quest"] is None
    assert proposal["agent_name"] == "Claude Code"


def test_invalid_fields_are_refused(agent: APIClient) -> None:
    base = {"title": "Lire", "territory": "KNOWLEDGE"}
    assert (
        agent.post(
            "/api/agent/quest-proposals/", {**base, "territory": "MARS"}, format="json"
        ).status_code
        == 400
    )
    assert (
        agent.post(
            "/api/agent/quest-proposals/", {**base, "difficulty": "IMPOSSIBLE"}, format="json"
        ).status_code
        == 400
    )
    assert (
        agent.post(
            "/api/agent/quest-proposals/", {**base, "skill_branch": "inexistante"}, format="json"
        ).status_code
        == 400
    )
    assert agent.post("/api/agent/quest-proposals/", {}, format="json").status_code == 400


def test_valid_skill_branch_and_steps(agent: APIClient) -> None:
    load_skill_tree()
    response = agent.post(
        "/api/agent/quest-proposals/",
        {
            "title": "Lire",
            "territory": "KNOWLEDGE",
            "skill_branch": "reading",
            "steps": [{"title": "Choisir le livre", "is_required": True}],
            "due_date": "2026-12-01",
        },
        format="json",
    )
    assert response.status_code == 201
    proposal = response.json()[0]
    assert proposal["skill_branch"] == "reading"
    assert proposal["steps"][0]["title"] == "Choisir le livre"
    assert proposal["due_date"] == "2026-12-01"


def test_agent_lists_only_its_own_proposals(user: User, character: Character) -> None:
    token_a, secret_a = create_agent_token(user, "Agent A", ["proposals"])
    _, secret_b = create_agent_token(user, "Agent B", ["proposals"])
    create_proposals(token_a, [{"title": "A", "territory": "KNOWLEDGE"}])
    client_b = APIClient()
    client_b.credentials(HTTP_AUTHORIZATION=f"Bearer {secret_b}")
    create_proposals(
        AgentToken.objects.get(name="Agent B"), [{"title": "B", "territory": "KNOWLEDGE"}]
    )
    client_a = APIClient()
    client_a.credentials(HTTP_AUTHORIZATION=f"Bearer {secret_a}")
    data = client_a.get("/api/agent/quest-proposals/").json()
    assert len(data) == 1
    assert data[0]["title"] == "A"
    assert client_b.get("/api/agent/quest-proposals/").json()[0]["title"] == "B"


def test_user_list_pending_first_and_status_filter(api: APIClient, user: User) -> None:
    token, _ = create_agent_token(user, "Claude Code", ["proposals"])
    first, second, third = create_proposals(
        token,
        [
            {"title": "Une", "territory": "KNOWLEDGE"},
            {"title": "Deux", "territory": "KNOWLEDGE"},
            {"title": "Trois", "territory": "KNOWLEDGE"},
        ],
    )
    api.post(f"/api/quest-proposals/{second.pk}/reject/", {}, format="json")
    response = api.get("/api/quest-proposals/")
    assert response.status_code == 200
    data = response.json()
    assert data["count"] == 3
    titles = [item["title"] for item in data["results"]]
    assert titles == ["Trois", "Une", "Deux"]
    filtered = api.get("/api/quest-proposals/?status=REJECTED").json()
    assert filtered["count"] == 1
    assert filtered["results"][0]["title"] == "Deux"


def test_user_patch_pending_proposal(api: APIClient, user: User) -> None:
    token, _ = create_agent_token(user, "Claude Code", ["proposals"])
    proposal = create_proposals(token, [{"title": "Lire", "territory": "KNOWLEDGE"}])[0]
    response = api.patch(
        f"/api/quest-proposals/{proposal.pk}/",
        {"title": "Lire 30 pages", "difficulty": "HARD"},
        format="json",
    )
    assert response.status_code == 200
    data = response.json()
    assert data["title"] == "Lire 30 pages"
    assert data["difficulty"] == "HARD"
    assert data["xp_preview"] == 60
    assert JournalEntry.objects.filter(event_type="PROPOSAL_UPDATED").count() == 1


def test_patch_decided_proposal_is_conflict(api: APIClient, user: User) -> None:
    token, _ = create_agent_token(user, "Claude Code", ["proposals"])
    proposal = create_proposals(token, [{"title": "Lire", "territory": "KNOWLEDGE"}])[0]
    api.post(f"/api/quest-proposals/{proposal.pk}/reject/", {}, format="json")
    response = api.patch(f"/api/quest-proposals/{proposal.pk}/", {"title": "X"}, format="json")
    assert response.status_code == 409
    assert response.json()["detail"] == "Cette proposition a déjà été décidée."


def test_accept_creates_ai_quest_without_reward(
    api: APIClient, user: User, character: Character
) -> None:
    token, _ = create_agent_token(user, "Claude Code", ["proposals"])
    proposal = create_proposals(
        token,
        [
            {
                "title": "Lire",
                "territory": "KNOWLEDGE",
                "difficulty": "EASY",
                "steps": [{"title": "Choisir le livre"}],
            }
        ],
    )[0]
    response = api.post(f"/api/quest-proposals/{proposal.pk}/accept/", {}, format="json")
    assert response.status_code == 200
    data = response.json()
    assert data["proposal"]["status"] == "ACCEPTED"
    assert data["proposal"]["decided_at"] is not None
    quest = data["quest"]
    assert quest["origin"] == "AI"
    assert quest["status"] == "AVAILABLE"
    assert quest["xp_reward"] == 15
    assert len(quest["steps"]) == 1
    assert data["proposal"]["quest"] == quest["id"]
    # Aucune récompense tant que l'utilisateur n'a pas validé la mission.
    character.refresh_from_db()
    assert character.total_xp == 0
    assert character.credits == 0
    assert character.level == 1
    assert XPTransaction.objects.count() == 0
    assert QuestCompletion.objects.count() == 0
    entry = JournalEntry.objects.get(event_type="PROPOSAL_ACCEPTED")
    assert entry.actor == "user"
    assert entry.quest_id == quest["id"]


def test_accept_with_last_minute_overrides(api: APIClient, user: User) -> None:
    token, _ = create_agent_token(user, "Claude Code", ["proposals"])
    proposal = create_proposals(token, [{"title": "Lire", "territory": "KNOWLEDGE"}])[0]
    response = api.post(
        f"/api/quest-proposals/{proposal.pk}/accept/",
        {"title": "Lire 10 pages", "difficulty": "TRIVIAL"},
        format="json",
    )
    assert response.status_code == 200
    assert response.json()["quest"]["title"] == "Lire 10 pages"
    assert response.json()["quest"]["xp_reward"] == 5


def test_accept_twice_is_conflict(api: APIClient, user: User) -> None:
    token, _ = create_agent_token(user, "Claude Code", ["proposals"])
    proposal = create_proposals(token, [{"title": "Lire", "territory": "KNOWLEDGE"}])[0]
    assert (
        api.post(f"/api/quest-proposals/{proposal.pk}/accept/", {}, format="json").status_code
        == 200
    )
    response = api.post(f"/api/quest-proposals/{proposal.pk}/accept/", {}, format="json")
    assert response.status_code == 409
    assert Quest.objects.filter(origin="AI").count() == 1


def test_reject_with_reason(api: APIClient, user: User) -> None:
    token, _ = create_agent_token(user, "Claude Code", ["proposals"])
    proposal = create_proposals(token, [{"title": "Lire", "territory": "KNOWLEDGE"}])[0]
    response = api.post(
        f"/api/quest-proposals/{proposal.pk}/reject/",
        {"reason": "Pas cette semaine."},
        format="json",
    )
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "REJECTED"
    assert data["reject_reason"] == "Pas cette semaine."
    assert data["decided_at"] is not None
    assert data["quest"] is None
    assert JournalEntry.objects.filter(event_type="PROPOSAL_REJECTED").count() == 1
    # Une proposition refusée ne peut plus être acceptée.
    assert (
        api.post(f"/api/quest-proposals/{proposal.pk}/accept/", {}, format="json").status_code
        == 409
    )
    assert (
        api.post(f"/api/quest-proposals/{proposal.pk}/reject/", {}, format="json").status_code
        == 409
    )


def test_other_user_cannot_decide(user: User, other_user: User, character: Character) -> None:
    token, _ = create_agent_token(user, "Claude Code", ["proposals"])
    proposal = create_proposals(token, [{"title": "Lire", "territory": "KNOWLEDGE"}])[0]
    other_token = Token.objects.create(user=other_user)
    client = APIClient()
    client.credentials(HTTP_AUTHORIZATION=f"Token {other_token.key}")
    assert (
        client.post(f"/api/quest-proposals/{proposal.pk}/accept/", {}, format="json").status_code
        == 404
    )
    assert (
        client.post(f"/api/quest-proposals/{proposal.pk}/reject/", {}, format="json").status_code
        == 404
    )
    assert (
        client.patch(
            f"/api/quest-proposals/{proposal.pk}/", {"title": "X"}, format="json"
        ).status_code
        == 404
    )
    proposal.refresh_from_db()
    assert proposal.status == "PENDING"
