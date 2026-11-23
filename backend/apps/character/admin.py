"""Enregistrement du personnage dans l'administration Django."""

from django.contrib import admin

from .models import AvatarConfiguration, Character


@admin.register(Character)
class CharacterAdmin(admin.ModelAdmin):
    list_display = ("pseudonym", "user", "level", "total_xp", "credits", "is_onboarded")
    search_fields = ("pseudonym", "user__username")


@admin.register(AvatarConfiguration)
class AvatarConfigurationAdmin(admin.ModelAdmin):
    list_display = ("character", "silhouette", "color", "accent")
