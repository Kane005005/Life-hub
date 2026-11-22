#!/usr/bin/env python3
"""Sauvegarde locale de LIFE RPG : copie SQLite datée et export JSON."""

from __future__ import annotations

import os
import sqlite3
import sys
from collections.abc import Sequence
from contextlib import closing
from datetime import datetime
from pathlib import Path

from dotenv import load_dotenv

ROOT_DIR = Path(__file__).resolve().parent.parent
BACKEND_DIR = ROOT_DIR / "backend"
DB_FILENAME = "life_rpg.sqlite3"
DATA_FILENAME = "data.json"


def _load_env() -> None:
    """Charge le .env de la racine du dépôt, s'il existe."""
    env_file = ROOT_DIR / ".env"
    if env_file.is_file():
        load_dotenv(env_file)


def _resolve_path(value: str | None, default: Path) -> Path:
    """Résout un chemin configurable, en le rattachant à la racine si relatif."""
    path = Path(value).expanduser() if value else default
    return path if path.is_absolute() else ROOT_DIR / path


def main(argv: Sequence[str] | None = None) -> int:
    """Crée une sauvegarde datée ; renvoie 0 en cas de succès, 1 sinon."""
    _load_env()
    db_path = _resolve_path(
        os.environ.get("LIFE_RPG_DB_PATH"), ROOT_DIR / "data" / DB_FILENAME
    )
    if not db_path.is_file():
        print(f"Aucune base à sauvegarder : {db_path}.")
        return 1

    backup_root = _resolve_path(
        os.environ.get("LIFE_RPG_BACKUP_DIR"), ROOT_DIR / "backups"
    )
    backup_dir = backup_root / datetime.now().strftime("%Y-%m-%d_%H%M%S")
    backup_dir.mkdir(parents=True, exist_ok=False)  # jamais écraser une sauvegarde

    with (
        closing(sqlite3.connect(db_path)) as src,
        closing(sqlite3.connect(backup_dir / DB_FILENAME)) as dst,
    ):
        src.backup(dst)

    backend_path = str(BACKEND_DIR)
    if backend_path not in sys.path:
        sys.path.insert(0, backend_path)
    os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings.local")

    import django

    django.setup()

    from django.core.management import call_command

    call_command(
        "dumpdata",
        natural_foreign=True,
        natural_primary=True,
        indent=2,
        exclude=["contenttypes", "auth.permission", "sessions", "admin.logentry"],
        output=str(backup_dir / DATA_FILENAME),
    )

    print(f"Sauvegarde créée : {backup_dir}.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
