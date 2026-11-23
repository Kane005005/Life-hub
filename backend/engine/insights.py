"""Analyse de progression par règles fixes (phase 3), strictement en lecture seule.

Aucune règle ne modifie de données : « L'IA ne modifie jamais silencieusement
les échéances ou les objectifs ».
"""

from __future__ import annotations

from datetime import date
from typing import TYPE_CHECKING

from django.utils import timezone

from apps.analytics.models import EnergyCheckIn
from apps.progression.models import XPTransaction
from apps.quests.models import Quest
from apps.world.models import Territory
from engine.energy import ENERGY_LABELS
from engine.services import ACTIVE_STATUSES

if TYPE_CHECKING:
    from apps.accounts.models import User

HARD_DIFFICULTIES = ("HARD", "EPIC", "LEGENDARY")
NEGLECT_DAYS = 14
OVERLOAD_THRESHOLD = 8


def compute_insights(
    user: User,
    today: date | None = None,
    *,
    include_body: bool = True,
) -> dict:
    """Calcule l'objet Insights du contrat d'API sans rien écrire en base.

    ``include_body=False`` retire tout ce qui touche au territoire BODY,
    pour les jetons d'agent sans la portée ``body``.
    """
    day = today or timezone.localdate()

    quests = Quest.objects.filter(owner=user, status__in=ACTIVE_STATUSES)
    if not include_body:
        quests = quests.exclude(territory__code="BODY")
    active = list(quests)
    hard_count = sum(1 for quest in active if quest.difficulty in HARD_DIFFICULTIES)
    overdue_count = sum(
        1 for quest in active if quest.due_date is not None and quest.due_date < day
    )

    checkin = EnergyCheckIn.objects.filter(owner=user).order_by("-date", "-id").first()
    energy = None
    if checkin is not None:
        energy = {
            "level": checkin.level,
            "label": ENERGY_LABELS[checkin.level],
            "date": checkin.date.isoformat(),
        }

    territories = Territory.objects.all()
    if not include_body:
        territories = territories.exclude(code="BODY")
    neglected: list[dict] = []
    for territory in territories:
        last_xp = (
            XPTransaction.objects.filter(character__user=user, territory=territory)
            .order_by("-created_at")
            .first()
        )
        if last_xp is None:
            neglected.append({"code": territory.code, "days_since_xp": None})
            continue
        days = (day - timezone.localtime(last_xp.created_at).date()).days
        if days >= NEGLECT_DAYS:
            neglected.append({"code": territory.code, "days_since_xp": days})

    names = {territory.code: territory.name for territory in Territory.objects.all()}
    suggestions: list[dict] = []
    if energy is not None and energy["level"] <= 2 and hard_count >= 2:
        suggestions.append(
            {
                "kind": "RECOVERY",
                "message": (
                    f"Énergie faible et {hard_count} missions difficiles en cours : "
                    "une mission courte ou une pause suffit aujourd'hui."
                ),
            }
        )
    if len(active) > OVERLOAD_THRESHOLD:
        suggestions.append(
            {
                "kind": "OVERLOAD",
                "message": (
                    f"{len(active)} missions actives : choisis tes priorités "
                    "et mets le reste en pause."
                ),
            }
        )
    for item in neglected:
        name = names[item["code"]]
        if item["days_since_xp"] is None:
            message = f"Ton territoire {name} n'a encore jamais reçu d'XP."
        else:
            message = f"Ton territoire {name} n'a pas bougé depuis {item['days_since_xp']} jours."
        suggestions.append({"kind": "BALANCE", "message": message})
    if overdue_count:
        suggestions.append(
            {
                "kind": "OVERDUE",
                "message": (
                    f"{overdue_count} mission(s) ont dépassé leur échéance : "
                    "termine, reporte ou abandonne-les."
                ),
            }
        )
    if energy is not None and energy["level"] >= 4 and hard_count == 0:
        suggestions.append(
            {
                "kind": "MOMENTUM",
                "message": (
                    "Bonne énergie et aucune mission difficile en cours : "
                    "tu peux avancer sur une mission ambitieuse."
                ),
            }
        )

    return {
        "generated_at": timezone.now(),
        "energy": energy,
        "load": {
            "active_quests": len(active),
            "hard_quests": hard_count,
            "overdue": overdue_count,
        },
        "neglected_territories": neglected,
        "suggestions": suggestions,
    }
