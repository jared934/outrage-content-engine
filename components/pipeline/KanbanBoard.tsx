'use client'

import { useState } from 'react'
import { DragDropContext, type DropResult } from '@hello-pangea/dnd'
import { KanbanColumn } from './KanbanColumn'
import { useMovePipelineItem } from '@/hooks/usePipelineItems'
import { PIPELINE_STATUSES, STATUS_CONFIG } from '@/lib/pipeline/pipeline.types'
import { cn } from '@/lib/utils/cn'
import type { PipelineItem, PipelineStatus } from '@/lib/pipeline/pipeline.types'

// Statuses excluded from default kanban view (can toggle in filter)
const HIDDEN_BY_DEFAULT: PipelineStatus[] = ['archived', 'rejected']

interface KanbanBoardProps {
  items:          PipelineItem[]
  onCard:         (item: PipelineItem) => void
  onAdd?:         (status: PipelineStatus) => void
  showArchived?:  boolean
}

export function KanbanBoard({ items, onCard, onAdd, showArchived = false }: KanbanBoardProps) {
  const { mutate: moveItem } = useMovePipelineItem()

  const visibleStatuses = PIPELINE_STATUSES.filter((s) =>
    showArchived ? true : !HIDDEN_BY_DEFAULT.includes(s)
  )

  // Mobile: show one column at a time
  const [mobileCol, setMobileCol] = useState<PipelineStatus>(visibleStatuses[0])

  function onDragEnd(result: DropResult) {
    if (!result.destination) return
    const newStatus = result.destination.droppableId as PipelineStatus
    const position  = result.destination.index
    moveItem({ id: result.draggableId, status: newStatus, position })
  }

  return (
    <DragDropContext onDragEnd={onDragEnd}>
      {/* Mobile column picker */}
      <div className="md:hidden flex gap-1.5 px-4 pt-4 overflow-x-auto pb-1" style={{ scrollbarWidth: 'none' }}>
        {visibleStatuses.map((s) => {
          const cfg   = STATUS_CONFIG[s]
          const count = items.filter((i) => i.status === s).length
          const active = mobileCol === s
          return (
            <button
              key={s}
              onClick={() => setMobileCol(s)}
              className={cn(
                'flex items-center gap-1.5 shrink-0 px-3 py-1.5 rounded-full text-xs font-medium border transition-all',
                active
                  ? cn(cfg.bgClass, cfg.textClass, cfg.borderClass)
                  : 'border-border text-muted hover:border-zinc-600',
              )}
            >
              <span className={cn('h-1.5 w-1.5 rounded-full', cfg.dotClass)} />
              {cfg.label}
              {count > 0 && <span className="tabular-nums">{count}</span>}
            </button>
          )
        })}
      </div>

      {/* Mobile: single column */}
      <div className="md:hidden px-4 pt-3 pb-8 flex-1 overflow-y-auto">
        {(() => {
          const colItems = items
            .filter((i) => i.status === mobileCol)
            .sort((a, b) => a.position - b.position)
          return (
            <KanbanColumn
              status={mobileCol}
              items={colItems}
              onCard={onCard}
              onAdd={onAdd}
            />
          )
        })()}
      </div>

      {/* Desktop: all columns side by side */}
      <div className="hidden md:flex gap-3 p-5 flex-1 overflow-x-auto pb-8 min-h-0" style={{ scrollbarWidth: 'none' }}>
        {visibleStatuses.map((status) => {
          const colItems = items
            .filter((i) => i.status === status)
            .sort((a, b) => a.position - b.position)
          return (
            <KanbanColumn
              key={status}
              status={status}
              items={colItems}
              onCard={onCard}
              onAdd={onAdd}
            />
          )
        })}
      </div>
    </DragDropContext>
  )
}
