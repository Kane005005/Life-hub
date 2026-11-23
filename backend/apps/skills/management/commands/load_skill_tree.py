"""Commande de chargement de l'arbre de compétences."""

from django.core.management.base import BaseCommand

from engine.skills import load_skill_tree


class Command(BaseCommand):
    """Charge l'arbre de compétences depuis le seed JSON."""

    help = "Charge l'arbre de compétences."

    def handle(self, *args: object, **options: object) -> None:
        """Exécute le chargement idempotent de l'arbre."""
        result = load_skill_tree()
        self.stdout.write(
            "Arbre chargé : "
            f"{result['trees']} arbres, {result['branches']} branches, "
            f"{result['skills']} compétences."
        )
