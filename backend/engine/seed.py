"""Données initiales du monde LIFE RPG, chargées de façon idempotente."""

from apps.progression.models import GameSettings
from apps.world.models import Territory

TERRITORIES: tuple[dict[str, str], ...] = (
    {
        "code": "KNOWLEDGE",
        "stat_code": "INT",
        "name": "Savoir",
        "english": "KNOWLEDGE",
        "place": "Cité du savoir",
        "domain": "Développement intellectuel",
        "color": "#6F94B5",
    },
    {
        "code": "BODY",
        "stat_code": "VIT",
        "name": "Corps",
        "english": "BODY",
        "place": "Sanctuaire physique",
        "domain": "Vitalité et entretien physique",
        "color": "#2FD08B",
    },
    {
        "code": "CAREER",
        "stat_code": "INF",
        "name": "Carrière",
        "english": "CAREER",
        "place": "Métropole économique",
        "domain": "Évolution professionnelle",
        "color": "#D0A94A",
    },
    {
        "code": "TECHNOLOGY",
        "stat_code": "TEC",
        "name": "Technologie",
        "english": "TECHNOLOGY",
        "place": "Laboratoire avancé",
        "domain": "Maîtrise technologique",
        "color": "#3FB6C6",
    },
    {
        "code": "CREATION",
        "stat_code": "CRE",
        "name": "Création",
        "english": "CREATION",
        "place": "District créatif",
        "domain": "Expression et imagination",
        "color": "#E0806F",
    },
    {
        "code": "INNER_WORLD",
        "stat_code": "SAG",
        "name": "Monde intérieur",
        "english": "INNER WORLD",
        "place": "Sanctuaire intérieur",
        "domain": "Équilibre personnel",
        "color": "#A08DD0",
    },
)


def seed_world() -> None:
    """Crée ou met à jour les six territoires et les paramètres du jeu."""
    for order, data in enumerate(TERRITORIES, start=1):
        Territory.objects.update_or_create(code=data["code"], defaults={**data, "order": order})
    GameSettings.load()
