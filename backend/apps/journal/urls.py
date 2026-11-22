"""Routes du journal, sous le préfixe /api/."""

from django.urls import path

from . import views

app_name = "journal"

urlpatterns = [
    path("journal/", views.JournalEntryListView.as_view(), name="journal"),
    path("journal/rest/", views.RestView.as_view(), name="rest"),
]
