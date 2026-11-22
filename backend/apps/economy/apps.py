from django.apps import AppConfig


class EconomyConfig(AppConfig):
    """Portefeuille, transactions et récompenses."""

    name = "apps.economy"
    label = "economy"
    default_auto_field = "django.db.models.BigAutoField"
    verbose_name = "Économie"
