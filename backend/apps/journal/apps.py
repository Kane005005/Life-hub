from django.apps import AppConfig


class JournalConfig(AppConfig):
    """Journal des événements et bilans."""

    name = "apps.journal"
    label = "journal"
    default_auto_field = "django.db.models.BigAutoField"
    verbose_name = "Journal"
