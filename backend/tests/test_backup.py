"""Tests du script de sauvegarde autonome."""

import importlib.util
import sqlite3
from pathlib import Path
from types import ModuleType

import pytest

SCRIPT_PATH = Path(__file__).resolve().parents[2] / "scripts" / "backup.py"


def _load_backup_module() -> ModuleType:
    spec = importlib.util.spec_from_file_location("life_rpg_backup", SCRIPT_PATH)
    assert spec is not None and spec.loader is not None
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


@pytest.mark.django_db(transaction=True)
def test_backup_creates_sqlite_copy_and_json(
    tmp_path: Path, monkeypatch: pytest.MonkeyPatch
) -> None:
    db_path = tmp_path / "source.sqlite3"
    with sqlite3.connect(db_path) as connection:
        connection.execute("CREATE TABLE test_backup (id INTEGER PRIMARY KEY, valeur TEXT)")
        connection.execute("INSERT INTO test_backup (valeur) VALUES ('ok')")

    monkeypatch.setenv("LIFE_RPG_DB_PATH", str(db_path))
    monkeypatch.setenv("LIFE_RPG_BACKUP_DIR", str(tmp_path / "backups"))

    backup = _load_backup_module()
    assert backup.main([]) == 0

    backups = list((tmp_path / "backups").iterdir())
    assert len(backups) == 1
    backup_dir = backups[0]
    assert (backup_dir / "life_rpg.sqlite3").is_file()
    assert (backup_dir / "data.json").is_file()

    with sqlite3.connect(backup_dir / "life_rpg.sqlite3") as connection:
        assert connection.execute("SELECT valeur FROM test_backup").fetchone()[0] == "ok"


@pytest.mark.django_db(transaction=True)
def test_backup_keeps_sqlite_copy_when_json_export_fails(
    tmp_path: Path, monkeypatch: pytest.MonkeyPatch, capsys: pytest.CaptureFixture[str]
) -> None:
    """Export JSON en échec : la copie SQLite reste et aucun fichier partiel ne traîne."""
    db_path = tmp_path / "source.sqlite3"
    with sqlite3.connect(db_path) as connection:
        connection.execute("CREATE TABLE t (id INTEGER PRIMARY KEY)")

    monkeypatch.setenv("LIFE_RPG_DB_PATH", str(db_path))
    monkeypatch.setenv("LIFE_RPG_BACKUP_DIR", str(tmp_path / "backups"))

    def failing_dumpdata(*args: object, **kwargs: object) -> None:
        Path(str(kwargs["output"])).write_text("[{", encoding="utf-8")  # écriture partielle
        raise RuntimeError("no such table")

    monkeypatch.setattr("django.core.management.call_command", failing_dumpdata)

    backup = _load_backup_module()
    assert backup.main([]) == 0

    backup_dir = next((tmp_path / "backups").iterdir())
    assert (backup_dir / "life_rpg.sqlite3").is_file()
    assert not (backup_dir / "data.json").exists()
    assert list(backup_dir.glob("*.partiel")) == []
    assert "copie SQLite seulement" in capsys.readouterr().out
