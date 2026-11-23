"""Règles de calcul pures du LIFE RPG, sans aucun accès à la base de données."""

from collections.abc import Mapping, Sequence
from dataclasses import dataclass
from datetime import date

DIFFICULTY_XP_DEFAULT: dict[str, int] = {
    "TRIVIAL": 5,
    "EASY": 15,
    "MEDIUM": 30,
    "HARD": 60,
    "EPIC": 100,
    "LEGENDARY": 200,
}

STATE_THRESHOLDS_DEFAULT: dict[str, int] = {"DEVELOPMENT": 30, "MASTERY": 70}

RANKS_DEFAULT: list[dict[str, int | str]] = [
    {"min_level": 1, "code": "INITIATE", "label": "Initié"},
    {"min_level": 10, "code": "EXPLORER", "label": "Explorateur"},
    {"min_level": 20, "code": "BUILDER", "label": "Bâtisseur"},
    {"min_level": 30, "code": "SPECIALIST", "label": "Spécialiste"},
    {"min_level": 40, "code": "MASTER", "label": "Maître"},
    {"min_level": 50, "code": "ARCHITECT", "label": "Architecte"},
]


@dataclass(frozen=True)
class LevelUpdate:
    """Résultat d'un gain d'XP : niveau final, XP dans le niveau et niveaux gagnés."""

    level: int
    xp_in_level: int
    levels_gained: int


def xp_required(level: int) -> int:
    """Renvoie l'XP nécessaire pour passer le niveau donné.

    Règle : XP requis pour passer le niveau N = 100 + 50 × (N − 1).
    Le surplus d'XP se reporte au niveau suivant.
    """
    if isinstance(level, bool) or not isinstance(level, int):
        raise ValueError("Le niveau doit être un entier.")
    if level < 1:
        raise ValueError("Le niveau doit être supérieur ou égal à 1.")
    return 100 + 50 * (level - 1)


def xp_for_difficulty(difficulty: str, table: Mapping[str, int]) -> int:
    """Renvoie l'XP d'une difficulté selon le barème fourni.

    Lève ValueError si la difficulté n'est pas présente dans le barème.
    """
    try:
        return table[difficulty]
    except KeyError:
        raise ValueError(f"Difficulté inconnue : {difficulty}.") from None


def apply_xp(level: int, xp_in_level: int, gained: int) -> LevelUpdate:
    """Applique un gain d'XP en faisant monter un ou plusieurs niveaux.

    Le surplus est reporté au niveau suivant. Aucune XP n'est perdue.
    """
    if isinstance(level, bool) or not isinstance(level, int) or level < 1:
        raise ValueError("Le niveau doit être un entier supérieur ou égal à 1.")
    if isinstance(xp_in_level, bool) or not isinstance(xp_in_level, int) or xp_in_level < 0:
        raise ValueError("L'XP du niveau doit être un entier positif ou nul.")
    if isinstance(gained, bool) or not isinstance(gained, int) or gained < 0:
        raise ValueError("L'XP gagnée doit être un entier positif ou nul.")

    current_level = level
    remaining = xp_in_level + gained
    levels_gained = 0
    while remaining >= xp_required(current_level):
        remaining -= xp_required(current_level)
        current_level += 1
        levels_gained += 1
    return LevelUpdate(current_level, remaining, levels_gained)


def territory_stat(total_xp: int, divisor: int) -> int:
    """Calcule la statistique d'un territoire à partir de son XP cumulé."""
    if isinstance(total_xp, bool) or not isinstance(total_xp, int) or total_xp < 0:
        raise ValueError("L'XP cumulée doit être un entier positif ou nul.")
    if isinstance(divisor, bool) or not isinstance(divisor, int) or divisor < 1:
        raise ValueError("Le diviseur doit être un entier supérieur ou égal à 1.")
    return total_xp // divisor


def display_stat(stat: int, cap: int) -> int:
    """Plafonne une statistique pour son affichage."""
    return min(stat, cap)


def territory_state(stat: int, thresholds: Mapping[str, int]) -> str:
    """Détermine l'état d'un territoire d'après sa statistique et les seuils."""
    if stat >= thresholds["MASTERY"]:
        return "MASTERY"
    if stat >= thresholds["DEVELOPMENT"]:
        return "DEVELOPMENT"
    return "DISCOVERY"


def rank_for_level(level: int, ranks: Sequence[Mapping]) -> dict:
    """Renvoie le rang dont le palier est le plus grand encore atteint."""
    eligible = [rank for rank in ranks if rank["min_level"] <= level]
    if not eligible:
        raise ValueError("Aucun rang ne correspond à ce niveau.")
    best = max(eligible, key=lambda rank: rank["min_level"])
    return {"code": best["code"], "label": best["label"]}


def credits_for_xp(xp: int, rate: int) -> int:
    """Convertit une quantité d'XP en crédits selon le taux fourni."""
    return xp * rate


def skill_points_for_levels(levels: int, per_level: int) -> int:
    """Calcule les points de compétence gagnés pour un nombre de niveaux."""
    return levels * per_level


def period_key(quest_type: str, day: date) -> str:
    """Renvoie la clé de période d'une mission pour le jour donné.

    Les missions quotidiennes utilisent la date locale, les missions
    hebdomadaires la semaine ISO, les autres la valeur « once ».
    """
    if quest_type == "DAILY":
        return day.isoformat()
    if quest_type == "WEEKLY":
        iso = day.isocalendar()
        return f"{iso.year}-W{iso.week:02d}"
    return "once"


def is_recurring(quest_type: str) -> bool:
    """Indique si la mission est validable une fois par période."""
    return quest_type in ("DAILY", "WEEKLY")
