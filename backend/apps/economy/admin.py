"""Enregistrement de l'économie dans l'administration Django."""

from django.contrib import admin
from django.http import HttpRequest

from .models import CreditTransaction, InventoryItem, RewardPurchase, ShopItem


@admin.register(CreditTransaction)
class CreditTransactionAdmin(admin.ModelAdmin):
    list_display = ("uuid", "character", "amount", "kind", "reason", "balance_after")
    list_filter = ("kind",)

    def has_change_permission(
        self, request: HttpRequest, obj: CreditTransaction | None = None
    ) -> bool:
        return False

    def has_delete_permission(
        self, request: HttpRequest, obj: CreditTransaction | None = None
    ) -> bool:
        return False


@admin.register(ShopItem)
class ShopItemAdmin(admin.ModelAdmin):
    list_display = ("name", "category", "slot", "cost", "is_available", "owner", "order")
    list_filter = ("category", "slot", "is_available")
    search_fields = ("name", "owner__username")


@admin.register(RewardPurchase)
class RewardPurchaseAdmin(admin.ModelAdmin):
    list_display = ("uuid", "character", "item", "cost", "purchased_at")
    readonly_fields = ("uuid", "character", "item", "cost", "credit_transaction", "purchased_at")

    def has_add_permission(self, request: HttpRequest) -> bool:
        return False

    def has_change_permission(
        self, request: HttpRequest, obj: RewardPurchase | None = None
    ) -> bool:
        return False

    def has_delete_permission(
        self, request: HttpRequest, obj: RewardPurchase | None = None
    ) -> bool:
        return False


@admin.register(InventoryItem)
class InventoryItemAdmin(admin.ModelAdmin):
    list_display = ("character", "item", "acquired_at")
    search_fields = ("character__pseudonym", "item__name")
