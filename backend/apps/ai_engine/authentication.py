"""Authentification des agents de code par jeton Bearer (phase 3).

Un agent présente ``Authorization: Bearer lra_…``. Seule l'empreinte SHA-256
du secret est comparée ; un jeton inconnu ou révoqué est refusé immédiatement.
"""

from __future__ import annotations

import hashlib
import hmac

from django.utils import timezone
from drf_spectacular.extensions import OpenApiAuthenticationExtension
from rest_framework.authentication import BaseAuthentication, get_authorization_header
from rest_framework.exceptions import AuthenticationFailed

from apps.ai_engine.models import AgentToken

TOKEN_PREFIX = "lra_"
KEYWORD = "Bearer"
# Rafraîchit last_used_at au plus une fois par minute pour éviter les écritures inutiles.
LAST_USED_REFRESH_SECONDS = 60


def hash_secret(secret: str) -> str:
    """Renvoie l'empreinte SHA-256 hexadécimale d'un secret d'agent."""
    return hashlib.sha256(secret.encode("utf-8")).hexdigest()


class AgentTokenAuthentication(BaseAuthentication):
    """Authentifie un agent via son jeton Bearer, sans jamais le confondre avec l'utilisateur."""

    keyword = KEYWORD

    def authenticate(self, request) -> tuple | None:
        """Renvoie ``(propriétaire, jeton)`` ou lève AuthenticationFailed."""
        header = get_authorization_header(request).split()
        if not header or header[0].lower() != KEYWORD.lower().encode("ascii"):
            return None
        if len(header) != 2:
            raise AuthenticationFailed("Jeton d'agent invalide.")
        secret = header[1].decode("utf-8")
        if not secret.startswith(TOKEN_PREFIX):
            # Pas un jeton d'agent : laisse les autres authentificateurs répondre.
            return None

        key_hash = hash_secret(secret)
        try:
            token = AgentToken.objects.select_related("owner").get(key_hash=key_hash)
        except AgentToken.DoesNotExist:
            raise AuthenticationFailed("Jeton d'agent invalide.") from None
        if not hmac.compare_digest(token.key_hash, key_hash):
            raise AuthenticationFailed("Jeton d'agent invalide.")
        if token.revoked_at is not None:
            raise AuthenticationFailed("Jeton révoqué.")

        now = timezone.now()
        if (
            token.last_used_at is None
            or (now - token.last_used_at).total_seconds() >= LAST_USED_REFRESH_SECONDS
        ):
            token.last_used_at = now
            token.save(update_fields=["last_used_at"])
        return (token.owner, token)

    def authenticate_header(self, request) -> str:
        """Renvoie le scheme attendu pour que les 401 portent le bon en-tête."""
        return KEYWORD


class AgentTokenScheme(OpenApiAuthenticationExtension):
    """Schéma de sécurité OpenAPI « Bearer agent » pour drf-spectacular."""

    target_class = "apps.ai_engine.authentication.AgentTokenAuthentication"
    name = "AgentTokenAuth"

    def get_security_definition(self, auto_schema) -> dict:
        """Décrit l'authentification Bearer des agents dans le schéma OpenAPI."""
        return {
            "type": "http",
            "scheme": "bearer",
            "bearerFormat": "lra_…",
            "description": "Jeton d'agent LIFE RPG : en-tête Authorization: Bearer lra_…",
        }
