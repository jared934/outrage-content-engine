'use client'

import { useState } from 'react'
import Link from 'next/link'
import { X, ExternalLink, Zap, Calendar, ArrowRight } from 'lucide-react'
import { format, isValid } from 'date-fns'
import { Button } from '@/components/ui/Button'
import { cn } from '@/lib/utils/cn'
import { useUpdatePipelineItem } from '@/hooks/usePipelineItems'
import { STATUS_CONFIG, PIPELINE_STATUSES, FORMAT_ICONS } from '@/lib/pipeline/pipeline.types'
import type { PipelineItem, PipelineStatus } from '@/lib/pipeline/pipeline.types'

interface ScheduleModalProps {
  item:    PipelineItem
  onClose: () => void
}

export function ScheduleModal({ item, onClose }: ScheduleModalProps) {
  const { mutate: update, isPending } = useUpdatePipelineItem()
  const cfg = STATUS_CONFIG[item.status]

  const initDateTime = item.publish_at && isValid(new Date(item.publish_at))
    ? format(new Date(item.publish_at), "yyyy-MM-dd'T'HH:mm")
    : ''

  const [dateTime, setDateTime] = useState(initDateTime)
  const [status,   setStatus]   = useState<PipelineStatus>(item.status)

  function save() {
    update(
      {
        id: item.id,
        updates: {
          publish_at: dateTime ? new Date(dateTime).toISOString() : null,
          status,
        },
      },
      { onSuccess: onClose },
    )
  }

  function clearSchedule() {
    update(
      { id: item.id, updates: { publish_at: null } },
      { onSuccess: onClose },
    )
  }

  return (
    <>
      <div className="fixed inset-0 bg-black/60 z-50" onClick={onClose} />
      <div className="fixed inset-0 flex items-center justify-center z-50 p-4 pointer-events-none">
        <div
          className="pointer-events-auto w-full max-w-sm bg-surface border border-border rounded-2xl shadow-2xl overflow-hidden"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-5 py-4 border-b border-border">
            <div className="flex items-center gap-2">
              <span className="text-base">{FORMAT_ICONS[item.format ?? ''] ?? '📄'}</span>
              <div>
                <p className="text-xs font-bold text-foreground line-clamp-1">{item.title}</p>
                {item.cluster_title && (
                  <p className="text-[10px] text-muted">↗ {item.cluster_title}</p>
                )}
              </div>
            </div>
            <button onClick={onClose} className="text-zinc-600 hover:text-foreground transition-colors">
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="p-5 space-y-4">
            {/* Status row */}
            <div className="flex items-center gap-2">
              <span className={cn(
                'text-[10px] px-2 py-1 rounded-full border font-semibold uppercase tracking-wide',
                cfg.bgClass, cfg.textClass, cfg.borderClass,
              )}>
                {cfg.label}
              </span>
              {(item.urgency ?? 0) >= 70 && (
                <span className="flex items-center gap-1 text-xs text-amber-500">
                  <Zap className="h-3 w-3" />
                  Urgency {item.urgency}
                </span>
              )}
            </div>

            {/* Publish date/time */}
            <div>
              <label className="flex items-center gap-1.5 text-xs text-muted mb-1.5 font-medium">
                <Calendar className="h-3 w-3" /> Publish date & time
              </label>
              <input
                type="datetime-local"
                className="w-full bg-surface-raised border border-border rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:border-accent"
                value={dateTime}
                onChange={(e) => setDateTime(e.target.value)}
              />
            </div>

            {/* Status selector */}
            <div>
              <label className="block text-xs text-muted mb-1.5 font-medium">Pipeline status</label>
              <div className="flex flex-wrap gap-1.5">
                {PIPELINE_STATUSES.map((s) => {
                  const c = STATUS_CONFIG[s]
                  const active = status === s
                  return (
                    <button
                      key={s}
                      onClick={() => setStatus(s)}
                      className={cn(
                        'px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wide border transition-all',
                        active
                          ? cn(c.bgClass, c.textClass, c.borderClass)
                          : 'bg-transparent text-zinc-700 border-zinc-800 hover:border-zinc-600',
                      )}
                    >
                      {c.label}
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Quick links */}
            <div className="flex gap-2 pt-1">
              <Link
                href={`/pipeline`}
                className="flex-1 flex items-center justify-center gap-1 py-2 rounded-lg border border-border text-xs text-zinc-500 hover:text-foreground hover:border-zinc-600 transition-colors"
              >
                Open in Pipeline <ArrowRight className="h-3 w-3" />
              </Link>
              {item.cluster_id && (
                <Link
                  href={`/trends/${item.cluster_id}`}
                  className="flex items-center gap-1 px-3 py-2 rounded-lg border border-border text-xs text-zinc-500 hover:text-foreground hover:border-zinc-600 transition-colors"
                >
                  <ExternalLink className="h-3 w-3" />
                </Link>
              )}
            </div>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between gap-2 px-5 py-4 border-t border-border">
            {item.publish_at ? (
              <button
                onClick={clearSchedule}
                className="text-xs text-zinc-600 hover:text-red-500 transition-colors"
              >
                Remove from calendar
              </button>
            ) : <div />}
            <div className="flex gap-2">
              <Button variant="ghost" size="sm" onClick={onClose}>Cancel</Button>
              <Button variant="primary" size="sm" onClick={save} disabled={isPending}>
                {isPending ? 'Saving…' : 'Save'}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
