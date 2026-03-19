'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  getAlerts,
  getUnreadCount,
  markAlertRead,
  markAllAlertsRead,
  dismissAlert,
} from '@/lib/services/alerts.service'

export const alertKeys = {
  all: ['alerts'] as const,
  list: (filters?: object) => [...alertKeys.all, 'list', filters ?? {}] as const,
  unreadCount: () => [...alertKeys.all, 'unread-count'] as const,
}

export function useAlerts(filters: Parameters<typeof getAlerts>[0] = {}) {
  return useQuery({
    queryKey: alertKeys.list(filters),
    queryFn: () => getAlerts(filters),
    staleTime: 5 * 60_000,    // 5 min — alerts don't change second-to-second
    refetchInterval: 5 * 60_000,
  })
}

export function useUnreadAlerts() {
  return useAlerts({ is_read: false, is_dismissed: false, limit: 20 })
}

export function useUnreadAlertCount() {
  return useQuery({
    queryKey: alertKeys.unreadCount(),
    queryFn: getUnreadCount,
    staleTime: 2 * 60_000,    // 2 min — badge count can lag slightly
    refetchInterval: 2 * 60_000,
  })
}

export function useMarkAlertRead() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: markAlertRead,
    onSuccess: () => qc.invalidateQueries({ queryKey: alertKeys.all }),
  })
}

export function useMarkAllRead() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: markAllAlertsRead,
    onSuccess: () => qc.invalidateQueries({ queryKey: alertKeys.all }),
  })
}

export function useDismissAlert() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: dismissAlert,
    onSuccess: () => qc.invalidateQueries({ queryKey: alertKeys.all }),
  })
}
