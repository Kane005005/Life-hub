"""Routes de l'économie, sous le préfixe /api/."""

from django.urls import path

from . import views

app_name = "economy"

urlpatterns = [
    path("economy/wallet/", views.WalletView.as_view(), name="wallet"),
    path("economy/transactions/", views.CreditTransactionListView.as_view(), name="transactions"),
]
