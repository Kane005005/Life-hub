from django.apps import AppConfig


class PlanningConfig(AppConfig):
    """Calendrier journalier et planification des missions."""

    name = "apps.planning"
    label = "planning"
    default_auto_field = "django.db.models.BigAutoField"
    verbose_name = "Calendrier"
