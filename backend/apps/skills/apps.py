from django.apps import AppConfig


class SkillsConfig(AppConfig):
    """Compétences et arbres de compétences."""

    name = "apps.skills"
    label = "skills"
    default_auto_field = "django.db.models.BigAutoField"
    verbose_name = "Compétences"
