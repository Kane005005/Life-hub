"""Enregistrement des agents et des propositions dans l'administration Django."""

from django.contrib import admin
from django.http import HttpRequest

from .models import AgentToken, QuestProposal


@admin.register(AgentToken)
class AgentTokenAdmin(admin.ModelAdmin):
    list_display = ("name", "owner", "prefix", "created_at", "last_used_at", "revoked_at")
    search_fields = ("name", "owner__username")
    exclude = ("key_hash",)
    readonly_fields = ("prefix", "created_at", "last_used_at", "revoked_at")

    def has_delete_permission(self, request: HttpRequest, obj: AgentToken | None = None) -> bool:
        return False


@admin.register(QuestProposal)
class QuestProposalAdmin(admin.ModelAdmin):
    list_display = ("title", "owner", "agent_name", "status", "territory", "created_at")
    list_filter = ("status", "territory")
    search_fields = ("title", "agent_name", "owner__username")

    def has_add_permission(self, request: HttpRequest) -> bool:
        return False

    def has_change_permission(self, request: HttpRequest, obj: QuestProposal | None = None) -> bool:
        return False

    def has_delete_permission(self, request: HttpRequest, obj: QuestProposal | None = None) -> bool:
        return False
