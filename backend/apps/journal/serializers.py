"""Sérialiseurs du journal des événements et du repos."""

from rest_framework import serializers

from apps.journal.models import EventType, JournalEntry


class JournalEntrySerializer(serializers.ModelSerializer):
    """Événement du journal, tel que décrit dans le contrat d'API."""

    class Meta:
        model = JournalEntry
        fields = ("uuid", "event_type", "actor", "message", "payload", "quest", "created_at")
        read_only_fields = (
            "uuid",
            "event_type",
            "actor",
            "message",
            "payload",
            "quest",
            "created_at",
        )


class JournalFilterSerializer(serializers.Serializer):
    """Filtres acceptés sur la liste du journal."""

    event_type = serializers.ChoiceField(choices=EventType.choices, required=False)


class RestResponseSerializer(serializers.Serializer):
    """Message renvoyé après l'enregistrement d'un jour de repos."""

    message = serializers.CharField()
