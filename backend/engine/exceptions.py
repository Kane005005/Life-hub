"""Exceptions métier du Life Engine, avec des messages en français."""


class EngineError(Exception):
    """Erreur de base : le moteur refuse une opération."""

    def __init__(self, message: str = "Le moteur de jeu a refusé l'opération.") -> None:
        super().__init__(message)


class QuestStateError(EngineError):
    """L'état de la mission ne permet pas l'opération demandée."""

    def __init__(self, message: str = "Cette mission ne permet pas cette action.") -> None:
        super().__init__(message)


class AlreadyCompleted(EngineError):
    """La mission a déjà été validée pour la période en cours."""

    def __init__(self, message: str = "Mission déjà validée.") -> None:
        super().__init__(message)


class AlreadyUnlocked(EngineError):
    """La compétence est déjà débloquée pour ce personnage."""

    def __init__(self, message: str = "Compétence déjà débloquée.") -> None:
        super().__init__(message)


class SkillLockedError(EngineError):
    """La compétence ne peut pas être débloquée."""


class NotOwnedError(EngineError):
    """L'objet n'appartient pas au joueur."""


class InsufficientCredits(EngineError):
    """Le solde de crédits ne suffit pas."""


class AlreadyOwned(EngineError):
    """L'objet est déjà possédé."""

    def __init__(self, message: str = "Tu possèdes déjà cet objet.") -> None:
        super().__init__(message)


class SeasonError(EngineError):
    """L'opération sur la saison est impossible."""
