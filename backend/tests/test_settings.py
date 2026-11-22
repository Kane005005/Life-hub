"""Tests des réglages de sécurité et d'architecture."""

import pytest
from django.conf import settings
from rest_framework.permissions import IsAuthenticated
from rest_framework.settings import api_settings

EXPECTED_APPS = [
    "apps.accounts",
    "apps.character",
    "apps.world",
    "apps.quests",
    "apps.progression",
    "apps.skills",
    "apps.economy",
    "apps.achievements",
    "apps.seasons",
    "apps.journal",
    "apps.analytics",
    "apps.ai_engine",
    "apps.notifications",
]


def test_allowed_hosts_are_local_only() -> None:
    assert "*" not in settings.ALLOWED_HOSTS
    assert "0.0.0.0" not in settings.ALLOWED_HOSTS


def test_auth_user_model() -> None:
    assert settings.AUTH_USER_MODEL == "accounts.User"


def test_all_apps_are_installed() -> None:
    assert all(app in settings.INSTALLED_APPS for app in EXPECTED_APPS)


def test_default_permission_is_authenticated() -> None:
    assert IsAuthenticated in api_settings.DEFAULT_PERMISSION_CLASSES


@pytest.mark.django_db
def test_schema_requires_authentication(client) -> None:
    assert client.get("/api/schema/").status_code in (401, 403)
