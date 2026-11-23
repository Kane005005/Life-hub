"""Commande d'initialisation des données du monde."""

from django.core.management.base import BaseCommand

from engine.seed import seed_world


class Command(BaseCommand):
    """Charge les six territoires et les paramètres du jeu."""

    help = "Initialise les six territoires et les paramètres du jeu."

    def handle(self, *args: object, **options: object) -> None:
        seed_world()
        self.stdout.write("Monde initialisé : 6 territoires.")
