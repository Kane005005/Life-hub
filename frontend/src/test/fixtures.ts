import type {
  Achievement,
  AgentToken,
  CalendarDay,
  CalendarEntry,
  CalendarEntryKind,
  CalendarQuest,
  CalendarRange,
  CalendarToday,
  Character,
  CompletionResult,
  EnergyCheckIn,
  Insights,
  Quest,
  QuestProposal,
  ProposalStatus,
  Season,
  ShopItem,
  SkillNode,
  SkillTree,
  TerritoryStat,
} from '../lib/types'

export function makeTerritory(overrides: Partial<TerritoryStat> = {}): TerritoryStat {
  return {
    id: 3,
    code: 'TECHNOLOGY',
    stat_code: 'TEC',
    name: 'Technologie',
    english: 'TECHNOLOGY',
    place: 'Atelier',
    domain: 'Outils et systèmes',
    color: '#3FB6C6',
    total_xp: 120,
    stat: 42,
    stat_display: 42,
    state: 'DEVELOPMENT',
    active_quests: 2,
    ...overrides,
  }
}

export function makeQuest(overrides: Partial<Quest> = {}): Quest {
  return {
    id: 17,
    uuid: 'quest-17',
    title: 'Réviser le contrat API',
    description: '',
    territory: 'TECHNOLOGY',
    quest_type: 'DAILY',
    difficulty: 'EASY',
    priority: 'NORMAL',
    estimated_minutes: 30,
    start_date: null,
    scheduled_date: null,
    scheduled_time: '',
    due_date: null,
    xp_reward: 25,
    credit_reward: 5,
    validation_mode: 'MANUAL',
    origin: 'USER',
    status: 'IN_PROGRESS',
    skill_branch: 'programming',
    is_recurring: false,
    period_key: '',
    completed_this_period: false,
    completions_count: 0,
    steps: [
      {
        id: 51,
        title: 'Lire le chapitre 4',
        order: 1,
        is_required: true,
        is_done: false,
        done_at: null,
        scheduled_date: null,
      },
    ],
    created_at: '2026-11-20T10:00:00Z',
    updated_at: '2026-11-20T10:00:00Z',
    completed_at: null,
    ...overrides,
  }
}

export function makeCharacter(overrides: Partial<Character> = {}): Character {
  return {
    pseudonym: 'Kane',
    bio: '',
    character_class: 'ARCHITECT',
    is_onboarded: true,
    level: 2,
    xp_in_level: 20,
    xp_required: 100,
    total_xp: 120,
    rank: { code: 'INITIATE', label: 'Initié' },
    credits: 24,
    skill_points: { available: 1, spent: 0 },
    avatar: { silhouette: 'A', color: '#2FD08B', accent: '#EDE9DF' },
    stats: [makeTerritory()],
    ...overrides,
  }
}

export function makeCompletionResult(overrides: Partial<CompletionResult> = {}): CompletionResult {
  return {
    quest: makeQuest({ status: 'COMPLETED' }),
    result: {
      xp: 25,
      credits: 5,
      territory: 'TECHNOLOGY',
      level_before: 2,
      level_after: 3,
      levels_gained: 1,
      skill_points_gained: 1,
      message: 'Mission validée. +25 XP.',
      level_message: 'Tu passes niveau 3.',
      achievements: [],
    },
    ...overrides,
  }
}

export function makeCalendarQuest(overrides: Partial<CalendarQuest> = {}): CalendarQuest {
  return {
    id: 17,
    title: 'Réviser le contrat API',
    quest_type: 'DAILY',
    difficulty: 'EASY',
    territory: 'TECHNOLOGY',
    status: 'IN_PROGRESS',
    xp_reward: 25,
    credit_reward: 5,
    scheduled_date: null,
    scheduled_time: '',
    due_date: null,
    ...overrides,
  }
}

export function makeCalendarEntry(
  kind: CalendarEntryKind = 'DAILY',
  overrides: Partial<CalendarEntry> = {},
): CalendarEntry {
  const questType = kind === 'DAILY' || kind === 'WEEKLY' ? kind : 'MAIN'
  return {
    kind,
    quest: makeCalendarQuest({ quest_type: questType }),
    step: null,
    period_key: '2026-11-24',
    done: false,
    due_passed: false,
    ...overrides,
  }
}

export function makeCalendarDay(
  date: string = todayIso(),
  overrides: Partial<CalendarDay> = {},
): CalendarDay {
  return {
    date,
    is_today: true,
    iso_week: '2026-W48',
    entries: [],
    completions: [],
    summary: { completions: 0, xp: 0, credits: 0, dominant_territory: null },
    ...overrides,
  }
}

export function makeCalendarRange(
  from: string,
  to: string,
  days: CalendarDay[],
  overrides: Partial<CalendarRange> = {},
): CalendarRange {
  return {
    from,
    to,
    today: days.find((day) => day.is_today)?.date ?? from,
    time_zone: 'Africa/Bamako',
    days,
    ...overrides,
  }
}

export function makeCalendarToday(
  day: CalendarDay = makeCalendarDay(),
  overrides: Partial<CalendarToday> = {},
): CalendarToday {
  return {
    ...day,
    is_today: true,
    time_zone: 'Africa/Bamako',
    weekly: [],
    ...overrides,
  }
}

export function makeSkillNode(overrides: Partial<SkillNode> = {}): SkillNode {
  return {
    code: 'knowledge.reading.t1',
    name: 'Lecteur régulier',
    tier: 1,
    cost: 1,
    requires: [],
    min_territory_stat: 0,
    min_validated_quests: 0,
    state: 'UNLOCKED',
    unlocked_at: '2026-11-20T10:00:00Z',
    missing: [],
    ...overrides,
  }
}

export function makeSkillTree(overrides: Partial<SkillTree> = {}): SkillTree {
  return {
    territory: 'KNOWLEDGE',
    name: 'Savoir',
    color: '#6F94B5',
    stat: 20,
    branches: [
      {
        code: 'reading',
        name: 'Lecture & culture',
        validated_quests: 4,
        skills: [
          makeSkillNode(),
          makeSkillNode({
            code: 'knowledge.reading.t2',
            name: 'Lecteur critique',
            tier: 2,
            state: 'UNLOCKABLE',
            unlocked_at: null,
            requires: ['knowledge.reading.t1'],
            min_territory_stat: 15,
            min_validated_quests: 3,
          }),
          makeSkillNode({
            code: 'knowledge.reading.t3',
            name: 'Fiches et synthèses',
            tier: 3,
            cost: 2,
            state: 'LOCKED',
            unlocked_at: null,
            requires: ['knowledge.reading.t2'],
            min_territory_stat: 30,
            min_validated_quests: 8,
            missing: ['Débloque d’abord Lecteur critique.'],
          }),
          makeSkillNode({
            code: 'knowledge.reading.t4',
            name: 'Érudit',
            tier: 4,
            cost: 3,
            state: 'LOCKED',
            unlocked_at: null,
            requires: ['knowledge.reading.t3'],
            min_territory_stat: 50,
            min_validated_quests: 15,
            missing: ['Débloque d’abord Fiches et synthèses.'],
          }),
        ],
      },
      {
        code: 'languages',
        name: 'Langues',
        validated_quests: 1,
        skills: [
          makeSkillNode({
            code: 'knowledge.languages.t1',
            name: 'Bases solides',
            tier: 1,
            state: 'UNLOCKABLE',
            unlocked_at: null,
          }),
          makeSkillNode({
            code: 'knowledge.languages.t2',
            name: 'Conversation courante',
            tier: 2,
            state: 'LOCKED',
            unlocked_at: null,
            missing: ['Débloque d’abord Bases solides.'],
          }),
          makeSkillNode({
            code: 'knowledge.languages.t3',
            name: 'Lecture et écriture avancées',
            tier: 3,
            cost: 2,
            state: 'LOCKED',
            unlocked_at: null,
            missing: ['Débloque d’abord Conversation courante.'],
          }),
          makeSkillNode({
            code: 'knowledge.languages.t4',
            name: 'Bilingue',
            tier: 4,
            cost: 3,
            state: 'LOCKED',
            unlocked_at: null,
            missing: ['Débloque d’abord Lecture et écriture avancées.'],
          }),
        ],
      },
      {
        code: 'research',
        name: 'Recherche & méthode',
        validated_quests: 0,
        skills: [
          makeSkillNode({
            code: 'knowledge.research.t1',
            name: 'Curiosité méthodique',
            tier: 1,
            state: 'UNLOCKABLE',
            unlocked_at: null,
          }),
          makeSkillNode({
            code: 'knowledge.research.t2',
            name: 'Sources fiables',
            tier: 2,
            state: 'LOCKED',
            unlocked_at: null,
            missing: ['Débloque d’abord Curiosité méthodique.'],
          }),
          makeSkillNode({
            code: 'knowledge.research.t3',
            name: 'Analyse et rédaction',
            tier: 3,
            cost: 2,
            state: 'LOCKED',
            unlocked_at: null,
            missing: ['Débloque d’abord Sources fiables.'],
          }),
          makeSkillNode({
            code: 'knowledge.research.t4',
            name: 'Chercheur autonome',
            tier: 4,
            cost: 3,
            state: 'LOCKED',
            unlocked_at: null,
            missing: ['Débloque d’abord Analyse et rédaction.'],
          }),
        ],
      },
    ],
    ...overrides,
  }
}

export function makeAchievement(overrides: Partial<Achievement> = {}): Achievement {
  return {
    code: 'FIRST_QUEST',
    name: 'First Quest',
    label: 'Premier pas',
    description: 'Valider une première mission.',
    unlocked: true,
    unlocked_at: '2026-11-20T10:00:00Z',
    ...overrides,
  }
}

export function makeShopItem(overrides: Partial<ShopItem> = {}): ShopItem {
  return {
    id: 4,
    name: "Aura d'émeraude",
    description: 'Un halo discret.',
    category: 'ARTIFACT',
    slot: 'AURA',
    cost: 150,
    is_available: true,
    is_custom: false,
    visual: { color: '#2FD08B' },
    owned: false,
    equipped: false,
    purchases_count: 0,
    ...overrides,
  }
}

export function todayIso(): string {
  const now = new Date()
  const month = String(now.getMonth() + 1).padStart(2, '0')
  const day = String(now.getDate()).padStart(2, '0')
  return `${now.getFullYear()}-${month}-${day}`
}

export function makeProposal(overrides: Partial<QuestProposal> = {}): QuestProposal {
  const status: ProposalStatus = overrides.status ?? 'PENDING'
  return {
    id: 7,
    uuid: 'proposal-7',
    agent_name: 'Claude Code',
    status,
    title: 'Lire 20 pages',
    description: '',
    rationale: "Ton territoire Savoir n'a pas bougé depuis 12 jours.",
    territory: 'KNOWLEDGE',
    quest_type: 'DAILY',
    difficulty: 'EASY',
    priority: 'NORMAL',
    estimated_minutes: 20,
    due_date: null,
    scheduled_date: null,
    skill_branch: 'reading',
    steps: [{ title: 'Ouvrir le livre', is_required: true }],
    xp_preview: 15,
    quest: status === 'ACCEPTED' ? 12 : null,
    decided_at: status === 'PENDING' ? null : '2026-11-22T10:00:00Z',
    reject_reason: '',
    created_at: '2026-11-23T08:00:00Z',
    ...overrides,
  }
}

export function makeAgentToken(overrides: Partial<AgentToken> = {}): AgentToken {
  return {
    id: 3,
    name: 'Claude Code',
    prefix: 'lra_a1b2',
    scopes: ['profile', 'progression', 'quests', 'proposals'],
    created_at: '2026-11-20T10:00:00Z',
    last_used_at: null,
    revoked_at: null,
    is_active: true,
    ...overrides,
  }
}

export function makeEnergyCheckIn(overrides: Partial<EnergyCheckIn> = {}): EnergyCheckIn {
  return {
    id: 1,
    level: 2,
    label: 'Faible',
    note: '',
    date: todayIso(),
    created_at: '2026-11-23T08:00:00Z',
    ...overrides,
  }
}

export function makeInsights(overrides: Partial<Insights> = {}): Insights {
  return {
    generated_at: '2026-11-23T08:00:00Z',
    energy: { level: 2, label: 'Faible', date: todayIso() },
    load: { active_quests: 6, hard_quests: 3, overdue: 1 },
    neglected_territories: [{ code: 'CREATION', days_since_xp: 21 }],
    suggestions: [
      {
        kind: 'RECOVERY',
        message:
          'Énergie faible et 3 missions difficiles en cours : une mission courte ou une pause suffit aujourd’hui.',
      },
    ],
    ...overrides,
  }
}

export function makeSeason(overrides: Partial<Season> = {}): Season {
  return {
    id: 2,
    number: 2,
    name: 'Saison 2',
    theme: 'Cap sur la régularité',
    status: 'ACTIVE',
    start_date: '2026-11-23',
    end_date: '2027-02-20',
    days_left: 89,
    closed_at: null,
    priority_territories: ['TECHNOLOGY'],
    objectives: [
      { id: 1, title: 'Livrer un projet', is_main: true, is_done: false, order: 0 },
      { id: 2, title: 'Lire deux livres', is_main: false, is_done: false, order: 1 },
    ],
    summary: {
      xp_total: 120,
      xp_by_territory: { KNOWLEDGE: 40, TECHNOLOGY: 80 },
      completions: 6,
      completions_by_type: { DAILY: 4, MAIN: 2 },
      levels_gained: 1,
      objectives_done: 0,
      objectives_total: 2,
      achievements_unlocked: ['Premier pas'],
      skills_unlocked: ['Lecteur régulier'],
    },
    ...overrides,
  }
}
