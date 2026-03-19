'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import type {
  Asset, AssetType, AssetCategory,
  CreateAssetInput, UpdateAssetInput,
} from '@/lib/assets/asset.types'

// ─── Query keys ──────────────────────────────────────────────────────────────

export const assetKeys = {
  all:    ['assets'] as const,
  list:   (orgId: string, filters?: object) => [...assetKeys.all, orgId, filters ?? {}] as const,
  detail: (id: string) => [...assetKeys.all, 'detail', id] as const,
}

// ─── Response type ───────────────────────────────────────────────────────────

export interface AssetListResponse {
  assets:         Asset[]
  total:          number
  categoryCounts: Record<string, number>
  typeCounts:     Record<string, number>
  allTags:        string[]
}

// ─── Fetchers ────────────────────────────────────────────────────────────────

async function fetchAssets(
  orgId: string,
  filters: {
    type?:     AssetType | ''
    category?: AssetCategory | ''
    tag?:      string
    q?:        string
    limit?:    number
    offset?:   number
  } = {},
): Promise<AssetListResponse> {
  const p = new URLSearchParams({ org_id: orgId })
  if (filters.type)     p.set('type',     filters.type)
  if (filters.category) p.set('category', filters.category)
  if (filters.tag)      p.set('tag',      filters.tag)
  if (filters.q)        p.set('q',        filters.q)
  if (filters.limit)    p.set('limit',    String(filters.limit))
  if (filters.offset)   p.set('offset',   String(filters.offset))

  const res = await fetch(`/api/assets?${p}`)
  if (!res.ok) throw new Error(await res.text())
  return res.json()
}

async function saveAssetMetadata(orgId: string, input: Omit<CreateAssetInput, 'org_id'>): Promise<Asset> {
  const res = await fetch(`/api/assets?org_id=${orgId}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  })
  if (!res.ok) throw new Error(await res.text())
  return (await res.json()).asset
}

async function updateAsset(id: string, updates: UpdateAssetInput): Promise<Asset> {
  const res = await fetch(`/api/assets/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(updates),
  })
  if (!res.ok) throw new Error(await res.text())
  return (await res.json()).asset
}

async function archiveAsset(id: string, hard = false): Promise<void> {
  const res = await fetch(`/api/assets/${id}${hard ? '?hard=1' : ''}`, { method: 'DELETE' })
  if (!res.ok) throw new Error(await res.text())
}

// ─── Hooks ───────────────────────────────────────────────────────────────────

export function useAssets(
  orgId: string,
  filters: {
    type?:     AssetType | ''
    category?: AssetCategory | ''
    tag?:      string
    q?:        string
  } = {},
) {
  return useQuery({
    queryKey: assetKeys.list(orgId, filters),
    queryFn:  () => fetchAssets(orgId, filters),
    staleTime: 30_000,
    enabled:   !!orgId,
  })
}

export function useSaveAssetMetadata(orgId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (input: Omit<CreateAssetInput, 'org_id'>) => saveAssetMetadata(orgId, input),
    onSuccess: () => qc.invalidateQueries({ queryKey: assetKeys.all }),
    onError:   (err) => toast.error((err as Error).message),
  })
}

export function useUpdateAsset() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: UpdateAssetInput }) =>
      updateAsset(id, updates),
    onSuccess: (asset) => {
      qc.invalidateQueries({ queryKey: assetKeys.all })
      qc.setQueryData(assetKeys.detail(asset.id), asset)
      toast.success('Asset updated')
    },
    onError: (err) => toast.error((err as Error).message),
  })
}

export function useArchiveAsset() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, hard }: { id: string; hard?: boolean }) => archiveAsset(id, hard),
    onSuccess: (_, { hard }) => {
      qc.invalidateQueries({ queryKey: assetKeys.all })
      toast.success(hard ? 'Asset permanently deleted' : 'Asset archived')
    },
    onError: (err) => toast.error((err as Error).message),
  })
}
