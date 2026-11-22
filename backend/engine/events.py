"""Écriture centralisée des événements du journal du LIFE RPG."""

from __future__ import annotations

from typing import TYPE_CHECKING

from apps.journal.models import JournalEntry

if TYPE_CHECKING:
    from apps.accounts.models import User
    from apps.quests.models import Quest


def log_event(
    owner: User,
    event_type: str,
    message: str,
    *,
    quest: Quest | None = None,
    payload: dict | None = None,
    actor: str = "user",
) -> JournalEntry:
    """Journalise un événement du moteur au nom de l'utilisateur ou d'un agent."""
    return JournalEntry.objects.create(
        owner=owner,
        event_type=event_type,
        message=message,
        quest=quest,
        payload=payload if payload is not None else {},
        actor=actor,
    )
