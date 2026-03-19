'use client'

import { useState } from 'react'
import { ExternalLink, Trash2, ChevronRight, Download } from 'lucide-react'
import { cn } from '@/lib/utils/cn'
import { CanvaStatusBadge } from './CanvaStatusBadge'
import { CanvaHandoffModal } from './CanvaHandoffModal'
import { Skeleton } from '@/components/ui/Skeleton'
import type {
  CanvaExport, CanvaTemplateType, ExportStatus, ExportListFilters,
} from '@/lib/canva/canva.types'
import { TEMPLATE_LABELS } from '@/lib/canva/canva.types'
import {
  useCanvaExports,
  useUpdateCanvaExport,
  useDeleteCanvaExport,
} from '@/hooks/useCanvaExport'

interface ExportHistoryProps {
  orgId:     string
  filters?:  ExportListFilters
  compact?:  boolean
}

const TEMPLATE_FILTERS: Array<{ value: CanvaTemplateType | ''; label: string }> = [
  { value: '',               label: 'All templates' },
  { value: 'breaking_alert', label: 'Breaking Alert' },
  { value: 'meme',           label: 'Meme' },
  { value: 'story',          label: 'Story' },
  { value: 'carousel_cover', label: 'Carousel Cover' },
  { value: 'reel_cover',     label: 'Reel Cover' },
  { value: 'quote_graphic',  label: 'Quote Graphic' },
]

const STATUS_FILTERS: Array<{ value: ExportStatus | ''; label: string }> = [
  { value: '',           label: 'All statuses' },
  { value: 'pending',    label: 'Pending' },
  { value: 'in_progress',label: 'In Progress' },
  { value: 'designed',   label: 'Designed' },
  { value: 'review',     label: 'In Review' },
  { value: 'approved',   label: 'Approved' },
  { value: 'published',  label: 'Published' },
]

export function ExportHistory({ orgId, filters: initialFilters, compact }: ExportHistoryProps) {
  const [templateFilter, setTemplateFilter] = useState<CanvaTemplateType | ''>(
    initialFilters?.template_type ?? ''
  )
  const [statusFilter, setStatusFilter] = useState<ExportStatus | ''>(
    initialFilters?.status ?? ''
  )
  const [selectedExport, setSelectedExport] = useState<CanvaExport | null>(null)

  const { data: exports = [], isLoading } = useCanvaExports(orgId, {
    template_type: templateFilter || undefined,
    status:        statusFilter   || undefined,
    limit:         50,
  })

  const updateExport = useUpdateCanvaExport(orgId)
  const deleteExport = useDeleteCanvaExport(orgId)

  if (isLoading) {
    return (
      <div className="space-y-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-16 rounded-lg" />
        ))}
      </div>
    )
  }

  return (
    <>
      <div className="space-y-3">
        {/* Filters */}
        {!compact && (
          <div className="flex items-center gap-2">
            <select
              value={templateFilter}
              onChange={(e) => setTemplateFilter(e.target.value as CanvaTemplateType | '')}
              className="flex-1 bg-surface border border-border text-xs text-foreground rounded-lg px-3 py-1.5 focus:outline-none"
            >
              {TEMPLATE_FILTERS.map((f) => (
                <option key={f.value} value={f.value}>{f.label}</option>
              ))}
            </select>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as ExportStatus | '')}
              className="flex-1 bg-surface border border-border text-xs text-foreground rounded-lg px-3 py-1.5 focus:outline-none"
            >
              {STATUS_FILTERS.map((f) => (
                <option key={f.value} value={f.value}>{f.label}</option>
              ))}
            </select>
          </div>
        )}

        {/* Empty state */}
        {exports.length === 0 && (
          <div className="flex flex-col items-center justify-center py-10 text-center">
            <Download className="h-8 w-8 text-zinc-700 mb-2" />
            <p className="text-sm text-muted">No exports yet</p>
            <p className="text-xs text-zinc-600 mt-0.5">
              Export a content idea or meme to kick off a Canva workflow.
            </p>
          </div>
        )}

        {/* Export rows */}
        <div className="space-y-1.5">
          {exports.map((record) => (
            <ExportRow
              key={record.id}
              record={record}
              onOpen={() => setSelectedExport(record)}
              onDelete={() => deleteExport.mutate(record.id)}
            />
          ))}
        </div>
      </div>

      {/* Handoff modal */}
      {selectedExport && (
        <CanvaHandoffModal
          open={!!selectedExport}
          onClose={() => setSelectedExport(null)}
          record={selectedExport}
          isSaving={updateExport.isPending}
          onUpdate={(updates) => {
            updateExport.mutate(
              { id: selectedExport.id, ...updates },
              {
                onSuccess: (updated) => setSelectedExport(updated),
              }
            )
          }}
        />
      )}
    </>
  )
}

// ---------------------------------------------------------------------------
// Single row
// ---------------------------------------------------------------------------

function ExportRow({
  record, onOpen, onDelete,
}: {
  record:   CanvaExport
  onOpen:   () => void
  onDelete: () => void
}) {
  const headline = record.payload?.headline ?? record.name
  const dateStr  = new Date(record.created_at).toLocaleDateString([], {
    month: 'short', day: 'numeric',
  })

  return (
    <div className="flex items-center gap-3 px-3 py-2.5 rounded-lg border border-border bg-surface hover:border-zinc-600 transition-all">
      {/* Template type pill */}
      <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded border border-zinc-700 text-zinc-400 bg-zinc-900 flex-shrink-0">
        {TEMPLATE_LABELS[record.template_type as CanvaTemplateType]}
      </span>

      {/* Name / headline */}
      <button
        onClick={onOpen}
        className="flex-1 text-left min-w-0"
      >
        <p className="text-xs text-foreground font-medium truncate">{headline}</p>
        <p className="text-[10px] text-zinc-600">{dateStr}</p>
      </button>

      {/* Status */}
      <CanvaStatusBadge status={record.status as ExportStatus} size="sm" />

      {/* Design link */}
      {record.canva_design_url && (
        <a
          href={record.canva_design_url}
          target="_blank"
          rel="noopener noreferrer"
          onClick={(e) => e.stopPropagation()}
          className="text-zinc-600 hover:text-accent transition-colors flex-shrink-0"
          title="Open design in Canva"
        >
          <ExternalLink className="h-3.5 w-3.5" />
        </a>
      )}

      {/* Open handoff */}
      <button
        onClick={onOpen}
        className="text-zinc-600 hover:text-muted transition-colors flex-shrink-0"
      >
        <ChevronRight className="h-3.5 w-3.5" />
      </button>

      {/* Delete */}
      <button
        onClick={(e) => { e.stopPropagation(); onDelete() }}
        className="text-zinc-700 hover:text-red-400 transition-colors flex-shrink-0"
      >
        <Trash2 className="h-3.5 w-3.5" />
      </button>
    </div>
  )
}
