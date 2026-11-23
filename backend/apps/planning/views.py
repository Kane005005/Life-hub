"""Vues REST du calendrier journalier, pour l'utilisateur et les agents."""

from __future__ import annotations

from datetime import date

from drf_spectacular.utils import OpenApiParameter, extend_schema
from rest_framework.request import Request
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.planning.serializers import (
    CalendarRangeResponseSerializer,
    CalendarTodayResponseSerializer,
)
from config.permissions import HasAgentScope, IsAgent
from engine.calendar import calendar_range, calendar_today, resolve_range
from engine.events import log_event

RANGE_PARAMETERS = [
    OpenApiParameter(
        name="from",
        type=str,
        location=OpenApiParameter.QUERY,
        description="Premier jour inclus (AAAA-MM-JJ). Semaine ISO courante par défaut.",
    ),
    OpenApiParameter(
        name="to",
        type=str,
        location=OpenApiParameter.QUERY,
        description="Dernier jour inclus (AAAA-MM-JJ). Semaine ISO courante par défaut.",
    ),
]


def _requested_range(request: Request, user) -> tuple[date, date]:
    """Lit la plage demandée, en laissant le moteur refuser les plages invalides."""
    return resolve_range(user, request.query_params.get("from"), request.query_params.get("to"))


class CalendarRangeView(APIView):
    """Calendrier d'une plage inclusive, au fuseau de l'utilisateur."""

    @extend_schema(
        operation_id="calendar_range",
        parameters=RANGE_PARAMETERS,
        responses=CalendarRangeResponseSerializer,
    )
    def get(self, request: Request) -> Response:
        """Renvoie les jours, entrées et validations de la plage demandée."""
        start, end = _requested_range(request, request.user)
        return Response(
            CalendarRangeResponseSerializer(
                calendar_range(request.user, start, end),
            ).data
        )


class CalendarTodayView(APIView):
    """Vue du jour avec les hebdomadaires de la semaine en cours."""

    @extend_schema(operation_id="calendar_today", responses=CalendarTodayResponseSerializer)
    def get(self, request: Request) -> Response:
        """Renvoie le jour courant, ses validations et l'avancement hebdomadaire."""
        return Response(CalendarTodayResponseSerializer(calendar_today(request.user)).data)


class AgentCalendarView(APIView):
    """Lecture du calendrier par un agent, avec masquage du territoire BODY."""

    permission_classes = [IsAgent, HasAgentScope]
    required_scope = "quests"

    @extend_schema(
        operation_id="agent_calendar",
        parameters=RANGE_PARAMETERS,
        responses=CalendarRangeResponseSerializer,
    )
    def get(self, request: Request) -> Response:
        """Renvoie le calendrier autorisé par les portées du jeton d'agent."""
        token = request.auth
        owner = token.owner
        start, end = _requested_range(request, owner)
        data = calendar_range(
            owner,
            start,
            end,
            include_body="body" in token.scopes,
        )
        log_event(
            owner,
            "AGENT_CONTEXT_READ",
            f"{token.name} a lu le calendrier.",
            actor=token.name,
        )
        return Response(CalendarRangeResponseSerializer(data).data)
