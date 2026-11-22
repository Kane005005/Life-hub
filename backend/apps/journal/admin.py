"""Enregistrement du journal dans l'administration Django."""

from django.contrib import admin
from django.http import HttpRequest

from .models import JournalEntry


@admin.register(JournalEntry)
class JournalEntryAdmin(admin.ModelAdmin):
    list_display = ("uuid", "event_type", "actor", "message", "quest", "created_at")
    list_filter = ("event_type", "actor")
    search_fields = ("message", "actor")

    def has_change_permission(self, request: HttpRequest, obj: JournalEntry | None = None) -> bool:
        return False

    def has_delete_permission(self, request: HttpRequest, obj: JournalEntry | None = None) -> bool:
        return False
