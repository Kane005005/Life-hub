#!/usr/bin/env python
"""Point d'entrée des commandes d'administration Django de LIFE RPG."""

import os
import sys


def main() -> None:
    """Lance une commande Django avec les réglages locaux par défaut."""
    os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings.local")
    try:
        from django.core.management import execute_from_command_line
    except ImportError as exc:
        raise ImportError(
            "Django n'est pas disponible. Active l'environnement du projet (uv run)."
        ) from exc
    execute_from_command_line(sys.argv)


if __name__ == "__main__":
    main()
