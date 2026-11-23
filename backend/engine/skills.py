"""Moteur des compétences : chargement, état et déblocage."""

from __future__ import annotations

import json
from pathlib import Path
from typing import TYPE_CHECKING

from django.conf import settings
from django.db import IntegrityError, transaction

from apps.quests.models import QuestCompletion
from apps.skills.models import (
    Skill,
    SkillBranch,
    SkillPointTransaction,
    SkillTree,
    SkillUnlock,
)
from apps.world.models import Territory, TerritoryProgress
from engine.events import log_event
from engine.exceptions import AlreadyUnlocked, SkillLockedError
from engine.rules import territory_stat

if TYPE_CHECKING:
    from apps.character.models import Character


def _seed_path(path: Path | None = None) -> Path:
    if path is not None:
        return path
    return Path(settings.ROOT_DIR) / "docs" / "skill_tree_seed.json"


def load_skill_tree(path: Path | None = None) -> dict:
    """Charge l'arbre de compétences depuis le seed JSON de façon idempotente."""
    data = json.loads(_seed_path(path).read_text(encoding="utf-8"))
    nodes = data["nodes"]

    territories = {territory.code: territory for territory in Territory.objects.all()}
    trees_by_code: dict[str, SkillTree] = {}
    branches_by_code: dict[str, SkillBranch] = {}
    skills_by_code: dict[str, Skill] = {}
    branch_orders: dict[str, int] = {}

    for node in nodes:
        territory = territories[node["territory"]]
        tree, _ = SkillTree.objects.update_or_create(territory=territory)
        trees_by_code[territory.code] = tree

        branch_code = node["branch"]
        if branch_code not in branch_orders:
            branch_orders[branch_code] = len(branch_orders)
        branch, _ = SkillBranch.objects.update_or_create(
            code=branch_code,
            defaults={
                "name": node["branch_name"],
                "tree": tree,
                "order": branch_orders[branch_code],
            },
        )
        branches_by_code[branch_code] = branch

        skill, _ = Skill.objects.update_or_create(
            code=node["code"],
            defaults={
                "name": node["name"],
                "branch": branch,
                "tier": node["tier"],
                "cost": node["cost"],
                "min_territory_stat": node["min_territory_stat"],
                "min_validated_quests": node["min_validated_quests"],
            },
        )
        skills_by_code[skill.code] = skill

    for node in nodes:
        skill = skills_by_code[node["code"]]
        required = [skills_by_code[code] for code in node.get("requires", [])]
        skill.requires.set(required)

    return {
        "trees": SkillTree.objects.count(),
        "branches": SkillBranch.objects.count(),
        "skills": Skill.objects.count(),
    }


def branch_validated_count(character: Character, branch_code: str) -> int:
    """Compte les validations de missions du joueur pour une branche."""
    return QuestCompletion.objects.filter(
        quest__owner_id=character.user_id,
        quest__skill_branch=branch_code,
    ).count()


def _territory_stat_for(character: Character, territory: Territory) -> int:
    progress = TerritoryProgress.objects.filter(
        character=character,
        territory=territory,
    ).first()
    if progress is None:
        return 0
    from apps.progression.models import GameSettings

    settings = GameSettings.load()
    return territory_stat(progress.total_xp, settings.territory_stat_divisor)


def skill_state(
    character: Character,
    skill: Skill,
    *,
    unlocked_codes: set[str],
    stats: dict[int, int],
    counts: dict[str, int],
    available_points: int,
) -> tuple[str, list[str]]:
    """Calcule l'état d'une compétence et les manques éventuels."""
    if skill.code in unlocked_codes:
        return "UNLOCKED", []

    missing: list[str] = []
    if available_points < skill.cost:
        missing.append(f"Il te manque {skill.cost - available_points} point(s) de compétence.")

    for required in skill.requires.all():
        if required.code not in unlocked_codes:
            missing.append(f"Débloque d'abord {required.name}.")

    territory = skill.branch.tree.territory
    stat = stats.get(territory.id, 0)
    if stat < skill.min_territory_stat:
        missing.append(
            f"Statistique {territory.name} : {skill.min_territory_stat} requise, {stat} actuelle."
        )

    validated = counts.get(skill.branch.code, 0)
    if validated < skill.min_validated_quests:
        missing.append(
            "Il te manque "
            f"{skill.min_validated_quests - validated} validations dans {skill.branch.name}."
        )

    if missing:
        return "LOCKED", missing
    return "UNLOCKABLE", []


def skill_trees(character: Character, territory: str | None = None) -> list[dict]:
    """Construit la vue API des arbres de compétences."""
    from apps.progression.models import GameSettings

    GameSettings.load()
    unlocks = SkillUnlock.objects.filter(character=character).select_related("skill")
    unlocked_codes = {unlock.skill.code for unlock in unlocks}
    unlocked_at = {unlock.skill.code: unlock.unlocked_at for unlock in unlocks}

    progresses = TerritoryProgress.objects.filter(character=character).select_related("territory")
    stats = {
        progress.territory_id: territory_stat(
            progress.total_xp, GameSettings.load().territory_stat_divisor
        )
        for progress in progresses
    }

    counts_rows = (
        QuestCompletion.objects.filter(quest__owner_id=character.user_id)
        .exclude(quest__skill_branch="")
        .values("quest__skill_branch")
        .order_by()
    )
    from django.db.models import Count

    counts = {
        row["quest__skill_branch"]: row["total"] for row in counts_rows.annotate(total=Count("id"))
    }

    trees_qs = SkillTree.objects.select_related("territory").prefetch_related(
        "branches__skills__requires",
        "branches__skills__branch__tree__territory",
    )
    if territory:
        trees_qs = trees_qs.filter(territory__code=territory)

    result: list[dict] = []
    for tree in trees_qs:
        branches_data = []
        for branch in tree.branches.all():
            skills_data = []
            for skill in branch.skills.all():
                state, missing = skill_state(
                    character,
                    skill,
                    unlocked_codes=unlocked_codes,
                    stats=stats,
                    counts=counts,
                    available_points=character.skill_points_available,
                )
                skills_data.append(
                    {
                        "code": skill.code,
                        "name": skill.name,
                        "tier": skill.tier,
                        "cost": skill.cost,
                        "requires": [item.code for item in skill.requires.all()],
                        "min_territory_stat": skill.min_territory_stat,
                        "min_validated_quests": skill.min_validated_quests,
                        "state": state,
                        "unlocked_at": unlocked_at.get(skill.code),
                        "missing": missing,
                    }
                )
            branches_data.append(
                {
                    "code": branch.code,
                    "name": branch.name,
                    "validated_quests": counts.get(branch.code, 0),
                    "skills": skills_data,
                }
            )
        result.append(
            {
                "territory": tree.territory.code,
                "name": tree.territory.name,
                "color": tree.territory.color,
                "stat": stats.get(tree.territory_id, 0),
                "branches": branches_data,
            }
        )
    return result


@transaction.atomic
def unlock_skill(character: Character, code: str) -> dict:
    """Débloque une compétence si toutes les conditions sont remplies."""
    from apps.character.models import Character as CharacterModel

    character = CharacterModel.objects.select_for_update().get(pk=character.pk)
    skill = (
        Skill.objects.select_related("branch__tree__territory")
        .prefetch_related("requires")
        .get(code=code)
    )

    if SkillUnlock.objects.filter(character=character, skill=skill).exists():
        raise AlreadyUnlocked()

    unlocked_codes = set(
        SkillUnlock.objects.filter(character=character).values_list("skill__code", flat=True)
    )
    from apps.progression.models import GameSettings

    settings = GameSettings.load()
    stats = {
        p.territory_id: territory_stat(p.total_xp, settings.territory_stat_divisor)
        for p in TerritoryProgress.objects.filter(character=character)
    }
    from django.db.models import Count

    counts = {
        row["quest__skill_branch"]: row["total"]
        for row in QuestCompletion.objects.filter(quest__owner_id=character.user_id)
        .exclude(quest__skill_branch="")
        .values("quest__skill_branch")
        .annotate(total=Count("id"))
    }
    state, missing = skill_state(
        character,
        skill,
        unlocked_codes=unlocked_codes,
        stats=stats,
        counts=counts,
        available_points=character.skill_points_available,
    )
    if state != "UNLOCKABLE":
        detail = f"Impossible de débloquer {skill.name}. " + " ".join(missing)
        raise SkillLockedError(detail)

    character.skill_points_available -= skill.cost
    character.skill_points_spent += skill.cost
    character.save(update_fields=["skill_points_available", "skill_points_spent", "updated_at"])

    transaction_obj = SkillPointTransaction.objects.create(
        character=character,
        amount=skill.cost,
        kind="SPEND",
        reason=f"Compétence débloquée : {skill.name}.",
        balance_after=character.skill_points_available,
    )
    try:
        SkillUnlock.objects.create(
            character=character,
            skill=skill,
            points_spent=skill.cost,
            transaction=transaction_obj,
        )
    except IntegrityError:
        raise AlreadyUnlocked() from None

    log_event(
        character.user,
        "SKILL_UNLOCKED",
        f"Compétence débloquée : {skill.name}.",
        payload={"skill": skill.code},
    )

    from engine.achievements import evaluate_achievements

    evaluate_achievements(character)

    return {
        "skill": {
            "code": skill.code,
            "name": skill.name,
            "tier": skill.tier,
            "cost": skill.cost,
            "requires": [item.code for item in skill.requires.all()],
            "min_territory_stat": skill.min_territory_stat,
            "min_validated_quests": skill.min_validated_quests,
            "state": "UNLOCKED",
            "unlocked_at": SkillUnlock.objects.get(character=character, skill=skill).unlocked_at,
            "missing": [],
        },
        "skill_points": {
            "available": character.skill_points_available,
            "spent": character.skill_points_spent,
        },
        "message": f"Compétence débloquée : {skill.name}.",
    }
