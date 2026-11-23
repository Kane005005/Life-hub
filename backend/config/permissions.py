"""Permissions globales de l'API LIFE RPG.

Refus par défaut : un jeton d'agent ne peut rien faire hors des endpoints
``/api/agent/``. Les vues d'agent remplacent explicitement ces permissions
par ``[IsAgent, HasAgentScope]``.
"""

from __future__ import annotations

from rest_framework.permissions import BasePermission

from apps.ai_engine.models import AgentToken


class DenyAgentTokens(BasePermission):
    """Refuse (403) toute requête authentifiée par un jeton d'agent.

    Placée en tête des permissions par défaut, elle protège tous les endpoints
    utilisateur sans avoir à les déclarer un par un.
    """

    message = "Cette action est réservée à l'utilisateur."

    def has_permission(self, request, view) -> bool:
        return not isinstance(request.auth, AgentToken)


class IsAgent(BasePermission):
    """N'autorise que les requêtes authentifiées par un jeton d'agent.

    Un utilisateur connecté avec son jeton personnel est refusé (403) :
    un agent et l'utilisateur ne se confondent jamais.
    """

    message = "Réservé aux agents."

    def has_permission(self, request, view) -> bool:
        return isinstance(request.auth, AgentToken)


class HasAgentScope(BasePermission):
    """Vérifie que le jeton de l'agent possède la portée déclarée par la vue.

    La vue définit ``required_scope`` (une chaîne). Sans portée requise
    déclarée, tout jeton d'agent valide est accepté.
    """

    message = "Cette portée n'est pas accordée à ton jeton."

    def has_permission(self, request, view) -> bool:
        token = request.auth
        if not isinstance(token, AgentToken):
            return False
        required = getattr(view, "required_scope", None)
        if required is None:
            return True
        return required in token.scopes
