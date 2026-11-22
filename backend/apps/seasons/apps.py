from django.apps import AppConfig


class SeasonsConfig(AppConfig):
    """Saisons de 90 jours et objectifs."""

    name = "apps.seasons"
    label = "seasons"
    default_auto_field = "django.db.models.BigAutoField"
    verbose_name = "Saisons"
