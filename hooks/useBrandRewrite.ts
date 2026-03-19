'use client'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import type { RewriteTool, RewriteResult, BrandRewrite, RewriteHistoryFilters } from '@/lib/brand/rewrite.types'

// ---------------------------------------------------------------------------
// Query key factory
// ---------------------------------------------------------------------------

export const rewriteKeys = {
  all:     ['brand', 'rewrites'] as const,
  history: (orgId: string, filters: RewriteHistoryFilters) =>
    [...rewriteKeys.all, 'history', orgId, filters] as const,
}

// ---------------------------------------------------------------------------
// Run a rewrite tool mutation
// ---------------------------------------------------------------------------

export interface UseRewriteParams {
  orgId: string
  onSuccess?: (result: RewriteResult) => void
}

export function useRewrite({ orgId, onSuccess }: UseRewriteParams) {
  const qc = useQueryClient()

  return useMutation<
    RewriteResult,
    Error,
    { text: string; tool: RewriteTool; customInstruction?: string; clusterId?: string; ideaId?: string }
  >({
    mutationFn: async ({ text, tool, customInstruction, clusterId, ideaId }) => {
      const res = await fetch('/api/brand/rewrite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          original_text:      text,
          tool,
          org_id:             orgId,
          custom_instruction: customInstruction || undefined,
          cluster_id:         clusterId || undefined,
          idea_id:            ideaId   || undefined,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Rewrite failed')
      return data as RewriteResult
    },
    onSuccess: (result) => {
      qc.invalidateQueries({ queryKey: rewriteKeys.all })
      onSuccess?.(result)
    },
    onError: (err) => {
      toast.error(err.message)
    },
  })
}

// ---------------------------------------------------------------------------
// Fetch rewrite history
// ---------------------------------------------------------------------------

export function useRewriteHistory(orgId: string, filters: RewriteHistoryFilters = {}) {
  const params = new URLSearchParams({ org_id: orgId })
  if (filters.tool)     params.set('tool', filters.tool)
  if (filters.is_saved) params.set('saved', 'true')
  if (filters.search)   params.set('search', filters.search)
  if (filters.limit)    params.set('limit', String(filters.limit))

  return useQuery<BrandRewrite[]>({
    queryKey: rewriteKeys.history(orgId, filters),
    queryFn: async () => {
      const res  = await fetch(`/api/brand/rewrite?${params.toString()}`)
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Failed to fetch history')
      return data.history as BrandRewrite[]
    },
    staleTime: 30_000,
  })
}

// ---------------------------------------------------------------------------
// Save / unsave a rewrite
// ---------------------------------------------------------------------------

export function useToggleSaveRewrite(orgId: string) {
  const qc = useQueryClient()
  return useMutation<void, Error, { id: string; saved: boolean }>({
    mutationFn: async ({ id, saved }) => {
      const res = await fetch('/api/brand/rewrite', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, action: saved ? 'save' : 'unsave' }),
      })
      if (!res.ok) throw new Error('Failed to update')
    },
    onSuccess: (_, { saved }) => {
      toast.success(saved ? 'Rewrite saved' : 'Rewrite unsaved')
      qc.invalidateQueries({ queryKey: rewriteKeys.all })
    },
    onError: (err) => toast.error(err.message),
  })
}

// ---------------------------------------------------------------------------
// Delete a rewrite
// ---------------------------------------------------------------------------

export function useDeleteRewrite(orgId: string) {
  const qc = useQueryClient()
  return useMutation<void, Error, string>({
    mutationFn: async (id) => {
      const res = await fetch('/api/brand/rewrite', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, action: 'delete' }),
      })
      if (!res.ok) throw new Error('Failed to delete')
    },
    onSuccess: () => {
      toast.success('Rewrite deleted')
      qc.invalidateQueries({ queryKey: rewriteKeys.all })
    },
    onError: (err) => toast.error(err.message),
  })
}
