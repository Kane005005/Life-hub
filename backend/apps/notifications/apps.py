from django.apps import AppConfig


class NotificationsConfig(AppConfig):
    """Notifications locales de l'application."""

    name = "apps.notifications"
    label = "notifications"
    default_auto_field = "django.db.models.BigAutoField"
    verbose_name = "Notifications"
