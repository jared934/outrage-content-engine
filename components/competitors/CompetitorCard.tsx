'use client'

import { useState } from 'react'
import { RefreshCw, ExternalLink, Globe, Trash2, ChevronDown, ChevronUp } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { cn } from '@/lib/utils/cn'
import { CATEGORY_CONFIG, SOURCE_CONFIG } from '@/lib/competitors/competitor.types'
import { useRefreshCompetitor, useDeleteCompetitor } from '@/hooks/useCompetitors'
import type { Competitor } from '@/lib/competitors/competitor.types'
import { SourceManager } from './SourceManager'

interface CompetitorCardProps {
  competitor: Competitor
  orgId:      string
  onSelect:   (c: Competitor) => void
  selected:   boolean
}

export function CompetitorCard({ competitor: c, orgId, onSelect, selected }: CompetitorCardProps) {
  const [expanded, setExpanded] = useState(false)
  const { mutate: refresh, isPending: refreshing } = useRefreshCompetitor(orgId)
  const { mutate: remove }                         = useDeleteCompetitor()

  const cfg = CATEGORY_CONFIG[c.category]

  const autoSources = (c.sources ?? []).filter(
    (s) => SOURCE_CONFIG[s.source_type]?.canAutoFetch
  )
  const hasErrors = (c.sources ?? []).some((s) => s.fetch_error)

  return (
    <div
      className={cn(
        'rounded-xl border transition-all',
        selected ? 'border-accent bg-accent/5' : 'border-border bg-surface hover:border-zinc-600',
      )}
    >
      {/* Header */}
      <div
        className="flex items-center gap-3 px-4 py-3 cursor-pointer"
        onClick={() => onSelect(c)}
      >
        {/* Avatar / icon */}
        <div className={cn(
          'h-9 w-9 rounded-xl flex items-center justify-center text-lg shrink-0',
          'bg-surface-raised border border-border',
        )}>
          {c.avatar_url
            ? <img src={c.avatar_url} alt={c.name} className="h-9 w-9 rounded-xl object-cover" />
            : cfg.icon
          }
        </div>

        {/* Name + category */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <p className="text-sm font-semibold text-foreground truncate">{c.name}</p>
            {hasErrors && (
              <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-red-950/40 border border-red-800/40 text-red-400 font-semibold uppercase tracking-wide">
                error
              </span>
            )}
          </div>
          <div className="flex items-center gap-2 mt-0.5">
            <span className={cn('text-[10px]', cfg.color)}>{cfg.icon} {cfg.label}</span>
            {c.last_active_at && (
              <span className="text-[10px] text-zinc-600">
                · {formatDistanceToNow(new Date(c.last_active_at), { addSuffix: true })}
              </span>
            )}
          </div>
        </div>

        {/* Stats */}
        <div className="hidden sm:flex flex-col items-end gap-0.5 shrink-0">
          <span className="text-sm font-bold text-foreground tabular-nums">{c.post_count}</span>
          <span className="text-[10px] text-zinc-600">posts</span>
        </div>

        {/* Source count pill */}
        <div className="flex items-center gap-1 shrink-0">
          {(c.sources ?? []).length > 0 && (
            <span className="text-[10px] px-2 py-0.5 rounded-full border border-border text-zinc-600">
              {(c.sources ?? []).length} src
            </span>
          )}
          {autoSources.length > 0 && (
            <button
              onClick={(e) => { e.stopPropagation(); refresh(c.id) }}
              disabled={refreshing}
              className="p-1.5 text-zinc-600 hover:text-accent transition-colors"
              title="Fetch RSS sources"
            >
              <RefreshCw className={cn('h-3.5 w-3.5', refreshing && 'animate-spin')} />
            </button>
          )}
          {c.website_url && (
            <a
              href={c.website_url}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
              className="p-1.5 text-zinc-600 hover:text-foreground transition-colors"
            >
              <ExternalLink className="h-3.5 w-3.5" />
            </a>
          )}
          <button
            onClick={(e) => { e.stopPropagation(); setExpanded((v) => !v) }}
            className="p-1.5 text-zinc-600 hover:text-foreground transition-colors"
          >
            {expanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
          </button>
        </div>
      </div>

      {/* Expanded: source manager */}
      {expanded && (
        <div className="border-t border-border px-4 pb-4 pt-3 space-y-3">
          {c.description && (
            <p className="text-xs text-muted">{c.description}</p>
          )}
          <SourceManager competitor={c} />
          <div className="flex justify-end pt-1">
            <button
              onClick={() => remove({ id: c.id })}
              className="flex items-center gap-1 text-[10px] text-zinc-700 hover:text-red-500 transition-colors"
            >
              <Trash2 className="h-3 w-3" />
              Remove
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
