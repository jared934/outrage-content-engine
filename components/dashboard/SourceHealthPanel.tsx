'use client'

import Link from 'next/link'
import { Wifi, WifiOff, Clock, AlertCircle, CheckCircle2, ArrowRight } from 'lucide-react'
import { cn } from '@/lib/utils/cn'
import { timeAgo } from '@/lib/utils/format'
import type { SourceHealth } from '@/lib/dashboard/dashboard.types'
import { Skeleton } from '@/components/ui/Skeleton'

interface SourceHealthPanelProps {
  sources:  SourceHealth[]
  loading?: boolean
}

const STATUS_CONFIG = {
  healthy: {
    icon:  CheckCircle2,
    color: 'text-emerald-400',
    bg:    'bg-emerald-500/10',
    label: 'Healthy',
  },
  stale: {
    icon:  Clock,
    color: 'text-amber-400',
    bg:    'bg-amber-500/10',
    label: 'Stale',
  },
  error: {
    icon:  AlertCircle,
    color: 'text-red-400',
    bg:    'bg-red-500/10',
    label: 'Error',
  },
  never: {
    icon:  WifiOff,
    color: 'text-zinc-500',
    bg:    'bg-zinc-800',
    label: 'Never synced',
  },
}

const TYPE_LABELS: Record<string, string> = {
  rss:          'RSS',
  youtube_rss:  'YouTube',
  google_trends:'Google Trends',
  reddit:       'Reddit',
  google_news:  'Google News',
  manual:       'Manual',
  competitor:   'Competitor',
}

export function SourceHealthPanel({ sources, loading }: SourceHealthPanelProps) {
  if (loading) {
    return (
      <div className="rounded-xl border border-border bg-surface p-4">
        <Skeleton className="h-4 w-32 mb-3" />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-14 rounded-lg" />
          ))}
        </div>
      </div>
    )
  }

  if (sources.length === 0) return null

  const healthyCount = sources.filter((s) => s.status === 'healthy').length
  const totalCount   = sources.length
  const hasIssues    = sources.some((s) => s.status === 'error' || s.status === 'stale')

  return (
    <div className="rounded-xl border border-border bg-surface overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-surface-raised">
        <div className="flex items-center gap-2">
          <Wifi className={cn('h-4 w-4', hasIssues ? 'text-amber-400' : 'text-emerald-400')} />
          <span className="font-display font-semibold text-sm text-foreground">Source Health</span>
          <span className={cn(
            'text-[10px] font-medium px-1.5 py-0.5 rounded-full border',
            healthyCount === totalCount
              ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
              : 'bg-amber-500/10 border-amber-500/30 text-amber-400',
          )}>
            {healthyCount}/{totalCount} healthy
          </span>
        </div>
        <Link href="/settings/sources">
          <button className="flex items-center gap-1 text-[10px] text-zinc-500 hover:text-muted transition-colors">
            Manage <ArrowRight className="h-3 w-3" />
          </button>
        </Link>
      </div>

      {/* Source grid */}
      <div className="p-3 grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-2">
        {sources.map((src) => {
          const cfg  = STATUS_CONFIG[src.status]
          const Icon = cfg.icon

          return (
            <div
              key={src.source_id}
              className={cn(
                'rounded-lg border border-border p-2.5 space-y-1.5',
                src.status === 'error' && 'border-red-800/30',
                src.status === 'stale' && 'border-amber-700/30',
              )}
            >
              <div className="flex items-center justify-between gap-1">
                <span className="text-[9px] text-zinc-600 uppercase tracking-wider font-medium">
                  {TYPE_LABELS[src.source_type] ?? src.source_type}
                </span>
                <div className={cn('p-0.5 rounded', cfg.bg)}>
                  <Icon className={cn('h-2.5 w-2.5', cfg.color)} />
                </div>
              </div>

              <p className="text-xs text-foreground font-medium truncate" title={src.source_name}>
                {src.source_name}
              </p>

              <p className="text-[10px] text-zinc-600">
                {src.last_synced ? timeAgo(src.last_synced) : 'Never synced'}
              </p>

              {src.items_fetched > 0 && (
                <p className="text-[9px] text-zinc-700">
                  {src.items_fetched} items
                </p>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
