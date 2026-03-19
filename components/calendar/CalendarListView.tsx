'use client'

import { format, isToday, isTomorrow, isYesterday, isPast, isFuture } from 'date-fns'
import { Zap, Calendar, ExternalLink } from 'lucide-react'
import Link from 'next/link'
import { cn } from '@/lib/utils/cn'
import { Badge } from '@/components/ui/Badge'
import { STATUS_CONFIG, FORMAT_ICONS } from '@/lib/pipeline/pipeline.types'
import type { PipelineItem } from '@/lib/pipeline/pipeline.types'

interface CalendarListViewProps {
  scheduled:   PipelineItem[]
  unscheduled: PipelineItem[]
  onItemClick: (item: PipelineItem) => void
}

function dayLabel(date: Date): string {
  if (isToday(date))     return 'Today'
  if (isTomorrow(date))  return 'Tomorrow'
  if (isYesterday(date)) return 'Yesterday'
  return format(date, 'EEEE, MMMM d')
}

export function CalendarListView({ scheduled, unscheduled, onItemClick }: CalendarListViewProps) {
  // Group by day
  const dayMap = new Map<string, { date: Date; items: PipelineItem[] }>()
  for (const item of scheduled) {
    if (!item.publish_at) continue
    const d = new Date(item.publish_at)
    const key = format(d, 'yyyy-MM-dd')
    if (!dayMap.has(key)) dayMap.set(key, { date: d, items: [] })
    dayMap.get(key)!.items.push(item)
  }

  // Sort days chronologically, upcoming first
  const sortedDays = Array.from(dayMap.entries())
    .sort(([a], [b]) => a.localeCompare(b))

  if (sortedDays.length === 0 && unscheduled.length === 0) {
    return (
      <div className="flex items-center justify-center py-20 text-sm text-muted">
        No content scheduled. Drag items from the sidebar or edit publish times in the Pipeline.
      </div>
    )
  }

  return (
    <div className="space-y-6 p-5">
      {sortedDays.map(([key, { date, items }]) => {
        const past = isPast(date) && !isToday(date)
        return (
          <div key={key}>
            {/* Day header */}
            <div className={cn(
              'flex items-center gap-3 mb-2',
              past && 'opacity-50',
            )}>
              <div className={cn(
                'flex-shrink-0 h-8 w-8 rounded-full flex items-center justify-center text-xs font-bold',
                isToday(date) ? 'bg-accent text-white' : 'bg-surface-raised text-muted border border-border',
              )}>
                {format(date, 'd')}
              </div>
              <div>
                <p className={cn(
                  'text-sm font-semibold',
                  isToday(date) ? 'text-accent' : 'text-foreground',
                )}>
                  {dayLabel(date)}
                </p>
                <p className="text-[10px] text-muted">{format(date, 'EEEE, MMMM yyyy')}</p>
              </div>
              <span className="ml-auto text-xs text-zinc-600">{items.length} item{items.length !== 1 ? 's' : ''}</span>
            </div>

            {/* Items */}
            <div className="ml-11 space-y-1.5">
              {items.map((item) => (
                <ListItem key={item.id} item={item} onClick={onItemClick} />
              ))}
            </div>
          </div>
        )
      })}

      {/* Unscheduled section */}
      {unscheduled.length > 0 && (
        <div>
          <div className="flex items-center gap-3 mb-2">
            <div className="flex-shrink-0 h-8 w-8 rounded-full flex items-center justify-center border border-dashed border-zinc-700">
              <Calendar className="h-3.5 w-3.5 text-zinc-600" />
            </div>
            <p className="text-sm font-semibold text-zinc-500">Unscheduled</p>
            <span className="ml-auto text-xs text-zinc-600">{unscheduled.length}</span>
          </div>
          <div className="ml-11 space-y-1.5">
            {unscheduled.map((item) => (
              <ListItem key={item.id} item={item} onClick={onItemClick} dim />
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

function ListItem({
  item, onClick, dim = false,
}: { item: PipelineItem; onClick: (i: PipelineItem) => void; dim?: boolean }) {
  const cfg = STATUS_CONFIG[item.status]
  const timeStr = item.publish_at
    ? format(new Date(item.publish_at), 'h:mm a')
    : null

  return (
    <button
      onClick={() => onClick(item)}
      className={cn(
        'w-full flex items-center gap-3 px-3 py-2.5 rounded-lg bg-surface border border-border',
        'hover:border-zinc-600 hover:bg-surface-raised transition-colors text-left group',
        dim && 'opacity-50',
      )}
    >
      {/* Time */}
      <div className="w-12 shrink-0 text-[11px] text-zinc-600 font-medium tabular-nums text-right">
        {timeStr ?? '—'}
      </div>

      {/* Format icon */}
      <span className="text-sm shrink-0">{FORMAT_ICONS[item.format ?? ''] ?? '📄'}</span>

      {/* Title + meta */}
      <div className="flex-1 min-w-0">
        <p className="text-xs font-medium text-foreground truncate">{item.title}</p>
        <div className="flex items-center gap-2 mt-0.5">
          {item.cluster_title && (
            <span className="text-[10px] text-muted truncate">↗ {item.cluster_title}</span>
          )}
          {item.platform && (
            <span className="text-[10px] text-zinc-600">{item.platform}</span>
          )}
        </div>
      </div>

      {/* Status */}
      <span className={cn(
        'hidden sm:block text-[9px] px-2 py-0.5 rounded-full border font-semibold uppercase tracking-wide',
        cfg.bgClass, cfg.textClass, cfg.borderClass,
      )}>
        {cfg.label}
      </span>

      {/* Urgency */}
      {(item.urgency ?? 0) >= 70 && (
        <Zap className="h-3.5 w-3.5 text-amber-500 shrink-0" />
      )}
    </button>
  )
}
