# Annexe B : Calendrier journalier (spécification)

Cette annexe ajoute au cahier des charges une vue calendrier : savoir ce qu'on fait aujourd'hui, cette semaine et ce mois-ci. Elle réutilise les missions existantes (Daily, Weekly, Main, Side, Boss) et n'ajoute aucune règle de gain.

## B.1 Principes

- Le calendrier **affiche et planifie**, il ne change ni l'XP, ni les crédits, ni les niveaux.
- **Jamais de punition** : un jour manqué reste neutre (pas de rouge, pas de « série brisée », pas de perte). Cela respecte la règle « aucune perte liée au repos ».
- Les missions récurrentes (Daily, Weekly) apparaissent **automatiquement** aux bonnes dates, grâce à leur période (`period_key`).
- Le calendrier est **local à l'application** et fonctionne hors ligne. Une lecture de Google Agenda pourra venir plus tard (lecture seule), pas dans cette version.
- Un agent peut **proposer** une date pour une mission, mais seul l'utilisateur la confirme.

## B.2 Vues

- **Aujourd'hui** : les missions du jour regroupées par territoire (par exemple prières et méditation en Sanctuaire intérieur, sport en Sanctuaire physique), les hebdomadaires en cours avec leur avancement de la semaine, les missions principales ou boss dont une étape est planifiée aujourd'hui, et le résumé de la journée (missions validées, XP gagnés).
- **Semaine** : sept jours en colonnes, avec les missions planifiées, les hebdomadaires et leur avancement. Glisser une mission sur un autre jour la replanifie.
- **Mois** : une grille où chaque jour est coloré selon l'activité (nombre de validations, couleur du territoire dominant). Un clic ouvre la vue du jour. Un compteur « jours actifs » est affiché, sans notion de série à protéger.
- **Saison** : une barre de 90 jours avec le jour courant et les repères de la saison (par exemple les paliers d'abonnés).

## B.3 Planification

- Champs optionnels sur une mission : `scheduled_date` (jour planifié), `scheduled_time` (heure ou plage : matin, après-midi, soir) et `due_date` (échéance souple).
- Une mission Daily s'affiche tous les jours de sa période d'activité sans qu'il faille la planifier. Une Weekly s'affiche toute la semaine ISO.
- Une échéance dépassée est affichée sobrement (« échéance passée »), sans pénalité, et la mission reste réalisable.
- Une étape d'une mission principale ou boss peut recevoir sa propre `scheduled_date`.

## B.4 API

- `GET /api/calendar/?from=AAAA-MM-JJ&to=AAAA-MM-JJ` : pour chaque jour de la plage, les missions attendues (récurrentes et planifiées), les validations réelles et le résumé (nombre de validations, XP, territoire dominant).
- `GET /api/calendar/today/` : la vue du jour, avec le résumé.
- `PATCH /api/quests/{id}/` accepte `scheduled_date`, `scheduled_time` et `due_date`.
- Côté agents : lecture du calendrier avec la portée Missions, et proposition d'une `scheduled_date` dans une proposition de mission. Un agent ne peut ni valider, ni replanifier une mission existante sans accord.

## B.5 Interface

Page « Calendrier » dans la navigation principale, avec le sélecteur Aujourd'hui / Semaine / Mois / Saison. Même identité visuelle que le reste (brand book) : couleurs de territoire pour les jours du mois, carte de mission réutilisée dans la vue du jour. Respect de `prefers-reduced-motion`. Utilisable sur petit écran.

## B.6 Critères d'acceptation

- Une Daily apparaît chaque jour et une Weekly toute la semaine, sans planification manuelle.
- Un jour sans validation n'affiche aucune alerte, aucune perte et aucune couleur d'échec.
- Replanifier une mission ne change ni l'XP, ni les crédits, ni le journal de progression (hors événement « replanifiée »).
- La vue mois colore correctement les jours validés, et un clic ouvre le bon jour.
- Les fuseaux horaires sont gérés : le jour est celui de l'utilisateur (Africa/Bamako par défaut, configurable).
- Un agent ne peut pas valider ni replanifier sans accord (test dédié).
