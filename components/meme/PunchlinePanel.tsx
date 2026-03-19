'use client'

import { useState } from 'react'
import { Sparkles, RefreshCw, ChevronRight } from 'lucide-react'
import { cn } from '@/lib/utils/cn'
import type { PunchlineSuggestion, QuickAction } from '@/lib/meme/meme.types'

interface PunchlinePanelProps {
  orgId:      string
  clusterId?: string
  topic?:     string
  onApply:    (top: string, bottom: string | null) => void
  isPending:  boolean
  suggestions: PunchlineSuggestion[]
  onGenerate: (params: { topic?: string; cluster_id?: string; quick_action?: QuickAction; current_top?: string; current_bottom?: string }) => void
  currentTop?:    string
  currentBottom?: string
}

const QUICK_ACTIONS: { action: QuickAction; label: string; emoji: string }[] = [
  { action: 'funnier',    label: 'Funnier',    emoji: '😂' },
  { action: 'savage',     label: 'Savage',     emoji: '🔥' },
  { action: 'mainstream', label: 'Mainstream', emoji: '📣' },
  { action: 'safer',      label: 'Safer',      emoji: '🛡️' },
  { action: 'less_cringe',label: 'Less Cringe',emoji: '😬' },
  { action: 'shorter',    label: 'Shorter',    emoji: '✂️' },
]

export function PunchlinePanel({
  orgId, clusterId, topic,
  onApply, isPending, suggestions,
  onGenerate, currentTop, currentBottom,
}: PunchlinePanelProps) {
  const [customTopic, setCustomTopic] = useState(topic ?? '')

  function handleGenerate(quick_action?: QuickAction) {
    onGenerate({
      topic:        customTopic || topic,
      cluster_id:   clusterId,
      quick_action,
      current_top:    currentTop,
      current_bottom: currentBottom,
    })
  }

  return (
    <div className="space-y-3">
      {/* Topic input */}
      <div>
        <p className="text-[10px] text-zinc-600 mb-1">Topic / trend</p>
        <div className="flex gap-2">
          <input
            type="text"
            value={customTopic}
            onChange={(e) => setCustomTopic(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleGenerate()}
            placeholder={clusterId ? 'Using trend cluster…' : 'e.g. celebrity drama...'}
            className="flex-1 bg-surface border border-border rounded-lg px-3 py-2 text-xs text-foreground placeholder:text-zinc-700 focus:outline-none focus:ring-1 focus:ring-accent"
          />
          <button
            onClick={() => handleGenerate()}
            disabled={isPending || (!customTopic.trim() && !clusterId)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-accent text-white text-xs font-semibold hover:bg-accent/90 transition-all disabled:opacity-40"
          >
            {isPending
              ? <span className="h-3 w-3 rounded-full border-2 border-white border-t-transparent animate-spin" />
              : <Sparkles className="h-3 w-3" />
            }
            {isPending ? 'Generating…' : 'Generate'}
          </button>
        </div>
      </div>

      {/* Quick actions */}
      {(suggestions.length > 0 || currentTop) && (
        <div>
          <p className="text-[10px] text-zinc-600 mb-1.5">Quick actions</p>
          <div className="grid grid-cols-3 gap-1">
            {QUICK_ACTIONS.map(({ action, label, emoji }) => (
              <button
                key={action}
                onClick={() => handleGenerate(action)}
                disabled={isPending}
                className="flex items-center gap-1 px-2 py-1.5 rounded-lg border border-border bg-surface text-[10px] text-zinc-500 hover:text-muted hover:border-zinc-600 transition-all disabled:opacity-40"
              >
                <span>{emoji}</span>
                {label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Suggestions */}
      {suggestions.length > 0 && (
        <div className="space-y-1.5">
          <p className="text-[10px] text-zinc-600 uppercase tracking-wider font-medium">
            {suggestions.length} options
          </p>
          {suggestions.map((s) => (
            <button
              key={s.id}
              onClick={() => onApply(s.top_text, s.bottom_text)}
              className="w-full text-left rounded-lg border border-border bg-surface hover:border-zinc-600 hover:bg-surface-raised transition-all p-2.5 group"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-foreground font-medium leading-tight">
                    {s.top_text}
                  </p>
                  {s.bottom_text && (
                    <p className="text-xs text-muted mt-0.5">{s.bottom_text}</p>
                  )}
                  {s.concept && (
                    <p className="text-[10px] text-zinc-600 mt-1 italic">{s.concept}</p>
                  )}
                </div>
                <ChevronRight className="h-3 w-3 text-zinc-700 group-hover:text-accent flex-shrink-0 mt-0.5 transition-colors" />
              </div>
            </button>
          ))}
        </div>
      )}

      {/* Empty state */}
      {suggestions.length === 0 && !isPending && (
        <div className="flex flex-col items-center py-6 text-center">
          <Sparkles className="h-6 w-6 text-zinc-700 mb-2" />
          <p className="text-xs text-muted">No punchlines yet</p>
          <p className="text-[10px] text-zinc-600 mt-0.5">Enter a topic and hit Generate</p>
        </div>
      )}
    </div>
  )
}
