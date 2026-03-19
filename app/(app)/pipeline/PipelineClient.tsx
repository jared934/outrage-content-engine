'use client'

import { useState, useMemo } from 'react'
import {
  KanbanSquare, List, Plus, Search, Filter,
  RefreshCw, LayoutGrid, Archive,
} from 'lucide-react'
import { usePipelineItems } from '@/hooks/usePipelineItems'
import { KanbanBoard }          from '@/components/pipeline/KanbanBoard'
import { PipelineListView }     from '@/components/pipeline/PipelineListView'
import { ContentDetailDrawer }  from '@/components/pipeline/ContentDetailDrawer'
import { AddContentModal }      from '@/components/pipeline/AddContentModal'
import { Button }    from '@/components/ui/Button'
import { Skeleton }  from '@/components/ui/Skeleton'
import { cn }        from '@/lib/utils/cn'
import {
  PIPELINE_STATUSES,
  STATUS_CONFIG,
  FORMAT_OPTIONS,
  PLATFORM_OPTIONS,
} from '@/lib/pipeline/pipeline.types'
import type { PipelineItem, PipelineStatus } from '@/lib/pipeline/pipeline.types'

interface PipelineClientProps {
  orgId: string
}

type View = 'kanban' | 'list'

export function PipelineClient({ orgId }: PipelineClientProps) {
  const [view,         setView]         = useState<View>('kanban')
  const [search,       setSearch]       = useState('')
  const [filterStatus, setFilterStatus] = useState<PipelineStatus | ''>('')
  const [filterFormat, setFilterFormat] = useState('')
  const [showArchived, setShowArchived] = useState(false)
  const [showFilters,  setShowFilters]  = useState(false)

  const [selectedItem, setSelectedItem] = useState<PipelineItem | null>(null)
  const [addModal,     setAddModal]     = useState<{ open: boolean; status?: PipelineStatus }>({ open: false })

  const { data: items = [], isLoading, refetch } = usePipelineItems(orgId)

  // Client-side filtering
  const filtered = useMemo(() => {
    let list = items
    if (search)        list = list.filter((i) => i.title.toLowerCase().includes(search.toLowerCase()))
    if (filterStatus)  list = list.filter((i) => i.status === filterStatus)
    if (filterFormat)  list = list.filter((i) => i.format === filterFormat)
    if (!showArchived) list = list.filter((i) => i.status !== 'archived' && i.status !== 'rejected')
    return list
  }, [items, search, filterStatus, filterFormat, showArchived])

  const totalActive = items.filter((i) => !['archived', 'rejected', 'posted'].includes(i.status)).length

  return (
    <div className="h-full flex flex-col">

      {/* ------------------------------------------------------------------ */}
      {/* Header                                                              */}
      {/* ------------------------------------------------------------------ */}
      <div className="px-5 py-3.5 border-b border-border flex items-center gap-3 shrink-0">
        <KanbanSquare className="h-4 w-4 text-muted shrink-0" />
        <h1 className="font-display font-bold text-lg text-foreground">Content Pipeline</h1>
        <span className="text-xs text-muted">
          {isLoading ? '…' : `${totalActive} active`}
        </span>

        <div className="flex-1" />

        {/* Search */}
        <div className="relative hidden sm:block">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-zinc-600 pointer-events-none" />
          <input
            className="bg-surface-raised border border-border rounded-lg pl-8 pr-3 py-1.5 text-xs text-foreground placeholder:text-zinc-700 focus:outline-none focus:border-zinc-600 w-48"
            placeholder="Search items…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        {/* Filter toggle */}
        <button
          onClick={() => setShowFilters((v) => !v)}
          className={cn(
            'flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-xs transition-colors',
            showFilters
              ? 'bg-accent/10 border-accent/40 text-accent'
              : 'border-border text-zinc-500 hover:border-zinc-600 hover:text-foreground',
          )}
        >
          <Filter className="h-3 w-3" />
          Filters
        </button>

        {/* View toggle */}
        <div className="flex items-center border border-border rounded-lg overflow-hidden">
          <button
            onClick={() => setView('kanban')}
            className={cn(
              'px-2.5 py-1.5 transition-colors',
              view === 'kanban' ? 'bg-surface-raised text-foreground' : 'text-zinc-600 hover:text-foreground',
            )}
            title="Kanban"
          >
            <LayoutGrid className="h-3.5 w-3.5" />
          </button>
          <button
            onClick={() => setView('list')}
            className={cn(
              'px-2.5 py-1.5 transition-colors border-l border-border',
              view === 'list' ? 'bg-surface-raised text-foreground' : 'text-zinc-600 hover:text-foreground',
            )}
            title="List"
          >
            <List className="h-3.5 w-3.5" />
          </button>
        </div>

        {/* Refresh */}
        <button
          onClick={() => refetch()}
          className="text-zinc-600 hover:text-foreground transition-colors"
          title="Refresh"
        >
          <RefreshCw className="h-3.5 w-3.5" />
        </button>

        {/* Add */}
        <Button
          variant="primary"
          size="sm"
          icon={<Plus className="h-3.5 w-3.5" />}
          onClick={() => setAddModal({ open: true })}
        >
          Add
        </Button>
      </div>

      {/* ------------------------------------------------------------------ */}
      {/* Filter bar                                                          */}
      {/* ------------------------------------------------------------------ */}
      {showFilters && (
        <div className="px-5 py-3 border-b border-border flex flex-wrap items-center gap-2 bg-surface-raised shrink-0">
          {/* Status filter */}
          <select
            className="bg-surface border border-border rounded-lg px-3 py-1.5 text-xs text-foreground focus:outline-none focus:border-zinc-600"
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value as PipelineStatus | '')}
          >
            <option value="">All statuses</option>
            {PIPELINE_STATUSES.map((s) => (
              <option key={s} value={s}>{STATUS_CONFIG[s].label}</option>
            ))}
          </select>

          {/* Format filter */}
          <select
            className="bg-surface border border-border rounded-lg px-3 py-1.5 text-xs text-foreground focus:outline-none focus:border-zinc-600"
            value={filterFormat}
            onChange={(e) => setFilterFormat(e.target.value)}
          >
            <option value="">All formats</option>
            {FORMAT_OPTIONS.map((f) => (
              <option key={f.value} value={f.value}>{f.icon} {f.label}</option>
            ))}
          </select>

          {/* Show archived toggle */}
          <button
            onClick={() => setShowArchived((v) => !v)}
            className={cn(
              'flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-xs transition-colors',
              showArchived
                ? 'bg-stone-900 border-stone-700 text-stone-400'
                : 'border-border text-zinc-600 hover:border-zinc-600',
            )}
          >
            <Archive className="h-3 w-3" />
            {showArchived ? 'Hiding archived' : 'Show archived'}
          </button>

          {(filterStatus || filterFormat || search) && (
            <button
              onClick={() => { setFilterStatus(''); setFilterFormat(''); setSearch('') }}
              className="text-xs text-zinc-600 hover:text-foreground transition-colors underline"
            >
              Clear all
            </button>
          )}

          <span className="ml-auto text-[10px] text-zinc-600">
            {filtered.length} of {items.length} items
          </span>
        </div>
      )}

      {/* ------------------------------------------------------------------ */}
      {/* Board / List                                                        */}
      {/* ------------------------------------------------------------------ */}
      {isLoading ? (
        <div className="flex gap-3 p-5 flex-1 overflow-x-auto">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="w-64 shrink-0 space-y-2">
              <Skeleton className="h-7 w-full rounded-lg" />
              {Array.from({ length: 3 }).map((_, j) => (
                <Skeleton key={j} className="h-20 w-full rounded-lg" />
              ))}
            </div>
          ))}
        </div>
      ) : view === 'kanban' ? (
        <KanbanBoard
          items={filtered}
          onCard={setSelectedItem}
          onAdd={(status) => setAddModal({ open: true, status })}
          showArchived={showArchived}
        />
      ) : (
        <div className="flex-1 overflow-y-auto">
          <PipelineListView items={filtered} onCard={setSelectedItem} />
        </div>
      )}

      {/* ------------------------------------------------------------------ */}
      {/* Detail drawer                                                       */}
      {/* ------------------------------------------------------------------ */}
      {selectedItem && (
        <ContentDetailDrawer
          item={selectedItem}
          onClose={() => setSelectedItem(null)}
        />
      )}

      {/* ------------------------------------------------------------------ */}
      {/* Add modal                                                           */}
      {/* ------------------------------------------------------------------ */}
      {addModal.open && (
        <AddContentModal
          orgId={orgId}
          defaultStatus={addModal.status}
          onClose={() => setAddModal({ open: false })}
        />
      )}
    </div>
  )
}
