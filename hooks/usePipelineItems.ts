'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import type {
  PipelineItem,
  PipelineStatus,
  CreatePipelineItemInput,
  UpdatePipelineItemInput,
} from '@/lib/pipeline/pipeline.types'

// ---------------------------------------------------------------------------
// Query key factory
// ---------------------------------------------------------------------------
export const pipelineItemKeys = {
  all:    ['pipeline-items'] as const,
  list:   (orgId: string, filters?: object) => [...pipelineItemKeys.all, orgId, filters ?? {}] as const,
  detail: (id: string) => [...pipelineItemKeys.all, 'detail', id] as const,
}

// ---------------------------------------------------------------------------
// Fetchers
// ---------------------------------------------------------------------------
async function fetchItems(orgId: string, filters: {
  status?: PipelineStatus
  format?: string
  cluster_id?: string
  q?: string
} = {}): Promise<PipelineItem[]> {
  const params = new URLSearchParams({ org_id: orgId })
  if (filters.status)     params.set('status',     filters.status)
  if (filters.format)     params.set('format',     filters.format)
  if (filters.cluster_id) params.set('cluster_id', filters.cluster_id)
  if (filters.q)          params.set('q',          filters.q)

  const res = await fetch(`/api/pipeline/items?${params}`)
  if (!res.ok) throw new Error(await res.text())
  const json = await res.json()
  return json.items as PipelineItem[]
}

async function fetchItem(id: string): Promise<PipelineItem> {
  const res = await fetch(`/api/pipeline/items/${id}`)
  if (!res.ok) throw new Error(await res.text())
  return (await res.json()).item as PipelineItem
}

async function createItem(orgId: string, input: Omit<CreatePipelineItemInput, 'org_id'>): Promise<PipelineItem> {
  const res = await fetch(`/api/pipeline/items?org_id=${orgId}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  })
  if (!res.ok) throw new Error(await res.text())
  return (await res.json()).item as PipelineItem
}

async function updateItem(id: string, updates: UpdatePipelineItemInput): Promise<PipelineItem> {
  const res = await fetch(`/api/pipeline/items/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(updates),
  })
  if (!res.ok) throw new Error(await res.text())
  return (await res.json()).item as PipelineItem
}

async function deleteItem(id: string): Promise<void> {
  const res = await fetch(`/api/pipeline/items/${id}`, { method: 'DELETE' })
  if (!res.ok) throw new Error(await res.text())
}

// ---------------------------------------------------------------------------
// Hooks
// ---------------------------------------------------------------------------
export function usePipelineItems(orgId: string, filters: {
  status?: PipelineStatus
  format?: string
  cluster_id?: string
  q?: string
} = {}) {
  return useQuery({
    queryKey: pipelineItemKeys.list(orgId, filters),
    queryFn: () => fetchItems(orgId, filters),
    staleTime: 30_000,
    enabled: !!orgId,
  })
}

export function usePipelineItem(id: string) {
  return useQuery({
    queryKey: pipelineItemKeys.detail(id),
    queryFn: () => fetchItem(id),
    enabled: !!id,
  })
}

export function useCreatePipelineItem(orgId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (input: Omit<CreatePipelineItemInput, 'org_id'>) => createItem(orgId, input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: pipelineItemKeys.all })
      toast.success('Item added to pipeline')
    },
    onError: (err) => toast.error((err as Error).message),
  })
}

export function useUpdatePipelineItem() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: UpdatePipelineItemInput }) =>
      updateItem(id, updates),
    onSuccess: (item) => {
      qc.invalidateQueries({ queryKey: pipelineItemKeys.all })
      qc.setQueryData(pipelineItemKeys.detail(item.id), item)
    },
    onError: (err) => toast.error((err as Error).message),
  })
}

export function useMovePipelineItem() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, status, position }: { id: string; status: PipelineStatus; position?: number }) =>
      updateItem(id, { status, ...(position !== undefined ? { position } : {}) }),
    // Optimistic update — swap status immediately in cache
    onMutate: async ({ id, status }) => {
      await qc.cancelQueries({ queryKey: pipelineItemKeys.all })
      const keys = qc.getQueriesData<PipelineItem[]>({ queryKey: pipelineItemKeys.all })
      const snapshots: Array<[unknown[], PipelineItem[] | undefined]> = []

      for (const [key, data] of keys) {
        if (!Array.isArray(data)) continue
        snapshots.push([key as unknown[], data])
        qc.setQueryData(key, data.map((item) =>
          item.id === id ? { ...item, status } : item
        ))
      }
      return { snapshots }
    },
    onError: (_err, _vars, ctx) => {
      // Roll back
      if (ctx?.snapshots) {
        for (const [key, data] of ctx.snapshots) {
          qc.setQueryData(key, data)
        }
      }
      toast.error('Failed to move item')
    },
    onSettled: () => qc.invalidateQueries({ queryKey: pipelineItemKeys.all }),
  })
}

export function useDeletePipelineItem() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: deleteItem,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: pipelineItemKeys.all })
      toast.success('Removed from pipeline')
    },
    onError: (err) => toast.error((err as Error).message),
  })
}
