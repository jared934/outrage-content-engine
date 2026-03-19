'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Lightbulb, Image as ImageIcon, Send, EyeOff, TrendingUp } from 'lucide-react'
import { cn } from '@/lib/utils/cn'
import { timeAgo } from '@/lib/utils/format'
import type { TrendWithScore } from '@/lib/dashboard/dashboard.types'

// ---------------------------------------------------------------------------
// Score bar — compact visual dimension indicator
// ---------------------------------------------------------------------------

function ScoreBar({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className="space-y-0.5">
      <div className="flex items-center justify-between">
        <span className="text-[9px] text-zinc-600 uppercase tracking-wider">{label}</span>
        <span className="text-[9px] text-zinc-500 tabular-nums">{Math.round(value)}</span>
      </div>
      <div className="h-1 w-full bg-zinc-800 rounded-full overflow-hidden">
        <div
          className={cn('h-full rounded-full transition-all', color)}
          style={{ width: `${Math.max(4, Math.min(100, value))}%` }}
        />
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Action label config
// ---------------------------------------------------------------------------

const ACTION_CONFIG: Record<string, {
  label: string; bg: string; text: string; border: string
}> = {
  post_now:      { label: '🔥 Post NOW',   bg: 'bg-accent/15',    text: 'text-red-400',    border: 'border-accent/30' },
  post_soon:     { label: '⚡ Post Soon',  bg: 'bg-amber-500/10', text: 'text-amber-400',  border: 'border-amber-500/30' },
  save_for_later:{ label: '📌 Save',       bg: 'bg-blue-500/10',  text: 'text-blue-400',   border: 'border-blue-500/30' },
  ignore:        { label: '— Ignore',      bg: 'bg-zinc-800',     text: 'text-zinc-500',   border: 'border-zinc-700' },
  too_risky:     { label: '⚠ Too Risky',  bg: 'bg-red-900/20',   text: 'text-red-500',    border: 'border-red-800/30' },
}

// ---------------------------------------------------------------------------
// Format chip
// ---------------------------------------------------------------------------

function FormatChip({ format }: { format: string }) {
  const label = format.replace(/_/g, ' ')
  return (
    <span className="text-[9px] px-1.5 py-0.5 rounded bg-zinc-800 border border-zinc-700 text-zinc-500 capitalize whitespace-nowrap">
      {label}
    </span>
  )
}

// ---------------------------------------------------------------------------
// Main card
// ---------------------------------------------------------------------------

interface TrendOpportunityCardProps {
  trend:     TrendWithScore
  onIgnore?: (id: string) => void
  compact?:  boolean
}

export function TrendOpportunityCard({ trend, onIgnore, compact = false }: TrendOpportunityCardProps) {
  const router    = useRouter()
  const action    = trend.recommended_action ?? 'save_for_later'
  const config    = ACTION_CONFIG[action] ?? ACTION_CONFIG['save_for_later']
  const priority  = trend.total_priority_score ?? trend.overall_score ?? 0
  const formats   = (trend.recommended_formats ?? []).slice(0, 3)

  const hasDimensions = trend.outrage_fit_score != null

  return (
    <div className={cn(
      'rounded-xl border bg-surface transition-all hover:border-zinc-600 group',
      action === 'post_now' ? 'border-accent/20' : 'border-border',
    )}>
      {/* Header */}
      <div className="px-4 pt-3.5 pb-2.5">
        <div className="flex items-start gap-3">
          {/* Priority score */}
          <div className={cn(
            'flex-shrink-0 flex items-center justify-center w-10 h-10 rounded-lg text-sm font-bold tabular-nums border',
            priority >= 80 ? 'bg-accent/15 border-accent/30 text-accent'
            : priority >= 60 ? 'bg-amber-500/10 border-amber-500/30 text-amber-400'
            : 'bg-zinc-800 border-zinc-700 text-zinc-400',
          )}>
            {Math.round(priority)}
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <Link
                href={`/trends/${trend.id}`}
                className="text-sm font-semibold text-foreground hover:text-accent transition-colors line-clamp-2 leading-snug"
              >
                {trend.title}
              </Link>
              {/* Recommended action */}
              <span className={cn(
                'flex-shrink-0 text-[10px] font-bold px-1.5 py-0.5 rounded border',
                config.bg, config.text, config.border,
              )}>
                {config.label}
              </span>
            </div>

            {/* Meta row */}
            <div className="flex items-center gap-2 mt-1 flex-wrap">
              {trend.category && (
                <span className="text-[10px] text-zinc-500 capitalize">{trend.category}</span>
              )}
              <Link
                href={`/trends/${trend.id}#sources`}
                className="text-[10px] text-zinc-500 hover:text-accent transition-colors underline underline-offset-2"
                onClick={(e) => e.stopPropagation()}
              >
                {trend.source_count} source{trend.source_count !== 1 ? 's' : ''}
              </Link>
              <span className="text-[10px] text-zinc-600">{timeAgo(trend.updated_at)}</span>
            </div>
          </div>
        </div>

        {/* Summary */}
        {!compact && trend.summary && (
          <p className="text-xs text-zinc-500 mt-2 line-clamp-2 leading-relaxed">
            {trend.summary}
          </p>
        )}
      </div>

      {/* Score bars */}
      {hasDimensions && (
        <div className="px-4 pb-2.5 grid grid-cols-4 gap-2.5">
          <ScoreBar label="Outrage"  value={trend.outrage_fit_score  ?? 0} color="bg-red-500" />
          <ScoreBar label="Meme"     value={trend.meme_potential_score ?? 0} color="bg-purple-500" />
          <ScoreBar label="Urgency"  value={trend.urgency_score       ?? 0} color="bg-amber-500" />
          <ScoreBar label="Virality" value={trend.virality_score      ?? 0} color="bg-blue-500" />
        </div>
      )}

      {/* Formats */}
      {formats.length > 0 && (
        <div className="px-4 pb-2.5 flex flex-wrap gap-1">
          {formats.map((f) => <FormatChip key={f} format={f} />)}
        </div>
      )}

      {/* Action buttons */}
      <div className="px-4 pb-3 pt-1 flex items-center gap-2 border-t border-border">
        <button
          onClick={() => router.push(`/trends/${trend.id}`)}
          className="flex items-center gap-1 px-2 py-1 rounded-md bg-accent text-white text-[11px] font-semibold hover:bg-accent/90 transition-all"
        >
          <Lightbulb className="h-3 w-3" />
          Ideas
        </button>
        <button
          onClick={() => router.push(`/memes/studio?cluster_id=${trend.id}`)}
          className="flex items-center gap-1 px-2 py-1 rounded-md bg-surface border border-border text-[11px] text-muted hover:text-foreground hover:border-zinc-600 transition-all"
        >
          <ImageIcon className="h-3 w-3" />
          Meme
        </button>
        <button
          onClick={() => router.push(`/brand/exports?cluster_id=${trend.id}`)}
          className="flex items-center gap-1 px-2 py-1 rounded-md bg-surface border border-border text-[11px] text-muted hover:text-foreground hover:border-zinc-600 transition-all"
        >
          <Send className="h-3 w-3" />
          Canva
        </button>
        {onIgnore && (
          <button
            onClick={() => onIgnore(trend.id)}
            className="ml-auto flex items-center gap-1 px-2 py-1 rounded-md text-[11px] text-zinc-600 hover:text-zinc-400 transition-all"
          >
            <EyeOff className="h-3 w-3" />
            Ignore
          </button>
        )}
      </div>
    </div>
  )
}
