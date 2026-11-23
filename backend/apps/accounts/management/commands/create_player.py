"""Création du compte unique de LIFE RPG et de son jeton d'API."""

import sys
from argparse import ArgumentParser
from getpass import getpass
from typing import Any

from django.contrib.auth import get_user_model
from django.core.management.base import BaseCommand, CommandError
from django.db import transaction
from rest_framework.authtoken.models import Token

from engine.services import ensure_character


class Command(BaseCommand):
    """Crée le seul compte autorisé, avec les droits d'administration."""

    help = "Crée le compte unique et affiche son jeton d'API."

    def add_arguments(self, parser: ArgumentParser) -> None:
        parser.add_argument(
            "--username",
            required=True,
            help="Nom d'utilisateur du compte unique.",
        )
        parser.add_argument(
            "--password-stdin",
            action="store_true",
            help="Lit le mot de passe sur une ligne de l'entrée standard.",
        )

    def handle(self, *args: Any, **options: Any) -> None:
        user_model = get_user_model()
        if user_model.objects.exists():
            raise CommandError("Le compte unique existe déjà. Aucun nouveau compte n'a été créé.")

        if options["password_stdin"]:
            password = sys.stdin.readline().rstrip("\r\n")
        else:
            password = getpass("Mot de passe : ")
            confirmation = getpass("Confirme le mot de passe : ")
            if password != confirmation:
                raise CommandError("Les mots de passe ne correspondent pas.")

        if not password:
            raise CommandError("Le mot de passe ne peut pas être vide.")
        if len(password) < 8:
            raise CommandError("Le mot de passe doit contenir au moins 8 caractères.")

        with transaction.atomic():
            user = user_model.objects.create_user(
                username=options["username"],
                password=password,
                is_staff=True,
                is_superuser=True,
            )
            ensure_character(user)
            token = Token.objects.create(user=user)
        self.stdout.write(f"Compte créé : {user.username}.")
        self.stdout.write(f"Jeton d'API : {token.key}")
