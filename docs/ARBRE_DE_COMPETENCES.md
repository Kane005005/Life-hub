# Annexe A — Arbre de compétences (spécification)

Cette annexe complète le §6.4 du cahier des charges, qui ne précisait ni la structure, ni les coûts, ni les conditions de déblocage. Les valeurs ci-dessous sont des **propositions de départ**, toutes configurables dans les paramètres du système (Kane les valide ou les modifie).

## A.1 Principes

- Il y a **6 arbres**, un par territoire. Chaque arbre a **3 branches**, et chaque branche a **4 niveaux** (donc 72 compétences au total).
- Une compétence est la **reconnaissance d'un savoir-faire réel**. Elle est symbolique : elle donne un titre, un badge et un contenu d'interface, **jamais un bonus artificiel d'XP ou de statistiques**.
- Débloquer une compétence est **toujours un choix de l'utilisateur** : il dépense lui-même ses points. Le serveur vérifie les conditions, rien ne se débloque automatiquement.
- Une compétence débloquée n'est **jamais perdue**, même après une longue inactivité.
- Les compétences du territoire BODY restent privées et ne sont jamais un diagnostic médical.
- Les agents IA peuvent **proposer** une compétence à viser, mais ne peuvent ni la débloquer ni dépenser de points.

## A.2 Points de compétence

- Gain : **1 point par niveau général gagné** (configurable).
- Les points sont dépensés, jamais remboursés par défaut. Une option « réorienter » (rembourser une compétence) peut être ajoutée plus tard, à décider par Kane.
- Total des 72 compétences : **126 points**. Au niveau 50 le joueur a gagné environ 49 points : il ne peut donc pas tout débloquer, il choisit une orientation. C'est voulu.

## A.3 Coûts et conditions de déblocage

Chaque branche se débloque dans l'ordre : le niveau N exige le niveau N−1 de la même branche. Les branches sont indépendantes entre elles.

| Niveau | Coût (points) | Statistique minimale du territoire (0–100) | Missions validées dans la branche |
|---|---|---|---|
| 1 | 1 | 0 | 0 |
| 2 | 1 | 15 | 3 |
| 3 | 2 | 30 (état DEVELOPMENT) | 8 |
| 4 | 3 | 50 | 15 |

Une mission est rattachée à une branche (champ optionnel `skill_branch`). Seules les missions **validées par l'utilisateur** comptent : la progression est prouvée par la pratique réelle, pas par le simple dépôt de points.

## A.4 Modèle de données (module `skills`)

- `SkillTree` : un par territoire.
- `SkillBranch` : code, nom, arbre.
- `Skill` : code (ex. `technology.programming.t2`), nom, branche, niveau (1–4), coût, `requires` (compétences prérequises), `min_territory_stat`, `min_validated_quests`.
- `SkillUnlock` : compétence, date, points dépensés, `SkillPointTransaction` associée (journalisée comme `XPTransaction` et `CreditTransaction`).
- `SkillPointTransaction` : gain ou dépense, motif, solde après opération.

Les données de départ sont dans `docs/skill_tree_seed.json` et se chargent par une commande `python manage.py load_skill_tree` (idempotente : elle met à jour sans doublon).

## A.5 API

- `GET /api/skills/trees/` : les six arbres avec l'état de chaque compétence (verrouillée, débloquable, débloquée) et ce qui manque pour la débloquer.
- `POST /api/skills/{code}/unlock/` : débloque si les conditions et le solde le permettent, sinon erreur explicite.
- `GET /api/progression/skills/` : compétences débloquées et points disponibles/dépensés.
- Côté agents : lecture seule des compétences, plus `POST /api/agent/quest-proposals/` pour proposer une mission liée à une branche.

## A.6 Interface

Chaque territoire affiche son arbre : trois colonnes (les branches) de quatre nœuds, reliés verticalement. Couleur du territoire pour les nœuds débloqués, ton éteint pour les verrouillés, halo pour les débloquables. Un clic sur un nœud ouvre le coût, les prérequis, ce qu'il manque et le bouton de déblocage. Une animation de déblocage sobre, qui respecte `prefers-reduced-motion`.

## A.7 Contenu de départ

### KNOWLEDGE — Cité du savoir

| Branche | Niv. 1 | Niv. 2 | Niv. 3 | Niv. 4 |
|---|---|---|---|---|
| **Lecture & culture** (`reading`) | Lecteur régulier | Lecteur critique | Fiches et synthèses | Érudit |
| **Langues** (`languages`) | Bases solides | Conversation courante | Lecture et écriture avancées | Bilingue |
| **Recherche & méthode** (`research`) | Curiosité méthodique | Sources fiables | Analyse et rédaction | Chercheur autonome |

### BODY — Sanctuaire physique

| Branche | Niv. 1 | Niv. 2 | Niv. 3 | Niv. 4 |
|---|---|---|---|---|
| **Natation** (`swimming`) | Aisance dans l'eau | Nage régulière | Endurance | Technique maîtrisée |
| **Forme & mobilité** (`fitness`) | Routine d'étirements | Entraînement régulier | Force et mobilité | Condition durable |
| **Sommeil & alimentation** (`recovery`) | Rythme de sommeil | Repas équilibrés | Récupération planifiée | Hygiène de vie stable |

### CAREER — Métropole économique

| Branche | Niv. 1 | Niv. 2 | Niv. 3 | Niv. 4 |
|---|---|---|---|---|
| **Entrepreneuriat** (`entrepreneurship`) | Idée validée | Offre structurée | Activité rentable | Entreprise pilotée |
| **Vente & prospection** (`sales`) | Premiers contacts | Pitch clair | Pipeline suivi | Négociateur |
| **Finances & gestion** (`finance`) | Budget tenu | Suivi des flux | Prévision | Gestion maîtrisée |

### TECHNOLOGY — Laboratoire avancé

| Branche | Niv. 1 | Niv. 2 | Niv. 3 | Niv. 4 |
|---|---|---|---|---|
| **Programmation** (`programming`) | Bases solides | Projet livré | Architecture propre | Développeur autonome |
| **IA & automatisation** (`ai`) | Prompts efficaces | Premiers workflows | Agents orchestrés | Systèmes automatisés |
| **DevOps & sécurité** (`devops`) | Git et terminal | Déploiement | Conteneurs et CI | Sécurité appliquée |

### CREATION — District créatif

| Branche | Niv. 1 | Niv. 2 | Niv. 3 | Niv. 4 |
|---|---|---|---|---|
| **Dessin** (`drawing`) | Croquis réguliers | Proportions | Style personnel | Œuvre aboutie |
| **Cuisine** (`cooking`) | Recettes de base | Techniques maîtrisées | Recettes originales | Table maîtrisée |
| **Vidéo & musique** (`media`) | Premiers montages | Narration visuelle | Production complète | Créateur reconnu |

### INNER_WORLD — Sanctuaire intérieur

| Branche | Niv. 1 | Niv. 2 | Niv. 3 | Niv. 4 |
|---|---|---|---|---|
| **Réflexion & écriture** (`reflection`) | Journal tenu | Bilans réguliers | Principes personnels | Vision de vie |
| **Relations humaines** (`relations`) | Présence | Écoute | Liens entretenus | Cercle solide |
| **Repos & équilibre** (`balance`) | Pauses assumées | Rituels | Équilibre travail-repos | Sérénité durable |

## A.8 Critères d'acceptation (phase 2)

- `load_skill_tree` crée 6 arbres, 18 branches et 72 compétences, et peut être relancée sans doublon.
- Impossible de débloquer sans les points, sans le niveau précédent, sans la statistique ou sans les missions validées requises, avec un message qui dit ce qui manque.
- Chaque déblocage crée une transaction de points et une entrée de journal.
- Un agent ne peut pas débloquer une compétence (test dédié).
- Le déblocage est atomique : pas de double dépense en cas de double clic.
