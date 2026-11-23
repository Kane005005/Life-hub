"""Tests de l'authentification par jeton de l'API."""

import pytest
from rest_framework.authtoken.models import Token
from rest_framework.test import APIClient

from apps.accounts.models import User

pytestmark = pytest.mark.django_db


def test_login_returns_token_and_user(user: User) -> None:
    api = APIClient()

    response = api.post(
        "/api/auth/login/",
        {"username": "kane", "password": "mot-de-passe"},
        format="json",
    )

    assert response.status_code == 200
    data = response.json()
    assert Token.objects.filter(user=user, key=data["token"]).exists()
    assert data["user"] == {"id": user.id, "username": "kane"}


def test_login_with_wrong_password_is_rejected(user: User) -> None:
    api = APIClient()

    response = api.post(
        "/api/auth/login/",
        {"username": "kane", "password": "mauvais"},
        format="json",
    )

    assert response.status_code == 400
    assert response.json() == {"detail": "Identifiants incorrects."}


def test_me_requires_a_token(user: User) -> None:
    api = APIClient()

    assert api.get("/api/auth/me/").status_code == 401


def test_logout_revokes_the_current_token(user: User) -> None:
    token = Token.objects.create(user=user)
    api = APIClient()
    api.credentials(HTTP_AUTHORIZATION=f"Token {token.key}")

    response = api.post("/api/auth/logout/")

    assert response.status_code == 204
    assert not Token.objects.filter(key=token.key).exists()
    assert api.get("/api/auth/me/").status_code == 401
