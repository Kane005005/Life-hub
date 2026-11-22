"""Routes des missions, sous le préfixe /api/."""

from django.urls import include, path
from rest_framework.routers import SimpleRouter

from .views import QuestViewSet

app_name = "quests"

router = SimpleRouter()
router.register("quests", QuestViewSet, basename="quest")

urlpatterns = [path("", include(router.urls))]
