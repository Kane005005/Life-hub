# Prompt de construction : LIFE RPG (de A à Z)

> À coller dans Claude Code (ou un autre agent de code) à la racine d'un dépôt vide.
> Avant de lancer, place ces deux fichiers dans le dépôt :
> - `docs/CAHIER_DES_CHARGES.md` : le cahier des charges LIFE RPG (export Markdown du doc)
> - `docs/brand-book.html` : le brand book (fichier HTML fourni avec ce prompt)

---

## Rôle et mission

Tu es l'ingénieur principal de **LIFE RPG**, une application personnelle de gamification de la vie réelle, pour **un seul utilisateur** (Kane). Tu construis le produit complet, de l'initialisation du dépôt jusqu'à une application utilisable au quotidien, en suivant le cahier des charges et le brand book.

## Sources de vérité (à lire en entier avant d'écrire une ligne)

1. `docs/CAHIER_DES_CHARGES.md` : fonctionnel et technique. Il décrit les six territoires, les missions, l'XP, les niveaux, les crédits, les points de compétence, les succès, les saisons, la boutique, le journal, le Game Master (LIFE AI), le modèle de données, l'API et les phases.
2. `docs/brand-book.html` : identité visuelle. Ouvre-le, lis son CSS, ses tokens et son JavaScript (carte hexagonale, radar, jauge, montée de niveau, braises). Il prime sur toute autre décision visuelle.

**Ordre de priorité en cas de conflit :** les décisions ci-dessous (architecture locale) > le cahier des charges > ton jugement. Le cahier a été écrit avec une architecture hébergée (PythonAnywhere, Vercel, Flutter, synchronisation) qui est **abandonnée pour le MVP**. Ignore tout ce qui concerne l'hébergement et la synchronisation, sauf pour garder le modèle de données prêt à les accueillir plus tard.

Si une règle est ambiguë ou manque, **pose la question** au lieu d'inventer. Ne devine jamais une règle de progression.

## Décisions d'architecture (définitives)

- **Tout tourne en local** sur le PC de l'utilisateur (Fedora KDE). Aucun hébergement, aucun abonnement, aucun service payant.
- **Backend :** Python 3.12+, Django 5.2, Django REST Framework, SQLite (un fichier). Environnement géré avec `uv` ou `venv`.
- **Frontend :** React + TypeScript + Vite + Tailwind CSS + Framer Motion. Gestion des données avec TanStack Query. Routage avec React Router.
- **Service :** Django sert le build React en production locale. En développement : Vite avec proxy vers Django.
- **Sécurité :** le serveur écoute **uniquement sur 127.0.0.1**. Pas d'inscription publique : un seul compte, créé par commande d'administration. Authentification par jeton.
- **Lancement :** une seule commande (`make run` ou `./run.sh`). Fournis aussi un fichier de service systemd utilisateur optionnel pour démarrer l'app avec la session.
- **Sauvegarde :** commande `make backup` (copie datée du fichier SQLite + export JSON) et restauration documentée.
- **Mobile :** hors périmètre. Ne construis pas Flutter. Garde seulement une API propre, basée sur jetons, et un champ d'identifiant unique (UUID) sur les événements pour permettre une synchronisation future.
- **Agents de code :** ils se connectent à l'API locale avec des jetons à portée limitée (voir « Accès des agents »). Un serveur MCP optionnel les expose comme outils, en phase 3.

## Règles de jeu non négociables

1. **Le backend est la seule autorité** sur les récompenses. Le front et les agents ne calculent ni n'attribuent jamais d'XP, de crédits ou de points.
2. **Tout passe par un service central, le Life Engine** (`engine/services.py`). Valider une mission = une transaction atomique qui crée des `XPTransaction`, met à jour territoire, niveau, crédits et succès, et écrit un événement de journal. Une mission ne peut être validée qu'une fois (idempotence).
3. **Le repos ne coûte rien.** Aucune perte d'XP, de série ou de niveau pour inactivité. Jamais de pénalité, jamais de rouge d'alarme.
4. **L'agent propose, l'utilisateur décide.** Une proposition d'agent est un objet distinct qui attend acceptation, modification ou refus.
5. **Formule de niveau :** XP requis pour passer le niveau N = `100 + 50 × (N − 1)`. Le surplus se reporte.
6. **Paliers d'XP :** 5, 15, 30, 60, 100, 200.
7. **Types de missions :** quotidienne, hebdomadaire, principale, secondaire, boss. Reprends leurs règles exactes du cahier.
8. **Six territoires et leurs statistiques :**

| Code | Territoire | Anglais | Couleur |
| --- | --- | --- | --- |
| INT | Savoir | KNOWLEDGE | `#6F94B5` |
| VIT | Corps | BODY | `#2FD08B` |
| INF | Carrière | CAREER | `#D0A94A` |
| TEC | Technologie | TECHNOLOGY | `#3FB6C6` |
| CRE | Création | CREATION | `#E0806F` |
| SAG | Monde intérieur | INNER WORLD | `#A08DD0` |

9. Les rangs, classes, saisons (90 jours), boutique, crédits, points de compétence et succès suivent **exactement** le cahier. Ne les modifie pas.

## Structure du dépôt

```
life-rpg/
  backend/
    manage.py
    config/                 # settings (base, local), urls, wsgi
    apps/
      accounts/  character/  world/  quests/  progression/  skills/
      economy/   achievements/  seasons/  journal/  analytics/
      ai_engine/  notifications/
    engine/                 # Life Engine : services.py, rules.py, events.py
    tests/
  frontend/
    src/ (app, pages, components, features, lib, styles, tokens)
  docs/
    CAHIER_DES_CHARGES.md  brand-book.html  ARCHITECTURE.md  API.md  AGENTS.md
  Makefile  README.md  .env.example  scripts/
```

Respecte les applications Django du cahier. Mets les règles pures (calcul d'XP, niveaux, paliers) dans `engine/rules.py`, sans accès base de données, pour les tester facilement.

## API (reprends la liste du cahier, section « API »)

Préfixe `/api/`. Authentification, personnage, monde et territoires, missions, propositions de missions, progression, économie, saisons, journal, et un domaine **agents** :

- `POST /api/auth/login/`, `POST /api/auth/logout/`, `GET /api/auth/me/`
- `POST /api/auth/agent-tokens/`, `DELETE /api/auth/agent-tokens/{id}/`
- `GET/PATCH /api/character/`, `PATCH /api/character/avatar/`
- `GET /api/world/territories/`, `GET /api/world/territories/{id}/`, `GET /api/world/progress/`
- `GET/POST /api/quests/`, `GET/PATCH /api/quests/{id}/`, `POST /api/quests/{id}/accept|complete|abandon/`
- `GET /api/quest-proposals/`, `POST /api/quest-proposals/{id}/accept|reject/`
- `GET /api/progression/`, `/history/`, `/skills/`
- `GET /api/economy/wallet/`, `/transactions/`, `/rewards/`, `POST /api/economy/rewards/{id}/purchase/`
- `GET/POST /api/seasons/`, `GET /api/seasons/current/`
- `GET /api/journal/`
- `GET /api/agent/context/`, `POST /api/agent/quest-proposals/`
- Réservé à plus tard : `/api/sync/push|pull|status/`

Génère un schéma **OpenAPI** (drf-spectacular) et publie-le dans `docs/API.md`.

## Accès des agents de code

- Chaque agent reçoit son propre jeton, révocable, avec une **portée** : lire la progression, lire les missions, créer des propositions.
- Un agent **ne peut jamais** : valider une mission, attribuer XP ou crédits, supprimer des données, modifier le moteur.
- Chaque action d'un agent est écrite dans le journal avec le nom de l'agent.
- `GET /api/agent/context/` renvoie un contexte compact et borné : niveau, statistiques, missions actives, objectifs, saison. Le jeton limite les catégories lisibles.
- Documente le tout dans `docs/AGENTS.md`, avec un exemple d'appel `curl` et un exemple de configuration MCP.
- Phase 3 : un petit serveur MCP (Python) qui expose ces endpoints comme outils.

## Frontend et identité visuelle (suis le brand book à la lettre)

**Univers :** monde nocturne vert-nuit, brume, braises émeraude, cadres de HUD argentés. L'émeraude vive `#2FD08B` est la seule lumière et reste rare. Thème sombre uniquement.

**Tokens :** reprends ceux du brand book (section Tokens) dans `tailwind.config.ts` et dans un fichier CSS de variables : Nuit `#0B100E`, Charbon `#16181A`, Vert profond `#0B3D2E`, Émeraude `#0F7B5A`, Émeraude vive `#2FD08B`, Ivoire `#EDE9DF`, Argent `#B9BEC2`, panneaux `#111A17`, filets `#24342E`, plus les six couleurs de territoires.

**Polices :** Instrument Serif (titres, grands nombres de niveau), Chakra Petch (interface de jeu : étiquettes, codes, XP), Schibsted Grotesk (texte). Auto-héberge les polices avec `@fontsource` pour fonctionner hors ligne.

**Mouvement :** courbe `cubic-bezier(.2,.7,.2,1)`, durées 120 ms, 240 ms, 600 ms. Respecte `prefers-reduced-motion` (tout devient instantané). Une seule animation lente : le remplissage de la jauge.

**Composants à reproduire depuis le brand book :** cadre HUD à coins, jauge d'XP segmentée, carte du monde à six nœuds hexagonaux reliés à la citadelle, radar à six axes, fiche du héros avec avatar minimaliste, carte de mission (le boss a son cadre à part), écran de montée de niveau (rayons, anneaux, grand numéro), braises à la validation, toasts de succès, barre supérieure avec niveau et jauge toujours visibles.

**Son :** désactivé par défaut, activable par un bouton. Sons synthétisés (Web Audio), aucun fichier externe.

**Pages :**
1. **Monde** (accueil) : carte des territoires, panneau de détail, missions du jour.
2. **Héros** : fiche, radar, jauge, succès, compétences.
3. **Missions** : journal de quêtes, création, filtres par territoire et type, validation.
4. **Game Master** : file des propositions d'agents (accepter, modifier, refuser), historique.
5. **Boutique et économie** : crédits, récompenses, historique des transactions.
6. **Saisons** : saison en cours (90 jours), objectifs, bilan.
7. **Journal** : événements et bilans, tendances.
8. **Réglages** : jetons d'agents, sauvegarde, export, son.

**Voix des textes (français, tutoiement, phrases courtes, aucun émoji) :** « Mission validée. +30 XP en Savoir. », « Repos enregistré. Ta progression est intacte. », « Claude Code propose 3 missions. Accepte, modifie ou refuse chacune. », « Niveau 8 atteint. 400 XP pour le suivant. ». Jamais de ton infantilisant ni de point d'exclamation superflu.

**Accessibilité :** contrastes AA minimum, focus visible, navigation clavier sur la carte et les cartes de mission, `aria-live` pour les annonces de validation.

## Méthode de travail

Travaille **phase par phase**. À la fin de chaque phase : tests verts, application lançable, commit propre (Conventional Commits), résumé court de ce qui marche, puis **arrête-toi et attends ma validation** avant la phase suivante.

### Phase 0 : fondations
- Dépôt, structure, `Makefile`, `README`, `.env.example`, `ruff`, `eslint`, `prettier`, `pytest-django`, `vitest`.
- Django + DRF + SQLite configurés, serveur lié à 127.0.0.1, commande de création du compte unique.
- Front Vite + Tailwind avec les tokens du brand book, polices auto-hébergées, composants de base (cadre HUD, bouton, jauge).
- **Critère :** `make run` ouvre une page avec la barre supérieure et la jauge, au style du brand book.

### Phase 1 : LIFE CORE
- Authentification par jeton, création du personnage, pseudonyme, avatar minimaliste.
- Six territoires (données initiales), Life Engine, missions (création, acceptation, validation, abandon), XP, niveaux, historique, journal d'événements.
- Pages Monde, Héros, Missions avec carte, radar, jauge, braises, montée de niveau.
- `make backup` et restauration.
- **Critères :** valider une mission une seule fois (idempotence testée) ; passage de niveau avec report du surplus ; repos sans aucune perte ; tests unitaires complets sur `engine/rules.py` et le Life Engine.

### Phase 2 : RPG SYSTEM
- Compétences et arbres, succès, crédits, boutique, équipements, saisons (90 jours), journal avancé.
- Pages Boutique, Saisons, Succès, Journal.
- **Critères :** achat refusé si crédits insuffisants ; saison qui se ferme et ouvre la suivante ; succès attribués une seule fois.

### Phase 3 : LIFE AI (agents)
- Jetons d'agents à portée limitée, `GET /api/agent/context/`, `POST /api/agent/quest-proposals/`, file de propositions, page Game Master.
- Serveur MCP optionnel, `docs/AGENTS.md`.
- Adaptation de la difficulté, bilan énergétique, analyse de progression (règles, pas de modèle embarqué).
- **Critères :** un agent peut proposer mais ni valider ni attribuer d'XP (testé, y compris les tentatives refusées) ; chaque action d'agent apparaît dans le journal.

### Phase 4 : expérience immersive
- Carte interactive aboutie, personnalisation avancée de l'avatar, animations, notifications locales.
- Finitions du brand book (son, effets, états vides soignés).
- **Critères :** parcours complet sans erreur console ; `prefers-reduced-motion` respecté ; Lighthouse accessibilité ≥ 95.

**Hors périmètre pour l'instant :** application Flutter, synchronisation, hébergement, multi-utilisateur.

## Qualité exigée

- Tests : `pytest` pour le moteur, l'API et les permissions des agents ; `vitest` et tests de composants pour les écrans critiques ; au moins un test de bout à bout du parcours « créer, valider, monter de niveau ».
- Aucune règle de jeu dupliquée entre front et back : le front affiche ce que l'API renvoie.
- Migrations propres, données initiales (six territoires, paliers, succès de base) via fixtures ou commande `seed`.
- Variables sensibles dans `.env`, jamais dans le dépôt.
- `README` clair : installation sur Fedora, `make run`, `make test`, `make backup`, service systemd.
- Documents à jour à chaque phase : `ARCHITECTURE.md`, `API.md`, `AGENTS.md`.

## Interdictions

- Ne change pas les règles de jeu, les valeurs d'XP ni la formule de niveau sans me demander.
- Ne rends jamais le serveur accessible hors du PC (pas de `0.0.0.0`).
- N'ajoute aucune dépendance payante ni aucun service externe obligatoire.
- Ne supprime aucun fichier ni aucune donnée de l'utilisateur sans confirmation.
- Ne copie pas le code du brand book tel quel dans un seul gros fichier : découpe-le en composants React typés et réutilisables.

## Première action

1. Lis les deux documents.
2. Réponds par un **plan court** : la structure que tu vas créer, les questions ouvertes (s'il y en a) et les risques que tu vois.
3. Attends mon accord, puis commence la phase 0.
