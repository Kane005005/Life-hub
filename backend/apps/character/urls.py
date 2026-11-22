"""Routes du personnage, sous le préfixe /api/."""

from django.urls import path

from . import views

app_name = "character"

urlpatterns = [
    path("character/", views.CharacterView.as_view(), name="character"),
    path("character/avatar/", views.AvatarView.as_view(), name="avatar"),
]
