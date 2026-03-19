'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import type {
  Competitor, CompetitorPost, CompetitorSource, GapEntry,
  CreateCompetitorInput, UpdateCompetitorInput, CreateSourceInput,
} from '@/lib/competitors/competitor.types'

// ─── Query Keys ───────────────────────────────────────────────────────────────

export const competitorKeys = {
  all:      ['competitors'] as const,
  list:     (orgId: string) => [...competitorKeys.all, 'list', orgId] as const,
  detail:   (id: string)   => [...competitorKeys.all, 'detail', id]  as const,
  posts:    (orgId: string, filters?: Record<string, unknown>) =>
              [...competitorKeys.all, 'posts', orgId, filters ?? {}] as const,
  gaps:     (orgId: string, days: number) =>
              [...competitorKeys.all, 'gaps', orgId, days] as const,
}

// ─── Fetchers ─────────────────────────────────────────────────────────────────

async function fetchCompetitors(orgId: string, category?: string): Promise<Competitor[]> {
  const params = new URLSearchParams({ org_id: orgId })
  if (category) params.set('category', category)
  const res = await fetch(`/api/competitors?${params}`)
  if (!res.ok) throw new Error(await res.text())
  return (await res.json()).competitors
}

async function createCompetitor(orgId: string, input: CreateCompetitorInput): Promise<Competitor> {
  const res = await fetch(`/api/competitors?org_id=${orgId}`, {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify(input),
  })
  if (!res.ok) throw new Error(await res.text())
  return (await res.json()).competitor
}

async function updateCompetitor(id: string, updates: UpdateCompetitorInput): Promise<Competitor> {
  const res = await fetch(`/api/competitors/${id}`, {
    method:  'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify(updates),
  })
  if (!res.ok) throw new Error(await res.text())
  return (await res.json()).competitor
}

async function deleteCompetitor(id: string, hard = false): Promise<void> {
  const res = await fetch(`/api/competitors/${id}${hard ? '?hard=1' : ''}`, { method: 'DELETE' })
  if (!res.ok) throw new Error(await res.text())
}

async function addSource(competitorId: string, input: CreateSourceInput): Promise<CompetitorSource> {
  const res = await fetch(`/api/competitors/${competitorId}/sources`, {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify(input),
  })
  if (!res.ok) throw new Error(await res.text())
  return (await res.json()).source
}

async function deleteSource(competitorId: string, sourceId: string): Promise<void> {
  const res = await fetch(`/api/competitors/${competitorId}/sources/${sourceId}`, { method: 'DELETE' })
  if (!res.ok) throw new Error(await res.text())
}

async function refreshCompetitor(id: string): Promise<{ total_inserted: number; sources_fetched: number }> {
  const res = await fetch(`/api/competitors/${id}/refresh`, { method: 'POST' })
  if (!res.ok) throw new Error(await res.text())
  return res.json()
}

async function fetchPosts(
  orgId: string,
  filters: { competitor_id?: string; tag?: string; cluster_id?: string; days?: number; limit?: number }
): Promise<(CompetitorPost & { competitor_name: string; competitor_category: string; competitor_avatar: string | null })[]> {
  const params = new URLSearchParams({ org_id: orgId })
  if (filters.competitor_id) params.set('competitor_id', filters.competitor_id)
  if (filters.tag)           params.set('tag',           filters.tag)
  if (filters.cluster_id)    params.set('cluster_id',    filters.cluster_id)
  if (filters.days)          params.set('days',          String(filters.days))
  if (filters.limit)         params.set('limit',         String(filters.limit))
  const res = await fetch(`/api/competitors/posts?${params}`)
  if (!res.ok) throw new Error(await res.text())
  return (await res.json()).posts
}

async function fetchGaps(orgId: string, days: number): Promise<{
  gaps: GapEntry[]
  days: number
  competitors_tracked: number
}> {
  const res = await fetch(`/api/competitors/gaps?org_id=${orgId}&days=${days}`)
  if (!res.ok) throw new Error(await res.text())
  return res.json()
}

// ─── Hooks ────────────────────────────────────────────────────────────────────

export function useCompetitors(orgId: string, category?: string) {
  return useQuery({
    queryKey: competitorKeys.list(orgId),
    queryFn:  () => fetchCompetitors(orgId, category),
    enabled:  !!orgId,
    staleTime: 60_000,
  })
}

export function useCreateCompetitor(orgId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (input: CreateCompetitorInput) => createCompetitor(orgId, input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: competitorKeys.list(orgId) })
      toast.success('Competitor added')
    },
    onError: (err) => toast.error((err as Error).message),
  })
}

export function useUpdateCompetitor() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: UpdateCompetitorInput }) =>
      updateCompetitor(id, updates),
    onSuccess: () => qc.invalidateQueries({ queryKey: competitorKeys.all }),
    onError: (err) => toast.error((err as Error).message),
  })
}

export function useDeleteCompetitor() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, hard }: { id: string; hard?: boolean }) => deleteCompetitor(id, hard),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: competitorKeys.all })
      toast.success('Competitor removed')
    },
    onError: (err) => toast.error((err as Error).message),
  })
}

export function useAddSource() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ competitorId, input }: { competitorId: string; input: CreateSourceInput }) =>
      addSource(competitorId, input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: competitorKeys.all })
      toast.success('Source added')
    },
    onError: (err) => toast.error((err as Error).message),
  })
}

export function useDeleteSource() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ competitorId, sourceId }: { competitorId: string; sourceId: string }) =>
      deleteSource(competitorId, sourceId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: competitorKeys.all })
      toast.success('Source removed')
    },
    onError: (err) => toast.error((err as Error).message),
  })
}

export function useRefreshCompetitor(orgId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => refreshCompetitor(id),
    onSuccess: (data, id) => {
      qc.invalidateQueries({ queryKey: competitorKeys.list(orgId) })
      qc.invalidateQueries({ queryKey: competitorKeys.posts(orgId) })
      qc.invalidateQueries({ queryKey: competitorKeys.gaps(orgId, 7) })
      toast.success(
        data.total_inserted > 0
          ? `Fetched ${data.total_inserted} new posts`
          : 'No new posts found'
      )
    },
    onError: (err) => toast.error((err as Error).message),
  })
}

export function useCompetitorPosts(
  orgId: string,
  filters: { competitor_id?: string; tag?: string; cluster_id?: string; days?: number; limit?: number } = {}
) {
  return useQuery({
    queryKey: competitorKeys.posts(orgId, filters),
    queryFn:  () => fetchPosts(orgId, filters),
    enabled:  !!orgId,
    staleTime: 120_000,
  })
}

export function useGapAnalysis(orgId: string, days = 7) {
  return useQuery({
    queryKey: competitorKeys.gaps(orgId, days),
    queryFn:  () => fetchGaps(orgId, days),
    enabled:  !!orgId,
    staleTime: 300_000,
  })
}
