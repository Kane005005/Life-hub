import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { clearToken, setToken } from './auth'
import { ApiError, apiRequest } from './api'
import type {
  Achievement,
  Character,
  CharacterUpdate,
  CompletionResult,
  GameSettings,
  Inventory,
  JournalEntry,
  JournalFilters,
  JournalSummary,
  LoginResponse,
  Paginated,
  Progression,
  PurchaseResult,
  Quest,
  QuestFilters,
  QuestInput,
  QuestUpdate,
  RewardInput,
  Season,
  SeasonCloseResult,
  SeasonInput,
  SeasonUpdate,
  ShopCategory,
  ShopItem,
  SkillTree,
  SkillUnlockResult,
  SkillsSummary,
  TerritoryCode,
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
  skills: ['skills'] as const,
  skillTrees: (territory?: TerritoryCode) => ['skills', 'trees', territory ?? 'all'] as const,
  skillsSummary: ['skills', 'summary'] as const,
  achievements: ['achievements'] as const,
  shop: ['shop'] as const,
  shopItems: (filters?: { category?: ShopCategory; slot?: string }) =>
    ['shop', 'items', filters ?? {}] as const,
  inventory: ['inventory'] as const,
  wallet: ['wallet'] as const,
  seasons: ['seasons'] as const,
  season: (id: number) => ['seasons', id] as const,
  currentSeason: ['seasons', 'current'] as const,
  journal: ['journal'] as const,
  journalList: (filters?: JournalFilters) => ['journal', filters ?? {}] as const,
  journalSummary: (period: 'week' | 'month') => ['journal', 'summary', period] as const,
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
  const eventTypes = filters.event_type
    ? Array.isArray(filters.event_type)
      ? filters.event_type
      : [filters.event_type]
    : []
  eventTypes.forEach((eventType) => params.append('event_type', eventType))
  if (filters.date_from) {
    params.set('date_from', filters.date_from)
  }
  if (filters.date_to) {
    params.set('date_to', filters.date_to)
  }
  if (filters.territory) {
    params.set('territory', filters.territory)
  }
  if (filters.q) {
    params.set('q', filters.q)
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
        'Mission déjà validée.',
      )
    },
    onSuccess: () => {
      void client.invalidateQueries({ queryKey: queryKeys.quests })
      void client.invalidateQueries({ queryKey: queryKeys.character })
      void client.invalidateQueries({ queryKey: queryKeys.territories })
      void client.invalidateQueries({ queryKey: queryKeys.progression })
      void client.invalidateQueries({ queryKey: queryKeys.journal })
      void client.invalidateQueries({ queryKey: queryKeys.world })
      void client.invalidateQueries({ queryKey: queryKeys.skills })
      void client.invalidateQueries({ queryKey: queryKeys.achievements })
      void client.invalidateQueries({ queryKey: queryKeys.shop })
      void client.invalidateQueries({ queryKey: queryKeys.inventory })
      void client.invalidateQueries({ queryKey: queryKeys.wallet })
      void client.invalidateQueries({ queryKey: queryKeys.seasons })
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

export function useJournalSummary(period: 'week' | 'month' = 'week') {
  return useQuery({
    queryKey: queryKeys.journalSummary(period),
    queryFn: () => apiRequest<JournalSummary>('GET', `/journal/summary/?period=${period}`),
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

export function useSkillTrees(territory?: TerritoryCode) {
  return useQuery({
    queryKey: queryKeys.skillTrees(territory),
    queryFn: () =>
      apiRequest<SkillTree[]>('GET', `/skills/trees/${territory ? `?territory=${territory}` : ''}`),
  })
}

export function useUnlockSkill() {
  const client = useQueryClient()
  return useMutation({
    mutationFn: (code: string) => apiRequest<SkillUnlockResult>('POST', `/skills/${code}/unlock/`),
    onSuccess: () => {
      void client.invalidateQueries({ queryKey: queryKeys.character })
      void client.invalidateQueries({ queryKey: queryKeys.skills })
      void client.invalidateQueries({ queryKey: queryKeys.progression })
      void client.invalidateQueries({ queryKey: queryKeys.journal })
    },
  })
}

export function useSkillsSummary() {
  return useQuery({
    queryKey: queryKeys.skillsSummary,
    queryFn: () => apiRequest<SkillsSummary>('GET', '/progression/skills/'),
  })
}

export function useAchievements() {
  return useQuery({
    queryKey: queryKeys.achievements,
    queryFn: () => apiRequest<Achievement[]>('GET', '/achievements/'),
  })
}

export function useShopItems(filters?: { category?: ShopCategory; slot?: string }) {
  return useQuery({
    queryKey: queryKeys.shopItems(filters),
    queryFn: () => {
      const params = new URLSearchParams()
      if (filters?.category) {
        params.set('category', filters.category)
      }
      if (filters?.slot) {
        params.set('slot', filters.slot)
      }
      const search = params.toString()
      return apiRequest<ShopItem[]>('GET', `/economy/rewards/${search ? `?${search}` : ''}`)
    },
  })
}

export function useCreateReward() {
  const client = useQueryClient()
  return useMutation({
    mutationFn: (input: RewardInput) => apiRequest<ShopItem>('POST', '/economy/rewards/', input),
    onSuccess: () => {
      void client.invalidateQueries({ queryKey: queryKeys.shop })
    },
  })
}

export function useUpdateReward() {
  const client = useQueryClient()
  return useMutation({
    mutationFn: ({ id, input }: { id: number; input: Partial<RewardInput> }) =>
      apiRequest<ShopItem>('PATCH', `/economy/rewards/${id}/`, input),
    onSuccess: () => {
      void client.invalidateQueries({ queryKey: queryKeys.shop })
      void client.invalidateQueries({ queryKey: queryKeys.inventory })
    },
  })
}

export function usePurchase() {
  const client = useQueryClient()
  return useMutation({
    mutationFn: (id: number) =>
      apiRequest<PurchaseResult>('POST', `/economy/rewards/${id}/purchase/`),
    onSuccess: () => {
      void client.invalidateQueries({ queryKey: queryKeys.character })
      void client.invalidateQueries({ queryKey: queryKeys.shop })
      void client.invalidateQueries({ queryKey: queryKeys.inventory })
      void client.invalidateQueries({ queryKey: queryKeys.wallet })
      void client.invalidateQueries({ queryKey: queryKeys.journal })
    },
  })
}

export function useInventory() {
  return useQuery({
    queryKey: queryKeys.inventory,
    queryFn: () => apiRequest<Inventory>('GET', '/economy/inventory/'),
  })
}

export function useEquip() {
  const client = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => apiRequest<Character>('POST', `/economy/inventory/${id}/equip/`),
    onSuccess: () => {
      void client.invalidateQueries({ queryKey: queryKeys.character })
      void client.invalidateQueries({ queryKey: queryKeys.inventory })
      void client.invalidateQueries({ queryKey: queryKeys.shop })
      void client.invalidateQueries({ queryKey: queryKeys.journal })
    },
  })
}

export function useUnequip() {
  const client = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => apiRequest<Character>('POST', `/economy/inventory/${id}/unequip/`),
    onSuccess: () => {
      void client.invalidateQueries({ queryKey: queryKeys.character })
      void client.invalidateQueries({ queryKey: queryKeys.inventory })
      void client.invalidateQueries({ queryKey: queryKeys.shop })
      void client.invalidateQueries({ queryKey: queryKeys.journal })
    },
  })
}

export function useSeasons() {
  return useQuery({
    queryKey: queryKeys.seasons,
    queryFn: () => apiRequest<Paginated<Season>>('GET', '/seasons/'),
  })
}

export function useCurrentSeason() {
  return useQuery({
    queryKey: queryKeys.currentSeason,
    queryFn: async () => {
      try {
        return await apiRequest<Season>('GET', '/seasons/current/')
      } catch (error) {
        if (error instanceof ApiError && error.status === 404) {
          return null
        }
        throw error
      }
    },
    retry: false,
  })
}

export function useSeason(id: number) {
  return useQuery({
    queryKey: queryKeys.season(id),
    queryFn: () => apiRequest<Season>('GET', `/seasons/${id}/`),
    enabled: Number.isFinite(id),
  })
}

export function useCreateSeason() {
  const client = useQueryClient()
  return useMutation({
    mutationFn: (input: SeasonInput) => apiRequest<Season>('POST', '/seasons/', input),
    onSuccess: () => {
      void client.invalidateQueries({ queryKey: queryKeys.seasons })
      void client.invalidateQueries({ queryKey: queryKeys.journal })
    },
  })
}

export function useUpdateSeason() {
  const client = useQueryClient()
  return useMutation({
    mutationFn: ({ id, input }: { id: number; input: SeasonUpdate }) =>
      apiRequest<Season>('PATCH', `/seasons/${id}/`, input),
    onSuccess: () => {
      void client.invalidateQueries({ queryKey: queryKeys.seasons })
      void client.invalidateQueries({ queryKey: queryKeys.journal })
    },
  })
}

export function useCloseSeason() {
  const client = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => apiRequest<SeasonCloseResult>('POST', `/seasons/${id}/close/`),
    onSuccess: () => {
      void client.invalidateQueries({ queryKey: queryKeys.seasons })
      void client.invalidateQueries({ queryKey: queryKeys.journal })
    },
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
