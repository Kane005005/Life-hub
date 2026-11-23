import { TERRITORIES } from '../tokens'
import type { TerritoryCode as StatCode, Territory as TokenTerritory } from '../tokens'
import type {
  CharacterClass,
  Difficulty,
  EventType,
  Priority,
  QuestStatus,
  QuestType,
  Silhouette,
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
} satisfies Record<EventType, string>

export const STATE_LABELS = {
  DISCOVERY: 'Découverte',
  DEVELOPMENT: 'Développement',
  MASTERY: 'Maîtrise',
} satisfies Record<TerritoryState, string>

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
