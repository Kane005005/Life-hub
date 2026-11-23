"""Refus global des jetons d'agent hors des endpoints /api/agent/."""

from __future__ import annotations

import json
import re
from uuid import uuid4

import pytest
from django.urls import URLPattern, URLResolver, get_resolver
from rest_framework.authtoken.models import Token
from rest_framework.test import APIClient

from apps.accounts.models import User
from apps.ai_engine.models import AgentToken, QuestProposal
from apps.analytics.models import EnergyCheckIn
from apps.character.models import Character
from apps.economy.models import CreditTransaction, InventoryItem, RewardPurchase, ShopItem
from apps.journal.models import JournalEntry
from apps.progression.models import XPTransaction
from apps.quests.models import Quest, QuestCompletion
from apps.seasons.models import Season
from apps.skills.models import SkillPointTransaction, SkillUnlock
from engine.agents import SCOPES, create_agent_token, create_proposals
from engine.economy import purchase, seed_shop
from engine.services import create_quest

pytestmark = pytest.mark.django_db

DENY_MESSAGE = "Cette action est réservée à l'utilisateur."
METHODS = ["GET", "POST", "PATCH", "PUT", "DELETE"]


def _sample_group(match: re.Match) -> str:
    """Valeur d'exemple qui satisfait la contrainte du groupe nommé."""
    name = match.group(1)
    if name in {"pk", "id", "step_id"}:
        return "1"
    return "knowledge.reading.t1"


def _concrete_path(route: str) -> str:
    """Transforme un motif d'URL en chemin concret pour les tests."""
    route = re.sub(r"\(\?:[^()]*(?:\([^()]*\)[^()]*)*\)\?", "", route)
    route = re.sub(r"\(\?P<(\w+)>[^)]*\)", _sample_group, route)
    route = re.sub(r"<int:\w+>", "1", route)
    route = re.sub(r"<uuid:\w+>", str(uuid4()), route)
    route = re.sub(r"<\w+:\w+>", "exemple", route)
    # Les routes du routeur DRF sont des regex ancrées (« ^quests/$ ») au milieu du préfixe.
    route = route.replace("\\.", ".").replace("?", "").replace("^", "").replace("$", "")
    return route


def _api_routes() -> list[str]:
    """Toutes les routes API sauf /api/agent/ et /api/health/, depuis config/urls.py."""

    def walk(patterns: list, prefix: str = ""):
        for entry in patterns:
            if isinstance(entry, URLResolver):
                yield from walk(entry.url_patterns, prefix + str(entry.pattern))
            elif isinstance(entry, URLPattern):
                yield prefix + str(entry.pattern)

    routes = set()
    for route in walk(get_resolver().url_patterns):
        concrete = _concrete_path(route)
        if not concrete.startswith("api/"):
            continue
        if concrete.startswith("api/agent/") or concrete == "api/health/":
            continue
        routes.add("/" + concrete)
    return sorted(routes)


@pytest.fixture
def agent(user: User) -> APIClient:
    """Client authentifié par un jeton d'agent avec toutes les portées."""
    _, secret = create_agent_token(user, "Agent Sécurité", list(SCOPES))
    client = APIClient()
    client.credentials(HTTP_AUTHORIZATION=f"Bearer {secret}")
    return client


@pytest.fixture
def api(user: User) -> APIClient:
    token = Token.objects.create(user=user)
    client = APIClient()
    client.credentials(HTTP_AUTHORIZATION=f"Token {token.key}")
    return client


@pytest.mark.parametrize("method", METHODS)
@pytest.mark.parametrize("path", _api_routes())
def test_agent_token_never_gets_2xx_outside_agent_routes(
    agent: APIClient, method: str, path: str
) -> None:
    """Aucune route utilisateur ne répond 2xx à un jeton d'agent."""
    if method in {"POST", "PATCH", "PUT"}:
        response = agent.generic(method, path, "{}", content_type="application/json")
    else:
        response = agent.generic(method, path)
    assert response.status_code not in range(200, 300)
    if path == "/api/auth/login/":
        # La connexion reste publique : le corps vide est simplement refusé.
        assert response.status_code in {400, 405}
    else:
        assert response.status_code == 403
        if path != "/api/schema/":  # le schéma répond en YAML (OpenAPI), le refus suffit
            assert response.json()["detail"] == DENY_MESSAGE


def _db_state() -> dict:
    """Instantané des compteurs et états qui ne doivent jamais bouger."""
    return {
        "quests": Quest.objects.count(),
        "completions": QuestCompletion.objects.count(),
        "journal": JournalEntry.objects.count(),
        "xp": XPTransaction.objects.count(),
        "credits": CreditTransaction.objects.count(),
        "points": SkillPointTransaction.objects.count(),
        "unlocks": SkillUnlock.objects.count(),
        "inventory": InventoryItem.objects.count(),
        "purchases": RewardPurchase.objects.count(),
        "tokens": AgentToken.objects.count(),
        "proposals": QuestProposal.objects.count(),
        "energy": EnergyCheckIn.objects.count(),
        "seasons": Season.objects.count(),
    }


@pytest.fixture
def world_state(user: User, character: Character) -> dict:
    """Données existantes visées par les appels destructeurs."""
    seed_shop()
    quest = create_quest(user, {"title": "Lire", "territory": "KNOWLEDGE", "difficulty": "EASY"})
    item = ShopItem.objects.first()
    character.credits = 1000
    character.save(update_fields=["credits"])
    purchase(user, item)
    inventory = InventoryItem.objects.get(character=character, item=item)
    token, _ = create_agent_token(user, "Agent Propositions", ["proposals"])
    proposal = create_proposals(token, [{"title": "Proposée", "territory": "KNOWLEDGE"}])[0]
    return {
        "quest": quest.pk,
        "item": item.pk,
        "inventory": inventory.pk,
        "token": token.pk,
        "proposal": proposal.pk,
    }


DESTRUCTIVE_CALLS = [
    ("POST", "/api/quests/", {"title": "Pirate", "territory": "KNOWLEDGE"}),
    ("PATCH", "/api/quests/{quest}/", {"title": "Pirate"}),
    ("PUT", "/api/quests/{quest}/", {"title": "Pirate", "territory": "KNOWLEDGE"}),
    ("DELETE", "/api/quests/{quest}/", None),
    ("POST", "/api/quests/{quest}/accept/", None),
    ("POST", "/api/quests/{quest}/complete/", None),
    ("POST", "/api/quests/{quest}/abandon/", None),
    ("POST", "/api/skills/knowledge.reading.t1/unlock/", None),
    ("POST", "/api/economy/rewards/{item}/purchase/", None),
    ("POST", "/api/economy/inventory/{inventory}/equip/", None),
    ("POST", "/api/economy/inventory/{inventory}/unequip/", None),
    ("POST", "/api/auth/agent-tokens/", {"name": "Pirate"}),
    ("DELETE", "/api/auth/agent-tokens/{token}/", None),
    ("PATCH", "/api/quest-proposals/{proposal}/", {"title": "Pirate"}),
    ("POST", "/api/quest-proposals/{proposal}/accept/", None),
    ("POST", "/api/quest-proposals/{proposal}/reject/", None),
    ("POST", "/api/energy/", {"level": 3}),
    ("POST", "/api/journal/rest/", None),
    ("POST", "/api/seasons/", {"name": "Pirate"}),
    ("PATCH", "/api/character/", {"pseudonym": "Pirate"}),
    ("PATCH", "/api/character/avatar/", {"color": "#000000"}),
]


@pytest.mark.parametrize(("method", "path", "body"), DESTRUCTIVE_CALLS)
def test_agent_destructive_calls_are_denied_without_db_change(
    agent: APIClient,
    character: Character,
    world_state: dict,
    method: str,
    path: str,
    body: dict | None,
) -> None:
    """Chaque appel sensible renvoie 403 et ne modifie strictement rien."""
    path = path.format(**world_state)
    character.refresh_from_db()  # la fixture a déjà fait un achat : partir de l'état en base
    before = _db_state()
    character_before = (
        character.level,
        character.total_xp,
        character.xp_in_level,
        character.credits,
        character.skill_points_available,
        character.pseudonym,
    )
    quest_before = Quest.objects.get(pk=world_state["quest"]).status
    proposal_before = QuestProposal.objects.get(pk=world_state["proposal"]).status

    if body is None:
        response = agent.generic(method, path)
    else:
        response = agent.generic(method, path, json.dumps(body), content_type="application/json")

    assert response.status_code == 403
    assert response.json()["detail"] == DENY_MESSAGE
    assert _db_state() == before
    character.refresh_from_db()
    assert (
        character.level,
        character.total_xp,
        character.xp_in_level,
        character.credits,
        character.skill_points_available,
        character.pseudonym,
    ) == character_before
    assert Quest.objects.get(pk=world_state["quest"]).status == quest_before
    assert QuestProposal.objects.get(pk=world_state["proposal"]).status == proposal_before


def test_agent_keeps_access_to_agent_routes(agent: APIClient) -> None:
    """Le refus global ne touche pas les endpoints /api/agent/."""
    response = agent.get("/api/agent/context/")
    assert response.status_code == 200


def test_user_token_still_works(api: APIClient, character: Character) -> None:
    """Le jeton personnel de l'utilisateur n'est pas affecté par le refus global."""
    response = api.get("/api/character/")
    assert response.status_code == 200
