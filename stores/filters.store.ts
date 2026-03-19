import { create } from 'zustand'
import type { TrendCategory, TrendStatus, Platform, SuggestionType } from '@/types'

interface TrendFilters {
  category: TrendCategory | null
  status: TrendStatus | null
  minScore: number
  timeRange: '1h' | '6h' | '24h' | '7d' | 'all'
  search: string
}

interface ContentFilters {
  platform: Platform | null
  type: SuggestionType | null
  savedOnly: boolean
}

interface FiltersState {
  trendFilters: TrendFilters
  contentFilters: ContentFilters

  setTrendFilter: <K extends keyof TrendFilters>(key: K, value: TrendFilters[K]) => void
  setContentFilter: <K extends keyof ContentFilters>(key: K, value: ContentFilters[K]) => void
  resetTrendFilters: () => void
  resetContentFilters: () => void
}

const defaultTrendFilters: TrendFilters = {
  category: null,
  status: 'active',
  minScore: 0,
  timeRange: '24h',
  search: '',
}

const defaultContentFilters: ContentFilters = {
  platform: null,
  type: null,
  savedOnly: false,
}

export const useFiltersStore = create<FiltersState>((set) => ({
  trendFilters: defaultTrendFilters,
  contentFilters: defaultContentFilters,

  setTrendFilter: (key, value) =>
    set((s) => ({ trendFilters: { ...s.trendFilters, [key]: value } })),
  setContentFilter: (key, value) =>
    set((s) => ({ contentFilters: { ...s.contentFilters, [key]: value } })),
  resetTrendFilters: () => set({ trendFilters: defaultTrendFilters }),
  resetContentFilters: () => set({ contentFilters: defaultContentFilters }),
}))
