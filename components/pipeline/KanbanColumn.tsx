'use client'

import { Droppable } from '@hello-pangea/dnd'
import { Plus } from 'lucide-react'
import { ContentCard } from './ContentCard'
import { cn } from '@/lib/utils/cn'
import { STATUS_CONFIG } from '@/lib/pipeline/pipeline.types'
import type { PipelineItem, PipelineStatus } from '@/lib/pipeline/pipeline.types'

interface KanbanColumnProps {
  status:   PipelineStatus
  items:    PipelineItem[]
  onCard:   (item: PipelineItem) => void
  onAdd?:   (status: PipelineStatus) => void
}

export function KanbanColumn({ status, items, onCard, onAdd }: KanbanColumnProps) {
  const cfg = STATUS_CONFIG[status]

  return (
    <div className="flex flex-col w-[260px] shrink-0">
      {/* Header */}
      <div className={cn(
        'flex items-center gap-2 mb-2 px-2 py-1.5 rounded-t-lg border-b',
        cfg.bgClass, cfg.borderClass,
      )}>
        <div className={cn('h-2 w-2 rounded-full shrink-0', cfg.dotClass)} />
        <span className={cn('text-xs font-semibold uppercase tracking-wide flex-1', cfg.textClass)}>
          {cfg.label}
        </span>
        <span className="text-[10px] text-zinc-600 tabular-nums mr-1">{items.length}</span>
        {onAdd && (
          <button
            onClick={() => onAdd(status)}
            className="text-zinc-700 hover:text-zinc-400 transition-colors"
            title={`Add to ${cfg.label}`}
          >
            <Plus className="h-3 w-3" />
          </button>
        )}
      </div>

      {/* Drop zone */}
      <Droppable droppableId={status}>
        {(provided, snapshot) => (
          <div
            ref={provided.innerRef}
            {...provided.droppableProps}
            className={cn(
              'flex-1 min-h-[120px] rounded-b-lg transition-colors space-y-2 p-1',
              snapshot.isDraggingOver
                ? cn('border border-dashed', cfg.borderClass, cfg.bgClass)
                : 'bg-transparent',
            )}
          >
            {items.length === 0 && !snapshot.isDraggingOver && (
              <div className="flex items-center justify-center h-16 rounded-md border border-dashed border-zinc-800/60">
                <span className="text-[10px] text-zinc-700">Drop here</span>
              </div>
            )}
            {items.map((item, idx) => (
              <ContentCard key={item.id} item={item} index={idx} onClick={onCard} />
            ))}
            {provided.placeholder}
          </div>
        )}
      </Droppable>
    </div>
  )
}
