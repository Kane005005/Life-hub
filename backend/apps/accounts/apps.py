from django.apps import AppConfig


class AccountsConfig(AppConfig):
    """Comptes et authentification de LIFE RPG."""

    name = "apps.accounts"
    label = "accounts"
    default_auto_field = "django.db.models.BigAutoField"
    verbose_name = "Comptes"
