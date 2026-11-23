"""Tests des jetons d'agent : création, portées, révocation et authentification."""

from __future__ import annotations

import hashlib

import pytest
from rest_framework.authtoken.models import Token
from rest_framework.test import APIClient

from apps.accounts.models import User
from apps.ai_engine.models import AgentToken
from apps.journal.models import JournalEntry
from engine.agents import DEFAULT_SCOPES, SCOPES, create_agent_token

pytestmark = pytest.mark.django_db


@pytest.fixture
def api(user: User) -> APIClient:
    token = Token.objects.create(user=user)
    client = APIClient()
    client.credentials(HTTP_AUTHORIZATION=f"Token {token.key}")
    return client


def test_create_token_returns_secret_once(api: APIClient, user: User) -> None:
    response = api.post("/api/auth/agent-tokens/", {"name": "Claude Code"}, format="json")
    assert response.status_code == 201
    data = response.json()
    secret = data["token"]
    assert secret.startswith("lra_")
    assert len(secret) == 44
    assert data["prefix"] == secret[:8]
    assert data["name"] == "Claude Code"
    assert data["scopes"] == DEFAULT_SCOPES
    assert data["is_active"] is True
    assert data["revoked_at"] is None
    assert "key_hash" not in data
    token = AgentToken.objects.get(pk=data["id"])
    assert token.key_hash == hashlib.sha256(secret.encode("utf-8")).hexdigest()
    assert token.owner_id == user.id


def test_create_token_with_explicit_scopes(api: APIClient) -> None:
    scopes = ["profile", "quests", "journal", "proposals"]
    response = api.post(
        "/api/auth/agent-tokens/", {"name": "Agent", "scopes": scopes}, format="json"
    )
    assert response.status_code == 201
    assert response.json()["scopes"] == scopes


def test_create_token_unknown_scope_is_refused(api: APIClient) -> None:
    response = api.post(
        "/api/auth/agent-tokens/", {"name": "Agent", "scopes": ["admin"]}, format="json"
    )
    assert response.status_code == 400
    assert AgentToken.objects.count() == 0


def test_create_token_requires_name(api: APIClient) -> None:
    assert api.post("/api/auth/agent-tokens/", {}, format="json").status_code == 400
    assert api.post("/api/auth/agent-tokens/", {"name": "   "}, format="json").status_code == 400
    assert api.post("/api/auth/agent-tokens/", {"name": "x" * 61}, format="json").status_code == 400


def test_body_and_proposals_never_default(api: APIClient) -> None:
    response = api.post("/api/auth/agent-tokens/", {"name": "Agent"}, format="json")
    scopes = response.json()["scopes"]
    assert "body" not in scopes
    assert "proposals" not in scopes


def test_list_tokens_hides_secret_and_hash(api: APIClient, user: User) -> None:
    _, secret = create_agent_token(user, "Claude Code")
    response = api.get("/api/auth/agent-tokens/")
    assert response.status_code == 200
    data = response.json()
    assert len(data) == 1
    assert "token" not in data[0]
    assert "key_hash" not in data[0]
    assert secret not in response.content.decode()


def test_delete_revokes_without_deleting(api: APIClient, user: User) -> None:
    token, _ = create_agent_token(user, "Claude Code")
    response = api.delete(f"/api/auth/agent-tokens/{token.pk}/")
    assert response.status_code == 204
    token.refresh_from_db()
    assert token.revoked_at is not None
    assert token.is_active is False
    listing = api.get("/api/auth/agent-tokens/").json()
    assert len(listing) == 1
    assert listing[0]["is_active"] is False


def test_revoke_is_idempotent(api: APIClient, user: User) -> None:
    token, _ = create_agent_token(user, "Claude Code")
    assert api.delete(f"/api/auth/agent-tokens/{token.pk}/").status_code == 204
    assert api.delete(f"/api/auth/agent-tokens/{token.pk}/").status_code == 204
    assert JournalEntry.objects.filter(event_type="AGENT_TOKEN_REVOKED").count() == 1


def test_token_actions_are_journaled_as_user(api: APIClient, user: User) -> None:
    token, _ = create_agent_token(user, "Claude Code")
    api.delete(f"/api/auth/agent-tokens/{token.pk}/")
    created = JournalEntry.objects.get(event_type="AGENT_TOKEN_CREATED")
    revoked = JournalEntry.objects.get(event_type="AGENT_TOKEN_REVOKED")
    assert created.actor == "user"
    assert revoked.actor == "user"
    assert created.owner_id == user.id


def test_revoked_token_is_refused_immediately(user: User) -> None:
    token, secret = create_agent_token(user, "Claude Code")
    client = APIClient()
    client.credentials(HTTP_AUTHORIZATION=f"Bearer {secret}")
    assert client.get("/api/agent/context/").status_code == 200
    token.revoked_at = token.created_at
    token.save(update_fields=["revoked_at"])
    response = client.get("/api/agent/context/")
    assert response.status_code == 401
    assert response.json()["detail"] == "Jeton révoqué."


def test_unknown_token_is_refused(user: User) -> None:
    client = APIClient()
    client.credentials(HTTP_AUTHORIZATION="Bearer lra_" + "x" * 40)
    response = client.get("/api/agent/context/")
    assert response.status_code == 401
    assert response.json()["detail"] == "Jeton d'agent invalide."


def test_last_used_at_is_updated(user: User) -> None:
    token, secret = create_agent_token(user, "Claude Code")
    assert token.last_used_at is None
    client = APIClient()
    client.credentials(HTTP_AUTHORIZATION=f"Bearer {secret}")
    assert client.get("/api/agent/context/").status_code == 200
    token.refresh_from_db()
    first_use = token.last_used_at
    assert first_use is not None
    # Moins d'une minute plus tard : pas de nouvelle écriture.
    assert client.get("/api/agent/context/").status_code == 200
    token.refresh_from_db()
    assert token.last_used_at == first_use


def test_all_scopes_are_accepted(api: APIClient) -> None:
    response = api.post(
        "/api/auth/agent-tokens/", {"name": "Agent", "scopes": list(SCOPES)}, format="json"
    )
    assert response.status_code == 201
    assert response.json()["scopes"] == list(SCOPES)


def test_other_user_cannot_revoke(user: User, other_user: User) -> None:
    token, _ = create_agent_token(user, "Claude Code")
    other_token = Token.objects.create(user=other_user)
    client = APIClient()
    client.credentials(HTTP_AUTHORIZATION=f"Token {other_token.key}")
    response = client.delete(f"/api/auth/agent-tokens/{token.pk}/")
    assert response.status_code == 404
    token.refresh_from_db()
    assert token.revoked_at is None
