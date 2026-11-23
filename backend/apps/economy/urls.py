"""Routes de l'économie, sous le préfixe /api/."""

from django.urls import path

from . import views

app_name = "economy"

urlpatterns = [
    path("economy/wallet/", views.WalletView.as_view(), name="wallet"),
    path("economy/transactions/", views.CreditTransactionListView.as_view(), name="transactions"),
    path("economy/rewards/", views.RewardListCreateView.as_view(), name="rewards"),
    path("economy/rewards/<int:pk>/", views.RewardDetailView.as_view(), name="reward-detail"),
    path(
        "economy/rewards/<int:pk>/purchase/",
        views.RewardPurchaseView.as_view(),
        name="reward-purchase",
    ),
    path("economy/inventory/", views.InventoryView.as_view(), name="inventory"),
    path(
        "economy/inventory/<int:pk>/equip/",
        views.InventoryEquipView.as_view(),
        name="inventory-equip",
    ),
    path(
        "economy/inventory/<int:pk>/unequip/",
        views.InventoryUnequipView.as_view(),
        name="inventory-unequip",
    ),
]
