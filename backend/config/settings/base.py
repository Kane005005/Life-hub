"""Réglages Django communs de LIFE RPG."""

import os
from pathlib import Path

from dotenv import load_dotenv

from . import env_bool

# config/settings/base.py -> config/settings -> config -> backend -> racine du dépôt.
ROOT_DIR = Path(__file__).resolve().parents[3]
BACKEND_DIR = ROOT_DIR / "backend"

ENV_FILE = ROOT_DIR / ".env"
if ENV_FILE.is_file():
    load_dotenv(ENV_FILE)

SECRET_KEY = os.environ.get("LIFE_RPG_SECRET_KEY", "")
DEBUG = env_bool("LIFE_RPG_DEBUG", False)
ALLOWED_HOSTS = ["127.0.0.1", "localhost"]

DB_PATH = Path(
    os.environ.get("LIFE_RPG_DB_PATH") or ROOT_DIR / "data" / "life_rpg.sqlite3"
).expanduser()
if not DB_PATH.is_absolute():
    DB_PATH = ROOT_DIR / DB_PATH
DB_PATH.parent.mkdir(parents=True, exist_ok=True)

DATABASES = {
    "default": {
        "ENGINE": "django.db.backends.sqlite3",
        "NAME": DB_PATH,
    }
}

INSTALLED_APPS = [
    "django.contrib.admin",
    "django.contrib.auth",
    "django.contrib.contenttypes",
    "django.contrib.sessions",
    "django.contrib.messages",
    "django.contrib.staticfiles",
    "rest_framework",
    "rest_framework.authtoken",
    "drf_spectacular",
    "apps.accounts",
    "apps.character",
    "apps.world",
    "apps.quests",
    "apps.progression",
    "apps.skills",
    "apps.economy",
    "apps.achievements",
    "apps.seasons",
    "apps.journal",
    "apps.analytics",
    "apps.ai_engine",
    "apps.notifications",
]

MIDDLEWARE = [
    "django.middleware.security.SecurityMiddleware",
    "django.contrib.sessions.middleware.SessionMiddleware",
    "django.middleware.common.CommonMiddleware",
    "django.middleware.csrf.CsrfViewMiddleware",
    "django.contrib.auth.middleware.AuthenticationMiddleware",
    "django.contrib.messages.middleware.MessageMiddleware",
    "django.middleware.clickjacking.XFrameOptionsMiddleware",
]

ROOT_URLCONF = "config.urls"

TEMPLATES = [
    {
        "BACKEND": "django.template.backends.django.DjangoTemplates",
        "DIRS": [],
        "APP_DIRS": True,
        "OPTIONS": {
            "context_processors": [
                "django.template.context_processors.request",
                "django.contrib.auth.context_processors.auth",
                "django.contrib.messages.context_processors.messages",
            ],
        },
    },
]

WSGI_APPLICATION = "config.wsgi.application"

AUTH_PASSWORD_VALIDATORS = [
    {
        "NAME": "django.contrib.auth.password_validation.UserAttributeSimilarityValidator",
    },
    {"NAME": "django.contrib.auth.password_validation.MinimumLengthValidator"},
    {"NAME": "django.contrib.auth.password_validation.CommonPasswordValidator"},
    {"NAME": "django.contrib.auth.password_validation.NumericPasswordValidator"},
]

AUTH_USER_MODEL = "accounts.User"

LANGUAGE_CODE = "fr-fr"
TIME_ZONE = os.environ.get("LIFE_RPG_TIME_ZONE") or "UTC"
USE_I18N = True
USE_TZ = True

STATIC_URL = "static/"
DEFAULT_AUTO_FIELD = "django.db.models.BigAutoField"

REST_FRAMEWORK = {
    "DEFAULT_AUTHENTICATION_CLASSES": [
        "rest_framework.authentication.TokenAuthentication",
        "rest_framework.authentication.SessionAuthentication",
    ],
    "DEFAULT_PERMISSION_CLASSES": ["rest_framework.permissions.IsAuthenticated"],
    "DEFAULT_SCHEMA_CLASS": "drf_spectacular.openapi.AutoSchema",
    "DEFAULT_PAGINATION_CLASS": "rest_framework.pagination.PageNumberPagination",
    "PAGE_SIZE": 50,
}

SPECTACULAR_SETTINGS = {
    "TITLE": "LIFE RPG API",
    "VERSION": "0.1.0",
}

FRONTEND_DIST = ROOT_DIR / "frontend" / "dist"
