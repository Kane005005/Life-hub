"""Bilans énergétiques (cahier §8.3) : un bilan par jour, sans effet sur la progression."""

from __future__ import annotations

from datetime import date
from typing import TYPE_CHECKING

from django.db import transaction
from django.utils import timezone

from apps.analytics.models import EnergyCheckIn
from engine.events import log_event
from engine.exceptions import EngineError

if TYPE_CHECKING:
    from apps.accounts.models import User

ENERGY_LABELS: dict[int, str] = {
    1: "Très faible",
    2: "Faible",
    3: "Moyenne",
    4: "Bonne",
    5: "Excellente",
}


def energy_snapshot(checkin: EnergyCheckIn) -> dict:
    """Représentation API d'un bilan énergétique, avec son libellé français."""
    return {
        "id": checkin.id,
        "level": checkin.level,
        "label": ENERGY_LABELS[checkin.level],
        "note": checkin.note,
        "date": checkin.date,
        "created_at": checkin.created_at,
    }


@transaction.atomic
def record_energy(
    user: User,
    level: int,
    note: str = "",
    today: date | None = None,
) -> EnergyCheckIn:
    """Enregistre le bilan du jour ; le dernier de la journée remplace le précédent."""
    if isinstance(level, bool) or not isinstance(level, int) or not 1 <= level <= 5:
        raise EngineError("Le niveau d'énergie doit être compris entre 1 et 5.")
    day = today or timezone.localdate()
    checkin, _ = EnergyCheckIn.objects.update_or_create(
        owner=user,
        date=day,
        defaults={"level": level, "note": note},
    )
    log_event(
        user,
        "ENERGY_CHECKIN",
        f"Énergie du jour : {ENERGY_LABELS[level]} ({level}/5).",
        payload={"level": level, "date": day.isoformat()},
    )
    return checkin
