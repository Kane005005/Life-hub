from django.apps import AppConfig


class WorldConfig(AppConfig):
    """Monde et territoires."""

    name = "apps.world"
    label = "world"
    default_auto_field = "django.db.models.BigAutoField"
    verbose_name = "Monde"
