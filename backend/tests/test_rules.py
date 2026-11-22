"""Tests des règles pures du moteur de jeu."""

import pytest

from engine.rules import xp_required


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
