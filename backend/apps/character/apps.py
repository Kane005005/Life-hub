from django.apps import AppConfig


class CharacterConfig(AppConfig):
    """Fiche et avatar du personnage."""

    name = "apps.character"
    label = "character"
    default_auto_field = "django.db.models.BigAutoField"
    verbose_name = "Personnage"
