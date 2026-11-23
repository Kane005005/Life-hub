"""Export complet des données du joueur (phase 3), en lecture seule.

Les secrets et empreintes de jetons d'agent ne figurent jamais dans l'export.
"""

from __future__ import annotations

from datetime import date, datetime
from typing import TYPE_CHECKING

from django.utils import timezone

from apps.achievements.models import PlayerAchievement
from apps.ai_engine.models import QuestProposal
from apps.analytics.models import EnergyCheckIn
from apps.economy.models import CreditTransaction, Equipment, InventoryItem, RewardPurchase
from apps.journal.models import JournalEntry
from apps.progression.models import XPTransaction
from apps.quests.models import Quest, QuestCompletion
from apps.seasons.models import Season
from apps.skills.models import SkillPointTransaction, SkillUnlock
from engine.energy import ENERGY_LABELS
from engine.seasons import season_snapshot
from engine.services import character_snapshot, ensure_character, territory_stats

if TYPE_CHECKING:
    from apps.accounts.models import User


def _iso(value: datetime | date | None) -> str | None:
    """Convertit une date ou une date-heure en chaîne ISO, en laissant passer None."""
    return value.isoformat() if value is not None else None


def _quest_data(quest: Quest) -> dict:
    """Mission complète avec ses étapes, pour l'export."""
    return {
        "id": quest.id,
        "uuid": str(quest.uuid),
        "title": quest.title,
        "description": quest.description,
        "territory": quest.territory.code,
        "quest_type": quest.quest_type,
        "difficulty": quest.difficulty,
        "priority": quest.priority,
        "estimated_minutes": quest.estimated_minutes,
        "start_date": _iso(quest.start_date),
        "due_date": _iso(quest.due_date),
        "xp_reward": quest.xp_reward,
        "credit_reward": quest.credit_reward,
        "validation_mode": quest.validation_mode,
        "origin": quest.origin,
        "status": quest.status,
        "skill_branch": quest.skill_branch,
        "season": quest.season_id,
        "steps": [
            {
                "id": step.id,
                "title": step.title,
                "order": step.order,
                "is_required": step.is_required,
                "is_done": step.is_done,
                "done_at": _iso(step.done_at),
            }
            for step in quest.steps.all()
        ],
        "created_at": _iso(quest.created_at),
        "updated_at": _iso(quest.updated_at),
        "completed_at": _iso(quest.completed_at),
    }


def _proposal_data(proposal: QuestProposal) -> dict:
    """Proposition de mission, sans aucune donnée de jeton."""
    return {
        "id": proposal.id,
        "uuid": str(proposal.uuid),
        "agent_name": proposal.agent_name,
        "status": proposal.status,
        "title": proposal.title,
        "description": proposal.description,
        "rationale": proposal.rationale,
        "territory": proposal.territory,
        "quest_type": proposal.quest_type,
        "difficulty": proposal.difficulty,
        "priority": proposal.priority,
        "estimated_minutes": proposal.estimated_minutes,
        "due_date": _iso(proposal.due_date),
        "skill_branch": proposal.skill_branch,
        "steps": proposal.steps,
        "xp_preview": proposal.xp_preview,
        "quest": proposal.quest_id,
        "decided_at": _iso(proposal.decided_at),
        "reject_reason": proposal.reject_reason,
        "created_at": _iso(proposal.created_at),
    }


def export_user_data(user: User) -> dict:
    """Rassemble toutes les données du joueur dans un dictionnaire sérialisable en JSON."""
    character = ensure_character(user)
    quests = (
        Quest.objects.filter(owner=user)
        .select_related("territory", "season")
        .prefetch_related("steps")
        .order_by("created_at", "id")
    )
    completions = (
        QuestCompletion.objects.filter(quest__owner=user)
        .select_related("quest__territory")
        .order_by("completed_at", "id")
    )
    xp_transactions = (
        XPTransaction.objects.filter(character=character)
        .select_related("territory")
        .order_by("created_at", "id")
    )
    credit_transactions = CreditTransaction.objects.filter(character=character).order_by(
        "created_at", "id"
    )
    point_transactions = SkillPointTransaction.objects.filter(character=character).order_by(
        "created_at", "id"
    )
    unlocks = SkillUnlock.objects.filter(character=character).select_related(
        "skill__branch__tree__territory"
    )
    achievements = PlayerAchievement.objects.filter(character=character).select_related(
        "achievement"
    )
    inventory = InventoryItem.objects.filter(character=character).select_related("item")
    purchases = RewardPurchase.objects.filter(character=character).select_related("item")
    equipment = Equipment.objects.filter(character=character).select_related("item__item")
    seasons = Season.objects.filter(owner=user).prefetch_related(
        "objectives", "priority_territories"
    )
    journal = JournalEntry.objects.filter(owner=user).order_by("created_at", "id")
    checkins = EnergyCheckIn.objects.filter(owner=user).order_by("date", "id")
    proposals = QuestProposal.objects.filter(owner=user).order_by("created_at", "id")

    seasons_data = []
    for season in seasons:
        data = season_snapshot(season)
        data["closed_at"] = _iso(data["closed_at"])
        seasons_data.append(data)

    return {
        "exported_at": timezone.now().isoformat(),
        "user": {"id": user.id, "username": user.username},
        "character": character_snapshot(character),
        "territories": territory_stats(character),
        "quests": [_quest_data(quest) for quest in quests],
        "completions": [
            {
                "uuid": str(completion.uuid),
                "quest": completion.quest_id,
                "quest_title": completion.quest.title,
                "territory": completion.quest.territory.code,
                "period_key": completion.period_key,
                "note": completion.note,
                "xp_awarded": completion.xp_awarded,
                "credits_awarded": completion.credits_awarded,
                "completed_at": _iso(completion.completed_at),
            }
            for completion in completions
        ],
        "xp_transactions": [
            {
                "uuid": str(transaction.uuid),
                "amount": transaction.amount,
                "territory": transaction.territory.code,
                "level_before": transaction.level_before,
                "level_after": transaction.level_after,
                "created_at": _iso(transaction.created_at),
            }
            for transaction in xp_transactions
        ],
        "credit_transactions": [
            {
                "uuid": str(transaction.uuid),
                "amount": transaction.amount,
                "kind": transaction.kind,
                "reason": transaction.reason,
                "balance_after": transaction.balance_after,
                "created_at": _iso(transaction.created_at),
            }
            for transaction in credit_transactions
        ],
        "skill_point_transactions": [
            {
                "uuid": str(transaction.uuid),
                "amount": transaction.amount,
                "kind": transaction.kind,
                "reason": transaction.reason,
                "balance_after": transaction.balance_after,
                "created_at": _iso(transaction.created_at),
            }
            for transaction in point_transactions
        ],
        "skills": [
            {
                "code": unlock.skill.code,
                "name": unlock.skill.name,
                "territory": unlock.skill.branch.tree.territory.code,
                "points_spent": unlock.points_spent,
                "unlocked_at": _iso(unlock.unlocked_at),
            }
            for unlock in unlocks
        ],
        "achievements": [
            {
                "code": item.achievement.code,
                "name": item.achievement.name,
                "label": item.achievement.label,
                "unlocked_at": _iso(item.unlocked_at),
            }
            for item in achievements
        ],
        "items": {
            "inventory": [
                {
                    "id": entry.item.id,
                    "name": entry.item.name,
                    "category": entry.item.category,
                    "slot": entry.item.slot or None,
                    "acquired_at": _iso(entry.acquired_at),
                }
                for entry in inventory
            ],
            "purchases": [
                {
                    "uuid": str(purchase.uuid),
                    "item": purchase.item.name,
                    "cost": purchase.cost,
                    "purchased_at": _iso(purchase.purchased_at),
                }
                for purchase in purchases
            ],
            "equipment": [
                {"slot": entry.slot, "item": entry.item.item.name} for entry in equipment
            ],
        },
        "seasons": seasons_data,
        "journal": [
            {
                "uuid": str(entry.uuid),
                "event_type": entry.event_type,
                "actor": entry.actor,
                "message": entry.message,
                "payload": entry.payload,
                "quest": entry.quest_id,
                "created_at": _iso(entry.created_at),
            }
            for entry in journal
        ],
        "energy": [
            {
                "id": checkin.id,
                "level": checkin.level,
                "label": ENERGY_LABELS[checkin.level],
                "note": checkin.note,
                "date": checkin.date.isoformat(),
                "created_at": _iso(checkin.created_at),
            }
            for checkin in checkins
        ],
        "proposals": [_proposal_data(proposal) for proposal in proposals],
    }
