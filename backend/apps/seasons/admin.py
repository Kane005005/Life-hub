"""Enregistrement des saisons dans l'administration Django."""

from django.contrib import admin

from .models import Season, SeasonObjective


class SeasonObjectiveInline(admin.TabularInline):
    model = SeasonObjective
    extra = 0


@admin.register(Season)
class SeasonAdmin(admin.ModelAdmin):
    list_display = ("name", "owner", "number", "status", "start_date", "end_date")
    list_filter = ("status",)
    search_fields = ("name", "owner__username")
    inlines = [SeasonObjectiveInline]


@admin.register(SeasonObjective)
class SeasonObjectiveAdmin(admin.ModelAdmin):
    list_display = ("season", "title", "is_main", "is_done", "order")
    list_filter = ("is_main", "is_done")
