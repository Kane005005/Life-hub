"""Moteur des agents (phase 3) : jetons, contexte borné et propositions de missions.

L'agent propose, l'utilisateur décide : ce module n'attribue jamais d'XP, de
crédits ni de points, ne débloque rien et ne valide aucune mission.
"""

from __future__ import annotations

import secrets
from collections.abc import Mapping
from typing import TYPE_CHECKING

from django.db import transaction
from django.utils import timezone

from apps.ai_engine.authentication import TOKEN_PREFIX, hash_secret
from apps.ai_engine.models import AgentToken, ProposalStatus, QuestProposal
from apps.analytics.models import EnergyCheckIn
from apps.journal.models import JournalEntry
from apps.progression.models import GameSettings
from apps.quests.models import Difficulty, Priority, Quest, QuestCompletion, QuestType
from apps.skills.models import SkillUnlock
from apps.world.models import Territory
from engine.energy import energy_snapshot
from engine.events import log_event
from engine.exceptions import AgentScopeError, EngineError, NotOwnedError, ProposalDecided
from engine.insights import compute_insights
from engine.rules import rank_for_level, xp_for_difficulty, xp_required
from engine.seasons import season_snapshot
from engine.services import (
    ACTIVE_STATUSES,
    _parse_date,
    _resolve_territory,
    _validate_skill_branch,
    create_quest,
    ensure_character,
    territory_stats,
)
from engine.skills import skill_trees

if TYPE_CHECKING:
    from apps.accounts.models import User

SCOPES: tuple[str, ...] = (
    "profile",
    "progression",
    "quests",
    "skills",
    "seasons",
    "journal",
    "energy",
    "body",
    "proposals",
)
DEFAULT_SCOPES: list[str] = ["profile", "progression", "quests"]
SECRET_RANDOM_LENGTH = 40
MAX_PROPOSALS_PER_BATCH = 10
ACTIVE_QUEST_LIMIT = 50
RECENT_COMPLETION_LIMIT = 20
JOURNAL_LIMIT = 50
ENERGY_LIMIT = 7
PROPOSAL_EDITABLE_FIELDS = (
    "title",
    "description",
    "territory",
    "quest_type",
    "difficulty",
    "priority",
    "estimated_minutes",
    "due_date",
    "scheduled_date",
    "skill_branch",
    "steps",
    "rationale",
)


@transaction.atomic
def create_agent_token(
    user: User,
    name: str,
    scopes: list[str] | None = None,
) -> tuple[AgentToken, str]:
    """Crée un jeton nommé et renvoie (jeton, secret) ; le secret n'est montré qu'une fois."""
    clean_name = name.strip()
    if not clean_name or len(clean_name) > 60:
        raise EngineError("Le nom du jeton doit contenir entre 1 et 60 caractères.")
    if scopes is None:
        scopes = list(DEFAULT_SCOPES)
    unknown = [scope for scope in scopes if scope not in SCOPES]
    if unknown:
        raise EngineError(f"Portée inconnue : {', '.join(unknown)}.")
    secret = TOKEN_PREFIX + secrets.token_urlsafe(30)[:SECRET_RANDOM_LENGTH]
    token = AgentToken.objects.create(
        owner=user,
        name=clean_name,
        prefix=secret[:8],
        key_hash=hash_secret(secret),
        scopes=list(scopes),
    )
    log_event(
        user,
        "AGENT_TOKEN_CREATED",
        f"Jeton d'agent « {clean_name} » créé.",
        payload={"name": clean_name, "prefix": token.prefix, "scopes": token.scopes},
    )
    return token, secret


@transaction.atomic
def revoke_agent_token(token: AgentToken) -> AgentToken:
    """Révoque un jeton sans le supprimer ; l'opération est idempotente."""
    token = AgentToken.objects.select_for_update().get(pk=token.pk)
    if token.revoked_at is None:
        token.revoked_at = timezone.now()
        token.save(update_fields=["revoked_at"])
        log_event(
            token.owner,
            "AGENT_TOKEN_REVOKED",
            f"Jeton d'agent « {token.name} » révoqué.",
            payload={"name": token.name, "prefix": token.prefix},
        )
    return token


def agent_context(token: AgentToken) -> dict:
    """Construit le contexte borné d'un agent : seules ses portées y figurent.

    Sans la portée ``body``, tout ce qui touche au territoire BODY est retiré.
    La lecture est journalisée au nom de l'agent.
    """
    user = token.owner
    character = ensure_character(user)
    scopes = list(token.scopes)
    has_body = "body" in scopes
    settings = GameSettings.load()
    today = timezone.localdate()
    context: dict = {
        "agent": token.name,
        "scopes": scopes,
        "generated_at": timezone.now(),
    }

    if "profile" in scopes:
        context["profile"] = {
            "pseudonym": character.pseudonym,
            "character_class": character.character_class,
            "level": character.level,
            "rank": rank_for_level(character.level, settings.ranks),
            "active_title": character.active_title or None,
        }

    if "progression" in scopes:
        territories = territory_stats(character)
        if not has_body:
            territories = [stat for stat in territories if stat["code"] != "BODY"]
        context["progression"] = {
            "level": character.level,
            "xp_in_level": character.xp_in_level,
            "xp_required": xp_required(character.level),
            "total_xp": character.total_xp,
            "territories": territories,
            "insights": compute_insights(user, today=today, include_body=has_body),
        }

    if "quests" in scopes:
        active_qs = Quest.objects.filter(owner=user, status__in=ACTIVE_STATUSES)
        completions_qs = QuestCompletion.objects.filter(quest__owner=user)
        if not has_body:
            active_qs = active_qs.exclude(territory__code="BODY")
            completions_qs = completions_qs.exclude(quest__territory__code="BODY")
        active_qs = active_qs.select_related("territory").order_by("created_at", "id")
        completions_qs = completions_qs.select_related("quest__territory").order_by(
            "-completed_at", "-id"
        )
        context["quests"] = {
            "active": [
                {
                    "id": quest.id,
                    "title": quest.title,
                    "territory": quest.territory.code,
                    "quest_type": quest.quest_type,
                    "difficulty": quest.difficulty,
                    "status": quest.status,
                    "due_date": quest.due_date,
                    "skill_branch": quest.skill_branch,
                }
                for quest in active_qs[:ACTIVE_QUEST_LIMIT]
            ],
            "recent_completions": [
                {
                    "title": completion.quest.title,
                    "territory": completion.quest.territory.code,
                    "completed_at": completion.completed_at,
                }
                for completion in completions_qs[:RECENT_COMPLETION_LIMIT]
            ],
        }

    if "skills" in scopes:
        unlocks = SkillUnlock.objects.filter(character=character).select_related(
            "skill__branch__tree__territory"
        )
        unlocked = [
            {
                "code": unlock.skill.code,
                "name": unlock.skill.name,
                "territory": unlock.skill.branch.tree.territory.code,
            }
            for unlock in unlocks
            if has_body or unlock.skill.branch.tree.territory.code != "BODY"
        ]
        trees = []
        for tree in skill_trees(character):
            if not has_body and tree["territory"] == "BODY":
                continue
            trees.append(
                {
                    "territory": tree["territory"],
                    "branches": [
                        {
                            "code": branch["code"],
                            "name": branch["name"],
                            "validated_quests": branch["validated_quests"],
                        }
                        for branch in tree["branches"]
                    ],
                }
            )
        context["skills"] = {
            "available_points": character.skill_points_available,
            "unlocked": unlocked,
            "trees": trees,
        }

    if "seasons" in scopes:
        from apps.seasons.models import Season

        season = Season.objects.filter(owner=user, status="ACTIVE").first()
        current = None
        if season is not None and season.end_date >= today:
            current = season_snapshot(season, today=today)
        context["seasons"] = {"current": current}

    if "journal" in scopes:
        entries = JournalEntry.objects.filter(owner=user)
        if not has_body:
            entries = entries.exclude(quest__territory__code="BODY")
        entries = entries.order_by("-created_at", "-id")
        context["journal"] = [
            {
                "event_type": entry.event_type,
                "message": entry.message,
                "created_at": entry.created_at,
            }
            for entry in entries[:JOURNAL_LIMIT]
        ]

    if "energy" in scopes:
        checkins = EnergyCheckIn.objects.filter(owner=user).order_by("-date", "-id")
        context["energy"] = [energy_snapshot(checkin) for checkin in checkins[:ENERGY_LIMIT]]

    if "proposals" in scopes:
        pending = QuestProposal.objects.filter(owner=user, status=ProposalStatus.PENDING).count()
        context["proposals"] = {"pending": pending}

    log_event(
        user,
        "AGENT_CONTEXT_READ",
        f"{token.name} lit le contexte de jeu.",
        payload={"scopes": scopes},
        actor=token.name,
    )
    return context


def _validate_proposal_fields(item: Mapping) -> dict:
    """Valide les champs d'une proposition comme à la création d'une mission."""
    title = str(item.get("title", "")).strip()
    if not title or len(title) > 200:
        raise EngineError("Le titre de la proposition doit contenir entre 1 et 200 caractères.")
    try:
        territory = _resolve_territory(str(item.get("territory", "")))
    except Territory.DoesNotExist:
        raise EngineError("Territoire inconnu.") from None
    quest_type = str(item.get("quest_type", QuestType.SIDE))
    if quest_type not in QuestType.values:
        raise EngineError("Type de mission inconnu.")
    difficulty = str(item.get("difficulty", Difficulty.MEDIUM))
    if difficulty not in Difficulty.values:
        raise EngineError("Difficulté inconnue.")
    priority = str(item.get("priority", Priority.NORMAL))
    if priority not in Priority.values:
        raise EngineError("Priorité inconnue.")
    estimated = int(item.get("estimated_minutes", 0) or 0)
    if estimated < 0:
        raise EngineError("La durée estimée doit être positive ou nulle.")
    try:
        due_date = _parse_date(item.get("due_date"))
    except ValueError:
        raise EngineError("Date d'échéance invalide.") from None
    try:
        scheduled_date = _parse_date(item.get("scheduled_date"))
    except ValueError:
        raise EngineError("Date de planification invalide.") from None
    skill_branch = str(item.get("skill_branch", ""))
    _validate_skill_branch(territory, skill_branch)

    steps = item.get("steps", []) or []
    if not isinstance(steps, list):
        raise EngineError("Les étapes doivent être une liste.")
    clean_steps = []
    for index, step in enumerate(steps):
        if not isinstance(step, Mapping):
            raise EngineError("Chaque étape doit être un objet.")
        step_title = str(step.get("title", "")).strip()
        if not step_title or len(step_title) > 200:
            raise EngineError("Le titre d'une étape doit contenir entre 1 et 200 caractères.")
        clean_steps.append(
            {
                "title": step_title,
                "order": int(step.get("order", index)),
                "is_required": bool(step.get("is_required", True)),
            }
        )
    return {
        "title": title,
        "description": str(item.get("description", "")),
        "territory": territory.code,
        "quest_type": quest_type,
        "difficulty": difficulty,
        "priority": priority,
        "estimated_minutes": estimated,
        "due_date": due_date,
        "scheduled_date": scheduled_date,
        "skill_branch": skill_branch,
        "steps": clean_steps,
        "rationale": str(item.get("rationale", "")),
    }


@transaction.atomic
def create_proposals(token: AgentToken, items: list[Mapping]) -> list[QuestProposal]:
    """Crée 1 à 10 propositions en attente ; aucune récompense n'est attachée."""
    if "proposals" not in token.scopes:
        raise AgentScopeError("La portée proposals est requise pour proposer des missions.")
    if not items:
        raise EngineError("Au moins une proposition est requise.")
    if len(items) > MAX_PROPOSALS_PER_BATCH:
        raise EngineError("Dix propositions au maximum par envoi.")
    has_body = "body" in token.scopes
    settings = GameSettings.load()
    proposals = []
    for item in items:
        data = _validate_proposal_fields(item)
        if data["territory"] == "BODY" and not has_body:
            raise AgentScopeError("La portée body est requise pour proposer une mission en Corps.")
        proposals.append(
            QuestProposal.objects.create(
                owner=token.owner,
                token=token,
                agent_name=token.name,
                xp_preview=xp_for_difficulty(data["difficulty"], settings.xp_by_difficulty),
                **data,
            )
        )
    count = len(proposals)
    plural = "s" if count > 1 else ""
    log_event(
        token.owner,
        "QUEST_PROPOSED",
        f"{token.name} propose {count} mission{plural}. Accepte, modifie ou refuse chacune.",
        payload={"count": count, "proposals": [str(proposal.uuid) for proposal in proposals]},
        actor=token.name,
    )
    return proposals


def _merge_proposal_fields(proposal: QuestProposal, data: Mapping) -> dict:
    """Fusionne les champs modifiables d'une proposition avec les nouvelles valeurs."""
    merged = {field: getattr(proposal, field) for field in PROPOSAL_EDITABLE_FIELDS}
    for field in PROPOSAL_EDITABLE_FIELDS:
        if field in data:
            merged[field] = data[field]
    return _validate_proposal_fields(merged)


@transaction.atomic
def update_proposal(proposal: QuestProposal, data: Mapping) -> QuestProposal:
    """Modifie une proposition en attente ; 409 si elle est déjà décidée."""
    proposal = QuestProposal.objects.select_for_update().get(pk=proposal.pk)
    if proposal.status != ProposalStatus.PENDING:
        raise ProposalDecided()
    validated = _merge_proposal_fields(proposal, data)
    for field, value in validated.items():
        setattr(proposal, field, value)
    settings = GameSettings.load()
    proposal.xp_preview = xp_for_difficulty(proposal.difficulty, settings.xp_by_difficulty)
    proposal.save()
    log_event(
        proposal.owner,
        "PROPOSAL_UPDATED",
        "Proposition mise à jour.",
        payload={"proposal": str(proposal.uuid)},
    )
    return proposal


@transaction.atomic
def accept_proposal(
    user: User,
    proposal: QuestProposal,
    overrides: Mapping | None = None,
) -> tuple[QuestProposal, Quest]:
    """Accepte une proposition : crée une mission AI disponible, sans récompense."""
    proposal = QuestProposal.objects.select_for_update().get(pk=proposal.pk)
    if proposal.owner_id != user.id:
        raise NotOwnedError("Cette proposition ne t'appartient pas.")
    if proposal.status != ProposalStatus.PENDING:
        raise ProposalDecided()
    if overrides:
        validated = _merge_proposal_fields(proposal, overrides)
        for field, value in validated.items():
            setattr(proposal, field, value)
    quest = create_quest(
        user,
        {
            "title": proposal.title,
            "description": proposal.description,
            "territory": proposal.territory,
            "quest_type": proposal.quest_type,
            "difficulty": proposal.difficulty,
            "priority": proposal.priority,
            "estimated_minutes": proposal.estimated_minutes,
            "due_date": proposal.due_date,
            "scheduled_date": proposal.scheduled_date,
            "skill_branch": proposal.skill_branch,
        },
        steps=proposal.steps,
        origin="AI",
    )
    proposal.status = ProposalStatus.ACCEPTED
    proposal.quest = quest
    proposal.xp_preview = quest.xp_reward
    proposal.decided_at = timezone.now()
    proposal.save()
    log_event(
        user,
        "PROPOSAL_ACCEPTED",
        f"Proposition acceptée : {proposal.title}.",
        quest=quest,
        payload={"proposal": str(proposal.uuid), "agent": proposal.agent_name},
    )
    return proposal, quest


@transaction.atomic
def reject_proposal(user: User, proposal: QuestProposal, reason: str = "") -> QuestProposal:
    """Refuse une proposition en attente ; 409 si elle est déjà décidée."""
    proposal = QuestProposal.objects.select_for_update().get(pk=proposal.pk)
    if proposal.owner_id != user.id:
        raise NotOwnedError("Cette proposition ne t'appartient pas.")
    if proposal.status != ProposalStatus.PENDING:
        raise ProposalDecided()
    proposal.status = ProposalStatus.REJECTED
    proposal.decided_at = timezone.now()
    proposal.reject_reason = reason
    proposal.save(update_fields=["status", "decided_at", "reject_reason", "updated_at"])
    log_event(
        user,
        "PROPOSAL_REJECTED",
        "Proposition refusée.",
        payload={"proposal": str(proposal.uuid), "reason": reason},
    )
    return proposal
