# LIFE RPG — Cahier des charges fonctionnel et technique v1.0

22 novembre 2026 · Kane

LIFE RPG est une application personnelle de gamification qui transforme les actions réelles en progression de type RPG, pour un seul utilisateur, exécutée en local sur son PC (Django et React), avec une application mobile envisagée plus tard.

## 1. Présentation générale

| **Information**           | **Valeur**                                       |
|---------------------------|--------------------------------------------------|
| Nom du projet             | LIFE RPG                                         |
| Nature                    | Application personnelle de gamification          |
| Type                      | RPG de progression dans la vie réelle            |
| Version documentaire      | 1.0                                              |
| Statut                    | Conception validée                               |
| Plateforme initiale       | Web local (React + Django sur le PC)             |
| Plateforme future         | Application mobile Flutter, si nécessaire        |
| Langue initiale           | Français                                         |
| Architecture              | React + Django + SQLite, en local                |
| Mode de fonctionnement    | Local-first (serveur sur le PC)                  |
| Intelligence artificielle | Agents de code (Claude Code, etc.) via API / MCP |

### 1.1. Contexte

LIFE RPG transforme les activités, les objectifs et les expériences de la vie réelle en un système de progression inspiré des jeux de rôle. L'utilisateur incarne sa propre identité à travers un personnage virtuel personnalisable. Ses actions réelles lui permettent de développer ses compétences, d'accomplir des missions, de progresser dans différents territoires, de débloquer des récompenses et de suivre son évolution.

L'application associe :

- la gestion des objectifs personnels ;
- les mécaniques de progression RPG ;
- la gestion des habitudes ;
- le développement des compétences ;
- l'intelligence artificielle ;
- l'analyse de progression ;
- la personnalisation d'un univers virtuel.

LIFE RPG ne doit pas être un simple gestionnaire de tâches avec des points d'expérience. Il doit constituer un véritable système de progression personnelle.

### 1.2. Vision du produit

LIFE RPG permet à chaque utilisateur de construire une représentation évolutive de sa vie, de ses objectifs et de ses accomplissements. Le système accompagne l'utilisateur pendant plusieurs années, sans imposer de progression artificielle ni créer de dépendance à la productivité.

### 1.3. Objectifs principaux

1.  Transformer les objectifs personnels en missions concrètes.
2.  Encourager une progression équilibrée dans les différentes dimensions de la vie.
3.  Rendre les accomplissements visibles et mesurables.
4.  Développer les compétences à travers des expériences réelles.
5.  Utiliser les agents IA de l'utilisateur (Claude Code, etc.) pour faciliter la planification et l'adaptation des objectifs.
6.  Construire une mémoire de progression à long terme.
7.  Permettre une utilisation quotidienne même sans connexion Internet.

## 2. Identité et direction artistique

### 2.1. Identité du joueur

Chaque utilisateur dispose d'un personnage personnel. Les éléments suivants sont personnalisables : pseudonyme, avatar, biographie, classe principale, niveau, rang, titres obtenus, équipements virtuels, statistiques et historique des accomplissements. L'identité réelle de l'utilisateur n'a pas besoin d'être affichée publiquement.

### 2.2. Système d'avatar

Le personnage repose sur une silhouette minimaliste, et non sur un avatar 3D complexe nécessitant un moteur graphique lourd. Le système permet de modifier progressivement :

- la silhouette ;
- les vêtements ;
- les accessoires ;
- les couleurs ;
- les équipements ;
- les éléments cosmétiques ;
- les effets visuels associés aux accomplissements.

Les équipements sont principalement symboliques et cosmétiques. Ils n'apportent aucun avantage artificiel aux statistiques réelles.

### 2.3. Direction artistique

Style : science-fiction futuriste, réaliste et minimaliste. L'application doit ressembler à un centre de contrôle personnel futuriste, pas à un tableau de bord administratif.

| **Élément**           | **Couleur recommandée** |
|-----------------------|-------------------------|
| Fond principal        | Graphite profond        |
| Surface secondaire    | Gris anthracite         |
| Accent principal      | Vert émeraude           |
| Texte principal       | Blanc cassé             |
| Texte secondaire      | Gris argenté            |
| Récompenses spéciales | Or discret              |

Principes graphiques :

- interface sobre et hiérarchie visuelle claire ;
- typographie moderne ;
- animations fluides et discrètes ;
- effets lumineux limités ;
- navigation intuitive ;
- excellente lisibilité sur mobile.

## 3. Univers et territoires

L'univers est constitué de six territoires. Chacun possède une identité visuelle, une statistique principale, des compétences, des missions, des objectifs, des succès, des statistiques historiques et une progression indépendante.

| **Territoire** | **Nom**              | **Domaine**                    | **Activités**                                                                                                    | **Statistique**    |
|----------------|----------------------|--------------------------------|------------------------------------------------------------------------------------------------------------------|--------------------|
| KNOWLEDGE      | Cité du savoir       | Développement intellectuel     | Lecture, apprentissage, langues, recherche, culture générale, formation                                          | INTELLIGENCE (INT) |
| BODY           | Sanctuaire physique  | Vitalité et entretien physique | Sport, natation, mobilité, sommeil, alimentation, récupération                                                   | VITALITÉ (VIT)     |
| CAREER         | Métropole économique | Évolution professionnelle      | Entrepreneuriat, gestion de projets, prospection, finances, relations professionnelles, développement commercial | INFLUENCE (INF)    |
| TECHNOLOGY     | Laboratoire avancé   | Maîtrise technologique         | Programmation, IA, automatisation, DevOps, cybersécurité, architecture logicielle                                | MAÎTRISE (TEC)     |
| CREATION       | District créatif     | Expression et imagination      | Dessin, cuisine, montage vidéo, musique, design, création artistique                                             | CRÉATIVITÉ (CRE)   |
| INNER WORLD    | Sanctuaire intérieur | Équilibre personnel            | Spiritualité, réflexion, relations humaines, temps personnel, repos, connaissance de soi                         | SAGESSE (SAG)      |

Les données personnelles liées au corps (territoire BODY) restent privées et ne sont jamais transformées en diagnostic médical.

### 3.1. Progression des territoires

Chaque territoire possède trois états de progression :

1.  : territoire découvert.
2.  : territoire en développement.
3.  : territoire dont les compétences sont durablement développées.

Les territoires ne perdent jamais leurs acquis en raison d'une période d'inactivité.

## 4. Gestion du personnage

### 4.1. Fiche du personnage

La fiche contient : pseudonyme, avatar, classe, niveau général, XP total, rang, statistiques des six territoires, compétences débloquées, succès, titres et équipements.

### 4.2. Classes

Classes initiales : Architect, Creator, Explorer, Strategist, Innovator. Une classe représente une orientation, pas une restriction. L'utilisateur peut changer de classe ou faire évoluer sa spécialisation sans perdre ses compétences précédentes.

### 4.3. Rangs

| **Niveau** | **Rang**   |
|------------|------------|
| 1–9        | Initiate   |
| 10–19      | Explorer   |
| 20–29      | Builder    |
| 30–39      | Specialist |
| 40–49      | Master     |
| 50+        | Architect  |

Les rangs sont configurables depuis les paramètres du système.

## 5. Système de missions

Le module QUESTS constitue le cœur fonctionnel de LIFE RPG.

### 5.1. Types de missions

| **Type**      | **Description**                                    | **Exemples**                                                                              |
|---------------|----------------------------------------------------|-------------------------------------------------------------------------------------------|
| Daily Quests  | Missions quotidiennes facultatives                 | Lire 20 minutes, faire une session de concentration, organiser sa journée                 |
| Weekly Quests | Missions hebdomadaires                             | Terminer une formation, avancer sur un projet, réaliser une activité physique             |
| Main Quests   | Objectifs importants à moyen ou long terme         | Lancer une plateforme, apprendre une technologie, développer une activité professionnelle |
| Side Quests   | Missions secondaires et exploratoires              | Découvrir une nouvelle activité, essayer une recette, réaliser un dessin                  |
| Boss Missions | Grands défis constitués de plusieurs sous-missions | Lancer une nouvelle activité professionnelle                                              |

### 5.2. Création d'une mission

| **Champ**          | **Description**                 |
|--------------------|---------------------------------|
| ID                 | Identifiant unique              |
| Titre              | Nom de la mission               |
| Description        | Explication                     |
| Territoire         | Domaine concerné                |
| Type               | Daily, Weekly, Main, Side, Boss |
| Difficulté         | Niveau estimé                   |
| Durée              | Temps estimé                    |
| Priorité           | Faible, normale, haute          |
| Date de début      | Facultative                     |
| Échéance           | Facultative                     |
| Récompense XP      | Calculée par le moteur          |
| Récompense crédits | Selon les règles                |
| Étapes             | Sous-objectifs                  |
| Validation         | Manuelle ou avec preuve         |
| Origine            | Utilisateur ou IA               |
| Statut             | État de la mission              |

### 5.3. Statuts

AVAILABLE, ACCEPTED, IN_PROGRESS, COMPLETED, PAUSED, ABANDONED. Une mission abandonnée ne provoque aucune perte d'XP déjà acquise.

### 5.4. Missions composées

Une Main Quest ou une Boss Mission peut contenir plusieurs sous-missions, chacune avec sa propre progression. La mission principale est considérée comme terminée lorsque toutes ses étapes obligatoires sont validées. Ses récompenses sont attribuées une seule fois.

### 5.5. Habitudes

Le système d'habitudes est distinct des missions classiques. Il permet :

- la création d'habitudes ;
- le suivi des occurrences ;
- la définition d'une fréquence ;
- l'affichage de l'historique ;
- le suivi de régularité ;
- la désactivation temporaire.

Les séries de jours consécutifs sont facultatives et ne créent aucune pénalité en cas d'interruption.

## 6. Moteur de progression

Le moteur de progression est centralisé dans le backend. Les récompenses sont définies par le système et non directement par l'IA.

### 6.1. XP

Barème initial, configurable :

| **Difficulté** | **XP** |
|----------------|--------|
| Très facile    | 5      |
| Facile         | 15     |
| Moyenne        | 30     |
| Difficile      | 60     |
| Épique         | 100    |
| Légendaire     | 200    |

### 6.2. Niveau

XP requis pour passer au niveau suivant (calculé côté serveur) :

    XP_{\text{requis}} = 100 + 50 \times (\text{niveau actuel} - 1)

### 6.3. Crédits

Les crédits sont une monnaie virtuelle qui permet d'acquérir des récompenses dans une boutique personnalisée. Toutes les transactions sont enregistrées.

### 6.4. Skill Points

Les points de compétence débloquent des branches dans les arbres de compétences. Le système distingue les points disponibles, les points dépensés, les compétences débloquées et leurs conditions de déblocage.

### 6.5. Achievements

| **Succès**       | **Condition**                              |
|------------------|--------------------------------------------|
| First Quest      | Première mission terminée                  |
| First Boss       | Premier grand défi accompli                |
| Knowledge Seeker | Première série de missions d'apprentissage |
| Creator          | Première réalisation créative              |
| Explorer         | Première activité hors routine             |

Chaque succès est déclenché une seule fois.

### 6.6. Anti-farming

Le système prévient :

- les validations répétées ;
- les récompenses en double ;
- les missions artificiellement découpées ;
- les manipulations de transactions ;
- les récompenses répétitives excessives.

Les plafonds de répétition sont configurables et ne doivent pas empêcher les activités légitimes.

## 7. Système de saisons

Une saison dure 90 jours par défaut. Chaque saison comprend :

- un nom et un thème ;
- un objectif principal et trois objectifs secondaires maximum ;
- des territoires prioritaires ;
- des missions associées ;
- une date de début et une date de fin ;
- un bilan final.

Le joueur peut créer une nouvelle saison ou poursuivre ses objectifs sans saison active. La clôture d'une saison ne supprime aucune donnée.

## 8. LIFE AI — Game Master

### 8.1. Objectif

LIFE AI n'est pas un modèle embarqué dans l'application : ce sont les agents de code de l'utilisateur (Claude Code et autres) qui se connectent à l'API locale, ou à un serveur MCP, pour jouer le rôle de Game Master. Ils accompagnent l'utilisateur dans la création, l'organisation et l'analyse de ses missions, sans aucune autorité sur le moteur de progression.

### 8.2. Rôles du Game Master

| **Agent**        | **Responsabilités**                                                                                                              |
|------------------|----------------------------------------------------------------------------------------------------------------------------------|
| Quest Architect  | Transformer un objectif en missions, créer des sous-objectifs, estimer difficulté et durée, proposer des récompenses indicatives |
| Progress Analyst | Analyser les accomplissements, étudier l'évolution des territoires, identifier les tendances, produire des bilans                |
| Personal Coach   | Aider à organiser les journées, adapter les propositions, identifier les surcharges, proposer des périodes de récupération       |
| World Narrator   | Produire des résumés narratifs, présenter les accomplissements, raconter les étapes importantes                                  |
| Balance Guardian | Identifier les territoires négligés, détecter les déséquilibres, proposer des ajustements, encourager une progression équilibrée |

### 8.3. Adaptation de la difficulté

LIFE AI prend en compte l'énergie déclarée, la charge de missions actives, les disponibilités, les priorités, les objectifs à long terme, l'historique des missions et le temps estimé disponible.

L'utilisateur peut effectuer un bilan énergétique personnel sur l'échelle suivante :

1.  Très faible.
2.  Faible.
3.  Moyenne.
4.  Bonne.
5.  Excellente.

Exemple : si l'utilisateur indique une faible énergie et possède plusieurs missions difficiles, LIFE AI peut proposer une mission courte, une étape simplifiée, une mission facultative de récupération ou le report d'une tâche non urgente. L'IA ne modifie jamais silencieusement les échéances ou les objectifs.

### 8.4. Fonctionnement de l'IA

1.  Récupération du contexte autorisé.
2.  Analyse de la situation.
3.  Génération de propositions.
4.  Présentation à l'utilisateur.
5.  Acceptation ou modification.
6.  Transmission au backend.
7.  Application des règles par le moteur central.

### 8.5. Mémoire de l'IA

Le contexte que l'API met à disposition des agents est organisé par catégories : profil, objectifs, préférences, projets, compétences, habitudes et historique de progression. L'utilisateur peut consulter, corriger et supprimer les informations mémorisées. Un agent ne lit que les catégories que son jeton l'autorise à lire.

### 8.6. Sécurité de l'IA

L'IA ne peut jamais :

- attribuer directement de l'XP ;
- créer des crédits ;
- modifier un niveau ;
- déclarer une mission terminée sans validation ;
- supprimer des données ;
- modifier une transaction.

Elle passe obligatoirement par les services autorisés du backend.

### 8.7. Connexion des agents

Les agents de code (Claude Code et autres) se connectent à l'API locale, ou à un serveur MCP optionnel qui expose ces endpoints comme outils. Chaque agent reçoit son propre jeton, révocable, à portée limitée.

| **Action**                                    | **Agent** | **Utilisateur**    |
|-----------------------------------------------|-----------|--------------------|
| Lire progression, territoires et missions     | Oui       | Oui                |
| Proposer une mission (file de propositions)   | Oui       | Oui                |
| Accepter, modifier ou refuser une proposition | Non       | Oui                |
| Valider une mission, attribuer XP ou crédits  | Non       | Oui, via le moteur |
| Supprimer des données                         | Non       | Oui                |

Chaque action d'un agent est inscrite dans le journal des événements, avec le nom de l'agent concerné.

## 9. Validation des missions

### 9.1. Validation personnelle

L'utilisateur peut marquer une mission comme terminée. Le backend vérifie l'existence de la mission, son statut, les conditions de validation et l'absence de récompense déjà attribuée.

### 9.2. Preuves facultatives

Types de preuves : texte, photographie, document, lien externe, note personnelle. Les preuves ne sont pas obligatoires par défaut et peuvent être conservées dans un espace privé.

### 9.3. Journal des événements

Chaque événement important est enregistré : création, acceptation, modification, validation, attribution d'XP, transaction, déblocage de compétence. Le journal permet de retracer les opérations et de prévenir les doubles récompenses.

## 10. Inventaire et boutique

### 10.1. Catégories

Rewards, Titles, Badges, Artifacts.

### 10.2. Boutique

L'utilisateur crée ses propres récompenses : acheter un livre, faire une sortie, acheter un équipement, organiser une journée découverte. Chaque récompense possède un nom, une description, un coût, une catégorie, une disponibilité et un historique d'achat.

L'achat d'une récompense ne doit pas être confondu avec une dépense réelle effectuée par l'application.

## 11. Interface et navigation

L'application comporte huit espaces : Dashboard, Quests, Character, World, Statistics, Inventory, Life AI et Settings.

| **Espace** | **Contenu**                                                                                                                                                                           |
|------------|---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| Dashboard  | Personnage, niveau, XP, missions actives, progression du jour, énergie déclarée, territoires, objectifs principaux, accès rapide au Game Master                                       |
| Quests     | Missions disponibles, actives et terminées ; filtres par territoire et par difficulté ; création manuelle ; propositions de LIFE AI                                                   |
| Character  | Avatar, équipements, rang, niveau, statistiques, compétences, titres, succès                                                                                                          |
| World      | Les six territoires sous forme de carte ou de grille interactive, avec missions, compétences et historique de chacun ; carte légère, utilisable sur appareils modestes                |
| Statistics | XP par période, missions terminées, répartition des activités, progression des territoires, historique, tendances, bilans hebdomadaires et saisonniers ; aucun classement obligatoire |
| Inventory  | Crédits, récompenses, badges, titres                                                                                                                                                  |
| Life AI    | Espace Game Master : propositions des agents connectés en attente de validation, historique des échanges, bilans, planification, ajustement de charge                                 |
| Settings   | Paramètres du système, dont la configuration des rangs et des barèmes                                                                                                                 |

## 12. Architecture technique

Un front web React et un backend Django tournent en local sur le PC de l'utilisateur, et les agents de code s'y connectent par l'API ou par MCP ; toutes les récompenses passent par le Life Engine.

<img src="media/rId64.png" style="width:5.83333in;height:3.20312in" />

Le Life Engine est le seul composant qui écrit XP et récompenses ; les agents ne font que proposer via l'API.

### 12.1. Frontend

Technologies : React, TypeScript, Vite, Tailwind CSS, Framer Motion, React Router, et une gestion d'état adaptée à l'application. Le frontend est une application web responsive, servie en local par Django (build React) : une seule commande lance l'ensemble. Une application mobile Flutter est envisagée plus tard, si le besoin se confirme ; elle utiliserait la même API.

### 12.2. Backend

Technologies : Python, Django, Django REST Framework, SQLite. Le backend expose une API REST documentée, selon une architecture Django modulaire, exécuté en local, avec une base SQLite stockée dans un fichier sur le PC.

| **Application** | **Responsabilité**            |
|-----------------|-------------------------------|
| accounts        | Comptes                       |
| character       | Personnage                    |
| world           | Territoires                   |
| quests          | Missions                      |
| progression     | XP et niveaux                 |
| skills          | Compétences                   |
| economy         | Crédits                       |
| achievements    | Succès                        |
| seasons         | Saisons                       |
| journal         | Journal                       |
| analytics       | Statistiques                  |
| ai_engine       | Accès des agents (API et MCP) |
| notifications   | Notifications                 |

### 12.3. Base de données

Entités principales :

| **Domaine**          | **Entités**                                            |
|----------------------|--------------------------------------------------------|
| Compte et personnage | User, PlayerProfile, Character, AvatarConfiguration    |
| Monde                | Territory, TerritoryProgress                           |
| Missions             | Quest, QuestStep, QuestCompletion, Habit, HabitRecord  |
| Compétences          | Skill, SkillTree, SkillUnlock                          |
| Transactions         | XPTransaction, CreditTransaction                       |
| Succès et boutique   | Achievement, PlayerAchievement, Reward, RewardPurchase |
| Saisons              | Season, SeasonObjective                                |
| Suivi                | JournalEntry, EnergyCheckIn, Notification              |
| IA                   | AIConversation, AIMemory                               |
| Synchronisation      | SyncEvent                                              |

Les transactions virtuelles et les récompenses sont traçables et protégées contre les doublons.

### 12.4. Life Engine

Service central qui gère : le calcul de l'XP, le calcul des niveaux, la progression des territoires, les récompenses, le déblocage des compétences, les succès, les transactions et les événements. Toutes les opérations critiques sont atomiques et validées côté serveur lorsqu'une connexion est disponible.

### 12.5. Exécution locale et évolution du projet

L'application est utilisée par une seule personne : elle tourne sur son PC, sans hébergement ni abonnement.

| **Composant**      | **Exécution**                                                          | **Coût**             |
|--------------------|------------------------------------------------------------------------|----------------------|
| Frontend et API    | Django sert le build React sur localhost                               | 0                    |
| Base de données    | SQLite, un fichier sur le PC                                           | 0                    |
| Game Master        | Claude Code et autres agents de l'utilisateur, via l'API locale ou MCP | outils déjà utilisés |
| Application mobile | Flutter, plus tard si nécessaire                                       | 0                    |

Règles de conception de l'exécution locale :

- le serveur n'écoute que sur localhost ;
- l'application se lance avec une seule commande, ou au démarrage de la session via un service utilisateur ;
- la base SQLite est sauvegardée régulièrement (copie du fichier ou export vers un dépôt Git privé) ;
- les agents de code travaillent directement sur le dépôt : ils ajoutent des modules, lancent les migrations et configurent le serveur local, ce qui est le mode d'évolution du projet ;
- un accès mobile futur passera par un réseau privé (par exemple Tailscale) ou par un hébergement, sans changer l'API.

## 13. Fonctionnement local et mobile futur

Le serveur tourne sur le PC de l'utilisateur : l'application fonctionne sans Internet. La synchronisation entre appareils n'est pas dans le MVP ; elle ne sera construite que si l'application mobile devient nécessaire.

Schéma cible, pour plus tard : chaque événement créé sur le mobile porte un identifiant unique, et le serveur du PC n'applique et ne récompense que ceux qu'il n'a pas encore vus.

### 13.1. Exécution sans réseau

Django et React tournent sur localhost : aucune connexion Internet n'est nécessaire pour utiliser l'application. Seules les actions des agents qui appellent un service externe dépendent du réseau.

### 13.2. Fonctions disponibles hors connexion

- consulter son personnage ;
- consulter les missions synchronisées ;
- créer des missions personnelles et modifier les missions locales ;
- démarrer et valider une mission ;
- ajouter une note ;
- consulter les territoires ;
- enregistrer une progression en attente.

### 13.3. Synchronisation avec un mobile (plus tard)

Lorsque le mobile retrouve le serveur du PC :

1.  Détecter la disponibilité réseau.
2.  Envoyer les événements locaux en attente.
3.  Vérifier leur identifiant unique.
4.  Vérifier les autorisations.
5.  Appliquer les opérations valides.
6.  Récupérer les données actualisées.
7.  Mettre à jour la base locale.

### 13.4. Gestion des conflits

Le système prévoit des identifiants uniques pour chaque événement, un horodatage, une version des données, un identifiant du périphérique, l'idempotence et un journal de synchronisation. Les opérations critiques comme les récompenses sont calculées et confirmées par le backend. En cas de conflit sur une mission, les informations ne sont jamais supprimées silencieusement.

Le PC et le téléphone ne se synchronisent jamais directement entre eux : chacun envoie ses événements au serveur Django, qui reste la source de vérité, puis récupère l'état à jour.

### 13.5. Limites

Le PC doit être allumé et le serveur démarré pour utiliser l'application. Les agents de code dépendent de leur propre accès réseau pour fonctionner.

## 14. Sécurité et confidentialité

Exigences :

- authentification sécurisée ;
- protection des endpoints et permissions par utilisateur ;
- validation côté serveur ;
- authentification par jeton, avec un jeton distinct et à portée limitée pour chaque agent, serveur à l'écoute de localhost uniquement, protection CSRF si des cookies sont utilisés ;
- HTTPS si le serveur est un jour exposé hors du PC ;
- stockage sécurisé des secrets ;
- sauvegardes de la base SQLite ;
- journalisation des opérations sensibles ;
- protection des fichiers téléversés ;
- gestion de la suppression des données.

Les informations personnelles restent privées par défaut. Aucun profil n'est public sans choix explicite de l'utilisateur.

Usage personnel : l'application n'a qu'un seul utilisateur. Il n'y a pas d'inscription publique : le compte est créé une seule fois par l'administrateur.

## 15. API principale

Endpoints indicatifs. Les chemins et formats exacts seront définis dans la spécification API OpenAPI. Les agents de code appellent ces endpoints avec un jeton à portée limitée ; un serveur MCP optionnel peut les exposer comme outils.

| **Domaine**                 | **Méthode** | **Endpoint**                        |
|-----------------------------|-------------|-------------------------------------|
| Authentication              | POST        | /api/auth/login/                    |
| Authentication              | POST        | /api/auth/logout/                   |
| Authentication              | GET         | /api/auth/me/                       |
| Authentication              | POST        | /api/auth/agent-tokens/             |
| Authentication              | DELETE      | /api/auth/agent-tokens/{id}/        |
| Character                   | GET         | /api/character/                     |
| Character                   | PATCH       | /api/character/                     |
| Character                   | PATCH       | /api/character/avatar/              |
| World                       | GET         | /api/world/territories/             |
| World                       | GET         | /api/world/territories/{id}/        |
| World                       | GET         | /api/world/progress/                |
| Quests                      | GET         | /api/quests/                        |
| Quests                      | POST        | /api/quests/                        |
| Quests                      | GET         | /api/quests/{id}/                   |
| Quests                      | PATCH       | /api/quests/{id}/                   |
| Quests                      | POST        | /api/quests/{id}/accept/            |
| Quests                      | POST        | /api/quests/{id}/complete/          |
| Quests                      | POST        | /api/quests/{id}/abandon/           |
| Quest proposals             | GET         | /api/quest-proposals/               |
| Quest proposals             | POST        | /api/quest-proposals/{id}/accept/   |
| Quest proposals             | POST        | /api/quest-proposals/{id}/reject/   |
| Progression                 | GET         | /api/progression/                   |
| Progression                 | GET         | /api/progression/history/           |
| Progression                 | GET         | /api/progression/skills/            |
| Economy                     | GET         | /api/economy/wallet/                |
| Economy                     | GET         | /api/economy/transactions/          |
| Economy                     | GET         | /api/economy/rewards/               |
| Economy                     | POST        | /api/economy/rewards/{id}/purchase/ |
| Seasons                     | GET         | /api/seasons/                       |
| Seasons                     | POST        | /api/seasons/                       |
| Seasons                     | GET         | /api/seasons/current/               |
| Journal                     | GET         | /api/journal/                       |
| Agents                      | GET         | /api/agent/context/                 |
| Agents                      | POST        | /api/agent/quest-proposals/         |
| Synchronisation (plus tard) | POST        | /api/sync/push/                     |
| Synchronisation (plus tard) | GET         | /api/sync/pull/                     |
| Synchronisation (plus tard) | GET         | /api/sync/status/                   |

## 16. Exigences non fonctionnelles

### 16.1. Performance

- chargement initial optimisé ;
- interface fluide sur ordinateur et mobile ;
- requêtes API paginées ;
- images optimisées ;
- animations légères ;
- faible consommation mémoire.

### 16.2. Compatibilité

- navigateurs modernes ;
- Android ;
- écrans mobiles ;
- ordinateurs modestes ;
- connexions Internet instables.

### 16.3. Fiabilité

- sauvegarde régulière ;
- journalisation ;
- transactions sécurisées ;
- synchronisation idempotente ;
- récupération après interruption.

### 16.4. Maintenabilité

- code modulaire ;
- tests automatisés ;
- documentation API ;
- configuration par environnement ;
- séparation des responsabilités ;
- gestion des migrations de base de données.

## 17. Périmètre du MVP et feuille de route

La première version doit être utilisable avant de chercher à construire un univers graphique très complexe.

### 17.1. Phases

| **Phase** | **Nom**              | **Contenu**                                                                                                                                                                                                                |
|-----------|----------------------|----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| 1         | LIFE CORE            | Authentification par jeton, création du personnage, pseudonyme, avatar minimaliste initial, six territoires, Dashboard, création et suivi des missions, XP, niveaux, historique, exécution locale et sauvegarde de la base |
| 2         | RPG SYSTEM           | Arbres de compétences, achievements, boutique, crédits, équipements, saisons, journal avancé                                                                                                                               |
| 3         | LIFE AI              | Connexion des agents de code (jeton à portée limitée, file de propositions, serveur MCP), rôles du Game Master, adaptation de la difficulté, bilan énergétique, analyse de progression, suggestions                        |
| 4         | IMMERSIVE EXPERIENCE | Carte interactive des territoires, personnalisation avancée de l'avatar, animations, notifications, application mobile Flutter avec synchronisation si nécessaire                                                          |

### 17.2. Roadmap de construction

Chaque étape fait l'objet d'une validation avant de passer à la suivante.

| **Étape** | **Travail**                          |
|-----------|--------------------------------------|
| 01        | Architecture et conception technique |
| 02        | Design system et maquettes           |
| 03        | Backend et base de données           |
| 04        | Moteur de progression                |
| 05        | Frontend web et dashboard            |
| 06        | Quêtes et territoires                |
| 07        | Exécution locale et sauvegarde       |
| 08        | Tests et stabilisation               |
| 09        | RPG System                           |
| 10        | Connexion des agents (API et MCP)    |
| 11        | Optimisation et lancement            |

## 18. Critères de validation du MVP

Le MVP est terminé lorsque les douze conditions suivantes sont remplies :

1.  Un utilisateur peut créer son personnage.
2.  Les six territoires sont accessibles.
3.  Il peut créer et gérer ses missions.
4.  Il peut terminer une mission.
5.  Une récompense XP est attribuée une seule fois.
6.  Le niveau est calculé correctement.
7.  L'historique conserve les événements.
8.  Une mission peut être utilisée hors connexion.
9.  Un agent connecté peut proposer une mission mais ne peut ni la valider ni attribuer d'XP.
10. Les données d'un utilisateur ne sont pas accessibles par un autre.
11. Les missions et les progrès restent conservés après redémarrage.
12. L'application se lance en local sur le PC et fonctionne sans connexion Internet.

Les tests couvrent les scénarios normaux, les erreurs réseau, les droits limités des agents et les tentatives de manipulation des récompenses.

## 19. Principes fondamentaux et définition du produit

### 19.1. Principes fondamentaux

LIFE RPG respecte définitivement les principes suivants :

1.  La progression ne se perd jamais à cause du repos.
2.  L'utilisateur reste maître de ses objectifs.
3.  L'IA propose, l'utilisateur décide.
4.  Le backend contrôle toutes les récompenses.
5.  Les accomplissements réels sont prioritaires sur les statistiques virtuelles.
6.  Le système reste utilisable hors connexion pour les opérations essentielles.
7.  La confidentialité est une priorité.
8.  L'application peut évoluer sans réécriture complète.
9.  La gamification ne devient jamais une source de culpabilité.
10. LIFE RPG reste un compagnon de vie sur le long terme.

### 19.2. Définition du produit final

LIFE RPG est une application personnelle de progression inspirée des jeux de rôle. Elle associe un univers virtuel de six territoires, un personnage personnalisable, un moteur de progression, un système de missions, une économie virtuelle, des compétences évolutives et des agents IA capables d'accompagner l'utilisateur dans ses objectifs. Le système est conçu autour d'une architecture locale, modulaire et extensible.

Document de référence pour les futures phases de conception, de prototypage, de développement et de validation.
