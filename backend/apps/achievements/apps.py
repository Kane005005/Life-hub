from django.apps import AppConfig


class AchievementsConfig(AppConfig):
    """Succès débloqués par le joueur."""

    name = "apps.achievements"
    label = "achievements"
    default_auto_field = "django.db.models.BigAutoField"
    verbose_name = "Succès"
