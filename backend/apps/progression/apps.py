from django.apps import AppConfig


class ProgressionConfig(AppConfig):
    """Niveaux, expérience et historique."""

    name = "apps.progression"
    label = "progression"
    default_auto_field = "django.db.models.BigAutoField"
    verbose_name = "Progression"
