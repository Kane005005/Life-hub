"""Règles de calcul pures du LIFE RPG, sans aucun accès à la base de données."""


def xp_required(level: int) -> int:
    """Renvoie l'XP nécessaire pour passer le niveau donné.

    Règle : XP requis pour passer le niveau N = 100 + 50 × (N − 1).
    Le surplus d'XP se reporte au niveau suivant.
    """
    if isinstance(level, bool) or not isinstance(level, int):
        raise ValueError("Le niveau doit être un entier.")
    if level < 1:
        raise ValueError("Le niveau doit être supérieur ou égal à 1.")
    return 100 + 50 * (level - 1)
