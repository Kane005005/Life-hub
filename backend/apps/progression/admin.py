"""Enregistrement de la progression dans l'administration Django."""

from django.contrib import admin
from django.http import HttpRequest

from .models import GameSettings, XPTransaction


@admin.register(GameSettings)
class GameSettingsAdmin(admin.ModelAdmin):
    list_display = ("id", "credits_per_xp", "skill_points_per_level", "updated_at")


@admin.register(XPTransaction)
class XPTransactionAdmin(admin.ModelAdmin):
    list_display = (
        "uuid",
        "character",
        "amount",
        "territory",
        "level_before",
        "level_after",
        "created_at",
    )
    list_filter = ("territory",)

    def has_change_permission(self, request: HttpRequest, obj: XPTransaction | None = None) -> bool:
        return False

    def has_delete_permission(self, request: HttpRequest, obj: XPTransaction | None = None) -> bool:
        return False
