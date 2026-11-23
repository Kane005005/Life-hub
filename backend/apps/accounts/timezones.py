"""Fuseaux horaires des comptes LIFE RPG (phase 4b).

Le fuseau est un nom IANA : il sert à la fois à la validation du champ
``User.time_zone`` et à l'activation du fuseau pendant les requêtes.
"""

from __future__ import annotations

from zoneinfo import ZoneInfo, ZoneInfoNotFoundError

from django.core.exceptions import ValidationError

DEFAULT_TIME_ZONE = "Africa/Bamako"


def check_time_zone(value: str) -> None:
    """Vérifie qu'un nom de fuseau IANA est connu, en français."""
    try:
        ZoneInfo(value)
    except (ZoneInfoNotFoundError, ValueError, TypeError):
        raise ValidationError("Fuseau horaire inconnu.", code="invalid_time_zone") from None


def user_zone_info(user) -> ZoneInfo:
    """Renvoie le fuseau de l'utilisateur, avec repli sur Bamako."""
    name = getattr(user, "time_zone", "") or DEFAULT_TIME_ZONE
    try:
        return ZoneInfo(name)
    except (ZoneInfoNotFoundError, ValueError, TypeError):
        return ZoneInfo(DEFAULT_TIME_ZONE)
