# LIFE RPG — commandes locales. Tout tourne sur 127.0.0.1, jamais ailleurs.
SHELL := /bin/bash
HOST  := 127.0.0.1
PORT  := 8000
BACK  := backend
FRONT := frontend
UV    := uv run --project $(BACK)

.PHONY: help install env build migrate run dev test test-back test-front lint format backup player

help: ## Affiche cette aide
	@grep -E '^[a-z-]+:.*## ' $(MAKEFILE_LIST) | awk -F':.*## ' '{printf "  make %-11s %s\n", $$1, $$2}'

install: ## Installe les dépendances Python (uv) et JavaScript (npm)
	cd $(BACK) && uv sync
	cd $(FRONT) && npm ci

env: ## Crée .env avec une clé secrète si le fichier n'existe pas (ne l'écrase jamais)
	@if [ ! -f .env ]; then \
		cp .env.example .env; chmod 600 .env; \
		key=$$(python3 -c 'import secrets; print(secrets.token_urlsafe(50))'); \
		sed -i "s|^LIFE_RPG_SECRET_KEY=.*|LIFE_RPG_SECRET_KEY=$$key|" .env; \
		echo ".env créé avec une clé secrète neuve."; \
	fi

build: ## Construit le front (frontend/dist), servi ensuite par Django
	cd $(FRONT) && npm run build

migrate: env ## Applique les migrations et les données initiales (idempotent)
	cd $(BACK) && uv run python manage.py migrate --noinput && uv run python manage.py seed

run: env build migrate ## Lance l'application : http://127.0.0.1:8000
	@echo "LIFE RPG : http://$(HOST):$(PORT)"
	cd $(BACK) && uv run python manage.py runserver $(HOST):$(PORT)

dev: env migrate ## Mode développement : Django (8000) + Vite (5173) avec rechargement
	@echo "Front : http://$(HOST):5173  ·  API : http://$(HOST):$(PORT)/api/"
	@trap 'kill 0' INT TERM; \
	(cd $(BACK) && uv run python manage.py runserver $(HOST):$(PORT)) & \
	(cd $(FRONT) && npm run dev) & \
	wait

test: test-back test-front ## Lance tous les tests

test-back: ## Tests du back-end (pytest)
	cd $(BACK) && uv run pytest -q

test-front: ## Tests du front-end (vitest)
	cd $(FRONT) && npm test

lint: ## Vérifie le style (ruff, eslint, prettier, tsc)
	cd $(BACK) && uv run ruff check . && uv run ruff format --check .
	cd $(FRONT) && npm run lint && npm run format:check && npx tsc -b

format: ## Formate le code (ruff, prettier)
	cd $(BACK) && uv run ruff check --fix . && uv run ruff format .
	cd $(FRONT) && npm run format

backup: env ## Sauvegarde datée de la base (copie SQLite + export JSON) dans backups/
	cd $(BACK) && uv run python ../scripts/backup.py

player: env migrate ## Crée le compte unique : make player USERNAME=kane
	@test -n "$(USERNAME)" || (echo "Indique un nom : make player USERNAME=kane"; exit 1)
	cd $(BACK) && uv run python manage.py create_player --username "$(USERNAME)"
