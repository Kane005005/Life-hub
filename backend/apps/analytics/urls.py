"""Routes d'énergie, d'analyse et d'export, sous le préfixe /api/."""

from django.urls import path

from . import views

app_name = "analytics"

urlpatterns = [
    path("energy/", views.EnergyListCreateView.as_view(), name="energy"),
    path("analytics/insights/", views.InsightsView.as_view(), name="insights"),
    path("export/", views.ExportView.as_view(), name="export"),
]
