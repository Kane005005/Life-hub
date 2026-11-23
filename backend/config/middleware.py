"""Middleware de fuseau horaire des requêtes LIFE RPG (phase 4b).

Le fuseau actif est propre au thread : il est nettoyé à l'entrée et à la sortie
de chaque requête, puis réactivé par les classes d'authentification.
"""

from __future__ import annotations

from collections.abc import Callable

from django.http import HttpRequest, HttpResponse
from django.utils import timezone


class UserTimeZoneMiddleware:
    """Garantit qu'aucun fuseau d'une requête précédente ne fuit."""

    def __init__(self, get_response: Callable[[HttpRequest], HttpResponse]) -> None:
        self.get_response = get_response

    def __call__(self, request: HttpRequest) -> HttpResponse:
        """Désactive le fuseau avant et après le traitement de la requête."""
        timezone.deactivate()
        try:
            response = self.get_response(request)
        finally:
            timezone.deactivate()
        return response
