"""Modèle de l'utilisateur unique de LIFE RPG."""

from django.contrib.auth.models import AbstractUser
from django.db import models

from apps.accounts.timezones import DEFAULT_TIME_ZONE, check_time_zone


class User(AbstractUser):
    """Compte unique, avec le fuseau horaire utilisé pour le calendrier."""

    time_zone = models.CharField(
        max_length=64,
        default=DEFAULT_TIME_ZONE,
        validators=[check_time_zone],
    )
