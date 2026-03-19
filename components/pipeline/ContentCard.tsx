'use client'

import { Draggable } from '@hello-pangea/dnd'
import { ExternalLink, Trash2, Calendar, Zap } from 'lucide-react'
import { Badge } from '@/components/ui/Badge'
import { useDeletePipelineItem } from '@/hooks/usePipelineItems'
import { cn } from '@/lib/utils/cn'
import { FORMAT_ICONS } from '@/lib/pipeline/pipeline.types'
import type { PipelineItem } from '@/lib/pipeline/pipeline.types'

interface ContentCardProps {
  item:    PipelineItem
  index:   number
  onClick: (item: PipelineItem) => void
}

function formatDue(due_at: string | null): string | null {
  if (!due_at) return null
  const d = new Date(due_at)
  const now = Date.now()
  const diff = d.getTime() - now
  if (diff < 0) return 'Overdue'
  if (diff < 3_600_000) return `${Math.round(diff / 60_000)}m`
  if (diff < 86_400_000) return `${Math.round(diff / 3_600_000)}h`
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

export function ContentCard({ item, index, onClick }: ContentCardProps) {
  const { mutate: deleteItem } = useDeletePipelineItem()
  const dueLabel    = formatDue(item.due_at)
  const isOverdue   = dueLabel === 'Overdue'
  const urgencyHigh = (item.urgency ?? 0) >= 70

  return (
    <Draggable draggableId={item.id} index={index}>
      {(provided, snapshot) => (
        <div
          ref={provided.innerRef}
          {...provided.draggableProps}
          {...provided.dragHandleProps}
          onClick={() => onClick(item)}
          className={cn(
            'bg-surface border border-border rounded-lg p-3 cursor-grab active:cursor-grabbing',
            'hover:border-zinc-600 transition-colors select-none group',
            snapshot.isDragging && 'shadow-2xl border-accent/50 rotate-1 scale-[1.02] z-50',
          )}
        >
          {/* Top row: format icon + title + delete */}
          <div className="flex items-start gap-2 mb-2">
            <span className="text-sm shrink-0 mt-0.5" title={item.format ?? 'content'}>
              {FORMAT_ICONS[item.format ?? ''] ?? '📄'}
            </span>
            <p className="text-xs font-medium text-foreground line-clamp-2 leading-snug flex-1 min-w-0">
              {item.title}
            </p>
            <button
              className="text-zinc-700 hover:text-red-500 shrink-0 -mt-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
              onClick={(e) => { e.stopPropagation(); deleteItem(item.id) }}
              title="Delete"
            >
              <Trash2 className="h-3 w-3" />
            </button>
          </div>

          {/* Cluster pill */}
          {item.cluster_title && (
            <p className="text-[10px] text-muted truncate mb-2 leading-none">
              ↗ {item.cluster_title}
            </p>
          )}

          {/* Bottom row: platform + due + urgency */}
          <div className="flex items-center gap-1.5 flex-wrap">
            {item.platform && (
              <Badge variant="muted" size="sm">
                {item.platform}
              </Badge>
            )}
            {dueLabel && (
              <span className={cn(
                'flex items-center gap-0.5 text-[10px]',
                isOverdue ? 'text-red-500' : 'text-zinc-500',
              )}>
                <Calendar className="h-2.5 w-2.5" />
                {dueLabel}
              </span>
            )}
            {urgencyHigh && (
              <span className="ml-auto flex items-center gap-0.5 text-[10px] text-amber-500">
                <Zap className="h-2.5 w-2.5" />
                {item.urgency}
              </span>
            )}
            {item.design_link && (
              <a
                href={item.design_link}
                target="_blank"
                rel="noopener noreferrer"
                onClick={(e) => e.stopPropagation()}
                className="ml-auto text-zinc-600 hover:text-indigo-400 transition-colors"
                title="Design link"
              >
                <ExternalLink className="h-3 w-3" />
              </a>
            )}
          </div>
        </div>
      )}
    </Draggable>
  )
}
