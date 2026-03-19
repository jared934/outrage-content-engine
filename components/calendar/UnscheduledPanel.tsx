'use client'

import { useState } from 'react'
import { Droppable, Draggable } from '@hello-pangea/dnd'
import { Inbox, ChevronDown, ChevronUp, Zap } from 'lucide-react'
import { cn } from '@/lib/utils/cn'
import { FORMAT_ICONS, STATUS_CONFIG } from '@/lib/pipeline/pipeline.types'
import type { PipelineItem } from '@/lib/pipeline/pipeline.types'

interface UnscheduledPanelProps {
  items:       PipelineItem[]
  onItemClick: (item: PipelineItem) => void
  /** on mobile this panel is collapsed by default */
  mobileCollapsed?: boolean
}

export function UnscheduledPanel({ items, onItemClick, mobileCollapsed = true }: UnscheduledPanelProps) {
  const [open, setOpen] = useState(!mobileCollapsed)

  return (
    <div className="flex flex-col border-l border-border bg-surface shrink-0 w-56 lg:w-64">
      {/* Header */}
      <div
        className="flex items-center gap-2 px-3 py-3 border-b border-border cursor-pointer select-none"
        onClick={() => setOpen((v) => !v)}
      >
        <Inbox className="h-3.5 w-3.5 text-muted shrink-0" />
        <span className="text-xs font-semibold text-foreground flex-1">Unscheduled</span>
        <span className="text-[10px] text-zinc-600 tabular-nums mr-1">{items.length}</span>
        {open ? <ChevronUp className="h-3 w-3 text-zinc-600" /> : <ChevronDown className="h-3 w-3 text-zinc-600" />}
      </div>

      {/* Tip */}
      {open && (
        <p className="text-[10px] text-zinc-700 px-3 py-2 border-b border-border leading-relaxed">
          Drag items onto the calendar to schedule them.
        </p>
      )}

      {/* Droppable list */}
      {open && (
        <Droppable droppableId="unscheduled">
          {(provided, snapshot) => (
            <div
              ref={provided.innerRef}
              {...provided.droppableProps}
              className={cn(
                'flex-1 overflow-y-auto p-2 space-y-1.5 min-h-[60px] transition-colors',
                snapshot.isDraggingOver && 'bg-zinc-800/30',
              )}
            >
              {items.length === 0 && !snapshot.isDraggingOver && (
                <div className="flex items-center justify-center py-6">
                  <span className="text-[10px] text-zinc-700 text-center px-2">
                    All items are scheduled
                  </span>
                </div>
              )}
              {items.map((item, idx) => {
                const cfg = STATUS_CONFIG[item.status]
                return (
                  <Draggable key={item.id} draggableId={item.id} index={idx}>
                    {(prov, snap) => (
                      <div
                        ref={prov.innerRef}
                        {...prov.draggableProps}
                        {...prov.dragHandleProps}
                        onClick={() => onItemClick(item)}
                        className={cn(
                          'flex items-start gap-2 px-2 py-2 rounded-lg border border-border bg-surface-raised',
                          'cursor-grab active:cursor-grabbing hover:border-zinc-600 transition-colors select-none',
                          snap.isDragging && 'shadow-xl rotate-1 z-50',
                        )}
                      >
                        <span className="text-sm shrink-0 mt-0.5">
                          {FORMAT_ICONS[item.format ?? ''] ?? '📄'}
                        </span>
                        <div className="flex-1 min-w-0">
                          <p className="text-[11px] font-medium text-foreground leading-snug line-clamp-2">
                            {item.title}
                          </p>
                          <div className="flex items-center gap-1 mt-1">
                            <span className={cn(
                              'text-[9px] px-1.5 py-0.5 rounded-full',
                              cfg.bgClass, cfg.textClass,
                            )}>
                              {cfg.label}
                            </span>
                            {(item.urgency ?? 0) >= 70 && (
                              <Zap className="h-2.5 w-2.5 text-amber-500" />
                            )}
                          </div>
                        </div>
                      </div>
                    )}
                  </Draggable>
                )
              })}
              {provided.placeholder}
            </div>
          )}
        </Droppable>
      )}
    </div>
  )
}
