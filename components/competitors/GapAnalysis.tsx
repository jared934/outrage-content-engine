'use client'

import { useState } from 'react'
import Link from 'next/link'
import { RefreshCw, ChevronRight, TrendingUp, AlertTriangle, CheckCircle2, Zap } from 'lucide-react'
import { cn } from '@/lib/utils/cn'
import { Skeleton } from '@/components/ui/Skeleton'
import { EmptyState } from '@/components/ui/EmptyState'
import { useGapAnalysis } from '@/hooks/useCompetitors'
import type { GapEntry } from '@/lib/competitors/competitor.types'

interface GapAnalysisProps {
  orgId: string
}

const GAP_TYPE_CONFIG = {
  uncovered:   { label: 'Uncovered',   icon: <Zap className="h-3 w-3" />,           color: 'text-green-400',  bg: 'bg-green-950/30 border-green-800/40',  dot: 'bg-green-500'  },
  underserved: { label: 'Underserved', icon: <TrendingUp className="h-3 w-3" />,     color: 'text-amber-400',  bg: 'bg-amber-950/30 border-amber-800/40',  dot: 'bg-amber-500'  },
  saturated:   { label: 'Saturated',   icon: <AlertTriangle className="h-3 w-3" />,  color: 'text-red-400',    bg: 'bg-red-950/30 border-red-800/40',      dot: 'bg-red-500'    },
}

type Filter = 'all' | GapEntry['gap_type']

export function GapAnalysis({ orgId }: GapAnalysisProps) {
  const [days,      setDays]      = useState(7)
  const [filter,    setFilter]    = useState<Filter>('all')
  const [expanded,  setExpanded]  = useState<string | null>(null)

  const { data, isLoading, refetch } = useGapAnalysis(orgId, days)

  const gaps = (data?.gaps ?? []).filter(
    (g) => filter === 'all' || g.gap_type === filter
  )

  const uncoveredCount   = data?.gaps.filter((g) => g.gap_type === 'uncovered').length   ?? 0
  const underservedCount = data?.gaps.filter((g) => g.gap_type === 'underserved').length ?? 0
  const saturatedCount   = data?.gaps.filter((g) => g.gap_type === 'saturated').length   ?? 0

  return (
    <div className="space-y-4">
      {/* Summary cards */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { type: 'uncovered'   as Filter, count: uncoveredCount,   label: 'Uncovered',   sub: 'competitors missed this' },
          { type: 'underserved' as Filter, count: underservedCount, label: 'Underserved', sub: 'partial coverage' },
          { type: 'saturated'   as Filter, count: saturatedCount,   label: 'Saturated',   sub: 'well covered — skip?' },
        ].map(({ type, count, label, sub }) => {
          const cfg = GAP_TYPE_CONFIG[type as GapEntry['gap_type']]
          return (
            <button
              key={type}
              onClick={() => setFilter(filter === type ? 'all' : type)}
              className={cn(
                'rounded-xl border p-3 text-left transition-all',
                filter === type ? cfg.bg : 'border-border bg-surface hover:border-zinc-600',
              )}
            >
              <p className={cn('text-2xl font-bold tabular-nums', filter === type ? cfg.color : 'text-foreground')}>
                {isLoading ? '—' : count}
              </p>
              <p className={cn('text-xs font-semibold mt-0.5', filter === type ? cfg.color : 'text-muted')}>
                {label}
              </p>
              <p className="text-[10px] text-zinc-600 mt-0.5">{sub}</p>
            </button>
          )
        })}
      </div>

      {/* Toolbar */}
      <div className="flex items-center gap-2">
        <p className="text-xs text-muted flex-1">
          {data?.competitors_tracked
            ? `Tracking ${data.competitors_tracked} competitor${data.competitors_tracked !== 1 ? 's' : ''}`
            : 'Add competitors to see gap analysis'}
        </p>

        {([3, 7, 14, 30] as const).map((d) => (
          <button
            key={d}
            onClick={() => setDays(d)}
            className={cn(
              'px-2.5 py-1 rounded-full text-[10px] font-semibold border transition-all',
              days === d
                ? 'border-accent bg-accent/10 text-accent'
                : 'border-border text-zinc-600 hover:border-zinc-600',
            )}
          >
            {d}d
          </button>
        ))}

        <button onClick={() => refetch()} className="text-zinc-600 hover:text-foreground transition-colors">
          <RefreshCw className="h-3.5 w-3.5" />
        </button>
      </div>

      {/* Gap list */}
      <div className="bg-surface border border-border rounded-xl overflow-hidden">
        {isLoading ? (
          <div className="divide-y divide-border">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="px-4 py-3.5 flex gap-3">
                <Skeleton className="h-4 w-12 rounded" />
                <div className="flex-1 space-y-1.5">
                  <Skeleton className="h-3.5 w-2/3" />
                  <Skeleton className="h-3 w-1/2" />
                </div>
              </div>
            ))}
          </div>
        ) : gaps.length === 0 ? (
          <div className="py-12">
            <EmptyState
              icon={<CheckCircle2 className="h-8 w-8" />}
              title={data?.competitors_tracked ? 'No gaps in this window' : 'No competitors tracked yet'}
              description={
                data?.competitors_tracked
                  ? 'All your active trends have competitor coverage. Check a wider date range.'
                  : 'Add competitors and their RSS feeds to start detecting gaps.'
              }
              compact
            />
          </div>
        ) : (
          <div className="divide-y divide-border">
            {gaps.map((gap) => (
              <GapRow
                key={gap.cluster_id}
                gap={gap}
                expanded={expanded === gap.cluster_id}
                onToggle={() => setExpanded(expanded === gap.cluster_id ? null : gap.cluster_id)}
              />
            ))}
          </div>
        )}
      </div>

      {/* n8n integration hint */}
      <div className="rounded-xl border border-border bg-surface p-4 space-y-2">
        <p className="text-xs font-semibold text-foreground">n8n Automation</p>
        <p className="text-xs text-muted">
          Schedule n8n to call <code className="text-zinc-500">POST /api/competitors/[id]/refresh</code> with your{' '}
          <code className="text-zinc-500">X-Api-Key</code> header every few hours to keep RSS feeds updated automatically.
          For social sources (Twitter/Instagram), use n8n's scraper nodes and POST to{' '}
          <code className="text-zinc-500">/api/competitors/ingest</code>.
        </p>
      </div>
    </div>
  )
}

function GapRow({ gap, expanded, onToggle }: { gap: GapEntry; expanded: boolean; onToggle: () => void }) {
  const cfg = GAP_TYPE_CONFIG[gap.gap_type]

  return (
    <div>
      {/* Row */}
      <div
        className="flex items-center gap-3 px-4 py-3.5 hover:bg-surface-raised/50 transition-colors cursor-pointer"
        onClick={onToggle}
      >
        {/* Gap score bar */}
        <div className="flex flex-col items-center gap-0.5 shrink-0 w-10">
          <span className={cn('text-sm font-bold tabular-nums', cfg.color)}>{gap.gap_score}</span>
          <div className="h-1 w-10 rounded-full bg-surface-raised overflow-hidden">
            <div
              className={cn('h-full rounded-full', cfg.dot)}
              style={{ width: `${gap.gap_score}%` }}
            />
          </div>
        </div>

        {/* Cluster info */}
        <div className="flex-1 min-w-0">
          <p className="text-sm text-foreground font-medium leading-snug truncate">{gap.cluster_title}</p>
          <div className="flex items-center gap-2 mt-0.5">
            <span className="text-[10px] text-zinc-600 capitalize">{gap.cluster_category}</span>
            <span className="text-zinc-800">·</span>
            <span className="text-[10px] text-zinc-600">urgency {Math.round(gap.urgency_score)}</span>
          </div>
        </div>

        {/* Gap type badge */}
        <span className={cn(
          'shrink-0 flex items-center gap-1 text-[9px] px-2 py-0.5 rounded-full border font-semibold uppercase tracking-wide',
          cfg.color, cfg.bg,
        )}>
          {cfg.icon}
          {cfg.label}
        </span>

        {/* Coverage indicator */}
        <div className="hidden sm:flex items-center gap-1 shrink-0">
          {gap.covered_by.map((c) => (
            <span
              key={c.competitor_id}
              title={`${c.competitor_name} (${c.post_count} posts)`}
              className="h-5 w-5 rounded-full bg-accent/20 border border-accent/30 flex items-center justify-center text-[8px] text-accent font-bold"
            >
              {c.competitor_name[0]}
            </span>
          ))}
          {gap.missing_from.map((c) => (
            <span
              key={c.competitor_id}
              title={`${c.competitor_name} — not covering this`}
              className="h-5 w-5 rounded-full bg-surface-raised border border-zinc-800 flex items-center justify-center text-[8px] text-zinc-600 font-bold"
            >
              {c.competitor_name[0]}
            </span>
          ))}
        </div>

        <Link
          href={`/trends/${gap.cluster_id}`}
          onClick={(e) => e.stopPropagation()}
          className="shrink-0 p-1.5 text-zinc-600 hover:text-accent transition-colors"
          title="View trend"
        >
          <ChevronRight className="h-3.5 w-3.5" />
        </Link>
      </div>

      {/* Expanded detail */}
      {expanded && (
        <div className="px-4 pb-4 border-t border-border bg-surface-raised/30 pt-3 space-y-3">
          {/* Coverage grid */}
          <div className="grid grid-cols-2 gap-3">
            {gap.covered_by.length > 0 && (
              <div>
                <p className="text-[10px] font-semibold text-zinc-500 uppercase tracking-wide mb-1.5">Covered by</p>
                <div className="space-y-1">
                  {gap.covered_by.map((c) => (
                    <div key={c.competitor_id} className="flex items-center gap-2">
                      <CheckCircle2 className="h-3 w-3 text-green-500 shrink-0" />
                      <span className="text-xs text-foreground">{c.competitor_name}</span>
                      <span className="text-[10px] text-zinc-600">({c.post_count})</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
            {gap.missing_from.length > 0 && (
              <div>
                <p className="text-[10px] font-semibold text-zinc-500 uppercase tracking-wide mb-1.5">Missed by</p>
                <div className="space-y-1">
                  {gap.missing_from.map((c) => (
                    <div key={c.competitor_id} className="flex items-center gap-2">
                      <div className="h-3 w-3 rounded-full border border-zinc-700 shrink-0" />
                      <span className="text-xs text-zinc-500">{c.competitor_name}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Sample posts */}
          {gap.sample_posts.length > 0 && (
            <div>
              <p className="text-[10px] font-semibold text-zinc-500 uppercase tracking-wide mb-1.5">Sample competitor posts</p>
              <div className="space-y-1">
                {gap.sample_posts.map((p) => (
                  <div key={p.post_id} className="flex items-center gap-2">
                    <span className="text-[10px] text-zinc-600 shrink-0">{p.competitor_name}</span>
                    <span className="text-[10px] text-foreground flex-1 truncate">{p.title ?? '(no title)'}</span>
                    {p.url && (
                      <a
                        href={p.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="shrink-0 text-[10px] text-zinc-600 hover:text-foreground"
                      >
                        ↗
                      </a>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
