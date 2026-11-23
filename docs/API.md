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

---

# Phase 3 — LIFE AI (agents et MCP)

## Règles (non négociables)
- **L'agent propose, l'utilisateur décide.** Un agent ne valide jamais une mission, n'attribue jamais d'XP, de crédit ni de point, ne débloque aucune compétence, n'achète rien, ne supprime rien, ne modifie aucune donnée existante.
- **Refus par défaut.** Une requête authentifiée par un jeton d'agent est refusée (403 « Cette action est réservée à l'utilisateur. ») sur **tous** les endpoints, sauf ceux sous `/api/agent/`. Ce refus est global (classe de permission par défaut), pas endpoint par endpoint.
- **Jetons** : un par agent, nommé, révocable, avec des portées. Le secret (`lra_` + 40 caractères aléatoires) n'est affiché **qu'une fois**, à la création ; seule son empreinte SHA-256 est stockée, avec un préfixe visible (8 premiers caractères). Un jeton révoqué est refusé immédiatement (401 « Jeton révoqué. »).
- **Portées** (lecture seule par défaut) :

| Portée | Ce que l'agent peut lire ou faire |
| --- | --- |
| `profile` | pseudonyme, classe, niveau, rang, titre actif |
| `progression` | XP, niveaux, statistiques des territoires, analyse de progression |
| `quests` | missions actives et récemment validées |
| `skills` | arbres et compétences débloquées (lecture seule) |
| `seasons` | saison active, objectifs, bilan |
| `journal` | 50 derniers événements |
| `energy` | 7 derniers bilans énergétiques |
| `body` | **données du territoire BODY** (statistique, missions, compétences, journal). Sans cette portée, tout ce qui touche BODY est retiré, partout |
| `proposals` | **écriture** : créer des propositions de missions et lire leur statut |

Création sans `scopes` → `["profile", "progression", "quests"]`. `body` et `proposals` ne sont jamais accordés par défaut.
- **Journal** : chaque action d'un agent (lecture du contexte, proposition) est écrite dans le journal avec `actor` = nom de l'agent. La création et la révocation d'un jeton sont journalisées (acteur `user`).
- **Une proposition acceptée** devient une mission `AVAILABLE` d'origine `AI`, qui ne rapporte rien tant que l'utilisateur ne l'a pas validée par le Life Engine.
- **Analyse et adaptation** : par règles fixes, sans modèle embarqué ; elles ne modifient jamais rien (« L'IA ne modifie jamais silencieusement les échéances ou les objectifs »).

Authentification d'un agent : en-tête `Authorization: Bearer lra_…`.

## Objets

### `AgentToken`
```json
{ "id": 3, "name": "Claude Code", "prefix": "lra_a1b2", "scopes": ["profile", "progression", "quests", "proposals"],
  "created_at": "…", "last_used_at": null, "revoked_at": null, "is_active": true }
```
À la création seulement : champ supplémentaire `"token": "lra_…"` (secret complet).

### `QuestProposal`
```json
{ "id": 7, "uuid": "…", "agent_name": "Claude Code", "status": "PENDING",
  "title": "Lire 20 pages", "description": "", "rationale": "Ton territoire Savoir n'a pas bougé depuis 12 jours.",
  "territory": "KNOWLEDGE", "quest_type": "DAILY", "difficulty": "EASY", "priority": "NORMAL",
  "estimated_minutes": 20, "due_date": null, "skill_branch": "reading", "steps": [{"title": "…", "is_required": true}],
  "xp_preview": 15, "quest": null, "decided_at": null, "reject_reason": "", "created_at": "…" }
```
`status` : `PENDING`, `ACCEPTED`, `REJECTED`. `xp_preview` est calculé par le serveur (barème), à titre indicatif : rien n'est attribué. `quest` = id de la mission créée après acceptation.

### `EnergyCheckIn`
```json
{ "id": 1, "level": 2, "label": "Faible", "note": "", "date": "2026-11-23", "created_at": "…" }
```
Échelle du cahier §8.3 : 1 Très faible, 2 Faible, 3 Moyenne, 4 Bonne, 5 Excellente. Un bilan par jour (le dernier de la journée remplace le précédent).

### `Insights` (analyse par règles)
```json
{ "generated_at": "…", "energy": { "level": 2, "label": "Faible", "date": "…" } ,
  "load": { "active_quests": 6, "hard_quests": 3, "overdue": 1 },
  "neglected_territories": [ { "code": "CREATION", "days_since_xp": 21 } ],
  "suggestions": [ { "kind": "RECOVERY", "message": "Énergie faible et 3 missions difficiles en cours : une mission courte ou une pause suffit aujourd'hui." } ] }
```
Règles : territoire négligé = aucun XP depuis 14 jours (ou jamais) ; mission difficile = `HARD`, `EPIC` ou `LEGENDARY` ; `kind` ∈ `RECOVERY` (énergie ≤ 2 et au moins 2 missions difficiles actives), `OVERLOAD` (plus de 8 missions actives), `BALANCE` (territoire négligé), `OVERDUE` (échéance dépassée), `MOMENTUM` (énergie ≥ 4 et aucune mission difficile active). Les suggestions sont des phrases ; elles ne changent rien.

### `AgentContext` (`GET /api/agent/context/`)
Objet borné : seules les clés des portées du jeton sont présentes.
```json
{ "agent": "Claude Code", "scopes": ["profile", "progression", "quests"], "generated_at": "…",
  "profile": { "pseudonym", "character_class", "level", "rank", "active_title" },
  "progression": { "level", "xp_in_level", "xp_required", "total_xp", "territories": [TerritoryStat sans BODY], "insights": Insights },
  "quests": { "active": [ {id, title, territory, quest_type, difficulty, status, due_date, skill_branch} ] (50 max), "recent_completions": [ {title, territory, completed_at} ] (20 max) },
  "skills": { "available_points", "unlocked": [ {code, name, territory} ], "trees": [ {territory, branches: [ {code, name, validated_quests} ]} ] },
  "seasons": { "current": Season | null },
  "journal": [ {event_type, message, created_at} ] (50 max),
  "energy": [ EnergyCheckIn ] (7 max),
  "proposals": { "pending": 2 } }
```

## Endpoints

| Méthode | Chemin | Qui | Rôle |
| --- | --- | --- | --- |
| GET | `/api/auth/agent-tokens/` | utilisateur | Liste des jetons (sans secret) |
| POST | `/api/auth/agent-tokens/` | utilisateur | `{name, scopes?}` → 201 `AgentToken` + `token` (affiché une fois). Nom requis (1–60 caractères), portées inconnues → 400 |
| DELETE | `/api/auth/agent-tokens/{id}/` | utilisateur | Révoque (204). Le jeton reste listé, `is_active: false`. Rien n'est supprimé |
| GET | `/api/agent/context/` | agent | `AgentContext` selon les portées |
| GET | `/api/agent/quest-proposals/` | agent (`proposals`) | Ses propres propositions et leur statut |
| POST | `/api/agent/quest-proposals/` | agent (`proposals`) | Une proposition (objet) ou plusieurs (`{"proposals": [...]}`, 10 max) → 201 `[QuestProposal]`. Champs serveur ignorés (`status`, `xp_preview`, `quest`…). Sans la portée `body`, une proposition en BODY est refusée (403). Journal : « Claude Code propose 3 missions. Accepte, modifie ou refuse chacune. » |
| GET | `/api/quest-proposals/` | utilisateur | Liste paginée, filtre `status` (défaut : toutes, en attente d'abord) |
| PATCH | `/api/quest-proposals/{id}/` | utilisateur | Modifie une proposition en attente (mêmes champs que la création) ; 409 si déjà décidée |
| POST | `/api/quest-proposals/{id}/accept/` | utilisateur | Corps facultatif = modifications de dernière minute → `{ "proposal": QuestProposal, "quest": Quest }`. Crée la mission par le Life Engine (`origin: "AI"`, statut `AVAILABLE`, aucune récompense). 409 si déjà décidée |
| POST | `/api/quest-proposals/{id}/reject/` | utilisateur | `{reason?}` → `QuestProposal` ; 409 si déjà décidée |
| GET | `/api/energy/` | utilisateur | Bilans énergétiques (paginé) |
| POST | `/api/energy/` | utilisateur | `{level: 1..5, note?}` → `EnergyCheckIn` (remplace celui du jour) |
| GET | `/api/analytics/insights/` | utilisateur | `Insights` |
| GET | `/api/export/` | utilisateur | Export JSON complet des données du joueur (téléchargement `life-rpg-export-AAAA-MM-JJ.json`) |

Nouveaux `event_type` du journal : `AGENT_TOKEN_CREATED`, `AGENT_TOKEN_REVOKED`, `AGENT_CONTEXT_READ`, `QUEST_PROPOSED`, `PROPOSAL_ACCEPTED`, `PROPOSAL_REJECTED`, `PROPOSAL_UPDATED`, `ENERGY_CHECKIN`.

---

# Phase 4b : calendrier

Le calendrier **affiche et planifie** : il ne change aucune règle de gain (XP, crédits, niveaux, points), ne punit jamais un jour manqué et n'ajoute aucun champ « manqué », « raté », « série » ou « streak ».

## Jour de l'utilisateur

- `accounts.User.time_zone` : nom de fuseau IANA, défaut `"Africa/Bamako"`, validé avec `zoneinfo`.
- `GET /api/auth/me/` renvoie `{ "id", "username", "time_zone" }`.
- `PATCH /api/auth/me/` accepte uniquement `{"time_zone": "Europe/Paris"}`. Un fuseau inconnu donne 400 avec `{"time_zone": ["Fuseau horaire inconnu."]}`. Les autres champs sont ignorés.
- Pendant chaque requête authentifiée (jeton utilisateur ou jeton d'agent), le fuseau du compte est activé : `timezone.localdate()` donne le jour de l'utilisateur, y compris pour les clés de période des Daily et Weekly. Un middleware nettoie le fuseau à l'entrée et à la sortie de la requête.
- `TIME_ZONE` par défaut des réglages : `"Africa/Bamako"` (surchargeable par `LIFE_RPG_TIME_ZONE`). Bamako est en UTC+0 sans heure d'été : aucune clé de période existante ne change.

## Champs de planification

- `Quest` : `scheduled_date` (date ou `null`), `scheduled_time` (`""`, `MORNING`, `AFTERNOON`, `EVENING` ou `HH:MM`), `due_date` (déjà présent).
- `QuestStep` : `scheduled_date` (date ou `null`).
- `QuestProposal` : `scheduled_date` (date ou `null`), proposable par l'agent, modifiable par l'utilisateur, copiée sur la mission à l'acceptation.
- `PATCH /api/quests/{id}/` accepte `scheduled_date`, `scheduled_time`, `due_date` (`null` efface la valeur). Si seuls ces champs changent, le journal reçoit `QUEST_RESCHEDULED` (« Mission replanifiée au 25/11/2026. » ou « Planification retirée. ») au lieu de `QUEST_UPDATED`. Aucune récompense ni statut ne change : l'XP n'est recalculée que si la difficulté change.
- `PATCH /api/quests/{id}/steps/{step_id}/` accepte `{"scheduled_date": "2026-11-25" | null}` et renvoie la `Quest` complète, avec le même événement `QUEST_RESCHEDULED`.
- `QuestSerializer` expose `scheduled_date`, `scheduled_time`, `due_date` ; chaque étape expose `scheduled_date`.
- Une mission terminée ou abandonnée reste refusée avec 409 pour toute modification.

## `GET /api/calendar/?from=AAAA-MM-JJ&to=AAAA-MM-JJ`

Plage inclusive, `from <= to`, 100 jours maximum (sinon 400 `{"detail": "La plage est limitée à 100 jours."}`). Sans paramètres : semaine ISO courante.

```json
{
  "from": "2026-11-23", "to": "2026-11-29", "today": "2026-11-24", "time_zone": "Africa/Bamako",
  "days": [ CalendarDay, ... ]
}
```

### `CalendarDay`

```json
{
  "date": "2026-11-24",
  "is_today": true,
  "iso_week": "2026-W48",
  "entries": [ CalendarEntry, ... ],
  "completions": [ CalendarCompletion, ... ],
  "summary": { "completions": 2, "xp": 20, "credits": 20, "dominant_territory": "INNER_WORLD" }
}
```

`dominant_territory` = territoire avec le plus de validations ce jour-là (égalité : le plus d'XP, puis l'ordre des territoires), sinon `null`. Un jour sans validation a simplement `completions: 0`, sans aucune autre clé.

### `CalendarEntry`

```json
{
  "kind": "DAILY" | "WEEKLY" | "SCHEDULED" | "STEP" | "DUE",
  "quest": { "id": 3, "title": "Méditer 10 minutes", "quest_type": "DAILY", "difficulty": "TRIVIAL",
             "territory": "INNER_WORLD", "status": "AVAILABLE", "xp_reward": 5, "credit_reward": 5,
             "scheduled_date": null, "scheduled_time": "", "due_date": null },
  "step": null | { "id": 9, "title": "Choisir le livre n°1", "is_done": false },
  "period_key": "2026-11-24" | "2026-W48" | "once",
  "done": false,
  "due_passed": false
}
```

Règles d'apparition (affichage seulement) :

- `DAILY` : chaque mission quotidienne active (`AVAILABLE`, `ACCEPTED`, `IN_PROGRESS`) apparaît chaque jour à partir de son jour de création local (ou `start_date`). Les jours passés inclus dans la plage apparaissent aussi, validés ou non. Une Daily en pause n'apparaît pas les jours futurs.
- `WEEKLY` : chaque mission hebdomadaire active apparaît sur les sept jours de sa semaine ISO, avec la même règle de début ; `done` vaut vrai toute la semaine après une validation.
- `SCHEDULED` : mission non récurrente dont `scheduled_date` vaut ce jour, y compris terminée ce jour-là (`done` vrai).
- `STEP` : étape dont `scheduled_date` vaut ce jour ; `done` = `step.is_done`.
- `DUE` : mission non récurrente non terminée dont `due_date` est atteinte ou dépassée, sans `scheduled_date` ce jour-là. Une échéance dépassée reste affichée sobrement jusqu'à la validation. `due_passed` vaut vrai si `due_date < today`, sans pénalité.

Ordre : territoire (ordre des territoires), type (`BOSS`, `MAIN`, `SIDE`, `WEEKLY`, `DAILY`), puis titre.

### `CalendarCompletion`

```json
{ "quest_id": 3, "title": "Méditer 10 minutes", "territory": "INNER_WORLD", "quest_type": "DAILY",
  "xp": 5, "credits": 5, "completed_at": "2026-11-24T07:12:00Z" }
```

Les validations sont prises d'après `completed_at` dans le fuseau de l'utilisateur. Les XP et crédits affichés sont les `xp_awarded` et `credits_awarded` enregistrés sur la validation, et les `xp_reward` et `credit_reward` de la mission : aucun recalcul.

## `GET /api/calendar/today/`

Même forme qu'un `CalendarDay` pour aujourd'hui, plus :

```json
{ "...CalendarDay": "...", "time_zone": "Africa/Bamako",
  "weekly": [ { "quest": {...}, "done": false, "days_left_in_week": 6 } ] }
```

`weekly` = hebdomadaires actives de la semaine en cours, avec `done` pour la semaine et les jours restants dans la semaine ISO, aujourd'hui compris.

## Agents

- `GET /api/agent/calendar/?from=&to=` : jeton d'agent avec la portée `quests` (libellé « Missions »). Même forme que le calendrier utilisateur. Sans la portée `body`, les entrées et validations du territoire BODY sont retirées et le résumé est recalculé. Journal : `AGENT_CONTEXT_READ` (« <agent> a lu le calendrier. »).
- Un agent ne peut ni valider une mission, ni la replanifier (`PATCH /api/quests/{id}/`, `PATCH /api/quests/{id}/steps/{step_id}/` → 403), ni modifier son fuseau (`PATCH /api/auth/me/` → 403).
- La proposition d'une mission peut porter `scheduled_date` ; l'utilisateur peut la modifier avant d'accepter, et la mission créée reçoit cette date sans aucune récompense.
- Outil MCP : `get_calendar(from_date: str = "", to_date: str = "")` appelle `GET agent/calendar/`.

`event_type` ajouté au journal : `QUEST_RESCHEDULED`.
