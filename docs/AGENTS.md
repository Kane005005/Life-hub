# Agents et serveur MCP de LIFE RPG

Ce document s'adresse à Kane et à tout agent (Claude Code, autre assistant, script local)
qui utilise l'API des agents de LIFE RPG. Tout tourne sur `127.0.0.1` : aucune donnée ne
doit quitter le poste.

## 1. Le principe non négociable

**L'agent propose, l'utilisateur décide.**

Un agent peut lire le contexte autorisé par son jeton et proposer des missions. Il ne peut
**jamais** :

- valider une mission, cocher une étape, attribuer de l'XP, des crédits ou des points de
  compétence ;
- débloquer une compétence, acheter un objet, équiper un objet, dépenser des crédits ;
- créer, modifier ou supprimer une mission existante, un objectif, une saison ou une donnée
  du joueur ;
- modifier silencieusement une échéance, une date planifiée ou un objectif ;
- accepter ou refuser sa propre proposition, ni décider à la place de Kane.

Une proposition acceptée devient une mission `AVAILABLE` d'origine `AI`. Elle ne rapporte
rien tant que Kane ne l'a pas validée lui-même dans le Life Engine. Le champ `xp_preview`
d'une proposition est une indication calculée par le serveur : **aucune récompense n'est
attribuée à la proposition**.

**Refus par défaut.** Un jeton d'agent est refusé avec `403` (« Cette action est réservée à
l'utilisateur. ») sur tous les endpoints, sauf ceux sous `/api/agent/`. Les champs serveur
d'une proposition (`status`, `xp_preview`, `quest`, `decided_at`…) sont ignorés.

## 2. Créer et gérer un jeton d'agent

Dans l'interface : **Réglages → Agents**, créer un jeton nommé (un jeton par agent, par
exemple « Claude Code »). Équivalent API, avec le jeton utilisateur habituel
(`Authorization: Token <clé>`) :

```bash
curl -sS -X POST http://127.0.0.1:8000/api/auth/agent-tokens/ \
  -H "Authorization: Token VOTRE_JETON_UTILISATEUR" \
  -H "Content-Type: application/json" \
  -d '{"name": "Claude Code", "scopes": ["profile", "progression", "quests", "proposals"]}'
```

Le nom est obligatoire (1 à 60 caractères). Le secret (`lra_` suivi de 40 caractères) est
**affiché une seule fois**, à la création : copie-le immédiatement dans la configuration de
ton agent. Seule son empreinte SHA-256 est conservée, avec un préfixe visible
(`lra_a1b2…`) pour l'identifier. Sans le champ `scopes`, seules les portées
`profile`, `progression` et `quests` sont accordées.

Liste des jetons (sans secret) : `GET /api/auth/agent-tokens/`. Révocation : bouton dans
Réglages, ou `DELETE /api/auth/agent-tokens/{id}/` avec le jeton utilisateur. Le jeton
révoqué reste listé (`is_active: false`) et est refusé immédiatement avec `401` (« Jeton
révoqué. »).

### Portées disponibles

| Portée | Ce que l'agent peut lire ou faire |
| --- | --- |
| `profile` | Pseudonyme, classe, niveau, rang, titre actif |
| `progression` | XP, niveaux, statistiques des territoires, analyse de progression |
| `quests` | Missions actives, récemment validées et calendrier journalier (`/api/agent/calendar/`) |
| `skills` | Arbres et compétences débloquées (lecture seule) |
| `seasons` | Saison active, objectifs, bilan |
| `journal` | 50 derniers événements |
| `energy` | 7 derniers bilans énergétiques |
| `body` | Données du territoire BODY (statistique, missions, compétences, journal). **Jamais par défaut** |
| `proposals` | **Écriture** : créer des propositions et lire leur statut. **Jamais par défaut** |

Sans `body`, tout ce qui touche BODY est retiré du contexte, et une proposition en BODY est
refusée avec `403`. N'accorde que les portées nécessaires, et toujours `proposals` à part.

## 3. Appeler l'API avec un jeton d'agent

Toutes les requêtes d'agent utilisent l'en-tête `Authorization: Bearer lra_…`.

Lire le contexte (les clés présentes dépendent des portées) :

```bash
curl -sS -H "Authorization: Bearer lra_…" \
  http://127.0.0.1:8000/api/agent/context/
```

Proposer une mission :

```bash
curl -sS -X POST http://127.0.0.1:8000/api/agent/quest-proposals/ \
  -H "Authorization: Bearer lra_…" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Lire 20 pages",
    "description": "Lecture tranquille, sans objectif de performance.",
    "rationale": "Ton territoire Savoir n'a pas bougé depuis 12 jours.",
    "territory": "KNOWLEDGE",
    "quest_type": "DAILY",
    "difficulty": "EASY",
    "priority": "NORMAL",
    "estimated_minutes": 20,
    "skill_branch": "reading",
    "steps": [{"title": "Lire pages 10 à 30", "is_required": true}]
  }'
```

Proposer un lot (10 propositions maximum, même format que ci-dessus) :

```bash
curl -sS -X POST http://127.0.0.1:8000/api/agent/quest-proposals/ \
  -H "Authorization: Bearer lra_…" \
  -H "Content-Type: application/json" \
  -d '{"proposals": [
    {"title": "Lire 20 pages", "territory": "KNOWLEDGE", "quest_type": "DAILY",
     "difficulty": "EASY", "rationale": "Le territoire Savoir est un peu à l'écart."},
    {"title": "Préparer une note de 15 minutes", "territory": "CREATION",
     "quest_type": "SIDE", "difficulty": "TRIVIAL",
     "rationale": "Une petite séance créative peut aider à relancer la semaine."}
  ]}'
```

Lire ses propres propositions et leur statut (`PENDING`, `ACCEPTED`, `REJECTED`) :

```bash
curl -sS -H "Authorization: Bearer lra_…" \
  http://127.0.0.1:8000/api/agent/quest-proposals/
```

Kane voit, modifie, accepte ou refuse les propositions dans l'interface. Un agent ne se
substitue jamais à cette décision.

## 4. Bon format de proposition et ton

Une proposition utile est courte, précise et justifiée. Codes utiles : territoires
`KNOWLEDGE`, `BODY`, `CAREER`, `TECHNOLOGY`, `CREATION`, `INNER_WORLD` ; types `DAILY`,
`WEEKLY`, `MAIN`, `SIDE`, `BOSS` ; difficultés `TRIVIAL`, `EASY`, `MEDIUM`, `HARD`, `EPIC`,
`LEGENDARY`.

```json
{
  "title": "Lire 20 pages",
  "description": "Une séance de lecture calme, à ton rythme.",
  "rationale": "Ton territoire Savoir n'a pas bougé depuis 12 jours ; 20 pages suffisent.",
  "territory": "KNOWLEDGE",
  "quest_type": "DAILY",
  "difficulty": "EASY",
  "priority": "NORMAL",
  "estimated_minutes": 20,
  "due_date": null,
  "scheduled_date": null,
  "skill_branch": "reading",
  "steps": [{"title": "Lire 20 pages", "is_required": true}]
}
```

Le `rationale` explique le lien avec le contexte lu, sans inventer de chiffre ni de
conséquence. Le ton est **français, tutoyant, calme** : « tu », « ton », « tu pourrais »,
« si ça te va ». Pas d'injonction (« il faut que tu », « tu dois », « rattrape », « urgent »),
pas de culpabilité, pas de pression. Propose au plus quelques pistes : c'est Kane qui
choisit, modifie ou écarte. Les données du territoire BODY sont confidentielles : sans la
portée `body`, ne les lis pas, ne les mentionne pas et ne propose pas de mission BODY.

## 5. Serveur MCP local

Le paquet `backend/mcp_server/` expose quatre outils via le protocole MCP en stdio :
`get_context`, `get_calendar`, `list_my_proposals` et `propose_quests`. `get_calendar`
lit `/api/agent/calendar/` avec la portée `quests` ; ses arguments `from_date` et
`to_date` sont des dates `AAAA-MM-JJ` facultatives (100 jours maximum, semaine ISO
courante par défaut). Sans `body`, les entrées et validations BODY sont retirées.
Il n'existe **aucun** outil de
validation, d'attribution, d'achat, de déblocage ou de suppression. Il n'ouvre aucune base
de données et n'importe pas Django : il est uniquement client de l'API locale. Les erreurs
de l'API sont renvoyées en texte lisible (message `detail` et code HTTP), sans trace Python.
L'hôte de `LIFE_RPG_API_URL` doit être `127.0.0.1` ou `localhost` (défaut :
`http://127.0.0.1:8000/api`) ; toute autre URL est refusée.

Installation et lancement :

```bash
cd backend && uv sync --group mcp
cd .. && LIFE_RPG_AGENT_TOKEN=lra_… make mcp
```

Configuration pour Claude Code (le secret reste dans la configuration locale) :

```bash
claude mcp add life-rpg -e LIFE_RPG_AGENT_TOKEN=lra_… -- \
  uv run --directory /chemin/vers/backend --group mcp python -m mcp_server
```

Bloc générique `mcpServers` (à adapter au client MCP utilisé) :

```json
{
  "mcpServers": {
    "life-rpg": {
      "command": "uv",
      "args": [
        "run", "--directory", "/chemin/vers/backend", "--group", "mcp",
        "python", "-m", "mcp_server"
      ],
      "env": {
        "LIFE_RPG_AGENT_TOKEN": "lra_…"
      }
    }
  }
}
```

Sans `LIFE_RPG_AGENT_TOKEN`, le serveur s'arrête avec un message explicite sur la sortie
d'erreur. Ne commite jamais un jeton, même révoqué.

## 6. Journal et confidentialité

Chaque action d'un agent est tracée dans le journal LIFE RPG avec `actor` = nom de l'agent :
lecture du contexte (`AGENT_CONTEXT_READ`), lecture du calendrier (`AGENT_CONTEXT_READ`,
message « <agent> a lu le calendrier. »), proposition (`QUEST_PROPOSED`). La création et
la révocation d'un jeton sont journalisées avec `actor` = `user`. Kane peut vérifier dans
le journal ce que chaque agent a lu et proposé.

Le secret du jeton et les données du territoire BODY restent sur la machine : BODY n'est
transmis qu'avec la portée explicite `body`, n'est jamais recopié dans un `rationale`
inutile et ne doit pas être envoyé à un service distant. En cas de doute, refuse ou
demande à Kane : le refus par défaut est la règle.
