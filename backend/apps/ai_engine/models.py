"""Modèles des agents et de leurs propositions (phase 3)."""

from uuid import uuid4

from django.conf import settings
from django.db import models

from apps.quests.models import Difficulty, Priority, QuestType


class AgentToken(models.Model):
    """Jeton d'accès d'un agent de code, révocable et à portées limitées.

    Seule l'empreinte SHA-256 du secret est stockée ; le secret lui-même
    n'est affiché qu'une fois, à la création.
    """

    owner = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="agent_tokens",
    )
    name = models.CharField(max_length=60)
    prefix = models.CharField(max_length=8)
    key_hash = models.CharField(max_length=64, unique=True)
    scopes = models.JSONField(default=list)
    created_at = models.DateTimeField(auto_now_add=True)
    last_used_at = models.DateTimeField(null=True, blank=True)
    revoked_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ["created_at", "id"]

    def __str__(self) -> str:
        return self.name

    @property
    def is_active(self) -> bool:
        """Un jeton est actif tant qu'il n'est pas révoqué."""
        return self.revoked_at is None


class ProposalStatus(models.TextChoices):
    """États d'une proposition de mission."""

    PENDING = "PENDING", "En attente"
    ACCEPTED = "ACCEPTED", "Acceptée"
    REJECTED = "REJECTED", "Refusée"


class QuestProposal(models.Model):
    """Mission proposée par un agent, en attente de décision de l'utilisateur.

    Aucune récompense n'est attachée à la proposition : seule l'acceptation
    crée une mission via le Life Engine, et seule sa validation rapporte.
    """

    uuid = models.UUIDField(default=uuid4, unique=True, editable=False)
    owner = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="quest_proposals",
    )
    token = models.ForeignKey(
        AgentToken,
        on_delete=models.PROTECT,
        related_name="proposals",
    )
    agent_name = models.CharField(max_length=60)
    status = models.CharField(
        max_length=10,
        choices=ProposalStatus.choices,
        default=ProposalStatus.PENDING,
    )
    title = models.CharField(max_length=200)
    description = models.TextField(blank=True, default="")
    territory = models.CharField(max_length=20)
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
    due_date = models.DateField(null=True, blank=True)
    scheduled_date = models.DateField(null=True, blank=True)
    skill_branch = models.CharField(max_length=40, blank=True, default="")
    steps = models.JSONField(default=list)
    rationale = models.TextField(blank=True, default="")
    xp_preview = models.PositiveIntegerField(default=0)
    quest = models.OneToOneField(
        "quests.Quest",
        on_delete=models.SET_NULL,
        related_name="proposal",
        null=True,
        blank=True,
    )
    decided_at = models.DateTimeField(null=True, blank=True)
    reject_reason = models.TextField(blank=True, default="")
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-created_at", "-id"]

    def __str__(self) -> str:
        return f"{self.agent_name} : {self.title}"
