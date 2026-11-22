import type { Character, CompletionResult, Quest, TerritoryStat } from '../lib/types'

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
    },
    ...overrides,
  }
}
