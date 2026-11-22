"""Enregistrement du monde dans l'administration Django."""

from django.contrib import admin

from .models import Territory, TerritoryProgress


@admin.register(Territory)
class TerritoryAdmin(admin.ModelAdmin):
    list_display = ("code", "stat_code", "name", "english", "place", "order")
    search_fields = ("code", "stat_code", "name")


@admin.register(TerritoryProgress)
class TerritoryProgressAdmin(admin.ModelAdmin):
    list_display = ("character", "territory", "total_xp")
    list_filter = ("territory",)
