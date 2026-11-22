# LIFE RPG (Life-hub)

Application personnelle de gamification de la vie réelle, pour un seul utilisateur.
Tout tourne en local sur ton PC : Django + DRF + SQLite pour l'API, React + TypeScript + Vite + Tailwind pour l'interface. Aucun hébergement, aucun service payant. Le serveur n'écoute que sur `127.0.0.1`.

## Installation sur Fedora

```bash
sudo dnf install -y make nodejs npm python3
curl -LsSf https://astral.sh/uv/install.sh | sh   # si uv n'est pas installé
make install      # dépendances Python (uv) et JavaScript (npm)
make env          # crée .env avec une clé secrète neuve (jamais écrasé ensuite)
make player USERNAME=kane   # crée le compte unique (mot de passe demandé deux fois)
```

La commande `make player` affiche ton jeton d'API. Garde-le pour toi.

## Commandes

| Commande | Effet |
| --- | --- |
| `make run` | Construit le front, applique les migrations, lance l'app sur http://127.0.0.1:8000 |
| `make dev` | Mode développement : Django (8000) et Vite (5173) avec rechargement à chaud |
| `make test` | Tests back-end (pytest) et front-end (vitest) |
| `make lint` | ruff, eslint, prettier, TypeScript |
| `make backup` | Sauvegarde datée dans `backups/AAAA-MM-JJ_HHMMSS/` : copie SQLite + `data.json` |
| `make player USERNAME=…` | Crée le compte unique (refusé si un compte existe déjà) |

## Sauvegarde et restauration

`make backup` ne supprime jamais d'ancienne sauvegarde. Chaque dossier contient :

- `life_rpg.sqlite3` : copie cohérente de la base (API de sauvegarde SQLite, possible même serveur lancé) ;
- `data.json` : export lisible des données (`dumpdata`).

Restaurer depuis la copie SQLite (méthode recommandée) :

```bash
# 1. Arrête le serveur (Ctrl+C, ou systemctl --user stop life-rpg)
# 2. Mets de côté la base actuelle, sans la supprimer
mv data/life_rpg.sqlite3 data/life_rpg.avant-restauration.sqlite3
# 3. Copie la sauvegarde choisie
cp backups/AAAA-MM-JJ_HHMMSS/life_rpg.sqlite3 data/life_rpg.sqlite3
# 4. Relance
make run
```

Restaurer depuis l'export JSON (dans une base neuve) :

```bash
cd backend
uv run python manage.py migrate
uv run python manage.py loaddata ../backups/AAAA-MM-JJ_HHMMSS/data.json
```

## Démarrage avec la session (optionnel)

Un service systemd utilisateur est fourni dans `scripts/life-rpg.service`. Lance `make build` une fois, puis :

```bash
mkdir -p ~/.config/systemd/user
sed "s|@REPO@|$PWD|" scripts/life-rpg.service > ~/.config/systemd/user/life-rpg.service
systemctl --user daemon-reload
systemctl --user enable --now life-rpg.service
```

## Structure

```
backend/    Django : config/, apps/ (13 apps du cahier), engine/ (Life Engine), tests/
frontend/   React : src/app, pages, components, lib, styles, tokens
scripts/    backup.py, life-rpg.service
docs/       cahier des charges, brand book, prompt de construction, ARCHITECTURE.md
```

## Documents

| Fichier | Rôle |
| --- | --- |
| `docs/PROMPT_BUILD_LIFE_RPG.md` | Instructions de construction, phases 0 à 4 |
| `docs/CAHIER_DES_CHARGES.md` | Cahier des charges fonctionnel et technique |
| `docs/brand-book.html` | Brand book : identité visuelle, tokens, composants. Ouvre-le dans un navigateur. |
| `docs/ARCHITECTURE.md` | Architecture technique et état d'avancement |
