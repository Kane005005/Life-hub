"""Routes du monde, sous le préfixe /api/."""

from django.urls import path

from . import views

app_name = "world"

urlpatterns = [
    path("world/territories/", views.TerritoryListView.as_view(), name="territory-list"),
    path(
        "world/territories/<int:pk>/",
        views.TerritoryDetailView.as_view(),
        name="territory-detail",
    ),
    path("world/progress/", views.WorldProgressView.as_view(), name="world-progress"),
]
