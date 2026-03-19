'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { getTrends, getTrendById, updateTrendStatus, getTrendStats } from '@/lib/services/trends.service'
import type { TrendFilters } from '@/lib/services/trends.service'
import type { TrendStatus } from '@/types'

export const trendKeys = {
  all: ['trends'] as const,
  list: (filters: TrendFilters) => [...trendKeys.all, 'list', filters] as const,
  detail: (id: string) => [...trendKeys.all, 'detail', id] as const,
  stats: () => [...trendKeys.all, 'stats'] as const,
}

export function useTrends(filters: TrendFilters = {}) {
  return useQuery({
    queryKey: trendKeys.list(filters),
    queryFn: () => getTrends(filters),
    staleTime: 30_000,
  })
}

export function useTrend(id: string) {
  return useQuery({
    queryKey: trendKeys.detail(id),
    queryFn: () => getTrendById(id),
    enabled: !!id,
  })
}

export function useTrendStats() {
  return useQuery({
    queryKey: trendKeys.stats(),
    queryFn: getTrendStats,
    staleTime: 60_000,
    refetchInterval: 120_000,
  })
}

export function useUpdateTrendStatus() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: TrendStatus }) =>
      updateTrendStatus(id, status),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: trendKeys.all })
    },
  })
}
