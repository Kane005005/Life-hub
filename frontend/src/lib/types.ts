/** Types du contrat API. Le front ne calcule aucune règle de jeu. */

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

export type SkillState = 'LOCKED' | 'UNLOCKABLE' | 'UNLOCKED'
export type ShopCategory = 'REWARD' | 'ARTIFACT'
export type EquipmentSlot = 'AURA' | 'FRAME' | 'EMBLEM'
export type SeasonStatus = 'ACTIVE' | 'CLOSED'

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
  | 'SKILL_UNLOCKED'
  | 'ACHIEVEMENT_UNLOCKED'
  | 'REWARD_PURCHASED'
  | 'ITEM_EQUIPPED'
  | 'ITEM_UNEQUIPPED'
  | 'SEASON_STARTED'
  | 'SEASON_CLOSED'
  | 'SEASON_UPDATED'
  | 'TITLE_CHANGED'
  | 'AGENT_TOKEN_CREATED'
  | 'AGENT_TOKEN_REVOKED'
  | 'AGENT_CONTEXT_READ'
  | 'QUEST_PROPOSED'
  | 'PROPOSAL_ACCEPTED'
  | 'PROPOSAL_REJECTED'
  | 'PROPOSAL_UPDATED'
  | 'ENERGY_CHECKIN'

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

export type ArtifactVisual = {
  color?: string
  style?: 'silver' | 'double' | string
  sign?: string
}

export type ShopItem = {
  id: number
  name: string
  description: string
  category: ShopCategory
  slot: EquipmentSlot | null
  cost: number
  is_available: boolean
  is_custom: boolean
  visual: ArtifactVisual | null
  owned: boolean
  equipped: boolean
  purchases_count: number
}

export type CharacterEquipment = Record<EquipmentSlot, ShopItem | null>

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
  active_title?: string | null
  titles?: string[]
  equipment?: CharacterEquipment
}

export type QuestStep = {
  id: number
  title: string
  order: number
  is_required: boolean
  is_done: boolean
  done_at: string | null
  scheduled_date: string | null
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
  scheduled_date: string | null
  scheduled_time: string
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

export type UnlockedAchievement = {
  code: string
  label: string
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
  achievements?: UnlockedAchievement[]
}

export type CompletionResult = {
  quest: Quest
  result: CompletionOutcome
}

/* ---------- Phase 4b — Calendrier ---------- */

export type CalendarEntryKind = 'DAILY' | 'WEEKLY' | 'SCHEDULED' | 'STEP' | 'DUE'

export type CalendarQuest = {
  id: number
  title: string
  quest_type: QuestType
  difficulty: Difficulty
  territory: TerritoryCode
  status: QuestStatus
  xp_reward: number
  credit_reward: number
  scheduled_date: string | null
  scheduled_time: string
  due_date: string | null
}

export type CalendarStep = {
  id: number
  title: string
  is_done: boolean
  scheduled_date?: string | null
}

export type CalendarEntry = {
  kind: CalendarEntryKind
  quest: CalendarQuest
  step: CalendarStep | null
  period_key: string
  done: boolean
  due_passed: boolean
}

export type CalendarCompletion = {
  quest_id: number
  title: string
  territory: TerritoryCode
  quest_type: QuestType
  xp: number
  credits: number
  completed_at: string
}

export type CalendarSummary = {
  completions: number
  xp: number
  credits: number
  dominant_territory: TerritoryCode | null
}

export type CalendarDay = {
  date: string
  is_today: boolean
  iso_week: string
  entries: CalendarEntry[]
  completions: CalendarCompletion[]
  summary: CalendarSummary
}

export type CalendarWeeklyProgress = {
  quest: CalendarQuest
  done: boolean
  days_left_in_week: number
}

export type CalendarToday = CalendarDay & {
  time_zone: string
  weekly: CalendarWeeklyProgress[]
}

export type CalendarRange = {
  from: string
  to: string
  today: string
  time_zone: string
  days: CalendarDay[]
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
  scheduled_date?: string | null
  scheduled_time?: string
  due_date?: string | null
  validation_mode?: ValidationMode
  skill_branch?: string
  steps?: { title: string; is_required: boolean }[]
}

export type AuthUser = {
  id: number
  username: string
  time_zone: string
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
  event_type?: EventType | EventType[]
  date_from?: string
  date_to?: string
  territory?: TerritoryCode
  q?: string
}

export type QuestFilters = {
  territory?: TerritoryCode
  quest_type?: QuestType
  status?: QuestStatus | QuestStatus[]
  difficulty?: Difficulty
  today?: boolean
}

export type CharacterUpdate = Partial<
  Pick<Character, 'pseudonym' | 'bio' | 'character_class' | 'is_onboarded' | 'active_title'>
>

export type QuestUpdate = Partial<QuestInput>

export type SkillNode = {
  code: string
  name: string
  tier: number
  cost: number
  requires: string[]
  min_territory_stat: number
  min_validated_quests: number
  state: SkillState
  unlocked_at: string | null
  missing: string[]
}

export type SkillBranch = {
  code: string
  name: string
  validated_quests: number
  skills: SkillNode[]
}

export type SkillTree = {
  territory: TerritoryCode
  name: string
  color: string
  stat: number
  branches: SkillBranch[]
}

export type SkillUnlockResult = {
  skill: SkillNode
  skill_points: SkillPoints
  message: string
}

export type SkillPointTransaction = {
  uuid: string
  amount: number
  kind: string
  reason: string
  balance_after: number
  created_at: string
}

export type UnlockedSkill = {
  code: string
  name: string
  territory: TerritoryCode
  unlocked_at: string
}

export type SkillsSummary = {
  available: number
  spent: number
  unlocked: UnlockedSkill[]
  transactions: SkillPointTransaction[]
}

export type Achievement = {
  code: string
  name: string
  label: string
  description: string
  unlocked: boolean
  unlocked_at: string | null
}

export type RewardInput = {
  name: string
  description?: string
  cost: number
  is_available?: boolean
}

export type PurchaseResult = {
  item: ShopItem
  credits: number
  message: string
}

export type PurchaseRecord = {
  uuid: string
  item_name: string
  cost: number
  purchased_at: string
}

export type Inventory = {
  items: ShopItem[]
  purchases: PurchaseRecord[]
}

export type WalletTransaction = {
  uuid: string
  amount: number
  kind: string
  reason: string
  balance_after: number
  created_at: string
}

export type SeasonObjective = {
  id: number
  title: string
  is_main: boolean
  is_done: boolean
  order: number
}

export type SeasonSummary = {
  xp_total: number
  xp_by_territory: Partial<Record<TerritoryCode, number>>
  completions: number
  completions_by_type: Record<string, number>
  levels_gained: number
  objectives_done: number
  objectives_total: number
  achievements_unlocked: string[]
  skills_unlocked: string[]
}

export type Season = {
  id: number
  number: number
  name: string
  theme: string
  status: SeasonStatus
  start_date: string
  end_date: string
  days_left: number
  closed_at: string | null
  priority_territories: TerritoryCode[]
  objectives: SeasonObjective[]
  summary: SeasonSummary
}

export type SeasonObjectiveInput = {
  title: string
  is_main: boolean
  is_done?: boolean
}

export type SeasonInput = {
  name: string
  theme?: string
  start_date?: string
  priority_territories?: TerritoryCode[]
  objectives?: SeasonObjectiveInput[]
}

export type SeasonUpdate = Partial<SeasonInput>

export type SeasonCloseResult = {
  closed: Season
  next: Season
}

export type JournalSummary = {
  period: 'week' | 'month'
  from: string
  to: string
  xp_by_day: { date: string; xp: number }[]
  xp_by_territory: Partial<Record<TerritoryCode, number>>
  completions: number
  rests: number
  achievements: number
  skills: number
}

/* ---------- Phase 3 — LIFE AI ---------- */

export type AgentScope =
  | 'profile'
  | 'progression'
  | 'quests'
  | 'skills'
  | 'seasons'
  | 'journal'
  | 'energy'
  | 'body'
  | 'proposals'

export type AgentToken = {
  id: number
  name: string
  prefix: string
  scopes: AgentScope[]
  created_at: string
  last_used_at: string | null
  revoked_at: string | null
  is_active: boolean
  /** Présent une seule fois, à la création. */
  token?: string
}

export type AgentTokenInput = {
  name: string
  scopes?: AgentScope[]
}

export type ProposalStatus = 'PENDING' | 'ACCEPTED' | 'REJECTED'

export type ProposalStep = {
  title: string
  is_required: boolean
}

export type QuestProposal = {
  id: number
  uuid: string
  agent_name: string
  status: ProposalStatus
  title: string
  description: string
  rationale: string
  territory: TerritoryCode
  quest_type: QuestType
  difficulty: Difficulty
  priority: Priority
  estimated_minutes: number
  due_date: string | null
  scheduled_date: string | null
  skill_branch: string
  steps: ProposalStep[]
  /** Valeur indicative calculée par l'API. Aucune XP n'est attribuée à l'acceptation. */
  xp_preview: number
  quest: number | null
  decided_at: string | null
  reject_reason: string
  created_at: string
}

export type ProposalUpdate = Partial<
  Pick<
    QuestProposal,
    | 'title'
    | 'description'
    | 'territory'
    | 'quest_type'
    | 'difficulty'
    | 'priority'
    | 'estimated_minutes'
    | 'due_date'
    | 'scheduled_date'
    | 'skill_branch'
    | 'steps'
  >
>

export type AcceptProposalResult = {
  proposal: QuestProposal
  quest: Quest
}

export type EnergyLevel = 1 | 2 | 3 | 4 | 5

export type EnergyCheckIn = {
  id: number
  level: EnergyLevel
  label: string
  note: string
  date: string
  created_at: string
}

export type InsightSuggestionKind = 'RECOVERY' | 'OVERLOAD' | 'BALANCE' | 'OVERDUE' | 'MOMENTUM'

export type InsightSuggestion = {
  kind: InsightSuggestionKind
  message: string
}

export type NeglectedTerritory = {
  code: TerritoryCode
  days_since_xp: number | null
}

export type Insights = {
  generated_at: string
  energy: Pick<EnergyCheckIn, 'level' | 'label' | 'date'> | null
  load: {
    active_quests: number
    hard_quests: number
    overdue: number
  }
  neglected_territories: NeglectedTerritory[]
  suggestions: InsightSuggestion[]
}
