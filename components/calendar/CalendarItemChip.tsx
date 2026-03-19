'use client'

import { Draggable } from '@hello-pangea/dnd'
import { Zap, ExternalLink } from 'lucide-react'
import { format, isValid } from 'date-fns'
import { cn } from '@/lib/utils/cn'
import { STATUS_CONFIG, FORMAT_ICONS } from '@/lib/pipeline/pipeline.types'
import type { PipelineItem } from '@/lib/pipeline/pipeline.types'

// Status → chip color (independent from STATUS_CONFIG bg which is too dark for small chips)
const STATUS_CHIP: Record<string, string> = {
  detected:        'bg-zinc-800 text-zinc-400 border-zinc-700',
  worth_exploring: 'bg-blue-950 text-blue-400 border-blue-800',
  drafting:        'bg-purple-950 text-purple-400 border-purple-800',
  designed:        'bg-indigo-950 text-indigo-400 border-indigo-800',
  approved:        'bg-green-950 text-green-400 border-green-800',
  scheduled:       'bg-amber-950 text-amber-400 border-amber-800',
  posted:          'bg-zinc-900 text-zinc-600 border-zinc-800',
  archived:        'bg-zinc-900 text-zinc-700 border-zinc-800',
  rejected:        'bg-red-950 text-red-700 border-red-900',
}

interface CalendarItemChipProps {
  item:       PipelineItem
  index:      number
  onClick:    (item: PipelineItem) => void
  /** compact = single-line chip for month view */
  compact?:   boolean
}

export function CalendarItemChip({ item, index, onClick, compact = false }: CalendarItemChipProps) {
  const chipClass = STATUS_CHIP[item.status] ?? 'bg-zinc-800 text-zinc-400 border-zinc-700'
  const timeStr   = item.publish_at && isValid(new Date(item.publish_at))
    ? format(new Date(item.publish_at), 'h:mma').toLowerCase()
    : null

  if (compact) {
    return (
      <Draggable draggableId={item.id} index={index}>
        {(provided, snapshot) => (
          <div
            ref={provided.innerRef}
            {...provided.draggableProps}
            {...provided.dragHandleProps}
            onClick={(e) => { e.stopPropagation(); onClick(item) }}
            className={cn(
              'flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] border truncate cursor-pointer',
              'hover:opacity-90 transition-opacity select-none',
              chipClass,
              snapshot.isDragging && 'shadow-lg rotate-1 z-50 opacity-90',
            )}
            title={item.title}
          >
            <span className="shrink-0">{FORMAT_ICONS[item.format ?? ''] ?? '📄'}</span>
            {timeStr && <span className="shrink-0 opacity-70">{timeStr}</span>}
            <span className="truncate">{item.title}</span>
            {(item.urgency ?? 0) >= 70 && (
              <Zap className="h-2.5 w-2.5 shrink-0 text-amber-500" />
            )}
          </div>
        )}
      </Draggable>
    )
  }

  // Full card (week view)
  return (
    <Draggable draggableId={item.id} index={index}>
      {(provided, snapshot) => (
        <div
          ref={provided.innerRef}
          {...provided.draggableProps}
          {...provided.dragHandleProps}
          onClick={(e) => { e.stopPropagation(); onClick(item) }}
          className={cn(
            'flex flex-col gap-0.5 px-2 py-1.5 rounded-lg border cursor-pointer select-none',
            'hover:opacity-90 transition-opacity group',
            chipClass,
            snapshot.isDragging && 'shadow-xl rotate-1 z-50',
          )}
        >
          <div className="flex items-center gap-1.5">
            <span className="text-xs shrink-0">{FORMAT_ICONS[item.format ?? ''] ?? '📄'}</span>
            <span className="text-xs font-medium truncate flex-1">{item.title}</span>
            {(item.urgency ?? 0) >= 70 && (
              <Zap className="h-3 w-3 shrink-0 text-amber-500" />
            )}
          </div>
          <div className="flex items-center gap-1.5 text-[10px] opacity-70">
            {timeStr && <span>{timeStr}</span>}
            {item.platform && <span>· {item.platform}</span>}
            {item.cluster_title && (
              <span className="truncate">· {item.cluster_title}</span>
            )}
          </div>
        </div>
      )}
    </Draggable>
  )
}
