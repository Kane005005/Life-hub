"""Enregistrement des compétences dans l'administration Django."""

from django.contrib import admin
from django.http import HttpRequest

from .models import Skill, SkillBranch, SkillPointTransaction, SkillTree, SkillUnlock


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


@admin.register(SkillTree)
class SkillTreeAdmin(admin.ModelAdmin):
    list_display = ("territory",)


@admin.register(SkillBranch)
class SkillBranchAdmin(admin.ModelAdmin):
    list_display = ("code", "name", "tree", "order")
    list_filter = ("tree",)
    search_fields = ("code", "name")


@admin.register(Skill)
class SkillAdmin(admin.ModelAdmin):
    list_display = ("code", "name", "branch", "tier", "cost")
    list_filter = ("branch__tree", "tier")
    search_fields = ("code", "name")
    filter_horizontal = ("requires",)


@admin.register(SkillUnlock)
class SkillUnlockAdmin(admin.ModelAdmin):
    list_display = ("uuid", "character", "skill", "unlocked_at", "points_spent")
    readonly_fields = ("uuid", "character", "skill", "unlocked_at", "points_spent", "transaction")

    def has_add_permission(self, request: HttpRequest) -> bool:
        return False

    def has_change_permission(self, request: HttpRequest, obj: SkillUnlock | None = None) -> bool:
        return False

    def has_delete_permission(self, request: HttpRequest, obj: SkillUnlock | None = None) -> bool:
        return False
