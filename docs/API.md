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

---

# Phase 2 — RPG SYSTEM (ajouts au contrat)

Décisions de jeu (validées par Kane, configurables dans l'admin) :
- **Compétences** : annexe `docs/ARBRE_DE_COMPETENCES.md`. « Missions validées dans la branche » = **nombre de validations** (`QuestCompletion`) des missions du joueur dont `skill_branch` = code de la branche ; une quotidienne validée 15 jours compte 15. La statistique comparée est `stat` (non plafonnée).
- **Succès** (une seule fois chacun, aucun bonus) : `FIRST_QUEST` 1re validation ; `FIRST_BOSS` 1re validation d'un boss ; `KNOWLEDGE_SEEKER` 5 validations en KNOWLEDGE ; `CREATOR` 1re validation en CREATION ; `EXPLORER` 1re validation d'une mission SIDE. Condition générique : `{"quest_type"?: "...", "territory"?: "...", "count": N}` sur les validations.
- **Saisons** : 90 jours (`season_length_days`, configurable). À la date de fin, la saison se clôt seule avec son bilan et la suivante s'ouvre aussitôt (« Saison N », objectifs vides). Clôture anticipée possible : la suivante s'ouvre alors le jour même. Si l'app n'a pas servi pendant plus d'une saison, la suivante commence aujourd'hui (pas de saisons vides en série). Sans aucune saison créée, il n'y a pas de saison active.
- **Boutique** : récompenses réelles créées par l'utilisateur (`REWARD`) et objets cosmétiques (`ARTIFACT`) d'un petit catalogue fourni, achetables avec les crédits et équipables sur l'avatar (un par emplacement : `AURA`, `FRAME`, `EMBLEM`). Titres et badges ne s'achètent pas : ils viennent des succès et des compétences.
- Achat refusé si crédits insuffisants. Aucune dépense ne touche à l'XP ni au niveau.

## Énumérations ajoutées

| Énumération | Codes |
| --- | --- |
| État d'une compétence `state` | `LOCKED`, `UNLOCKABLE`, `UNLOCKED` |
| Catégorie d'objet `category` | `REWARD`, `ARTIFACT` |
| Emplacement `slot` | `AURA`, `FRAME`, `EMBLEM` (`null` pour une récompense) |
| Statut de saison `status` | `ACTIVE`, `CLOSED` |
| Journal `event_type` (ajouts) | `SKILL_UNLOCKED`, `ACHIEVEMENT_UNLOCKED`, `REWARD_PURCHASED`, `ITEM_EQUIPPED`, `ITEM_UNEQUIPPED`, `SEASON_STARTED`, `SEASON_CLOSED`, `SEASON_UPDATED`, `TITLE_CHANGED` |

## Objets ajoutés

### `SkillNode`
```json
{ "code": "knowledge.reading.t2", "name": "Lecteur critique", "tier": 2, "cost": 1,
  "requires": ["knowledge.reading.t1"], "min_territory_stat": 15, "min_validated_quests": 3,
  "state": "LOCKED", "unlocked_at": null,
  "missing": ["Débloque d'abord Lecteur régulier.", "Il te manque 2 validations dans Lecture & culture."] }
```
`missing` liste en français tout ce qui manque (vide si débloquable ou débloquée) : points, prérequis, statistique (« Statistique Savoir : 15 requise, 8 actuelle. »), validations.

### `SkillTree`
```json
{ "territory": "KNOWLEDGE", "name": "Savoir", "color": "#6F94B5", "stat": 8,
  "branches": [ { "code": "reading", "name": "Lecture & culture", "validated_quests": 1, "skills": [SkillNode x4] } ] }
```

### `Achievement`
```json
{ "code": "FIRST_QUEST", "name": "First Quest", "label": "Premier pas", "description": "Valider une première mission.",
  "unlocked": true, "unlocked_at": "…" }
```
Libellés français : FIRST_QUEST « Premier pas », FIRST_BOSS « Premier boss », KNOWLEDGE_SEEKER « Chercheur de savoir », CREATOR « Créateur », EXPLORER « Explorateur ».

### `ShopItem`
```json
{ "id": 4, "name": "Aura d'émeraude", "description": "…", "category": "ARTIFACT", "slot": "AURA",
  "cost": 150, "is_available": true, "is_custom": false, "visual": {"color": "#2FD08B"},
  "owned": false, "equipped": false, "purchases_count": 0 }
```
`is_custom` vrai pour une récompense créée par l'utilisateur. Une `REWARD` peut s'acheter plusieurs fois ; un `ARTIFACT` une seule fois.

### `Season`
```json
{ "id": 2, "number": 2, "name": "Saison 2", "theme": "", "status": "ACTIVE",
  "start_date": "2026-11-23", "end_date": "2027-02-20", "days_left": 89, "closed_at": null,
  "priority_territories": ["TECHNOLOGY"],
  "objectives": [ { "id": 1, "title": "…", "is_main": true, "is_done": false, "order": 0 } ],
  "summary": { "xp_total": 0, "xp_by_territory": {"KNOWLEDGE": 0}, "completions": 0,
               "completions_by_type": {"DAILY": 0}, "levels_gained": 0,
               "objectives_done": 0, "objectives_total": 1,
               "achievements_unlocked": [], "skills_unlocked": [] } }
```
`summary` est calculé en direct pour une saison active, figé à la clôture. Au plus 1 objectif principal et 3 secondaires.

### `CompletionResult` (ajouts)
`result.achievements` : `[{ "code", "label" }]` débloqués par cette validation (vide sinon).

### `Character` (ajouts)
`"active_title": "Lecteur régulier" | null`, `"titles": ["Premier pas", "Lecteur régulier"]` (succès obtenus + compétences débloquées), `"equipment": { "AURA": ShopItem | null, "FRAME": …, "EMBLEM": … }`.
`PATCH /api/character/` accepte aussi `active_title` (doit appartenir à `titles`, ou `null`).

## Endpoints de la phase 2

| Méthode | Chemin | Rôle |
| --- | --- | --- |
| GET | `/api/skills/trees/` | `[SkillTree]` (6 arbres) ; filtre `territory` |
| POST | `/api/skills/{code}/unlock/` | Débloque → `{ "skill": SkillNode, "skill_points": {available, spent}, "message": "Compétence débloquée : Lecteur régulier." }`. 400 avec `detail` qui liste ce qui manque ; 409 si déjà débloquée |
| GET | `/api/progression/skills/` | (complété) `{available, spent, unlocked: [{code, name, territory, unlocked_at}], transactions: [...]}` |
| GET | `/api/achievements/` | `[Achievement]` |
| GET | `/api/economy/rewards/` | `[ShopItem]` ; filtres `category`, `slot` |
| POST | `/api/economy/rewards/` | Crée une récompense personnelle (`name`, `description`, `cost` ≥ 1) → `ShopItem` (`REWARD`, `is_custom: true`) |
| PATCH | `/api/economy/rewards/{id}/` | Modifie une récompense personnelle (`name`, `description`, `cost`, `is_available`) ; 403 sur un objet du catalogue |
| POST | `/api/economy/rewards/{id}/purchase/` | Achète → `{ "item": ShopItem, "credits": 450, "message": "Récompense obtenue : Un livre. -300 crédits." }`. 400 « Crédits insuffisants : il te manque 120 crédits. » ; 409 si objet déjà possédé ; 400 si indisponible |
| GET | `/api/economy/inventory/` | `{ "items": [ShopItem possédés], "purchases": [{uuid, item_name, cost, purchased_at}] }` |
| POST | `/api/economy/inventory/{id}/equip/` | Équipe un objet possédé (remplace celui de l'emplacement) → `Character` |
| POST | `/api/economy/inventory/{id}/unequip/` | → `Character` |
| GET | `/api/seasons/` | Liste paginée des saisons (récente d'abord) |
| POST | `/api/seasons/` | Crée la saison (refus 409 si une saison est active) : `name`, `theme`, `start_date` (défaut aujourd'hui), `priority_territories`, `objectives: [{title, is_main}]` → `Season` |
| GET | `/api/seasons/current/` | `Season` active (après clôture/ouverture automatiques si la date est passée) ou 404 « Aucune saison active. » |
| GET / PATCH | `/api/seasons/{id}/` | PATCH sur une saison active : `name`, `theme`, `priority_territories`, `objectives` (liste complète remplacée, ou `is_done` par objectif) ; 409 si close |
| POST | `/api/seasons/{id}/close/` | Clôture anticipée → `{ "closed": Season, "next": Season }` |
| GET | `/api/journal/` | (complété) filtres `event_type` répétable, `date_from`, `date_to` (AAAA-MM-JJ), `territory`, `q` (recherche dans le message) |
| GET | `/api/journal/summary/` | `{ "period": "week"|"month", "from", "to", "xp_by_day": [{date, xp}], "xp_by_territory": {...}, "completions": n, "rests": n, "achievements": n, "skills": n }` ; paramètre `period` (défaut `week`) |
