"""Exporte le schéma OpenAPI de l'API dans docs/openapi.yaml."""

from pathlib import Path

from django.core.management import call_command
from django.core.management.base import BaseCommand


class Command(BaseCommand):
    """Écrit le schéma généré par drf-spectacular dans le dépôt."""

    help = "Exporte le schéma OpenAPI dans docs/openapi.yaml."

    def handle(self, *args: object, **options: object) -> None:
        """Génère le fichier YAML du contrat d'API."""
        output = Path(__file__).resolve().parents[5] / "docs" / "openapi.yaml"
        output.parent.mkdir(parents=True, exist_ok=True)
        call_command("spectacular", file=str(output), validate=True)
        self.stdout.write(f"Schéma exporté : {output}")
