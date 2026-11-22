"""Enregistrement des missions dans l'administration Django."""

from django.contrib import admin

from .models import Quest, QuestCompletion, QuestStep


class QuestStepInline(admin.TabularInline):
    model = QuestStep
    extra = 0


@admin.register(Quest)
class QuestAdmin(admin.ModelAdmin):
    list_display = (
        "title",
        "owner",
        "territory",
        "quest_type",
        "difficulty",
        "status",
        "xp_reward",
    )
    list_filter = ("quest_type", "difficulty", "status", "territory")
    search_fields = ("title", "owner__username")
    inlines = [QuestStepInline]


@admin.register(QuestStep)
class QuestStepAdmin(admin.ModelAdmin):
    list_display = ("quest", "title", "order", "is_required", "is_done")


@admin.register(QuestCompletion)
class QuestCompletionAdmin(admin.ModelAdmin):
    list_display = ("quest", "period_key", "xp_awarded", "credits_awarded", "completed_at")
    list_filter = ("period_key",)
