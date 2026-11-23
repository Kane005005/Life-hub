"""Modèles des missions et validations (phase 1)."""

from uuid import uuid4

from django.conf import settings
from django.db import models
from django.utils import timezone


class QuestType(models.TextChoices):
    """Types de missions."""

    DAILY = "DAILY", "Quotidienne"
    WEEKLY = "WEEKLY", "Hebdomadaire"
    MAIN = "MAIN", "Principale"
    SIDE = "SIDE", "Secondaire"
    BOSS = "BOSS", "Boss"


class Difficulty(models.TextChoices):
    """Paliers de difficulté d'une mission."""

    TRIVIAL = "TRIVIAL", "Très facile"
    EASY = "EASY", "Facile"
    MEDIUM = "MEDIUM", "Moyenne"
    HARD = "HARD", "Difficile"
    EPIC = "EPIC", "Épique"
    LEGENDARY = "LEGENDARY", "Légendaire"


class Priority(models.TextChoices):
    """Priorité d'une mission."""

    LOW = "LOW", "Faible"
    NORMAL = "NORMAL", "Normale"
    HIGH = "HIGH", "Haute"


class QuestStatus(models.TextChoices):
    """États possibles d'une mission."""

    AVAILABLE = "AVAILABLE", "Disponible"
    ACCEPTED = "ACCEPTED", "Acceptée"
    IN_PROGRESS = "IN_PROGRESS", "En cours"
    COMPLETED = "COMPLETED", "Terminée"
    PAUSED = "PAUSED", "En pause"
    ABANDONED = "ABANDONED", "Abandonnée"


class ValidationMode(models.TextChoices):
    """Mode de validation d'une mission."""

    MANUAL = "MANUAL", "Manuelle"
    PROOF = "PROOF", "Avec preuve"


class Origin(models.TextChoices):
    """Origine de la mission."""

    USER = "USER", "Utilisateur"
    AI = "AI", "Agent"


class Quest(models.Model):
    """Mission créée par l'utilisateur ou proposée par un agent."""

    uuid = models.UUIDField(default=uuid4, unique=True, editable=False)
    owner = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="quests",
    )
    territory = models.ForeignKey(
        "world.Territory",
        on_delete=models.PROTECT,
        related_name="quests",
    )
    title = models.CharField(max_length=200)
    description = models.TextField(blank=True, default="")
    quest_type = models.CharField(
        max_length=20,
        choices=QuestType.choices,
        default=QuestType.SIDE,
    )
    difficulty = models.CharField(
        max_length=20,
        choices=Difficulty.choices,
        default=Difficulty.MEDIUM,
    )
    priority = models.CharField(
        max_length=20,
        choices=Priority.choices,
        default=Priority.NORMAL,
    )
    estimated_minutes = models.PositiveIntegerField(default=0)
    start_date = models.DateField(null=True, blank=True)
    due_date = models.DateField(null=True, blank=True)
    xp_reward = models.PositiveIntegerField(default=0)
    credit_reward = models.PositiveIntegerField(default=0)
    validation_mode = models.CharField(
        max_length=20,
        choices=ValidationMode.choices,
        default=ValidationMode.MANUAL,
    )
    origin = models.CharField(
        max_length=10,
        choices=Origin.choices,
        default=Origin.USER,
    )
    status = models.CharField(
        max_length=20,
        choices=QuestStatus.choices,
        default=QuestStatus.AVAILABLE,
    )
    skill_branch = models.CharField(max_length=40, blank=True, default="")
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    completed_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        indexes = [models.Index(fields=["owner", "status"], name="quest_owner_status_idx")]

    def __str__(self) -> str:
        return self.title


class QuestStep(models.Model):
    """Étape d'une mission composée, sans récompense propre."""

    quest = models.ForeignKey("quests.Quest", on_delete=models.CASCADE, related_name="steps")
    title = models.CharField(max_length=200)
    order = models.PositiveIntegerField(default=0)
    is_required = models.BooleanField(default=True)
    is_done = models.BooleanField(default=False)
    done_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["order"]

    def __str__(self) -> str:
        return self.title


class QuestCompletion(models.Model):
    """Validation d'une mission pour une période donnée, unique en base."""

    uuid = models.UUIDField(default=uuid4, unique=True, editable=False)
    quest = models.ForeignKey(
        "quests.Quest",
        on_delete=models.PROTECT,
        related_name="completions",
    )
    period_key = models.CharField(max_length=32, default="once")
    note = models.TextField(blank=True, default="")
    xp_awarded = models.PositiveIntegerField(default=0)
    credits_awarded = models.PositiveIntegerField(default=0)
    completed_at = models.DateTimeField(default=timezone.now)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=["quest", "period_key"],
                name="unique_quest_period_completion",
            )
        ]

    def __str__(self) -> str:
        return f"{self.quest.title} : {self.period_key}"
