/** Types du contrat API de la phase 1. Le front ne calcule aucune règle de jeu. */

export type TerritoryCode =
  'KNOWLEDGE' | 'BODY' | 'CAREER' | 'TECHNOLOGY' | 'CREATION' | 'INNER_WORLD'

export type TerritoryStatCode = 'INT' | 'VIT' | 'INF' | 'TEC' | 'CRE' | 'SAG'
export type TerritoryState = 'DISCOVERY' | 'DEVELOPMENT' | 'MASTERY'
export type QuestType = 'DAILY' | 'WEEKLY' | 'MAIN' | 'SIDE' | 'BOSS'
export type Difficulty = 'TRIVIAL' | 'EASY' | 'MEDIUM' | 'HARD' | 'EPIC' | 'LEGENDARY'
export type Priority = 'LOW' | 'NORMAL' | 'HIGH'
export type QuestStatus =
  'AVAILABLE' | 'ACCEPTED' | 'IN_PROGRESS' | 'COMPLETED' | 'PAUSED' | 'ABANDONED'
export type ValidationMode = 'MANUAL' | 'PROOF'
export type QuestOrigin = 'USER' | 'AI'
export type CharacterClass = 'ARCHITECT' | 'CREATOR' | 'EXPLORER' | 'STRATEGIST' | 'INNOVATOR'
export type RankCode = 'INITIATE' | 'EXPLORER' | 'BUILDER' | 'SPECIALIST' | 'MASTER' | 'ARCHITECT'
export type Silhouette = 'A' | 'B' | 'C'

export type EventType =
  | 'QUEST_CREATED'
  | 'QUEST_UPDATED'
  | 'QUEST_ACCEPTED'
  | 'QUEST_STEP_DONE'
  | 'QUEST_STEP_UNDONE'
  | 'QUEST_COMPLETED'
  | 'QUEST_ABANDONED'
  | 'XP_AWARDED'
  | 'LEVEL_UP'
  | 'CREDITS_EARNED'
  | 'SKILL_POINTS_EARNED'
  | 'REST'
  | 'CHARACTER_UPDATED'

export type Rank = {
  code: RankCode
  label: string
}

export type TerritoryStat = {
  id: number
  code: TerritoryCode
  stat_code: TerritoryStatCode
  name: string
  english: string
  place: string
  domain: string
  color: string
  total_xp: number
  stat: number
  stat_display: number
  state: TerritoryState
  active_quests: number
}

export type Avatar = {
  silhouette: Silhouette
  color: string
  accent: string
}

export type SkillPoints = {
  available: number
  spent: number
}

export type Character = {
  pseudonym: string
  bio: string
  character_class: CharacterClass
  is_onboarded: boolean
  level: number
  xp_in_level: number
  xp_required: number
  total_xp: number
  rank: Rank
  credits: number
  skill_points: SkillPoints
  avatar: Avatar
  stats: TerritoryStat[]
}

export type QuestStep = {
  id: number
  title: string
  order: number
  is_required: boolean
  is_done: boolean
  done_at: string | null
}

export type Quest = {
  id: number
  uuid: string
  title: string
  description: string
  territory: TerritoryCode
  quest_type: QuestType
  difficulty: Difficulty
  priority: Priority
  estimated_minutes: number
  start_date: string | null
  due_date: string | null
  xp_reward: number
  credit_reward: number
  validation_mode: ValidationMode
  origin: QuestOrigin
  status: QuestStatus
  skill_branch: string
  is_recurring: boolean
  period_key: string
  completed_this_period: boolean
  completions_count: number
  steps: QuestStep[]
  created_at: string
  updated_at: string
  completed_at: string | null
}

export type CompletionOutcome = {
  xp: number
  credits: number
  territory: TerritoryCode
  level_before: number
  level_after: number
  levels_gained: number
  skill_points_gained: number
  message: string
  level_message: string | null
}

export type CompletionResult = {
  quest: Quest
  result: CompletionOutcome
}

export type JournalEntry = {
  uuid: string
  event_type: EventType
  actor: string
  message: string
  payload: Record<string, unknown>
  quest: number | null
  created_at: string
}

export type Paginated<T> = {
  count: number
  next: string | null
  previous: string | null
  results: T[]
}

export type GameSettings = {
  xp_by_difficulty: Record<Difficulty, number>
  credits_per_xp: number
  skill_points_per_level: number
  territory_stat_divisor: number
  territory_stat_display_max: number
  territory_state_thresholds: Record<TerritoryState, number>
  ranks: { min_level: number; code: RankCode; label: string }[]
}

export type QuestInput = {
  title: string
  description?: string
  territory: TerritoryCode
  quest_type: QuestType
  difficulty: Difficulty
  priority?: Priority
  estimated_minutes?: number
  start_date?: string | null
  due_date?: string | null
  validation_mode?: ValidationMode
  skill_branch?: string
  steps?: { title: string; is_required: boolean }[]
}

export type AuthUser = {
  id: number
  username: string
}

export type LoginResponse = {
  token: string
  user: AuthUser
}

export type WorldProgress = {
  level: number
  xp_in_level: number
  xp_required: number
  total_xp: number
  rank: Rank
  territories: TerritoryStat[]
}

export type Progression = Omit<WorldProgress, 'territories'> & {
  skill_points: SkillPoints
}

export type XpTransaction = {
  uuid: string
  amount: number
  territory: TerritoryCode
  level_before: number
  level_after: number
  quest_title: string
  created_at: string
}

export type JournalFilters = {
  event_type?: EventType
}

export type QuestFilters = {
  territory?: TerritoryCode
  quest_type?: QuestType
  status?: QuestStatus | QuestStatus[]
  difficulty?: Difficulty
  today?: boolean
}

export type CharacterUpdate = Partial<
  Pick<Character, 'pseudonym' | 'bio' | 'character_class' | 'is_onboarded'>
>

export type QuestUpdate = Partial<QuestInput>
