"""Vues REST des missions et de leurs actions métier."""

from django.db.models import Q, QuerySet
from django.shortcuts import get_object_or_404
from django.utils import timezone
from drf_spectacular.utils import extend_schema
from rest_framework import mixins, viewsets
from rest_framework.decorators import action
from rest_framework.request import Request
from rest_framework.response import Response
from rest_framework.status import HTTP_201_CREATED

from apps.quests.models import Quest, QuestStep
from apps.quests.serializers import (
    CompleteQuestInputSerializer,
    CompletionResultDetailSerializer,
    CompletionResultSerializer,
    QuestCreateSerializer,
    QuestSerializer,
    QuestStepScheduleSerializer,
    QuestUpdateSerializer,
)
from apps.world.models import Territory
from engine.services import (
    ACTIVE_STATUSES,
    abandon_quest,
    accept_quest,
    complete_quest,
    create_quest,
    reschedule_step,
    update_quest,
)
from engine.services import (
    toggle_step as toggle_quest_step,
)


class QuestViewSet(
    mixins.ListModelMixin,
    mixins.RetrieveModelMixin,
    mixins.CreateModelMixin,
    mixins.UpdateModelMixin,
    viewsets.GenericViewSet,
):
    """Liste, détail, création et modification des missions ; pas de suppression."""

    serializer_class = QuestSerializer
    lookup_value_regex = r"\d+"
    queryset = Quest.objects.none()  # pour typer l'identifiant dans le schéma OpenAPI

    def get_queryset(self) -> QuerySet[Quest]:
        """Ne renvoie que les missions de l'utilisateur connecté."""
        queryset = Quest.objects.filter(owner=self.request.user)
        queryset = queryset.select_related("territory").prefetch_related("steps")
        params = self.request.query_params

        territory = params.get("territory")
        if territory:
            queryset = queryset.filter(territory__code=territory)
        quest_type = params.get("quest_type")
        if quest_type:
            queryset = queryset.filter(quest_type=quest_type)
        statuses = params.getlist("status")
        if statuses:
            queryset = queryset.filter(status__in=statuses)
        difficulty = params.get("difficulty")
        if difficulty:
            queryset = queryset.filter(difficulty=difficulty)
        if params.get("today") == "1":
            today = timezone.localdate()
            queryset = queryset.filter(
                status__in=ACTIVE_STATUSES,
            ).filter(
                Q(quest_type__in=("DAILY", "WEEKLY")) | Q(due_date__lte=today),
            )
        return queryset.distinct().order_by("-created_at", "-id")

    @extend_schema(responses=QuestSerializer(many=True))
    def list(self, request: Request, *args: object, **kwargs: object) -> Response:
        """Renvoie la liste paginée et filtrée des missions."""
        return super().list(request, *args, **kwargs)

    @extend_schema(responses=QuestSerializer)
    def retrieve(self, request: Request, *args: object, **kwargs: object) -> Response:
        """Renvoie une mission appartenant à l'utilisateur connecté."""
        return super().retrieve(request, *args, **kwargs)

    @extend_schema(request=QuestCreateSerializer, responses={201: QuestSerializer})
    def create(self, request: Request, *args: object, **kwargs: object) -> Response:
        """Crée une mission en laissant le moteur calculer les récompenses."""
        serializer = QuestCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = dict(serializer.validated_data)
        steps = data.pop("steps", [])
        quest = create_quest(request.user, data, steps=steps)
        return Response(QuestSerializer(quest).data, status=HTTP_201_CREATED)

    @extend_schema(request=QuestUpdateSerializer, responses=QuestSerializer)
    def partial_update(self, request: Request, *args: object, **kwargs: object) -> Response:
        """Modifie une mission active en ignorant les champs serveur."""
        quest = self.get_object()
        serializer = QuestUpdateSerializer(data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        data = dict(serializer.validated_data)
        territory = data.pop("territory", None)
        if territory is not None:
            data["territory"] = Territory.objects.get(code=territory)
        quest = update_quest(quest, data)
        return Response(QuestSerializer(quest).data)

    @extend_schema(request=QuestUpdateSerializer, responses=QuestSerializer)
    def update(self, request: Request, *args: object, **kwargs: object) -> Response:
        """Modifie une mission active, comme la méthode PATCH."""
        return self.partial_update(request, *args, **kwargs)

    @extend_schema(request=None, responses=QuestSerializer)
    @action(detail=True, methods=["post"])
    def accept(self, request: Request, pk: str | None = None) -> Response:
        """Fait passer une mission disponible ou en pause au statut accepté."""
        quest = accept_quest(self.get_object())
        return Response(QuestSerializer(quest).data)

    @extend_schema(request=CompleteQuestInputSerializer, responses=CompletionResultSerializer)
    @action(detail=True, methods=["post"])
    def complete(self, request: Request, pk: str | None = None) -> Response:
        """Valide la mission et renvoie le résultat exact du moteur."""
        serializer = CompleteQuestInputSerializer(data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        result = complete_quest(self.get_object(), note=serializer.validated_data.get("note", ""))
        return Response(
            {
                "quest": QuestSerializer(result.quest).data,
                "result": CompletionResultDetailSerializer(result).data,
            },
        )

    @extend_schema(request=None, responses=QuestSerializer)
    @action(detail=True, methods=["post"])
    def abandon(self, request: Request, pk: str | None = None) -> Response:
        """Abandonne la mission sans retirer la moindre XP."""
        quest = abandon_quest(self.get_object())
        return Response(QuestSerializer(quest).data)

    @extend_schema(request=None, responses=QuestSerializer)
    @action(detail=True, methods=["post"], url_path=r"steps/(?P<step_id>\d+)/toggle")
    def toggle_step(
        self,
        request: Request,
        pk: str | None = None,
        step_id: str | None = None,
    ) -> Response:
        """Coche ou décoche une étape d'une mission encore active."""
        quest = self.get_object()
        step = get_object_or_404(QuestStep, pk=step_id, quest=quest)
        toggle_quest_step(step)
        updated = Quest.objects.get(pk=quest.pk)
        return Response(QuestSerializer(updated).data)

    @extend_schema(request=QuestStepScheduleSerializer, responses=QuestSerializer)
    @action(detail=True, methods=["patch"], url_path=r"steps/(?P<step_id>\d+)")
    def schedule_step(
        self,
        request: Request,
        pk: str | None = None,
        step_id: str | None = None,
    ) -> Response:
        """Planifie une étape sans modifier les récompenses de la mission."""
        quest = self.get_object()
        step = get_object_or_404(QuestStep, pk=step_id, quest=quest)
        serializer = QuestStepScheduleSerializer(data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        reschedule_step(step, serializer.validated_data.get("scheduled_date"))
        updated = Quest.objects.get(pk=quest.pk)
        return Response(QuestSerializer(updated).data)
