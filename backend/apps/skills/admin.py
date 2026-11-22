"""Enregistrement des points de compétence dans l'administration Django."""

from django.contrib import admin
from django.http import HttpRequest

from .models import SkillPointTransaction


@admin.register(SkillPointTransaction)
class SkillPointTransactionAdmin(admin.ModelAdmin):
    list_display = ("uuid", "character", "amount", "kind", "reason", "balance_after")
    list_filter = ("kind",)

    def has_change_permission(
        self, request: HttpRequest, obj: SkillPointTransaction | None = None
    ) -> bool:
        return False

    def has_delete_permission(
        self, request: HttpRequest, obj: SkillPointTransaction | None = None
    ) -> bool:
        return False
