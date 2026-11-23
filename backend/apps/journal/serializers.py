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
    date_from = serializers.DateField(required=False)
    date_to = serializers.DateField(required=False)
    territory = serializers.CharField(required=False)
    q = serializers.CharField(required=False)


class RestResponseSerializer(serializers.Serializer):
    """Message renvoyé après l'enregistrement d'un jour de repos."""

    message = serializers.CharField()


class JournalSummaryDaySerializer(serializers.Serializer):
    """XP d'un jour pour le résumé journal."""

    date = serializers.DateField()
    xp = serializers.IntegerField()


class JournalSummarySerializer(serializers.Serializer):
    """Résumé journalier d'une période."""

    period = serializers.CharField()
    from_ = serializers.DateField(source="from")
    to = serializers.DateField()
    xp_by_day = JournalSummaryDaySerializer(many=True)
    xp_by_territory = serializers.DictField(child=serializers.IntegerField())
    completions = serializers.IntegerField()
    rests = serializers.IntegerField()
    achievements = serializers.IntegerField()
    skills = serializers.IntegerField()
