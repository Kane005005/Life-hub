"""Routes de progression et de paramètres, sous le préfixe /api/."""

from django.urls import path

from . import views

app_name = "progression"

urlpatterns = [
    path("progression/", views.ProgressionView.as_view(), name="progression"),
    path("progression/history/", views.XPHistoryView.as_view(), name="xp-history"),
    path("progression/skills/", views.SkillPointsView.as_view(), name="skills"),
    path("settings/game/", views.GameSettingsView.as_view(), name="game-settings"),
]
