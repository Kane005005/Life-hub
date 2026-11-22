"""Réglages Django de LIFE RPG."""

import os


def env_bool(name: str, default: bool) -> bool:
    """Lit un booléen dans l'environnement, avec une valeur par défaut."""
    value = os.environ.get(name)
    if value is None:
        return default
    return value.strip().lower() in {"1", "true", "yes", "on"}
