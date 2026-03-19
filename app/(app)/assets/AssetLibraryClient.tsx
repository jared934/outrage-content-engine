'use client'

import { useState, useMemo } from 'react'
import {
  FolderOpen, Search, Upload, Grid3X3, List,
  Filter, RefreshCw, X, LayoutGrid,
} from 'lucide-react'
import { Button }            from '@/components/ui/Button'
import { Skeleton }          from '@/components/ui/Skeleton'
import { EmptyState }        from '@/components/ui/EmptyState'
import { cn }                from '@/lib/utils/cn'


import { AssetCard }         from '@/components/assets/AssetCard'
import { AssetStatsBar }     from '@/components/assets/AssetStatsBar'
import { AssetDetailModal }  from '@/components/assets/AssetDetailModal'
import { AssetUploadZone }   from '@/components/assets/AssetUploadZone'

import { useAssets }         from '@/hooks/useAssets'
import {
  ASSET_CATEGORIES, CATEGORY_CONFIG,
  formatBytes,
} from '@/lib/assets/asset.types'
import type { Asset, AssetType, AssetCategory } from '@/lib/assets/asset.types'

type GridSize = 'sm' | 'md' | 'lg'

const GRID_COLS: Record<GridSize, string> = {
  sm: 'grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-8',
  md: 'grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6',
  lg: 'grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4',
}

interface AssetLibraryClientProps {
  orgId: string
}

export function AssetLibraryClient({ orgId }: AssetLibraryClientProps) {
  const [search,         setSearch]         = useState('')
  const [filterCategory, setFilterCategory] = useState<AssetCategory | ''>('')
  const [filterType,     setFilterType]     = useState<AssetType | ''>('')
  const [filterTag,      setFilterTag]      = useState('')
  const [gridSize,       setGridSize]       = useState<GridSize>('md')
  const [showUpload,     setShowUpload]     = useState(false)
  const [showFilters,    setShowFilters]    = useState(false)
  const [selectedAsset,  setSelectedAsset]  = useState<Asset | null>(null)
  const [selectedIds,    setSelectedIds]    = useState<Set<string>>(new Set())

  const { data, isLoading, refetch } = useAssets(orgId, {
    category: filterCategory || undefined,
    type:     filterType     || undefined,
    tag:      filterTag      || undefined,
    q:        search         || undefined,
  })

  const assets         = data?.assets         ?? []
  const total          = data?.total          ?? 0
  const categoryCounts = data?.categoryCounts ?? {}
  const typeCounts     = data?.typeCounts     ?? {}
  const allTags        = data?.allTags        ?? []

  const hasFilters = !!(filterCategory || filterType || filterTag || search)

  function toggleSelect(id: string, e: React.MouseEvent) {
    e.stopPropagation()
    setSelectedIds((prev) => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  return (
    <div className="h-full flex flex-col">

      {/* ------------------------------------------------------------------ */}
      {/* Header                                                              */}
      {/* ------------------------------------------------------------------ */}
      <div className="px-5 py-3.5 border-b border-border flex items-center gap-3 shrink-0 flex-wrap">
        <FolderOpen className="h-4 w-4 text-muted shrink-0" />
        <h1 className="font-display font-bold text-lg text-foreground">Asset Library</h1>
        <span className="text-xs text-muted">{isLoading ? '…' : `${total} assets`}</span>

        <div className="flex-1" />

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-zinc-600 pointer-events-none" />
          <input
            className="bg-surface-raised border border-border rounded-lg pl-8 pr-3 py-1.5 text-xs text-foreground placeholder:text-zinc-700 focus:outline-none focus:border-zinc-600 w-44"
            placeholder="Search assets…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          {search && (
            <button
              onClick={() => setSearch('')}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-zinc-600 hover:text-foreground"
            >
              <X className="h-3 w-3" />
            </button>
          )}
        </div>

        {/* Filter toggle */}
        <button
          onClick={() => setShowFilters((v) => !v)}
          className={cn(
            'flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-xs transition-colors',
            hasFilters || showFilters
              ? 'bg-accent/10 border-accent/40 text-accent'
              : 'border-border text-zinc-500 hover:border-zinc-600 hover:text-foreground',
          )}
        >
          <Filter className="h-3 w-3" />
          {hasFilters ? 'Filtered' : 'Filter'}
        </button>

        {/* Grid size */}
        <div className="hidden sm:flex items-center border border-border rounded-lg overflow-hidden">
          {(['sm','md','lg'] as GridSize[]).map((s, i) => (
            <button
              key={s}
              onClick={() => setGridSize(s)}
              className={cn(
                'px-2 py-1.5 transition-colors',
                i > 0 && 'border-l border-border',
                gridSize === s ? 'bg-surface-raised text-foreground' : 'text-zinc-600 hover:text-foreground',
              )}
              title={{ sm: 'Small', md: 'Medium', lg: 'Large' }[s]}
            >
              {s === 'sm' && <Grid3X3 className="h-3.5 w-3.5" />}
              {s === 'md' && <LayoutGrid className="h-3.5 w-3.5" />}
              {s === 'lg' && <List className="h-3.5 w-3.5" />}
            </button>
          ))}
        </div>

        {/* Refresh */}
        <button
          onClick={() => refetch()}
          className="text-zinc-600 hover:text-foreground transition-colors"
        >
          <RefreshCw className="h-3.5 w-3.5" />
        </button>

        {/* Upload */}
        <Button
          variant="primary"
          size="sm"
          icon={<Upload className="h-3.5 w-3.5" />}
          onClick={() => setShowUpload((v) => !v)}
        >
          Upload
        </Button>
      </div>

      {/* ------------------------------------------------------------------ */}
      {/* Filter bar                                                          */}
      {/* ------------------------------------------------------------------ */}
      {showFilters && (
        <div className="px-5 py-3 border-b border-border bg-surface-raised shrink-0 flex flex-wrap gap-2 items-center">
          {/* Type */}
          <select
            className="bg-surface border border-border rounded-lg px-3 py-1.5 text-xs text-foreground focus:outline-none"
            value={filterType}
            onChange={(e) => setFilterType(e.target.value as AssetType | '')}
          >
            <option value="">All types</option>
            {['image','video','gif','audio','document','template','other'].map((t) => (
              <option key={t} value={t}>{t} ({typeCounts[t] ?? 0})</option>
            ))}
          </select>

          {/* Tag */}
          <select
            className="bg-surface border border-border rounded-lg px-3 py-1.5 text-xs text-foreground focus:outline-none"
            value={filterTag}
            onChange={(e) => setFilterTag(e.target.value)}
          >
            <option value="">All tags</option>
            {allTags.map((t) => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>

          {hasFilters && (
            <button
              onClick={() => {
                setFilterCategory(''); setFilterType('');
                setFilterTag(''); setSearch('')
              }}
              className="text-xs text-zinc-600 hover:text-foreground underline"
            >
              Clear all
            </button>
          )}

          <span className="ml-auto text-[10px] text-zinc-600">
            {assets.length} matching
          </span>
        </div>
      )}

      {/* ------------------------------------------------------------------ */}
      {/* Category stats bar                                                  */}
      {/* ------------------------------------------------------------------ */}
      <div className="px-5 py-3 border-b border-border shrink-0">
        <AssetStatsBar
          total={total}
          categoryCounts={categoryCounts}
          activeCategory={filterCategory}
          onCategory={setFilterCategory}
        />
      </div>

      {/* ------------------------------------------------------------------ */}
      {/* Upload panel                                                        */}
      {/* ------------------------------------------------------------------ */}
      {showUpload && (
        <div className="px-5 py-4 border-b border-border bg-surface-raised shrink-0">
          <AssetUploadZone
            orgId={orgId}
            onDone={() => { setShowUpload(false); refetch() }}
          />
        </div>
      )}

      {/* ------------------------------------------------------------------ */}
      {/* Asset grid                                                          */}
      {/* ------------------------------------------------------------------ */}
      <div className="flex-1 overflow-y-auto p-5">
        {isLoading ? (
          <div className={cn('grid gap-3', GRID_COLS[gridSize])}>
            {Array.from({ length: 18 }).map((_, i) => (
              <div key={i}>
                <Skeleton className="aspect-square rounded-xl mb-2" />
                <Skeleton className="h-3 w-3/4 mb-1" />
                <Skeleton className="h-2.5 w-1/2" />
              </div>
            ))}
          </div>
        ) : assets.length === 0 ? (
          <div className="flex items-center justify-center py-20">
            <EmptyState
              icon={<FolderOpen className="h-10 w-10" />}
              title={hasFilters ? 'No assets match your filters' : 'No assets yet'}
              description={
                hasFilters
                  ? 'Try adjusting your filters or search.'
                  : 'Upload your first asset using the Upload button above.'
              }
              action={!hasFilters
                ? { label: 'Upload assets', onClick: () => setShowUpload(true) }
                : undefined
              }
            />
          </div>
        ) : (
          <div className={cn('grid gap-3', GRID_COLS[gridSize])}>
            {assets.map((asset) => (
              <AssetCard
                key={asset.id}
                asset={asset}
                selected={selectedIds.has(asset.id)}
                onSelect={setSelectedAsset}
              />
            ))}
          </div>
        )}
      </div>

      {/* ------------------------------------------------------------------ */}
      {/* Selection bar                                                       */}
      {/* ------------------------------------------------------------------ */}
      {selectedIds.size > 0 && (
        <div className="flex items-center gap-3 px-5 py-3 border-t border-border bg-surface-raised shrink-0">
          <span className="text-xs text-muted">{selectedIds.size} selected</span>
          <button
            onClick={() => setSelectedIds(new Set())}
            className="text-xs text-zinc-600 hover:text-foreground underline"
          >
            Clear
          </button>
        </div>
      )}

      {/* ------------------------------------------------------------------ */}
      {/* Detail modal                                                        */}
      {/* ------------------------------------------------------------------ */}
      {selectedAsset && (
        <AssetDetailModal
          asset={selectedAsset}
          onClose={() => setSelectedAsset(null)}
        />
      )}
    </div>
  )
}
