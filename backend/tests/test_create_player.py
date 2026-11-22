"""Tests de la commande de création du compte unique."""

import io
import sys

import pytest
from django.contrib.auth import get_user_model
from django.core.management import CommandError, call_command
from rest_framework.authtoken.models import Token


@pytest.mark.django_db
def test_create_player_with_stdin(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setattr(sys, "stdin", io.StringIO("mot-de-passe\n"))
    output = io.StringIO()

    call_command(
        "create_player",
        "--username",
        "kane",
        "--password-stdin",
        stdout=output,
    )

    user = get_user_model().objects.get(username="kane")
    assert user.is_staff
    assert user.is_superuser
    assert user.check_password("mot-de-passe")
    assert Token.objects.filter(user=user).exists()
    assert "Compte créé : kane." in output.getvalue()
    assert "Jeton d'API : " in output.getvalue()

    monkeypatch.setattr(sys, "stdin", io.StringIO("un-autre-mot-de-passe\n"))
    with pytest.raises(CommandError, match="Le compte unique existe déjà. Aucun nouveau compte"):
        call_command("create_player", "--username", "autre", "--password-stdin")

    assert get_user_model().objects.count() == 1
    assert Token.objects.count() == 1


@pytest.mark.django_db
def test_create_player_rejects_short_password(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    monkeypatch.setattr(sys, "stdin", io.StringIO("court\n"))

    with pytest.raises(CommandError, match="8 caractères"):
        call_command("create_player", "--username", "kane", "--password-stdin")

    assert get_user_model().objects.count() == 0
    assert Token.objects.count() == 0
