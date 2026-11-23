"""Modèles des événements du journal (phase 1)."""

from uuid import uuid4

from django.conf import settings
from django.db import models


class EventType(models.TextChoices):
    """Catégories d'événements consignés dans le journal."""

    QUEST_CREATED = "QUEST_CREATED", "Mission créée"
    QUEST_UPDATED = "QUEST_UPDATED", "Mission modifiée"
    QUEST_ACCEPTED = "QUEST_ACCEPTED", "Mission acceptée"
    QUEST_STEP_DONE = "QUEST_STEP_DONE", "Étape cochée"
    QUEST_STEP_UNDONE = "QUEST_STEP_UNDONE", "Étape décochée"
    QUEST_COMPLETED = "QUEST_COMPLETED", "Mission validée"
    QUEST_ABANDONED = "QUEST_ABANDONED", "Mission abandonnée"
    XP_AWARDED = "XP_AWARDED", "XP attribuée"
    LEVEL_UP = "LEVEL_UP", "Niveau gagné"
    CREDITS_EARNED = "CREDITS_EARNED", "Crédits gagnés"
    SKILL_POINTS_EARNED = "SKILL_POINTS_EARNED", "Points de compétence gagnés"
    REST = "REST", "Repos"
    CHARACTER_UPDATED = "CHARACTER_UPDATED", "Personnage modifié"
    SKILL_UNLOCKED = "SKILL_UNLOCKED", "Compétence débloquée"
    ACHIEVEMENT_UNLOCKED = "ACHIEVEMENT_UNLOCKED", "Succès débloqué"
    REWARD_PURCHASED = "REWARD_PURCHASED", "Récompense obtenue"
    ITEM_EQUIPPED = "ITEM_EQUIPPED", "Objet équipé"
    ITEM_UNEQUIPPED = "ITEM_UNEQUIPPED", "Objet retiré"
    SEASON_STARTED = "SEASON_STARTED", "Saison commencée"
    SEASON_CLOSED = "SEASON_CLOSED", "Saison terminée"
    SEASON_UPDATED = "SEASON_UPDATED", "Saison mise à jour"
    TITLE_CHANGED = "TITLE_CHANGED", "Titre changé"
    AGENT_TOKEN_CREATED = "AGENT_TOKEN_CREATED", "Jeton d'agent créé"
    AGENT_TOKEN_REVOKED = "AGENT_TOKEN_REVOKED", "Jeton d'agent révoqué"
    AGENT_CONTEXT_READ = "AGENT_CONTEXT_READ", "Contexte lu par un agent"
    QUEST_PROPOSED = "QUEST_PROPOSED", "Missions proposées"
    PROPOSAL_ACCEPTED = "PROPOSAL_ACCEPTED", "Proposition acceptée"
    PROPOSAL_REJECTED = "PROPOSAL_REJECTED", "Proposition refusée"
    PROPOSAL_UPDATED = "PROPOSAL_UPDATED", "Proposition mise à jour"
    ENERGY_CHECKIN = "ENERGY_CHECKIN", "Bilan énergétique"


class JournalEntry(models.Model):
    """Événement du journal, consultable pour retracer la progression."""

    uuid = models.UUIDField(default=uuid4, unique=True, editable=False)
    owner = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="journal_entries",
    )
    event_type = models.CharField(max_length=30, choices=EventType.choices)
    actor = models.CharField(max_length=100, default="user")
    message = models.TextField()
    payload = models.JSONField(default=dict)
    quest = models.ForeignKey(
        "quests.Quest",
        on_delete=models.SET_NULL,
        related_name="journal_entries",
        null=True,
        blank=True,
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self) -> str:
        return f"{self.event_type} : {self.message}"
