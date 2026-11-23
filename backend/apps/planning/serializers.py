"""Sérialiseurs de réponse du calendrier (aucune réécriture des données)."""

from rest_framework import serializers


class CalendarQuestSerializer(serializers.Serializer):
    """Mission réduite telle qu'elle apparaît dans une entrée de calendrier."""

    id = serializers.IntegerField()
    title = serializers.CharField()
    quest_type = serializers.CharField()
    difficulty = serializers.CharField()
    territory = serializers.CharField()
    status = serializers.CharField()
    xp_reward = serializers.IntegerField()
    credit_reward = serializers.IntegerField()
    scheduled_date = serializers.DateField(allow_null=True)
    scheduled_time = serializers.CharField()
    due_date = serializers.DateField(allow_null=True)


class CalendarStepSerializer(serializers.Serializer):
    """Étape planifiée d'une mission."""

    id = serializers.IntegerField()
    title = serializers.CharField()
    is_done = serializers.BooleanField()


class CalendarEntrySerializer(serializers.Serializer):
    """Mission attendue un jour donné, ou échéance souple."""

    kind = serializers.CharField()
    quest = CalendarQuestSerializer()
    step = CalendarStepSerializer(allow_null=True)
    period_key = serializers.CharField()
    done = serializers.BooleanField()
    due_passed = serializers.BooleanField()


class CalendarCompletionSerializer(serializers.Serializer):
    """Validation réellement enregistrée, avec ses montants figés."""

    quest_id = serializers.IntegerField()
    title = serializers.CharField()
    territory = serializers.CharField()
    quest_type = serializers.CharField()
    xp = serializers.IntegerField()
    credits = serializers.IntegerField()
    completed_at = serializers.DateTimeField()


class CalendarSummarySerializer(serializers.Serializer):
    """Résumé neutre d'une journée, sans alerte ni série."""

    completions = serializers.IntegerField()
    xp = serializers.IntegerField()
    credits = serializers.IntegerField()
    dominant_territory = serializers.CharField(allow_null=True)


class CalendarDaySerializer(serializers.Serializer):
    """Contenu d'un jour du calendrier."""

    date = serializers.DateField()
    is_today = serializers.BooleanField()
    iso_week = serializers.CharField()
    entries = CalendarEntrySerializer(many=True)
    completions = CalendarCompletionSerializer(many=True)
    summary = CalendarSummarySerializer()


# Le champ « from » est un mot-clé Python : la classe est construite avec ``type``.
CalendarRangeResponseSerializer = type(
    "CalendarRangeResponseSerializer",
    (serializers.Serializer,),
    {
        "__doc__": "Réponse de ``GET /api/calendar/`` : jours d'une plage inclusive.",
        "__module__": __name__,
        "from": serializers.DateField(),
        "to": serializers.DateField(),
        "today": serializers.DateField(),
        "time_zone": serializers.CharField(),
        "days": CalendarDaySerializer(many=True),
    },
)


class CalendarWeeklySerializer(serializers.Serializer):
    """Hebdomadaire en cours avec son avancement dans la semaine ISO."""

    quest = CalendarQuestSerializer()
    done = serializers.BooleanField()
    days_left_in_week = serializers.IntegerField()


class CalendarTodayResponseSerializer(CalendarDaySerializer):
    """Réponse de ``GET /api/calendar/today/``."""

    time_zone = serializers.CharField()
    weekly = CalendarWeeklySerializer(many=True)
