import { TERRITORIES } from '../tokens'
import type { TerritoryCode as StatCode, Territory as TokenTerritory } from '../tokens'
import type {
  AgentScope,
  CharacterClass,
  Difficulty,
  EnergyLevel,
  EquipmentSlot,
  EventType,
  InsightSuggestionKind,
  Priority,
  ProposalStatus,
  QuestStatus,
  QuestType,
  SeasonStatus,
  ShopCategory,
  Silhouette,
  SkillState,
  TerritoryCode,
  TerritoryState,
} from './types'

export const TERRITORY_LABELS = {
  KNOWLEDGE: 'Savoir',
  BODY: 'Corps',
  CAREER: 'Carrière',
  TECHNOLOGY: 'Technologie',
  CREATION: 'Création',
  INNER_WORLD: 'Monde intérieur',
} satisfies Record<TerritoryCode, string>

export const CALENDAR_VIEW_LABELS = {
  jour: "Aujourd'hui",
  semaine: 'Semaine',
  mois: 'Mois',
  saison: 'Saison',
} as const

export type CalendarView = keyof typeof CALENDAR_VIEW_LABELS

export const CALENDAR_VIEWS = Object.keys(CALENDAR_VIEW_LABELS) as CalendarView[]

export const CALENDAR_ENTRY_LABELS = {
  DAILY: 'Quotidienne',
  WEEKLY: 'Hebdomadaire',
  SCHEDULED: 'Planifiée',
  STEP: 'Étape',
  DUE: 'Échéance',
} as const

export const SCHEDULED_TIME_LABELS: Record<string, string> = {
  MORNING: 'Matin',
  AFTERNOON: 'Après-midi',
  EVENING: 'Soir',
}

/** Libellé d'un créneau planifié : plage nommée traduite, heure « HH:MM » telle quelle. */
export function scheduledTimeLabel(value: string): string {
  return SCHEDULED_TIME_LABELS[value] ?? value
}

export const QUEST_TYPE_LABELS = {
  DAILY: 'Quotidienne',
  WEEKLY: 'Hebdomadaire',
  MAIN: 'Principale',
  SIDE: 'Secondaire',
  BOSS: 'Boss',
} satisfies Record<QuestType, string>

export const DIFFICULTY_LABELS = {
  TRIVIAL: 'Très facile',
  EASY: 'Facile',
  MEDIUM: 'Moyenne',
  HARD: 'Difficile',
  EPIC: 'Épique',
  LEGENDARY: 'Légendaire',
} satisfies Record<Difficulty, string>

export const PRIORITY_LABELS = {
  LOW: 'Faible',
  NORMAL: 'Normale',
  HIGH: 'Haute',
} satisfies Record<Priority, string>

export const STATUS_LABELS = {
  AVAILABLE: 'Disponible',
  ACCEPTED: 'Acceptée',
  IN_PROGRESS: 'En cours',
  COMPLETED: 'Terminée',
  PAUSED: 'En pause',
  ABANDONED: 'Abandonnée',
} satisfies Record<QuestStatus, string>

export const EVENT_TYPE_LABELS = {
  QUEST_CREATED: 'Mission créée',
  QUEST_UPDATED: 'Mission modifiée',
  QUEST_ACCEPTED: 'Mission acceptée',
  QUEST_STEP_DONE: 'Étape terminée',
  QUEST_STEP_UNDONE: 'Étape rouverte',
  QUEST_COMPLETED: 'Mission validée',
  QUEST_ABANDONED: 'Mission abandonnée',
  XP_AWARDED: 'XP gagnée',
  LEVEL_UP: 'Niveau gagné',
  CREDITS_EARNED: 'Crédits gagnés',
  SKILL_POINTS_EARNED: 'Point de compétence gagné',
  REST: 'Repos',
  CHARACTER_UPDATED: 'Personnage modifié',
  SKILL_UNLOCKED: 'Compétence débloquée',
  ACHIEVEMENT_UNLOCKED: 'Succès débloqué',
  REWARD_PURCHASED: 'Récompense obtenue',
  ITEM_EQUIPPED: 'Objet équipé',
  ITEM_UNEQUIPPED: 'Objet retiré',
  SEASON_STARTED: 'Saison commencée',
  SEASON_CLOSED: 'Saison terminée',
  SEASON_UPDATED: 'Saison modifiée',
  TITLE_CHANGED: 'Titre modifié',
  AGENT_TOKEN_CREATED: 'Jeton d’agent créé',
  AGENT_TOKEN_REVOKED: 'Jeton d’agent révoqué',
  AGENT_CONTEXT_READ: 'Contexte lu par un agent',
  QUEST_PROPOSED: 'Mission proposée',
  PROPOSAL_ACCEPTED: 'Proposition acceptée',
  PROPOSAL_REJECTED: 'Proposition refusée',
  PROPOSAL_UPDATED: 'Proposition modifiée',
  ENERGY_CHECKIN: 'Bilan énergétique enregistré',
} satisfies Record<EventType, string>

export const STATE_LABELS = {
  DISCOVERY: 'Découverte',
  DEVELOPMENT: 'Développement',
  MASTERY: 'Maîtrise',
} satisfies Record<TerritoryState, string>

export const SKILL_STATE_LABELS = {
  LOCKED: 'Verrouillée',
  UNLOCKABLE: 'Débloquable',
  UNLOCKED: 'Débloquée',
} satisfies Record<SkillState, string>

export const SHOP_CATEGORY_LABELS = {
  REWARD: 'Récompense',
  ARTIFACT: 'Objet',
} satisfies Record<ShopCategory, string>

export const SLOT_LABELS = {
  AURA: 'Aura',
  FRAME: 'Cadre',
  EMBLEM: 'Emblème',
} satisfies Record<EquipmentSlot, string>

export const SEASON_STATUS_LABELS = {
  ACTIVE: 'En cours',
  CLOSED: 'Terminée',
} satisfies Record<SeasonStatus, string>

export const CLASS_LABELS = {
  ARCHITECT: 'Architecte',
  CREATOR: 'Créateur',
  EXPLORER: 'Explorateur',
  STRATEGIST: 'Stratège',
  INNOVATOR: 'Innovateur',
} satisfies Record<CharacterClass, string>

export type TerritoryLink = {
  statCode: StatCode
  name: string
  glyph: string
  color: string
}

const byStatCode = new Map<StatCode, TokenTerritory>(TERRITORIES.map((item) => [item.code, item]))

function link(statCode: StatCode): TerritoryLink {
  const token = byStatCode.get(statCode)
  if (!token) {
    throw new Error(`Territoire inconnu : ${statCode}.`)
  }
  return { statCode, name: token.name, glyph: token.glyph, color: token.hex }
}

/** Relie les codes API aux codes de statistique et aux glyphes des tokens. */
export const TERRITORY_BY_CODE = {
  KNOWLEDGE: link('INT'),
  BODY: link('VIT'),
  CAREER: link('INF'),
  TECHNOLOGY: link('TEC'),
  CREATION: link('CRE'),
  INNER_WORLD: link('SAG'),
} satisfies Record<TerritoryCode, TerritoryLink>

export const TERRITORY_CODES = Object.keys(TERRITORY_LABELS) as TerritoryCode[]
export const QUEST_TYPE_CODES = Object.keys(QUEST_TYPE_LABELS) as QuestType[]
export const DIFFICULTY_CODES = Object.keys(DIFFICULTY_LABELS) as Difficulty[]
export const PRIORITY_CODES = Object.keys(PRIORITY_LABELS) as Priority[]
export const STATUS_CODES = Object.keys(STATUS_LABELS) as QuestStatus[]
export const EVENT_TYPE_CODES = Object.keys(EVENT_TYPE_LABELS) as EventType[]
export const CLASS_CODES = Object.keys(CLASS_LABELS) as CharacterClass[]

export const SILHOUETTES: readonly Silhouette[] = ['A', 'B', 'C']

export const AVATAR_PALETTE = [
  '#2FD08B',
  '#6F94B5',
  '#D0A94A',
  '#3FB6C6',
  '#E0806F',
  '#A08DD0',
  '#EDE9DF',
  '#B9BEC2',
] as const

export function territoryLabel(code: TerritoryCode): string {
  return TERRITORY_LABELS[code] ?? code
}

/* ---------- Phase 3 — LIFE AI ---------- */

export const AGENT_SCOPE_LABELS = {
  profile: 'Profil',
  progression: 'Progression',
  quests: 'Missions',
  skills: 'Compétences',
  seasons: 'Saisons',
  journal: 'Journal',
  energy: 'Énergie',
  body: 'Corps',
  proposals: 'Propositions',
} satisfies Record<AgentScope, string>

export const AGENT_SCOPE_DESCRIPTIONS = {
  profile: 'Pseudonyme, classe, niveau, rang et titre actif.',
  progression: 'XP, niveaux, statistiques et analyse de progression.',
  quests: 'Missions actives et récemment validées.',
  skills: 'Arbres et compétences débloquées, en lecture seule.',
  seasons: 'Saison active, objectifs et bilan.',
  journal: 'Les 50 derniers événements.',
  energy: 'Les 7 derniers bilans énergétiques.',
  body: 'Données du corps : privées par défaut.',
  proposals: 'Permet de proposer des missions, jamais de les valider.',
} satisfies Record<AgentScope, string>

export const AGENT_SCOPE_CODES = Object.keys(AGENT_SCOPE_LABELS) as AgentScope[]
export const DEFAULT_AGENT_SCOPES: readonly AgentScope[] = ['profile', 'progression', 'quests']

export const PROPOSAL_STATUS_LABELS = {
  PENDING: 'En attente',
  ACCEPTED: 'Acceptée',
  REJECTED: 'Refusée',
} satisfies Record<ProposalStatus, string>

export const PROPOSAL_STATUS_CODES = Object.keys(PROPOSAL_STATUS_LABELS) as ProposalStatus[]

export const ENERGY_LEVEL_LABELS = {
  1: 'Très faible',
  2: 'Faible',
  3: 'Moyenne',
  4: 'Bonne',
  5: 'Excellente',
} satisfies Record<EnergyLevel, string>

export const ENERGY_LEVELS: readonly EnergyLevel[] = [1, 2, 3, 4, 5]

export const INSIGHT_KIND_LABELS = {
  RECOVERY: 'Récupération',
  OVERLOAD: 'Surcharge',
  BALANCE: 'Équilibre',
  OVERDUE: 'Échéance',
  MOMENTUM: 'Élan',
} satisfies Record<InsightSuggestionKind, string>
