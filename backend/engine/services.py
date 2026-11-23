"""Life Engine (phase 1) : services transactionnels du jeu.

Seul ce module attribue XP, niveaux, crédits et points de compétence.
Chaque écriture est atomique et verrouille le personnage concerné.
"""

from __future__ import annotations

from collections.abc import Mapping
from dataclasses import dataclass
from datetime import date
from typing import TYPE_CHECKING

from django.db import IntegrityError, transaction
from django.db.models import Count
from django.utils import timezone

from apps.character.models import AvatarConfiguration, Character
from apps.economy.models import CreditTransaction
from apps.journal.models import JournalEntry
from apps.progression.models import GameSettings, XPTransaction
from apps.quests.models import Quest, QuestCompletion, QuestStep
from apps.skills.models import SkillPointTransaction
from apps.world.models import Territory, TerritoryProgress
from engine.events import log_event
from engine.exceptions import AlreadyCompleted, EngineError, QuestStateError
from engine.rules import (
    apply_xp,
    credits_for_xp,
    display_stat,
    is_recurring,
    period_key,
    rank_for_level,
    skill_points_for_levels,
    territory_stat,
    territory_state,
    xp_for_difficulty,
    xp_required,
)

if TYPE_CHECKING:
    from apps.accounts.models import User

ACTIVE_STATUSES = ("AVAILABLE", "ACCEPTED", "IN_PROGRESS", "PAUSED")
CHARACTER_EDITABLE_FIELDS = ("pseudonym", "bio", "character_class", "is_onboarded")
AVATAR_EDITABLE_FIELDS = ("silhouette", "color", "accent")
QUEST_EDITABLE_FIELDS = (
    "title",
    "description",
    "quest_type",
    "difficulty",
    "priority",
    "estimated_minutes",
    "start_date",
    "due_date",
    "validation_mode",
    "skill_branch",
)


@dataclass(frozen=True)
class CompletionResult:
    """Détails d'une validation : mission et contenu de la clé « result »."""

    quest: Quest
    xp: int
    credits: int
    territory: str
    level_before: int
    level_after: int
    levels_gained: int
    skill_points_gained: int
    message: str
    level_message: str | None
    achievements: list[dict]


def _resolve_territory(value: object) -> Territory:
    """Accepte un territoire, son code ou son identifiant."""
    if isinstance(value, Territory):
        return value
    if isinstance(value, str):
        return Territory.objects.get(code=value)
    return Territory.objects.get(pk=value)


def _validate_skill_branch(territory: Territory, skill_branch: str) -> None:
    """Valide qu'une branche appartient au territoire de la mission."""
    if not skill_branch:
        return
    from apps.skills.models import SkillBranch

    exists = SkillBranch.objects.filter(code=skill_branch, tree__territory=territory).exists()
    if not exists:
        raise QuestStateError("Branche de compétence inconnue pour ce territoire.")


def _parse_date(value: object) -> date | None:
    """Convertit une date ISO en objet date, en laissant passer None."""
    if value is None or value == "":
        return None
    if isinstance(value, date):
        return value
    return date.fromisoformat(str(value))


def _already_completed_message(quest_type: str) -> str:
    """Renvoie le message de conflit adapté au type de mission."""
    if quest_type == "DAILY":
        return "Mission déjà validée aujourd'hui."
    if quest_type == "WEEKLY":
        return "Mission déjà validée cette semaine."
    return "Mission déjà validée."


@transaction.atomic
def ensure_character(user: User) -> Character:
    """Crée au besoin le personnage, son avatar et ses six progressions."""
    character, _ = Character.objects.select_for_update().get_or_create(
        user=user,
        defaults={"pseudonym": user.username},
    )
    AvatarConfiguration.objects.get_or_create(character=character)
    for territory in Territory.objects.all():
        TerritoryProgress.objects.get_or_create(character=character, territory=territory)
    return character


def character_titles(character: Character) -> list[str]:
    """Renvoie les titres obtenus (succès puis compétences) sans doublon."""
    from apps.achievements.models import PlayerAchievement
    from apps.skills.models import SkillUnlock

    titles: list[str] = []
    seen: set[str] = set()
    achievements = (
        PlayerAchievement.objects.filter(character=character)
        .select_related("achievement")
        .order_by("unlocked_at", "id")
    )
    for item in achievements:
        label = item.achievement.label
        if label not in seen:
            titles.append(label)
            seen.add(label)
    skills = (
        SkillUnlock.objects.filter(character=character)
        .select_related("skill")
        .order_by("unlocked_at", "id")
    )
    for item in skills:
        name = item.skill.name
        if name not in seen:
            titles.append(name)
            seen.add(name)
    return titles


@transaction.atomic
def update_character(character: Character, data: Mapping[str, object]) -> Character:
    """Met à jour le profil sans toucher à la progression du personnage."""
    character = Character.objects.select_for_update().get(pk=character.pk)
    for field in CHARACTER_EDITABLE_FIELDS:
        if field in data:
            setattr(character, field, data[field])

    update_fields = [*CHARACTER_EDITABLE_FIELDS, "updated_at"]
    if "active_title" in data:
        active_title = data["active_title"] or ""
        if active_title:
            titles = character_titles(character)
            if active_title not in titles:
                raise EngineError("Ce titre n'est pas encore obtenu.")
        character.active_title = active_title
        update_fields.append("active_title")
        character.save(update_fields=update_fields)
        log_event(character.user, "TITLE_CHANGED", "Titre actif mis à jour.")
        return character

    character.save(update_fields=update_fields)
    log_event(character.user, "CHARACTER_UPDATED", "Personnage mis à jour.")
    return character


@transaction.atomic
def update_avatar(character: Character, data: Mapping[str, object]) -> AvatarConfiguration:
    """Met à jour l'apparence de l'avatar sans modifier la progression."""
    avatar, _ = AvatarConfiguration.objects.select_for_update().get_or_create(
        character=character,
    )
    for field in AVATAR_EDITABLE_FIELDS:
        if field in data:
            setattr(avatar, field, data[field])
    avatar.save(update_fields=list(AVATAR_EDITABLE_FIELDS))
    log_event(character.user, "CHARACTER_UPDATED", "Avatar mis à jour.")
    return avatar


@transaction.atomic
def create_quest(
    user: User,
    data: Mapping[str, object],
    steps: list[dict] | None = None,
    origin: str = "USER",
) -> Quest:
    """Crée une mission disponible et calcule ses récompenses côté serveur."""
    ensure_character(user)
    settings = GameSettings.load()
    difficulty = str(data.get("difficulty", "MEDIUM"))
    xp = xp_for_difficulty(difficulty, settings.xp_by_difficulty)
    territory = _resolve_territory(data.get("territory"))
    skill_branch = str(data.get("skill_branch", ""))
    _validate_skill_branch(territory, skill_branch)

    from engine.seasons import current_season

    active_season = current_season(user)

    quest = Quest.objects.create(
        owner=user,
        territory=territory,
        season=active_season,
        title=str(data.get("title", "Nouvelle mission")),
        description=str(data.get("description", "")),
        quest_type=str(data.get("quest_type", "SIDE")),
        difficulty=difficulty,
        priority=str(data.get("priority", "NORMAL")),
        estimated_minutes=int(data.get("estimated_minutes", 0) or 0),
        start_date=_parse_date(data.get("start_date")),
        due_date=_parse_date(data.get("due_date")),
        xp_reward=xp,
        credit_reward=credits_for_xp(xp, settings.credits_per_xp),
        validation_mode=str(data.get("validation_mode", "MANUAL")),
        origin=origin,
        skill_branch=skill_branch,
    )
    for index, step in enumerate(steps or []):
        QuestStep.objects.create(
            quest=quest,
            title=str(step["title"]),
            order=int(step.get("order", index)),
            is_required=bool(step.get("is_required", True)),
        )
    log_event(user, "QUEST_CREATED", "Mission créée.", quest=quest)
    return quest


@transaction.atomic
def update_quest(quest: Quest, data: Mapping[str, object]) -> Quest:
    """Modifie une mission active et recalcule ses récompenses si besoin."""
    quest = Quest.objects.select_for_update().get(pk=quest.pk)
    if quest.status in ("COMPLETED", "ABANDONED"):
        raise QuestStateError("Cette mission est terminée. Elle ne peut plus être modifiée.")

    difficulty_changed = "difficulty" in data and data["difficulty"] != quest.difficulty
    for field in QUEST_EDITABLE_FIELDS:
        if field not in data:
            continue
        value = data[field]
        if field in ("start_date", "due_date"):
            value = _parse_date(value)
        setattr(quest, field, value)

    if "skill_branch" in data or "territory" in data:
        _validate_skill_branch(quest.territory, quest.skill_branch)

    if difficulty_changed:
        settings = GameSettings.load()
        xp = xp_for_difficulty(quest.difficulty, settings.xp_by_difficulty)
        quest.xp_reward = xp
        quest.credit_reward = credits_for_xp(xp, settings.credits_per_xp)

    quest.save()
    log_event(quest.owner, "QUEST_UPDATED", "Mission mise à jour.", quest=quest)
    return quest


@transaction.atomic
def accept_quest(quest: Quest) -> Quest:
    """Fait passer une mission disponible ou en pause au statut accepté."""
    quest = Quest.objects.select_for_update().get(pk=quest.pk)
    if quest.status in ("COMPLETED", "ABANDONED"):
        raise QuestStateError("Cette mission ne peut plus être acceptée.")
    quest.status = "ACCEPTED"
    quest.save(update_fields=["status", "updated_at"])
    log_event(quest.owner, "QUEST_ACCEPTED", "Mission acceptée.", quest=quest)
    return quest


@transaction.atomic
def abandon_quest(quest: Quest) -> Quest:
    """Abandonne une mission sans retirer la moindre XP."""
    quest = Quest.objects.select_for_update().get(pk=quest.pk)
    quest.status = "ABANDONED"
    quest.save(update_fields=["status", "updated_at"])
    log_event(
        quest.owner,
        "QUEST_ABANDONED",
        "Mission abandonnée. Ton XP est intact.",
        quest=quest,
    )
    return quest


@transaction.atomic
def toggle_step(step: QuestStep) -> QuestStep:
    """Coche ou décoche une étape d'une mission encore active."""
    quest = Quest.objects.select_for_update().get(pk=step.quest_id)
    step = QuestStep.objects.select_for_update().get(pk=step.pk)
    if quest.status in ("COMPLETED", "ABANDONED"):
        raise QuestStateError("Cette mission est terminée. Ses étapes ne peuvent plus changer.")
    step.is_done = not step.is_done
    step.done_at = timezone.now() if step.is_done else None
    step.save(update_fields=["is_done", "done_at"])
    event_type = "QUEST_STEP_DONE" if step.is_done else "QUEST_STEP_UNDONE"
    message = "Étape cochée." if step.is_done else "Étape décochée."
    log_event(quest.owner, event_type, message, quest=quest)
    return step


def complete_quest(quest: Quest, note: str = "", today: date | None = None) -> CompletionResult:
    """Valide une mission et attribue toutes ses récompenses une seule fois.

    La contrainte d'unicité sur (mission, période) protège aussi contre les
    validations simultanées : une violation est convertie en AlreadyCompleted.
    """
    day = today or timezone.localdate()
    settings = GameSettings.load()
    expected_message = _already_completed_message(quest.quest_type)
    try:
        with transaction.atomic():
            from engine.seasons import current_season

            current_season(quest.owner, today=day)
            current = Quest.objects.select_for_update().get(pk=quest.pk)
            if current.status == "ABANDONED":
                raise QuestStateError("Cette mission a été abandonnée.")
            if current.status == "COMPLETED":
                raise AlreadyCompleted("Mission déjà validée.")

            missing_steps = current.steps.filter(is_required=True, is_done=False).count()
            if missing_steps:
                raise QuestStateError(f"Il reste {missing_steps} étape(s) obligatoire(s).")

            key = period_key(current.quest_type, day)
            if QuestCompletion.objects.filter(quest=current, period_key=key).exists():
                raise AlreadyCompleted(expected_message)

            xp = xp_for_difficulty(current.difficulty, settings.xp_by_difficulty)
            credits = credits_for_xp(xp, settings.credits_per_xp)
            current.xp_reward = xp
            current.credit_reward = credits

            character = Character.objects.select_for_update().get(user_id=current.owner_id)
            progress, _ = TerritoryProgress.objects.select_for_update().get_or_create(
                character=character,
                territory=current.territory,
            )

            level_before = character.level
            update = apply_xp(level_before, character.xp_in_level, xp)
            points = skill_points_for_levels(update.levels_gained, settings.skill_points_per_level)

            character.level = update.level
            character.xp_in_level = update.xp_in_level
            character.total_xp += xp
            character.credits += credits
            character.skill_points_available += points
            character.save(
                update_fields=[
                    "level",
                    "xp_in_level",
                    "total_xp",
                    "credits",
                    "skill_points_available",
                    "updated_at",
                ]
            )
            progress.total_xp += xp
            progress.save(update_fields=["total_xp"])

            completion = QuestCompletion.objects.create(
                quest=current,
                period_key=key,
                note=note,
                xp_awarded=xp,
                credits_awarded=credits,
            )
            xp_transaction = XPTransaction.objects.create(
                character=character,
                amount=xp,
                territory=current.territory,
                quest_completion=completion,
                level_before=level_before,
                level_after=update.level,
            )
            CreditTransaction.objects.create(
                character=character,
                amount=credits,
                kind="EARN",
                reason="Mission validée.",
                balance_after=character.credits,
                quest_completion=completion,
            )

            balance = character.skill_points_available - points
            for level in range(level_before + 1, update.level + 1):
                balance += settings.skill_points_per_level
                SkillPointTransaction.objects.create(
                    character=character,
                    amount=settings.skill_points_per_level,
                    kind="GAIN",
                    reason=f"Niveau {level} atteint.",
                    balance_after=balance,
                    xp_transaction=xp_transaction,
                )

            if is_recurring(current.quest_type):
                current.status = "ACCEPTED"
            else:
                current.status = "COMPLETED"
                current.completed_at = timezone.now()
            current.save(
                update_fields=[
                    "status",
                    "completed_at",
                    "xp_reward",
                    "credit_reward",
                    "updated_at",
                ]
            )

            territory_name = current.territory.name
            message = f"Mission validée. +{xp} XP en {territory_name}."
            payload = {
                "xp": xp,
                "credits": credits,
                "territory": current.territory.code,
                "period_key": key,
            }
            log_event(current.owner, "QUEST_COMPLETED", message, quest=current, payload=payload)
            log_event(
                current.owner,
                "XP_AWARDED",
                f"+{xp} XP en {territory_name}.",
                quest=current,
                payload=payload,
            )
            log_event(
                current.owner,
                "CREDITS_EARNED",
                f"+{credits} crédits gagnés.",
                quest=current,
                payload=payload,
            )
            level_message = None
            if update.levels_gained:
                level_message = (
                    f"Niveau {update.level} atteint. "
                    f"{xp_required(update.level)} XP pour le suivant."
                )
                log_event(
                    current.owner,
                    "LEVEL_UP",
                    level_message,
                    quest=current,
                    payload={"level": update.level},
                )
            if points:
                log_event(
                    current.owner,
                    "SKILL_POINTS_EARNED",
                    f"{points} point(s) de compétence gagné(s).",
                    quest=current,
                    payload={"points": points},
                )

            from engine.achievements import evaluate_achievements

            unlocked = evaluate_achievements(character)
            achievements = [
                {"code": item.achievement.code, "label": item.achievement.label}
                for item in unlocked
            ]

            result = CompletionResult(
                quest=current,
                xp=xp,
                credits=credits,
                territory=current.territory.code,
                level_before=level_before,
                level_after=update.level,
                levels_gained=update.levels_gained,
                skill_points_gained=points,
                message=message,
                level_message=level_message,
                achievements=achievements,
            )
            quest.refresh_from_db()
    except IntegrityError:
        raise AlreadyCompleted(expected_message) from None
    return result


@transaction.atomic
def record_rest(user: User) -> JournalEntry:
    """Enregistre un jour de repos sans modifier la progression."""
    ensure_character(user)
    return log_event(user, "REST", "Repos enregistré. Ta progression est intacte.")


def territory_stats(character: Character) -> list[dict]:
    """Renvoie les six statistiques de territoire du personnage."""
    settings = GameSettings.load()
    progress_by_id = {
        progress.territory_id: progress
        for progress in TerritoryProgress.objects.filter(character=character)
    }
    active_counts = {
        row["territory_id"]: row["total"]
        for row in Quest.objects.filter(
            owner_id=character.user_id,
            status__in=ACTIVE_STATUSES,
        )
        .values("territory_id")
        .annotate(total=Count("id"))
    }

    stats = []
    for territory in Territory.objects.all():
        total_xp = progress_by_id[territory.id].total_xp if territory.id in progress_by_id else 0
        stat = territory_stat(total_xp, settings.territory_stat_divisor)
        stats.append(
            {
                "id": territory.id,
                "code": territory.code,
                "stat_code": territory.stat_code,
                "name": territory.name,
                "english": territory.english,
                "place": territory.place,
                "domain": territory.domain,
                "color": territory.color,
                "total_xp": total_xp,
                "stat": stat,
                "stat_display": display_stat(stat, settings.territory_stat_display_max),
                "state": territory_state(stat, settings.territory_state_thresholds),
                "active_quests": active_counts.get(territory.id, 0),
            }
        )
    return stats


def character_equipment(character: Character) -> dict:
    """Renvoie l'équipement cosmétique du personnage."""
    from apps.economy.models import Equipment

    slots = {"AURA": None, "FRAME": None, "EMBLEM": None}
    equipped = Equipment.objects.filter(character=character).select_related("item__item")
    for entry in equipped:
        item = entry.item.item
        slots[entry.slot] = {
            "id": item.id,
            "name": item.name,
            "description": item.description,
            "category": item.category,
            "slot": item.slot or None,
            "cost": item.cost,
            "is_available": item.is_available,
            "is_custom": item.owner_id is not None,
            "visual": item.visual,
            "owned": True,
            "equipped": True,
            "purchases_count": 0,
        }
    return slots


def character_snapshot(character: Character) -> dict:
    """Produit l'objet Character du contrat d'API pour le personnage."""
    settings = GameSettings.load()
    avatar = getattr(character, "avatar", None)
    avatar_data = {
        "silhouette": avatar.silhouette if avatar else "A",
        "color": avatar.color if avatar else "#2FD08B",
        "accent": avatar.accent if avatar else "#EDE9DF",
    }
    titles = character_titles(character)
    active_title = character.active_title or None
    return {
        "pseudonym": character.pseudonym,
        "bio": character.bio,
        "character_class": character.character_class,
        "is_onboarded": character.is_onboarded,
        "level": character.level,
        "xp_in_level": character.xp_in_level,
        "xp_required": xp_required(character.level),
        "total_xp": character.total_xp,
        "rank": rank_for_level(character.level, settings.ranks),
        "credits": character.credits,
        "skill_points": {
            "available": character.skill_points_available,
            "spent": character.skill_points_spent,
        },
        "avatar": avatar_data,
        "stats": territory_stats(character),
        "active_title": active_title,
        "titles": titles,
        "equipment": character_equipment(character),
    }
