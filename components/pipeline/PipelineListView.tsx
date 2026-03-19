'use client'

import Link from 'next/link'
import { Calendar, ExternalLink, Zap } from 'lucide-react'
import { Badge } from '@/components/ui/Badge'
import { cn } from '@/lib/utils/cn'
import { STATUS_CONFIG, FORMAT_ICONS } from '@/lib/pipeline/pipeline.types'
import type { PipelineItem } from '@/lib/pipeline/pipeline.types'

interface PipelineListViewProps {
  items:   PipelineItem[]
  onCard:  (item: PipelineItem) => void
}

function fmtDate(d: string | null) {
  if (!d) return null
  return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

export function PipelineListView({ items, onCard }: PipelineListViewProps) {
  if (items.length === 0) {
    return (
      <div className="flex items-center justify-center py-20 text-sm text-muted">
        No pipeline items match your filters.
      </div>
    )
  }

  return (
    <div className="divide-y divide-border">
      {/* Header */}
      <div className="grid grid-cols-[1fr_100px_90px_90px_80px_60px] gap-3 px-4 py-2 text-[10px] text-zinc-600 uppercase tracking-wider font-semibold">
        <span>Title</span>
        <span>Status</span>
        <span>Format</span>
        <span>Platform</span>
        <span>Due</span>
        <span className="text-right">Urgency</span>
      </div>

      {items.map((item) => {
        const cfg = STATUS_CONFIG[item.status]
        return (
          <div
            key={item.id}
            onClick={() => onCard(item)}
            className="grid grid-cols-[1fr_100px_90px_90px_80px_60px] gap-3 px-4 py-3 hover:bg-surface-raised transition-colors cursor-pointer items-center group"
          >
            {/* Title */}
            <div className="min-w-0">
              <p className="text-sm text-foreground truncate font-medium">{item.title}</p>
              {item.cluster_title && (
                <p className="text-[10px] text-muted truncate mt-0.5">↗ {item.cluster_title}</p>
              )}
            </div>

            {/* Status */}
            <div>
              <span className={cn(
                'inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold border',
                cfg.bgClass, cfg.textClass, cfg.borderClass,
              )}>
                <span className={cn('h-1.5 w-1.5 rounded-full shrink-0', cfg.dotClass)} />
                {cfg.label}
              </span>
            </div>

            {/* Format */}
            <div className="text-sm text-muted">
              {item.format ? (
                <span className="flex items-center gap-1">
                  <span>{FORMAT_ICONS[item.format] ?? '📄'}</span>
                  <span className="text-xs capitalize">{item.format}</span>
                </span>
              ) : <span className="text-zinc-700">—</span>}
            </div>

            {/* Platform */}
            <div>
              {item.platform
                ? <Badge variant="muted" size="sm">{item.platform}</Badge>
                : <span className="text-xs text-zinc-700">—</span>
              }
            </div>

            {/* Due */}
            <div className="text-xs text-zinc-500">
              {item.due_at ? (
                <span className="flex items-center gap-1">
                  <Calendar className="h-3 w-3" />
                  {fmtDate(item.due_at)}
                </span>
              ) : '—'}
            </div>

            {/* Urgency */}
            <div className="text-right">
              <span className={cn(
                'text-xs font-semibold tabular-nums',
                item.urgency >= 70 ? 'text-amber-500' : 'text-zinc-600',
              )}>
                {item.urgency}
              </span>
            </div>
          </div>
        )
      })}
    </div>
  )
}
