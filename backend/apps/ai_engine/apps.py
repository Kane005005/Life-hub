from django.apps import AppConfig


class AiEngineConfig(AppConfig):
    """Propositions et contexte des agents."""

    name = "apps.ai_engine"
    label = "ai_engine"
    default_auto_field = "django.db.models.BigAutoField"
    verbose_name = "Moteur IA"
