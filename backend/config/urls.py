"""Routes racines : administration, API et frontend construit."""

from pathlib import Path

from django.conf import settings
from django.contrib import admin
from django.urls import include, path, re_path
from django.views.static import serve
from drf_spectacular.views import SpectacularAPIView

from .views import HealthView, frontend_index

FRONTEND_DIST = Path(settings.FRONTEND_DIST)

urlpatterns = [
    path("admin/", admin.site.urls),
    path("api/health/", HealthView.as_view(), name="health"),
    path("api/schema/", SpectacularAPIView.as_view(), name="schema"),
    path("api/", include("apps.accounts.urls")),
    path("api/", include("apps.character.urls")),
    path("api/", include("apps.world.urls")),
    path("api/", include("apps.quests.urls")),
    path("api/", include("apps.planning.urls")),
    path("api/", include("apps.progression.urls")),
    path("api/", include("apps.skills.urls")),
    path("api/", include("apps.achievements.urls")),
    path("api/", include("apps.economy.urls")),
    path("api/", include("apps.seasons.urls")),
    path("api/", include("apps.journal.urls")),
    path("api/", include("apps.ai_engine.urls")),
    path("api/", include("apps.analytics.urls")),
    path(
        "assets/<path:path>",
        serve,
        {"document_root": str(FRONTEND_DIST / "assets")},
        name="frontend-assets",
    ),
    path(
        "favicon.svg",
        serve,
        {"path": "favicon.svg", "document_root": str(FRONTEND_DIST)},
        name="frontend-favicon",
    ),
    re_path(r"^(?!api/|admin/|assets/).*$", frontend_index, name="frontend-index"),
]
