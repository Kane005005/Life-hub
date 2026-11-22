# Architecture de LIFE RPG

État : **phase 0 (fondations)**. Ce document est mis à jour à chaque phase.

## Vue d'ensemble

```
Navigateur ──HTTP──▶ Django (127.0.0.1:8000)
                      ├─ /api/…        API REST (DRF, jetons)
                      ├─ /admin/       administration Django
                      ├─ /assets/…     fichiers du build React
                      └─ /*            index.html de React (routage côté client)
                     SQLite (data/life_rpg.sqlite3)
Agents de code ──jeton à portée limitée──▶ /api/agent/…   (phase 3)
```

- **Un seul processus** en usage normal : Django sert l'API et le build React (`frontend/dist`).
- **En développement** (`make dev`) : Vite sur 127.0.0.1:5173 avec un proxy `/api` vers Django.
- **Sécurité** : `ALLOWED_HOSTS` limité à `127.0.0.1` et `localhost`, serveur lancé sur `127.0.0.1` uniquement. Pas d'inscription : le compte unique est créé par `manage.py create_player`.

## Back-end (`backend/`)

| Dossier | Rôle |
| --- | --- |
| `config/settings/base.py` | Réglages communs, lus dans `.env` (`LIFE_RPG_*`) |
| `config/settings/local.py` | Réglages du poste local (debug, clé de secours de développement) |
| `config/urls.py` | Routes : santé, schéma OpenAPI, admin, service du front |
| `apps/` | Les 13 apps du cahier : accounts, character, world, quests, progression, skills, economy, achievements, seasons, journal, analytics, ai_engine, notifications |
| `engine/rules.py` | Règles pures, sans base de données (ex. `xp_required(level) = 100 + 50 × (level − 1)`) |
| `engine/services.py` | Life Engine (phase 1) : seule porte d'écriture de l'XP, des crédits et des récompenses |
| `engine/events.py` | Événements du journal (phase 1) |
| `tests/` | pytest-django |

Le modèle utilisateur est personnalisé dès le départ (`accounts.User`) pour pouvoir évoluer sans migration douloureuse.

### Endpoints disponibles en phase 0

| Méthode | Chemin | Accès |
| --- | --- | --- |
| GET | `/api/health/` | libre |
| GET | `/api/schema/` | authentifié (schéma OpenAPI) |

## Front-end (`frontend/`)

| Dossier | Rôle |
| --- | --- |
| `src/styles/tokens.css` | Variables CSS `--lr-*` reprises du brand book |
| `tailwind.config.ts` | Mêmes tokens côté Tailwind (`lr.*`, `territoire.*`, polices, mouvement) |
| `src/tokens/` | Tokens typés (couleurs, territoires, glyphes, durées) |
| `src/components/` | Composants de base : `HudFrame`, `Button`, `XpGauge`, `TopBar`, `LogoMark`, `SoundToggle` |
| `src/app/` | Application, routeur, mise en page |
| `src/pages/` | Pages (Monde en phase 0, les autres en attente) |
| `src/lib/api.ts` | Accès à l'API (TanStack Query) |

Polices auto-hébergées via `@fontsource` : l'interface fonctionne hors ligne. Le front n'applique aucune règle de jeu : il affiche ce que l'API renvoie.

## Données et sauvegarde

- Base : `data/life_rpg.sqlite3` (hors dépôt).
- `make backup` : `backups/<date>/life_rpg.sqlite3` + `data.json`. Les anciennes sauvegardes ne sont jamais supprimées.
