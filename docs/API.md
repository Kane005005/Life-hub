# API de LIFE RPG — contrat de la phase 1

Préfixe `/api/`. Toutes les réponses sont en JSON. Authentification par jeton DRF : en-tête `Authorization: Token <clé>`.
Sauf mention contraire, chaque endpoint exige un utilisateur authentifié et ne renvoie **que ses propres données**.
Le schéma OpenAPI complet et à jour est servi par `GET /api/schema/` (authentifié) et exporté dans `docs/openapi.yaml`.

Erreurs : `{"detail": "<message en français>"}` avec le code HTTP adapté (400 données invalides, 401 non authentifié, 404 introuvable, 409 conflit d'état, par exemple une mission déjà validée).
Listes paginées : `{"count", "next", "previous", "results": [...]}` (50 par page).

## Énumérations (codes stockés en base, libellés français dans l'interface)

| Énumération | Codes |
| --- | --- |
| Territoire `code` | `KNOWLEDGE`, `BODY`, `CAREER`, `TECHNOLOGY`, `CREATION`, `INNER_WORLD` |
| Statistique `stat_code` | `INT`, `VIT`, `INF`, `TEC`, `CRE`, `SAG` |
| État de territoire `state` | `DISCOVERY`, `DEVELOPMENT`, `MASTERY` |
| Type de mission `quest_type` | `DAILY`, `WEEKLY`, `MAIN`, `SIDE`, `BOSS` |
| Difficulté `difficulty` | `TRIVIAL` (5), `EASY` (15), `MEDIUM` (30), `HARD` (60), `EPIC` (100), `LEGENDARY` (200) |
| Priorité `priority` | `LOW`, `NORMAL`, `HIGH` |
| Statut `status` | `AVAILABLE`, `ACCEPTED`, `IN_PROGRESS`, `COMPLETED`, `PAUSED`, `ABANDONED` |
| Validation `validation_mode` | `MANUAL`, `PROOF` |
| Origine `origin` | `USER`, `AI` |
| Classe `character_class` | `ARCHITECT`, `CREATOR`, `EXPLORER`, `STRATEGIST`, `INNOVATOR` |
| Rang `rank.code` | `INITIATE`, `EXPLORER`, `BUILDER`, `SPECIALIST`, `MASTER`, `ARCHITECT` |

Le rang est renvoyé avec son libellé français : `{"code": "INITIATE", "label": "Initié"}`.

## Objets

### `TerritoryStat`
```json
{ "id": 1, "code": "KNOWLEDGE", "stat_code": "INT", "name": "Savoir", "english": "KNOWLEDGE",
  "place": "Cité du savoir", "domain": "Développement intellectuel", "color": "#6F94B5",
  "total_xp": 420, "stat": 42, "stat_display": 42, "state": "DEVELOPMENT", "active_quests": 3 }
```
`stat` = `total_xp // 10` (ne baisse jamais) ; `stat_display` = `min(stat, 100)`. `state` est calculé sur `stat`.

### `Character`
```json
{ "pseudonym": "Kane", "bio": "", "character_class": "ARCHITECT", "is_onboarded": true,
  "level": 7, "xp_in_level": 214, "xp_required": 400, "total_xp": 1564,
  "rank": { "code": "INITIATE", "label": "Initié" },
  "credits": 1564, "skill_points": { "available": 6, "spent": 0 },
  "avatar": { "silhouette": "A", "color": "#2FD08B", "accent": "#EDE9DF" },
  "stats": [ TerritoryStat, ... ] }
```

### `Quest`
```json
{ "id": 12, "uuid": "…", "title": "Nager 30 minutes", "description": "",
  "territory": "BODY", "quest_type": "DAILY", "difficulty": "EASY", "priority": "NORMAL",
  "estimated_minutes": 30, "start_date": null, "due_date": null,
  "xp_reward": 15, "credit_reward": 15,
  "validation_mode": "MANUAL", "origin": "USER", "status": "ACCEPTED", "skill_branch": "",
  "is_recurring": true, "period_key": "2026-11-22", "completed_this_period": false,
  "completions_count": 4,
  "steps": [ { "id": 3, "title": "…", "order": 0, "is_required": true, "is_done": false, "done_at": null } ],
  "created_at": "…", "updated_at": "…", "completed_at": null }
```
`xp_reward` et `credit_reward` sont **calculés par le serveur** (barème de difficulté × paramètres) et en lecture seule.
`is_recurring` est vrai pour `DAILY` et `WEEKLY`. `period_key` vaut la date du jour (`AAAA-MM-JJ`), la semaine ISO (`AAAA-Www`) ou `once`.

### `CompletionResult` (réponse de `POST /api/quests/{id}/complete/`)
```json
{ "quest": Quest,
  "result": { "xp": 30, "credits": 30, "territory": "KNOWLEDGE",
              "level_before": 7, "level_after": 8, "levels_gained": 1, "skill_points_gained": 1,
              "message": "Mission validée. +30 XP en Savoir.",
              "level_message": "Niveau 8 atteint. 450 XP pour le suivant." } }
```
`level_message` vaut `null` sans montée de niveau.

### `JournalEntry`
```json
{ "uuid": "…", "event_type": "QUEST_COMPLETED", "actor": "user", "message": "Mission validée. +30 XP en Savoir.",
  "payload": {}, "quest": 12, "created_at": "…" }
```
`event_type` : `QUEST_CREATED`, `QUEST_UPDATED`, `QUEST_ACCEPTED`, `QUEST_STEP_DONE`, `QUEST_STEP_UNDONE`, `QUEST_COMPLETED`, `QUEST_ABANDONED`, `XP_AWARDED`, `LEVEL_UP`, `CREDITS_EARNED`, `SKILL_POINTS_EARNED`, `REST`, `CHARACTER_UPDATED`.

## Endpoints de la phase 1

| Méthode | Chemin | Rôle |
| --- | --- | --- |
| POST | `/api/auth/login/` | `{username, password}` → `{token, user: {id, username}}`. Libre d'accès. 400 si identifiants faux : « Identifiants incorrects. » |
| POST | `/api/auth/logout/` | Révoque le jeton courant → 204 |
| GET | `/api/auth/me/` | `{id, username}` |
| GET / PATCH | `/api/character/` | `Character`. PATCH : `pseudonym`, `bio`, `character_class`, `is_onboarded` uniquement |
| PATCH | `/api/character/avatar/` | `{silhouette: "A"|"B"|"C", color: "#RRGGBB", accent: "#RRGGBB"}` → `Character` |
| GET | `/api/world/territories/` | `[TerritoryStat]` (6 éléments, non paginé) |
| GET | `/api/world/territories/{id}/` | `TerritoryStat` + `"quests": [Quest]` (missions non terminées et non abandonnées du territoire) |
| GET | `/api/world/progress/` | `{level, xp_in_level, xp_required, total_xp, rank, territories: [TerritoryStat]}` |
| GET | `/api/quests/` | Liste paginée. Filtres : `territory`, `quest_type`, `status` (répétable : `?status=ACCEPTED&status=AVAILABLE`), `difficulty`, `today=1` (missions du jour : quotidiennes, hebdomadaires et missions dont l'échéance est aujourd'hui ou dépassée, non terminées) |
| POST | `/api/quests/` | Crée une mission (`title`, `description`, `territory`, `quest_type`, `difficulty`, `priority`, `estimated_minutes`, `start_date`, `due_date`, `validation_mode`, `skill_branch`, `steps: [{title, is_required}]`) → `Quest`, statut `AVAILABLE` |
| GET / PATCH | `/api/quests/{id}/` | PATCH refusé (409) si la mission est `COMPLETED` ou `ABANDONED`. Champs serveur (`xp_reward`, `status`, `origin`…) ignorés |
| POST | `/api/quests/{id}/accept/` | `AVAILABLE` ou `PAUSED` → `ACCEPTED` → `Quest` |
| POST | `/api/quests/{id}/complete/` | `{note?}` → `CompletionResult`. 409 si déjà validée (pour la période en cours si récurrente) ; 400 s'il reste des étapes obligatoires ; 409 si abandonnée |
| POST | `/api/quests/{id}/abandon/` | → `Quest` (`ABANDONED`). Aucun XP retiré |
| POST | `/api/quests/{id}/steps/{step_id}/toggle/` | Coche ou décoche une étape (refusé si la mission est terminée) → `Quest` |
| GET | `/api/progression/` | `{level, xp_in_level, xp_required, total_xp, rank, skill_points: {available, spent}}` |
| GET | `/api/progression/history/` | Liste paginée des `XPTransaction` : `{uuid, amount, territory, level_before, level_after, quest_title, created_at}` |
| GET | `/api/progression/skills/` | `{available, spent, transactions: [{uuid, amount, kind, reason, balance_after, created_at}]}` (l'arbre arrive en phase 2) |
| GET | `/api/economy/wallet/` | `{credits}` |
| GET | `/api/economy/transactions/` | Liste paginée : `{uuid, amount, kind, reason, balance_after, created_at}` |
| GET | `/api/journal/` | Liste paginée de `JournalEntry`, filtre `event_type` |
| POST | `/api/journal/rest/` | Enregistre un jour de repos → 201 `{"message": "Repos enregistré. Ta progression est intacte."}`. Ne modifie rien d'autre |
| GET | `/api/settings/game/` | Paramètres en lecture : `{xp_by_difficulty, credits_per_xp, skill_points_per_level, territory_stat_divisor, territory_stat_display_max, territory_state_thresholds, ranks: [{min_level, code, label}]}` |
