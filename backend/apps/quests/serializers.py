"""Sérialiseurs des missions, étapes et résultats de validation."""

import re

from django.utils import timezone
from rest_framework import serializers

from apps.quests.models import Difficulty, Priority, Quest, QuestStep, QuestType, ValidationMode
from apps.world.models import Territory
from engine.rules import is_recurring
from engine.rules import period_key as period_key_for

SCHEDULED_TIME_PATTERN = re.compile(r"(?:MORNING|AFTERNOON|EVENING|(?:[01]\d|2[0-3]):[0-5]\d)?")


def check_scheduled_time(value: str) -> str:
    """Accepte une plage nommée, une heure HH:MM ou une chaîne vide."""
    if not SCHEDULED_TIME_PATTERN.fullmatch(value):
        raise serializers.ValidationError("Heure de planification invalide.")
    return value


class QuestStepSerializer(serializers.ModelSerializer):
    """Étape d'une mission, sans récompense propre."""

    class Meta:
        model = QuestStep
        fields = ("id", "title", "order", "is_required", "is_done", "done_at", "scheduled_date")
        read_only_fields = fields


class QuestSerializer(serializers.ModelSerializer):
    """Mission renvoyée par l'API, avec les champs calculés par le serveur."""

    uuid = serializers.UUIDField(read_only=True)
    territory = serializers.CharField(source="territory.code", read_only=True)
    is_recurring = serializers.SerializerMethodField()
    period_key = serializers.SerializerMethodField()
    completed_this_period = serializers.SerializerMethodField()
    completions_count = serializers.SerializerMethodField()
    steps = QuestStepSerializer(many=True, read_only=True)

    class Meta:
        model = Quest
        fields = (
            "id",
            "uuid",
            "title",
            "description",
            "territory",
            "quest_type",
            "difficulty",
            "priority",
            "estimated_minutes",
            "start_date",
            "due_date",
            "scheduled_date",
            "scheduled_time",
            "xp_reward",
            "credit_reward",
            "validation_mode",
            "origin",
            "status",
            "skill_branch",
            "is_recurring",
            "period_key",
            "completed_this_period",
            "completions_count",
            "steps",
            "created_at",
            "updated_at",
            "completed_at",
        )
        read_only_fields = (
            "xp_reward",
            "credit_reward",
            "origin",
            "status",
            "created_at",
            "updated_at",
            "completed_at",
        )

    def get_is_recurring(self, obj: Quest) -> bool:
        """Indique si la mission est quotidienne ou hebdomadaire."""
        return is_recurring(obj.quest_type)

    def get_period_key(self, obj: Quest) -> str:
        """Calcule la clé de période du jour local."""
        return period_key_for(obj.quest_type, timezone.localdate())

    def get_completed_this_period(self, obj: Quest) -> bool:
        """Indique si la mission a déjà été validée dans la période courante."""
        return obj.completions.filter(period_key=self.get_period_key(obj)).exists()

    def get_completions_count(self, obj: Quest) -> int:
        """Compte toutes les validations enregistrées pour la mission."""
        return obj.completions.count()


class QuestStepInputSerializer(serializers.Serializer):
    """Étape envoyée lors de la création d'une mission composée."""

    title = serializers.CharField(max_length=200)
    is_required = serializers.BooleanField(default=True)
    order = serializers.IntegerField(min_value=0, required=False)


class QuestCreateSerializer(serializers.Serializer):
    """Données acceptées à la création ; les champs serveur sont ignorés."""

    title = serializers.CharField(max_length=200)
    description = serializers.CharField(required=False, allow_blank=True, default="")
    territory = serializers.CharField(max_length=20)
    quest_type = serializers.ChoiceField(choices=QuestType.choices, default=QuestType.SIDE)
    difficulty = serializers.ChoiceField(choices=Difficulty.choices, default=Difficulty.MEDIUM)
    priority = serializers.ChoiceField(choices=Priority.choices, default=Priority.NORMAL)
    estimated_minutes = serializers.IntegerField(required=False, min_value=0, default=0)
    start_date = serializers.DateField(required=False, allow_null=True)
    due_date = serializers.DateField(required=False, allow_null=True)
    scheduled_date = serializers.DateField(required=False, allow_null=True)
    scheduled_time = serializers.CharField(
        max_length=9, required=False, allow_blank=True, default=""
    )
    validation_mode = serializers.ChoiceField(
        choices=ValidationMode.choices,
        default=ValidationMode.MANUAL,
    )
    skill_branch = serializers.CharField(
        max_length=40,
        required=False,
        allow_blank=True,
        default="",
    )
    steps = QuestStepInputSerializer(many=True, required=False, default=list)

    def validate_territory(self, value: str) -> str:
        """Refuse un code de territoire inconnu."""
        if not Territory.objects.filter(code=value).exists():
            raise serializers.ValidationError("Territoire inconnu.")
        return value

    def validate_scheduled_time(self, value: str) -> str:
        """Refuse une plage horaire inconnue."""
        return check_scheduled_time(value)


class QuestUpdateSerializer(serializers.Serializer):
    """Champs modifiables d'une mission active ; le reste est ignoré."""

    title = serializers.CharField(max_length=200, required=False)
    description = serializers.CharField(required=False, allow_blank=True)
    territory = serializers.CharField(max_length=20, required=False)
    quest_type = serializers.ChoiceField(choices=QuestType.choices, required=False)
    difficulty = serializers.ChoiceField(choices=Difficulty.choices, required=False)
    priority = serializers.ChoiceField(choices=Priority.choices, required=False)
    estimated_minutes = serializers.IntegerField(required=False, min_value=0)
    start_date = serializers.DateField(required=False, allow_null=True)
    due_date = serializers.DateField(required=False, allow_null=True)
    scheduled_date = serializers.DateField(required=False, allow_null=True)
    scheduled_time = serializers.CharField(
        max_length=9, required=False, allow_blank=True, default=""
    )
    validation_mode = serializers.ChoiceField(choices=ValidationMode.choices, required=False)
    skill_branch = serializers.CharField(max_length=40, required=False, allow_blank=True)

    def validate_territory(self, value: str) -> str:
        """Refuse un code de territoire inconnu."""
        if not Territory.objects.filter(code=value).exists():
            raise serializers.ValidationError("Territoire inconnu.")
        return value

    def validate_scheduled_time(self, value: str) -> str:
        """Refuse une plage horaire inconnue."""
        return check_scheduled_time(value)


class QuestStepScheduleSerializer(serializers.Serializer):
    """Date planifiée d'une étape, envoyée par l'utilisateur."""

    scheduled_date = serializers.DateField(required=False, allow_null=True)


class CompleteQuestInputSerializer(serializers.Serializer):
    """Note facultative jointe à une validation."""

    note = serializers.CharField(required=False, allow_blank=True, default="")


class CompletionAchievementSerializer(serializers.Serializer):
    """Succès débloqué lors d'une validation."""

    code = serializers.CharField()
    label = serializers.CharField()


class CompletionResultDetailSerializer(serializers.Serializer):
    """Récompenses et messages renvoyés après une validation."""

    xp = serializers.IntegerField()
    credits = serializers.IntegerField()
    territory = serializers.CharField()
    level_before = serializers.IntegerField()
    level_after = serializers.IntegerField()
    levels_gained = serializers.IntegerField()
    skill_points_gained = serializers.IntegerField()
    message = serializers.CharField()
    level_message = serializers.CharField(allow_null=True)
    achievements = CompletionAchievementSerializer(many=True)


class CompletionResultSerializer(serializers.Serializer):
    """Réponse complète de la route de validation d'une mission."""

    quest = QuestSerializer()
    result = CompletionResultDetailSerializer()
