"""Tests des règles pures du moteur de jeu."""

from datetime import date

import pytest

from engine.rules import (
    DIFFICULTY_XP_DEFAULT,
    RANKS_DEFAULT,
    STATE_THRESHOLDS_DEFAULT,
    LevelUpdate,
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


@pytest.mark.parametrize(
    ("level", "expected"),
    [(1, 100), (2, 150), (7, 400), (8, 450)],
)
def test_xp_required(level: int, expected: int) -> None:
    assert xp_required(level) == expected


@pytest.mark.parametrize("level", [0, -1, True, 1.5])
def test_xp_required_rejects_invalid_levels(level: object) -> None:
    with pytest.raises(ValueError):
        xp_required(level)  # type: ignore[arg-type]


@pytest.mark.parametrize(
    ("level", "xp_in_level", "gained", "expected"),
    [
        (1, 90, 30, LevelUpdate(2, 20, 1)),
        (1, 0, 100, LevelUpdate(2, 0, 1)),
        (3, 40, 200, LevelUpdate(4, 40, 1)),
        (1, 0, 500, LevelUpdate(4, 50, 3)),
        (7, 214, 0, LevelUpdate(7, 214, 0)),
    ],
)
def test_apply_xp(level: int, xp_in_level: int, gained: int, expected: LevelUpdate) -> None:
    assert apply_xp(level, xp_in_level, gained) == expected


def test_apply_xp_rejects_negative_gain() -> None:
    with pytest.raises(ValueError, match="entier positif ou nul"):
        apply_xp(1, 0, -1)


@pytest.mark.parametrize(
    ("stat", "expected"),
    [(29, "DISCOVERY"), (30, "DEVELOPMENT"), (69, "DEVELOPMENT"), (70, "MASTERY")],
)
def test_territory_state_boundaries(stat: int, expected: str) -> None:
    assert territory_state(stat, STATE_THRESHOLDS_DEFAULT) == expected


def test_territory_stat_and_display_cap() -> None:
    assert territory_stat(429, 10) == 42
    assert display_stat(42, 100) == 42
    assert display_stat(120, 100) == 100


@pytest.mark.parametrize(
    ("level", "code", "label"),
    [
        (9, "INITIATE", "Initié"),
        (10, "EXPLORER", "Explorateur"),
        (49, "MASTER", "Maître"),
        (50, "ARCHITECT", "Architecte"),
    ],
)
def test_rank_for_level_boundaries(level: int, code: str, label: str) -> None:
    assert rank_for_level(level, RANKS_DEFAULT) == {"code": code, "label": label}


def test_period_keys() -> None:
    assert period_key("DAILY", date(2026, 11, 22)) == "2026-11-22"
    assert period_key("WEEKLY", date(2026, 11, 22)) == "2026-W47"
    assert period_key("WEEKLY", date(2026, 12, 31)) == "2026-W53"
    assert period_key("MAIN", date(2026, 11, 22)) == "once"
    assert period_key("SIDE", date(2026, 11, 22)) == "once"


def test_recurring_quest_types() -> None:
    assert is_recurring("DAILY")
    assert is_recurring("WEEKLY")
    assert not is_recurring("MAIN")
    assert not is_recurring("SIDE")
    assert not is_recurring("BOSS")


def test_xp_for_difficulty() -> None:
    for difficulty, expected in DIFFICULTY_XP_DEFAULT.items():
        assert xp_for_difficulty(difficulty, DIFFICULTY_XP_DEFAULT) == expected
    with pytest.raises(ValueError, match="Difficulté inconnue"):
        xp_for_difficulty("IMPOSSIBLE", DIFFICULTY_XP_DEFAULT)


def test_credit_and_skill_point_rates() -> None:
    assert credits_for_xp(30, 1) == 30
    assert credits_for_xp(30, 2) == 60
    assert skill_points_for_levels(1, 1) == 1
    assert skill_points_for_levels(3, 2) == 6
