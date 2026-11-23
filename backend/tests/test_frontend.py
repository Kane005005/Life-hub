"""Tests de la diffusion du build React par Django."""

from django.test import Client, override_settings


def test_frontend_index_serves_built_index(client: Client, tmp_path) -> None:
    (tmp_path / "index.html").write_text("<h1>LIFE RPG</h1>", encoding="utf-8")

    with override_settings(FRONTEND_DIST=tmp_path):
        response = client.get("/monde")

    assert response.status_code == 200
    assert b"".join(response.streaming_content).decode("utf-8") == "<h1>LIFE RPG</h1>"


def test_frontend_index_without_build_returns_503(client: Client, tmp_path) -> None:
    with override_settings(FRONTEND_DIST=tmp_path):
        response = client.get("/monde")

    assert response.status_code == 503
    assert response.content.decode("utf-8") == "Le front n'est pas construit. Lance make build."


def test_frontend_index_is_revalidated(client, settings, tmp_path) -> None:
    (tmp_path / "index.html").write_text("<html>LIFE RPG</html>", encoding="utf-8")
    settings.FRONTEND_DIST = tmp_path
    response = client.get("/")
    assert response["Cache-Control"] == "no-cache"
