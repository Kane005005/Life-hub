# Architecture de LIFE RPG

État : **phase 1 (LIFE CORE)**. Ce document est mis à jour à chaque phase.

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

### Life Engine (phase 1)

Toute écriture de progression passe par `engine/services.py`, sous `transaction.atomic()` avec verrouillage du personnage :

- `complete_quest` : vérifie le statut et les étapes obligatoires, calcule l'XP depuis `GameSettings`, crée `QuestCompletion` (unique par mission et par période : idempotence en base), `XPTransaction`, `CreditTransaction`, une `SkillPointTransaction` par niveau gagné, met à jour le personnage et le territoire, puis écrit le journal.
- Missions `DAILY` et `WEEKLY` récurrentes (une validation par jour local ou par semaine ISO) ; `MAIN`, `SIDE`, `BOSS` validées une seule fois. Les étapes ne rapportent rien : la récompense tombe à la validation finale.
- Le repos (`record_rest`) et l'abandon ne retirent jamais rien. Aucune fonction ne retire d'XP.

### Paramètres du système (`progression.GameSettings`, modifiables dans l'admin)

| Paramètre | Défaut |
| --- | --- |
| `xp_by_difficulty` | TRIVIAL 5, EASY 15, MEDIUM 30, HARD 60, EPIC 100, LEGENDARY 200 |
| `credits_per_xp` | 1 |
| `skill_points_per_level` | 1 |
| `territory_stat_divisor` / `territory_stat_display_max` | 10 / 100 |
| `territory_state_thresholds` | DEVELOPMENT 30, MASTERY 70 (DISCOVERY en dessous) |
| `ranks` | 1 Initié, 10 Explorateur, 20 Bâtisseur, 30 Spécialiste, 40 Maître, 50 Architecte |

La formule de niveau (`100 + 50 × (N − 1)`) est une règle fixe de `engine/rules.py`, volontairement non configurable.

### API

Contrat lisible : `docs/API.md`. Schéma généré : `docs/openapi.yaml` (`manage.py export_openapi`). Données initiales : `manage.py seed` (6 territoires et paramètres), lancé par `make migrate`.

## Front-end (`frontend/`)

| Dossier | Rôle |
| --- | --- |
| `src/styles/tokens.css` | Variables CSS `--lr-*` reprises du brand book |
| `tailwind.config.ts` | Mêmes tokens côté Tailwind (`lr.*`, `territoire.*`, polices, mouvement) |
| `src/tokens/` | Tokens typés (couleurs, territoires, glyphes, durées) |
| `src/components/` | Composants de base : `HudFrame`, `Button`, `XpGauge`, `TopBar`, `LogoMark`, `SoundToggle` |
| `src/app/` | Application, routeur, mise en page |
| `src/pages/` | Connexion, création du personnage, Monde, Héros, Missions, Journal ; les autres espaces arrivent en phases 2 et 3 |
| `src/features/fx/` | Braises, secousse du boss, montée de niveau, toasts, sons Web Audio (désactivés par défaut), annonces `aria-live` |
| `src/lib/` | Client d'API avec jeton, types du contrat, hooks TanStack Query, libellés français |

Polices auto-hébergées via `@fontsource` : l'interface fonctionne hors ligne. Le front n'applique aucune règle de jeu : il affiche ce que l'API renvoie.

## Données et sauvegarde

- Base : `data/life_rpg.sqlite3` (hors dépôt).
- `make backup` : `backups/<date>/life_rpg.sqlite3` + `data.json`. Les anciennes sauvegardes ne sont jamais supprimées.
