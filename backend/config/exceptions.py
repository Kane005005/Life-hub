"""Conversion des erreurs du Life Engine en réponses d'erreur de l'API."""

from rest_framework.response import Response
from rest_framework.status import (
    HTTP_400_BAD_REQUEST,
    HTTP_403_FORBIDDEN,
    HTTP_409_CONFLICT,
)
from rest_framework.views import exception_handler as drf_exception_handler

from engine.exceptions import (
    AlreadyCompleted,
    AlreadyOwned,
    AlreadyUnlocked,
    EngineError,
    InsufficientCredits,
    NotOwnedError,
    QuestStateError,
    SeasonError,
    SkillLockedError,
)


def api_exception_handler(exc: Exception, context: dict) -> Response | None:
    """Renvoie toujours {"detail": message} pour une erreur métier connue."""
    message = str(exc)
    request = context.get("request")
    is_patch = getattr(request, "method", None) == "PATCH"
    view = context.get("view")
    is_completion = getattr(view, "action", None) == "complete"

    if isinstance(exc, (AlreadyCompleted, AlreadyUnlocked, AlreadyOwned, SeasonError)):
        return Response({"detail": message}, status=HTTP_409_CONFLICT)

    if isinstance(exc, QuestStateError):
        state_conflict = "terminée" in message or "abandonnée" in message
        abandoned_completion = is_completion and "abandonnée" in message
        conflict = state_conflict and (is_patch or abandoned_completion)
        status_code = HTTP_409_CONFLICT if conflict else HTTP_400_BAD_REQUEST
        return Response({"detail": message}, status=status_code)

    if isinstance(exc, NotOwnedError):
        return Response({"detail": message}, status=HTTP_403_FORBIDDEN)

    if isinstance(exc, (SkillLockedError, InsufficientCredits)):
        return Response({"detail": message}, status=HTTP_400_BAD_REQUEST)

    if isinstance(exc, EngineError):
        return Response({"detail": message}, status=HTTP_400_BAD_REQUEST)

    return drf_exception_handler(exc, context)
