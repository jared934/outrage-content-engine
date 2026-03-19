'use client'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import type {
  CanvaExport, CanvaTemplateType, ExportStatus, ExportListFilters,
  UpdateExportRequest, CanvaExportPayload,
} from '@/lib/canva/canva.types'

// ---------------------------------------------------------------------------
// Query key factory
// ---------------------------------------------------------------------------

export const canvaExportKeys = {
  all:    ['canva', 'exports'] as const,
  list:   (orgId: string, filters: ExportListFilters) => ['canva', 'exports', 'list', orgId, filters] as const,
  detail: (id: string) => ['canva', 'exports', 'detail', id] as const,
}

// ---------------------------------------------------------------------------
// List exports
// ---------------------------------------------------------------------------

export function useCanvaExports(orgId: string, filters: ExportListFilters = {}) {
  const params = new URLSearchParams({ org_id: orgId })
  if (filters.template_type) params.set('template_type', filters.template_type)
  if (filters.status)        params.set('status', filters.status)
  if (filters.cluster_id)    params.set('cluster_id', filters.cluster_id)
  if (filters.limit)         params.set('limit', String(filters.limit))

  return useQuery<CanvaExport[]>({
    queryKey: canvaExportKeys.list(orgId, filters),
    queryFn: async () => {
      const res  = await fetch(`/api/canva/export?${params.toString()}`)
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Failed to load exports')
      return data.exports as CanvaExport[]
    },
    staleTime: 30_000,
  })
}

// ---------------------------------------------------------------------------
// Single export detail
// ---------------------------------------------------------------------------

export function useCanvaExport(id: string | null, orgId: string) {
  return useQuery<CanvaExport>({
    queryKey: canvaExportKeys.detail(id ?? ''),
    enabled:  !!id,
    queryFn: async () => {
      const res  = await fetch(`/api/canva/export/${id}?org_id=${orgId}`)
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Not found')
      return data.export as CanvaExport
    },
    staleTime: 30_000,
  })
}

// ---------------------------------------------------------------------------
// Create export
// ---------------------------------------------------------------------------

export interface CreateExportInput {
  name?:            string
  template_type:    CanvaTemplateType
  source?:          'idea' | 'meme_draft' | 'manual'
  content_idea_id?: string | null
  meme_draft_id?:   string | null
  cluster_id?:      string | null
  design_notes?:    string | null
  payload?:         CanvaExportPayload
}

export function useCreateCanvaExport(orgId: string) {
  const qc = useQueryClient()

  return useMutation<CanvaExport, Error, CreateExportInput>({
    mutationFn: async (input) => {
      const res  = await fetch('/api/canva/export', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ org_id: orgId, ...input }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Export creation failed')
      return data.export as CanvaExport
    },
    onSuccess: () => {
      toast.success('Export created — ready to send to Canva')
      qc.invalidateQueries({ queryKey: canvaExportKeys.all })
    },
    onError: (err) => toast.error(err.message),
  })
}

// ---------------------------------------------------------------------------
// Update export (status / design link / notes)
// ---------------------------------------------------------------------------

export function useUpdateCanvaExport(orgId: string) {
  const qc = useQueryClient()

  return useMutation<CanvaExport, Error, { id: string } & UpdateExportRequest>({
    mutationFn: async ({ id, ...updates }) => {
      const res  = await fetch(`/api/canva/export/${id}`, {
        method:  'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ org_id: orgId, ...updates }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Update failed')
      return data.export as CanvaExport
    },
    onSuccess: (record) => {
      const msg = record.canva_design_url && record.status === 'designed'
        ? 'Design link saved'
        : `Status: ${record.status}`
      toast.success(msg)
      qc.invalidateQueries({ queryKey: canvaExportKeys.all })
    },
    onError: (err) => toast.error(err.message),
  })
}

// ---------------------------------------------------------------------------
// Delete export
// ---------------------------------------------------------------------------

export function useDeleteCanvaExport(orgId: string) {
  const qc = useQueryClient()

  return useMutation<void, Error, string>({
    mutationFn: async (id) => {
      const res = await fetch(`/api/canva/export/${id}?org_id=${orgId}`, { method: 'DELETE' })
      if (!res.ok) throw new Error('Failed to delete export')
    },
    onSuccess: () => {
      toast.success('Export deleted')
      qc.invalidateQueries({ queryKey: canvaExportKeys.all })
    },
    onError: (err) => toast.error(err.message),
  })
}
