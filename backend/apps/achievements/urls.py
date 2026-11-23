"""Routes des succès, sous le préfixe /api/."""

from django.urls import path

from . import views

app_name = "achievements"

urlpatterns = [
    path("achievements/", views.AchievementListView.as_view(), name="list"),
]
