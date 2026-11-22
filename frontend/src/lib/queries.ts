import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { clearToken, setToken } from './auth'
import { apiRequest } from './api'
import type {
  Character,
  CharacterUpdate,
  CompletionResult,
  GameSettings,
  JournalEntry,
  JournalFilters,
  LoginResponse,
  Paginated,
  Progression,
  Quest,
  QuestFilters,
  QuestInput,
  QuestUpdate,
  TerritoryStat,
  WorldProgress,
  XpTransaction,
} from './types'

export const queryKeys = {
  me: ['auth', 'me'] as const,
  character: ['character'] as const,
  territories: ['territories'] as const,
  territory: (id: number) => ['territories', id] as const,
  world: ['world'] as const,
  worldProgress: ['world', 'progress'] as const,
  quests: ['quests'] as const,
  questList: (filters?: QuestFilters) => ['quests', filters ?? {}] as const,
  quest: (id: number) => ['quests', id] as const,
  progression: ['progression'] as const,
  history: ['progression', 'history'] as const,
  journal: ['journal'] as const,
  journalList: (filters?: JournalFilters) => ['journal', filters ?? {}] as const,
  settings: ['settings', 'game'] as const,
}

function questsPath(filters: QuestFilters = {}): string {
  const params = new URLSearchParams()
  if (filters.territory) {
    params.set('territory', filters.territory)
  }
  if (filters.quest_type) {
    params.set('quest_type', filters.quest_type)
  }
  const statuses = filters.status
    ? Array.isArray(filters.status)
      ? filters.status
      : [filters.status]
    : []
  statuses.forEach((status) => params.append('status', status))
  if (filters.difficulty) {
    params.set('difficulty', filters.difficulty)
  }
  if (filters.today) {
    params.set('today', '1')
  }
  const search = params.toString()
  return `/quests/${search ? `?${search}` : ''}`
}

function journalPath(filters: JournalFilters = {}): string {
  const params = new URLSearchParams()
  if (filters.event_type) {
    params.set('event_type', filters.event_type)
  }
  const search = params.toString()
  return `/journal/${search ? `?${search}` : ''}`
}

export function useMe() {
  return useQuery({
    queryKey: queryKeys.me,
    queryFn: () => apiRequest<{ id: number; username: string }>('GET', '/auth/me/'),
    retry: false,
  })
}

export function useCharacter() {
  return useQuery({
    queryKey: queryKeys.character,
    queryFn: () => apiRequest<Character>('GET', '/character/'),
    retry: false,
  })
}

export function useUpdateCharacter() {
  const client = useQueryClient()
  return useMutation({
    mutationFn: (input: CharacterUpdate) => apiRequest<Character>('PATCH', '/character/', input),
    onSuccess: () => {
      void client.invalidateQueries({ queryKey: queryKeys.character })
      void client.invalidateQueries({ queryKey: queryKeys.progression })
      void client.invalidateQueries({ queryKey: queryKeys.world })
    },
  })
}

export function useUpdateAvatar() {
  const client = useQueryClient()
  return useMutation({
    mutationFn: (input: {
      silhouette: Character['avatar']['silhouette']
      color: string
      accent: string
    }) => apiRequest<Character>('PATCH', '/character/avatar/', input),
    onSuccess: () => {
      void client.invalidateQueries({ queryKey: queryKeys.character })
      void client.invalidateQueries({ queryKey: queryKeys.world })
    },
  })
}

export function useTerritories() {
  return useQuery({
    queryKey: queryKeys.territories,
    queryFn: () => apiRequest<TerritoryStat[]>('GET', '/world/territories/'),
  })
}

export function useTerritory(id: number) {
  return useQuery({
    queryKey: queryKeys.territory(id),
    queryFn: () =>
      apiRequest<TerritoryStat & { quests: Quest[] }>('GET', `/world/territories/${id}/`),
    enabled: Number.isFinite(id),
  })
}

export function useWorldProgress() {
  return useQuery({
    queryKey: queryKeys.worldProgress,
    queryFn: () => apiRequest<WorldProgress>('GET', '/world/progress/'),
  })
}

export function useQuests(filters?: QuestFilters) {
  return useQuery({
    queryKey: queryKeys.questList(filters),
    queryFn: () => apiRequest<Paginated<Quest>>('GET', questsPath(filters)),
  })
}

export function useQuest(id: number) {
  return useQuery({
    queryKey: queryKeys.quest(id),
    queryFn: () => apiRequest<Quest>('GET', `/quests/${id}/`),
    enabled: Number.isFinite(id),
  })
}

export function useCreateQuest() {
  const client = useQueryClient()
  return useMutation({
    mutationFn: (input: QuestInput) => apiRequest<Quest>('POST', '/quests/', input),
    onSuccess: () => {
      void client.invalidateQueries({ queryKey: queryKeys.quests })
      void client.invalidateQueries({ queryKey: queryKeys.journal })
      void client.invalidateQueries({ queryKey: queryKeys.world })
    },
  })
}

export function useUpdateQuest() {
  const client = useQueryClient()
  return useMutation({
    mutationFn: ({ id, input }: { id: number; input: QuestUpdate }) =>
      apiRequest<Quest>('PATCH', `/quests/${id}/`, input),
    onSuccess: () => {
      void client.invalidateQueries({ queryKey: queryKeys.quests })
      void client.invalidateQueries({ queryKey: queryKeys.journal })
      void client.invalidateQueries({ queryKey: queryKeys.world })
    },
  })
}

export function useAcceptQuest() {
  const client = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => apiRequest<Quest>('POST', `/quests/${id}/accept/`),
    onSuccess: () => {
      void client.invalidateQueries({ queryKey: queryKeys.quests })
      void client.invalidateQueries({ queryKey: queryKeys.journal })
    },
  })
}

type CompleteQuestArgs = number | { id: number; note?: string }

export function useCompleteQuest() {
  const client = useQueryClient()
  return useMutation({
    mutationFn: (args: CompleteQuestArgs) => {
      const id = typeof args === 'number' ? args : args.id
      const note = typeof args === 'number' ? undefined : args.note
      return apiRequest<CompletionResult>(
        'POST',
        `/quests/${id}/complete/`,
        note === undefined ? {} : { note },
      )
    },
    onSuccess: () => {
      void client.invalidateQueries({ queryKey: queryKeys.quests })
      void client.invalidateQueries({ queryKey: queryKeys.character })
      void client.invalidateQueries({ queryKey: queryKeys.territories })
      void client.invalidateQueries({ queryKey: queryKeys.progression })
      void client.invalidateQueries({ queryKey: queryKeys.journal })
      void client.invalidateQueries({ queryKey: queryKeys.world })
    },
  })
}

export function useAbandonQuest() {
  const client = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => apiRequest<Quest>('POST', `/quests/${id}/abandon/`),
    onSuccess: () => {
      void client.invalidateQueries({ queryKey: queryKeys.quests })
      void client.invalidateQueries({ queryKey: queryKeys.journal })
      void client.invalidateQueries({ queryKey: queryKeys.world })
    },
  })
}

export function useToggleStep() {
  const client = useQueryClient()
  return useMutation({
    mutationFn: ({ id, stepId }: { id: number; stepId: number }) =>
      apiRequest<Quest>('POST', `/quests/${id}/steps/${stepId}/toggle/`),
    onSuccess: () => {
      void client.invalidateQueries({ queryKey: queryKeys.quests })
      void client.invalidateQueries({ queryKey: queryKeys.journal })
    },
  })
}

export function useProgression() {
  return useQuery({
    queryKey: queryKeys.progression,
    queryFn: () => apiRequest<Progression>('GET', '/progression/'),
  })
}

export function useXpHistory() {
  return useQuery({
    queryKey: queryKeys.history,
    queryFn: () => apiRequest<Paginated<XpTransaction>>('GET', '/progression/history/'),
  })
}

export function useJournal(filters?: JournalFilters) {
  return useQuery({
    queryKey: queryKeys.journalList(filters),
    queryFn: () => apiRequest<Paginated<JournalEntry>>('GET', journalPath(filters)),
  })
}

export function useRest() {
  const client = useQueryClient()
  return useMutation({
    mutationFn: () => apiRequest<{ message: string }>('POST', '/journal/rest/', {}),
    onSuccess: () => {
      void client.invalidateQueries({ queryKey: queryKeys.journal })
    },
  })
}

export function useGameSettings() {
  return useQuery({
    queryKey: queryKeys.settings,
    queryFn: () => apiRequest<GameSettings>('GET', '/settings/game/'),
  })
}

export function useLogin() {
  const client = useQueryClient()
  return useMutation({
    mutationFn: (input: { username: string; password: string }) =>
      apiRequest<LoginResponse>('POST', '/auth/login/', input, 'Identifiants incorrects.'),
    onSuccess: (data) => {
      setToken(data.token)
      void client.invalidateQueries()
    },
  })
}

export function useLogout() {
  const client = useQueryClient()
  return useMutation({
    mutationFn: async () => {
      try {
        await apiRequest<void>('POST', '/auth/logout/', {})
      } finally {
        clearToken()
      }
    },
    onSuccess: () => {
      client.clear()
    },
  })
}
