from django.apps import AppConfig


class AnalyticsConfig(AppConfig):
    """Statistiques et tendances de progression."""

    name = "apps.analytics"
    label = "analytics"
    default_auto_field = "django.db.models.BigAutoField"
    verbose_name = "Analyses"
