"""Réglages Django pour l'installation locale de LIFE RPG."""

import os

from . import env_bool
from .base import *  # noqa: F403

# Clé de développement uniquement : une vraie clé doit venir du .env.
SECRET_KEY = os.environ.get("LIFE_RPG_SECRET_KEY") or "dev-insecure-life-rpg-local-key"
DEBUG = env_bool("LIFE_RPG_DEBUG", True)
