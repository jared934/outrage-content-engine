'use client'

import { useState } from 'react'
import { History, Bookmark, Trash2, ChevronDown, ChevronUp, Copy, Check } from 'lucide-react'
import { cn } from '@/lib/utils/cn'
import { TOOL_META_MAP, REWRITE_TOOLS, type RewriteTool, type BrandRewrite } from '@/lib/brand/rewrite.types'
import { Skeleton } from '@/components/ui/Skeleton'

interface RewriteHistoryProps {
  items: BrandRewrite[]
  isLoading: boolean
  onRestore: (text: string) => void
  onSave: (id: string, saved: boolean) => void
  onDelete: (id: string) => void
  toolFilter: RewriteTool | ''
  onToolFilterChange: (tool: RewriteTool | '') => void
  savedOnly: boolean
  onSavedOnlyChange: (v: boolean) => void
}

export function RewriteHistory({
  items,
  isLoading,
  onRestore,
  onSave,
  onDelete,
  toolFilter,
  onToolFilterChange,
  savedOnly,
  onSavedOnlyChange,
}: RewriteHistoryProps) {
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [copiedId, setCopiedId]     = useState<string | null>(null)

  async function copy(text: string, id: string) {
    await navigator.clipboard.writeText(text)
    setCopiedId(id)
    setTimeout(() => setCopiedId(null), 2000)
  }

  function toggle(id: string) {
    setExpandedId((prev) => (prev === id ? null : id))
  }

  if (isLoading) {
    return (
      <div className="space-y-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-16 rounded-lg" />
        ))}
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {/* Filters */}
      <div className="flex items-center gap-2">
        <select
          value={toolFilter}
          onChange={(e) => onToolFilterChange(e.target.value as RewriteTool | '')}
          className="flex-1 bg-surface border border-border text-sm text-foreground rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-accent appearance-none"
        >
          <option value="">All tools</option>
          {REWRITE_TOOLS.map((t) => (
            <option key={t.tool} value={t.tool}>{t.label}</option>
          ))}
        </select>

        <button
          onClick={() => onSavedOnlyChange(!savedOnly)}
          className={cn(
            'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-all',
            savedOnly
              ? 'bg-accent/10 border-accent/30 text-accent'
              : 'bg-surface border-border text-muted hover:text-foreground hover:border-zinc-600',
          )}
        >
          <Bookmark className="h-3.5 w-3.5" />
          Saved
        </button>
      </div>

      {/* Empty state */}
      {items.length === 0 && (
        <div className="flex flex-col items-center justify-center py-10 text-center">
          <History className="h-8 w-8 text-zinc-700 mb-2" />
          <p className="text-sm text-muted">No rewrites yet</p>
          <p className="text-xs text-zinc-600 mt-0.5">
            Pick a tool above and start rewriting.
          </p>
        </div>
      )}

      {/* Items */}
      <div className="space-y-1.5">
        {items.map((item) => {
          const meta      = TOOL_META_MAP[item.tool as RewriteTool]
          const isExpanded = expandedId === item.id
          const isCopied   = copiedId === item.id
          const date       = new Date(item.created_at)
          const timeLabel  = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })

          return (
            <div
              key={item.id}
              className={cn(
                'rounded-lg border transition-all',
                isExpanded
                  ? 'border-zinc-600 bg-surface-raised'
                  : 'border-border bg-surface hover:border-zinc-600',
              )}
            >
              {/* Row header */}
              <button
                onClick={() => toggle(item.id)}
                className="w-full flex items-center gap-3 px-3 py-2.5 text-left"
              >
                <span className={cn(
                  'text-[10px] font-bold px-1.5 py-0.5 rounded border flex-shrink-0',
                  meta?.bgColor, meta?.color,
                )}>
                  {meta?.label ?? item.tool}
                </span>

                <p className="flex-1 text-xs text-muted truncate min-w-0">
                  {item.rewritten_text}
                </p>

                <span className="text-[10px] text-zinc-600 flex-shrink-0">{timeLabel}</span>
                {isExpanded
                  ? <ChevronUp className="h-3.5 w-3.5 text-zinc-600 flex-shrink-0" />
                  : <ChevronDown className="h-3.5 w-3.5 text-zinc-600 flex-shrink-0" />
                }
              </button>

              {/* Expanded content */}
              {isExpanded && (
                <div className="px-3 pb-3 space-y-3 border-t border-border pt-3">
                  {/* Before / after */}
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <p className="text-[10px] uppercase tracking-wider text-zinc-600 font-medium">Before</p>
                      <p className="text-xs text-zinc-400 leading-relaxed whitespace-pre-wrap bg-zinc-900 rounded-lg p-2.5">
                        {item.original_text}
                      </p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-[10px] uppercase tracking-wider text-zinc-400 font-medium">After</p>
                      <p className="text-xs text-foreground leading-relaxed whitespace-pre-wrap bg-zinc-900 rounded-lg p-2.5">
                        {item.rewritten_text}
                      </p>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => onRestore(item.rewritten_text)}
                      className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium bg-accent text-white hover:bg-accent/90 transition-all"
                    >
                      Restore to editor
                    </button>

                    <button
                      onClick={() => copy(item.rewritten_text, item.id)}
                      className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium bg-surface border border-border text-muted hover:text-foreground transition-all"
                    >
                      {isCopied ? <Check className="h-3 w-3 text-green-400" /> : <Copy className="h-3 w-3" />}
                      {isCopied ? 'Copied' : 'Copy'}
                    </button>

                    <button
                      onClick={() => onSave(item.id, !item.is_saved)}
                      className={cn(
                        'flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium border transition-all',
                        item.is_saved
                          ? 'bg-accent/10 border-accent/30 text-accent'
                          : 'bg-surface border-border text-muted hover:text-foreground',
                      )}
                    >
                      <Bookmark className="h-3 w-3" />
                      {item.is_saved ? 'Saved' : 'Save'}
                    </button>

                    <button
                      onClick={() => onDelete(item.id)}
                      className="ml-auto flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium text-zinc-600 hover:text-red-400 hover:bg-red-400/10 transition-all"
                    >
                      <Trash2 className="h-3 w-3" />
                    </button>
                  </div>

                  {/* Meta */}
                  {item.custom_instruction && (
                    <p className="text-[10px] text-zinc-600 italic">
                      Instruction: "{item.custom_instruction}"
                    </p>
                  )}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
