"""Modèle de l'utilisateur unique de LIFE RPG."""

from django.contrib.auth.models import AbstractUser


class User(AbstractUser):
    """Compte unique, sans champ supplémentaire par rapport à AbstractUser."""
