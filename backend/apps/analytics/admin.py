"""Enregistrement des bilans énergétiques dans l'administration Django."""

from django.contrib import admin
from django.http import HttpRequest

from .models import EnergyCheckIn


@admin.register(EnergyCheckIn)
class EnergyCheckInAdmin(admin.ModelAdmin):
    list_display = ("owner", "date", "level", "created_at")
    list_filter = ("level", "date")
    search_fields = ("owner__username",)

    def has_add_permission(self, request: HttpRequest) -> bool:
        return False

    def has_change_permission(self, request: HttpRequest, obj: EnergyCheckIn | None = None) -> bool:
        return False

    def has_delete_permission(self, request: HttpRequest, obj: EnergyCheckIn | None = None) -> bool:
        return False
