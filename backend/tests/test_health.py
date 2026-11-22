"""Tests de l'endpoint de santé de l'API."""

from django.test import Client


def test_health_is_public_and_exact(client: Client) -> None:
    response = client.get("/api/health/")

    assert response.status_code == 200
    assert response.json() == {"status": "ok", "app": "LIFE RPG", "version": "0.1.0"}
