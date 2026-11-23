"""Sérialiseurs des saisons."""

from rest_framework import serializers


class SeasonObjectiveSerializer(serializers.Serializer):
    """Objectif de saison."""

    id = serializers.IntegerField()
    title = serializers.CharField()
    is_main = serializers.BooleanField()
    is_done = serializers.BooleanField()
    order = serializers.IntegerField()


class SeasonSummarySerializer(serializers.Serializer):
    """Bilan d'une saison."""

    xp_total = serializers.IntegerField()
    xp_by_territory = serializers.DictField(child=serializers.IntegerField())
    completions = serializers.IntegerField()
    completions_by_type = serializers.DictField(child=serializers.IntegerField())
    levels_gained = serializers.IntegerField()
    objectives_done = serializers.IntegerField()
    objectives_total = serializers.IntegerField()
    achievements_unlocked = serializers.ListField(child=serializers.CharField())
    skills_unlocked = serializers.ListField(child=serializers.CharField())


class SeasonSerializer(serializers.Serializer):
    """Représentation complète d'une saison."""

    id = serializers.IntegerField()
    number = serializers.IntegerField()
    name = serializers.CharField()
    theme = serializers.CharField()
    status = serializers.CharField()
    start_date = serializers.DateField()
    end_date = serializers.DateField()
    days_left = serializers.IntegerField()
    closed_at = serializers.DateTimeField(allow_null=True)
    priority_territories = serializers.ListField(child=serializers.CharField())
    objectives = SeasonObjectiveSerializer(many=True)
    summary = SeasonSummarySerializer()


class SeasonObjectiveInputSerializer(serializers.Serializer):
    """Objectif envoyé lors de la création ou modification."""

    id = serializers.IntegerField(required=False)
    title = serializers.CharField(max_length=200, required=False)
    is_main = serializers.BooleanField(required=False, default=False)
    is_done = serializers.BooleanField(required=False, default=False)
    order = serializers.IntegerField(required=False, min_value=0)


class SeasonCreateSerializer(serializers.Serializer):
    """Création d'une saison."""

    name = serializers.CharField(max_length=120, required=False)
    theme = serializers.CharField(max_length=200, required=False, allow_blank=True, default="")
    start_date = serializers.DateField(required=False)
    priority_territories = serializers.ListField(
        child=serializers.CharField(), required=False, default=list
    )
    objectives = SeasonObjectiveInputSerializer(many=True, required=False, default=list)


class SeasonUpdateSerializer(serializers.Serializer):
    """Mise à jour d'une saison active."""

    name = serializers.CharField(max_length=120, required=False)
    theme = serializers.CharField(max_length=200, required=False, allow_blank=True)
    priority_territories = serializers.ListField(child=serializers.CharField(), required=False)
    objectives = SeasonObjectiveInputSerializer(many=True, required=False)


class SeasonCloseResponseSerializer(serializers.Serializer):
    """Réponse de clôture anticipée."""

    closed = SeasonSerializer()
    next = SeasonSerializer()


class SeasonListResponseSerializer(serializers.Serializer):
    """Liste paginée des saisons."""

    count = serializers.IntegerField()
    next = serializers.CharField(allow_null=True)
    previous = serializers.CharField(allow_null=True)
    results = SeasonSerializer(many=True)
