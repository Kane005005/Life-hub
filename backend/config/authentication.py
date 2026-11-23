"""Authentification par jeton utilisateur avec activation du fuseau (phase 4b).

La classe remplace ``TokenAuthentication`` dans les réglages DRF : dès que le
jeton est accepté, le fuseau du compte devient le fuseau actif de la requête.
"""

from __future__ import annotations

from django.utils import timezone
from rest_framework.authentication import TokenAuthentication

from apps.accounts.timezones import user_zone_info


class UserTokenAuthentication(TokenAuthentication):
    """Jeton DRF qui active le fuseau horaire de son propriétaire."""

    def authenticate(self, request):
        """Renvoie ``(user, token)`` et active le fuseau de l'utilisateur."""
        result = super().authenticate(request)
        if result is not None:
            user, _token = result
            timezone.activate(user_zone_info(user))
        return result
