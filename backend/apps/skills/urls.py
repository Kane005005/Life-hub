"""Routes des compétences, sous le préfixe /api/."""

from django.urls import path, re_path

from . import views

app_name = "skills"

urlpatterns = [
    path("skills/trees/", views.SkillTreeListView.as_view(), name="trees"),
    re_path(
        r"^skills/(?P<code>[a-z_.0-9]+)/unlock/$",
        views.SkillUnlockView.as_view(),
        name="unlock",
    ),
]
