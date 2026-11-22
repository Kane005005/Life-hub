from django.apps import AppConfig


class QuestsConfig(AppConfig):
    """Missions et propositions de missions."""

    name = "apps.quests"
    label = "quests"
    default_auto_field = "django.db.models.BigAutoField"
    verbose_name = "Missions"
