'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import type { DashboardPayload } from '@/lib/dashboard/dashboard.types'

export const dashboardKeys = {
  all:  ['dashboard'] as const,
  data: (orgId: string) => ['dashboard', 'data', orgId] as const,
}

export function useDashboard(orgId: string) {
  return useQuery<DashboardPayload>({
    queryKey: dashboardKeys.data(orgId),
    queryFn: async () => {
      const res  = await fetch(`/api/dashboard?org_id=${orgId}`)
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Failed to load dashboard')
      return data as DashboardPayload
    },
    staleTime:     60_000,  // 1 min
    refetchInterval: 120_000, // auto-refresh every 2 min
  })
}

// Quick action mutations wired to the dashboard query
export function useIgnoreTrend(orgId: string) {
  const qc = useQueryClient()
  return useMutation<void, Error, string>({
    mutationFn: async (clusterId) => {
      const res = await fetch('/api/trends/status', {
        method:  'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ id: clusterId, status: 'ignored' }),
      })
      if (!res.ok) throw new Error('Failed to ignore trend')
    },
    onSuccess: () => {
      toast.success('Trend ignored')
      qc.invalidateQueries({ queryKey: dashboardKeys.all })
    },
    onError: (err) => toast.error(err.message),
  })
}

export function useSaveIdea(orgId: string) {
  const qc = useQueryClient()
  return useMutation<void, Error, { id: string; saved: boolean }>({
    mutationFn: async ({ id, saved }) => {
      const res = await fetch('/api/content/ideas/save', {
        method:  'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ id, is_saved: saved }),
      })
      if (!res.ok) throw new Error('Failed to update idea')
    },
    onSuccess: (_, { saved }) => {
      toast.success(saved ? 'Idea saved' : 'Idea unsaved')
      qc.invalidateQueries({ queryKey: dashboardKeys.all })
    },
    onError: (err) => toast.error(err.message),
  })
}
