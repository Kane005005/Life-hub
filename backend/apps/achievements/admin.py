"""Enregistrement des succès dans l'administration Django."""

from django.contrib import admin
from django.http import HttpRequest

from .models import Achievement, PlayerAchievement


@admin.register(Achievement)
class AchievementAdmin(admin.ModelAdmin):
    list_display = ("code", "label", "name", "order", "is_active")
    list_filter = ("is_active",)
    search_fields = ("code", "label", "name")


@admin.register(PlayerAchievement)
class PlayerAchievementAdmin(admin.ModelAdmin):
    list_display = ("uuid", "character", "achievement", "unlocked_at")
    readonly_fields = ("uuid", "character", "achievement", "unlocked_at")

    def has_add_permission(self, request: HttpRequest) -> bool:
        return False

    def has_change_permission(
        self, request: HttpRequest, obj: PlayerAchievement | None = None
    ) -> bool:
        return False

    def has_delete_permission(
        self, request: HttpRequest, obj: PlayerAchievement | None = None
    ) -> bool:
        return False
