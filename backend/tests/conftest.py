"""Fixtures partagées des tests du LIFE RPG."""

import pytest
from django.contrib.auth import get_user_model

from apps.accounts.models import User
from apps.character.models import Character
from engine.seed import seed_world
from engine.services import ensure_character


@pytest.fixture
def world(db: None) -> None:
    """Initialise les six territoires et les paramètres du jeu."""
    seed_world()


@pytest.fixture
def user(world: None) -> User:
    """Crée l'utilisateur principal."""
    return get_user_model().objects.create_user(username="kane", password="mot-de-passe")


@pytest.fixture
def character(user: User) -> Character:
    """Crée le personnage de l'utilisateur principal."""
    return ensure_character(user)


@pytest.fixture
def other_user(world: None) -> User:
    """Crée un second utilisateur pour vérifier l'isolation des données."""
    return get_user_model().objects.create_user(username="autre", password="mot-de-passe")
