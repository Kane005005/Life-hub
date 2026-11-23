"""Routes des saisons, sous le préfixe /api/."""

from django.urls import path

from . import views

app_name = "seasons"

urlpatterns = [
    path("seasons/", views.SeasonListCreateView.as_view(), name="list"),
    path("seasons/current/", views.SeasonCurrentView.as_view(), name="current"),
    path("seasons/<int:pk>/", views.SeasonDetailView.as_view(), name="detail"),
    path("seasons/<int:pk>/close/", views.SeasonCloseView.as_view(), name="close"),
]
