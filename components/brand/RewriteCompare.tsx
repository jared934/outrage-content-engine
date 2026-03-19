'use client'

import { useState } from 'react'
import { Check, Copy, RefreshCw, Bookmark, BookmarkCheck, ArrowRight, Coins } from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils/cn'
import { TOOL_META_MAP, type RewriteTool, type RewriteResult } from '@/lib/brand/rewrite.types'

interface RewriteCompareProps {
  result: RewriteResult
  onAccept: (text: string) => void
  onRegenerate: () => void
  onSave: (id: string, saved: boolean) => void
  isRegenerating?: boolean
  isSaving?: boolean
  isSaved?: boolean
}

export function RewriteCompare({
  result,
  onAccept,
  onRegenerate,
  onSave,
  isRegenerating,
  isSaving,
  isSaved,
}: RewriteCompareProps) {
  const [copied, setCopied] = useState(false)
  const [accepted, setAccepted] = useState(false)

  const meta = TOOL_META_MAP[result.tool]

  async function copyToClipboard() {
    await navigator.clipboard.writeText(result.rewritten_text)
    setCopied(true)
    toast.success('Copied to clipboard')
    setTimeout(() => setCopied(false), 2000)
  }

  function handleAccept() {
    onAccept(result.rewritten_text)
    setAccepted(true)
    toast.success('Applied to editor')
  }

  // Simple word-level diff highlight — mark changed spans
  function renderDiff() {
    const origWords  = result.original_text.split(/\s+/)
    const newWords   = result.rewritten_text.split(/\s+/)
    const origSet    = new Set(origWords.map((w) => w.toLowerCase().replace(/[^a-z0-9]/g, '')))

    return newWords.map((word, i) => {
      const clean = word.toLowerCase().replace(/[^a-z0-9]/g, '')
      const isNew = clean.length > 2 && !origSet.has(clean)
      return (
        <span
          key={i}
          className={cn(
            isNew && 'bg-accent/15 text-accent rounded px-0.5',
          )}
        >
          {word}{' '}
        </span>
      )
    })
  }

  const charDiff = result.rewritten_text.length - result.original_text.length
  const wordDiff = result.rewritten_text.split(/\s+/).length - result.original_text.split(/\s+/).length

  return (
    <div className="rounded-xl border border-border bg-surface overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-surface-raised">
        <div className="flex items-center gap-2">
          <span className={cn('text-xs font-semibold px-2 py-0.5 rounded-full border', meta?.bgColor, meta?.color)}>
            {meta?.label ?? result.tool}
          </span>
          <span className="text-xs text-zinc-500">
            {charDiff > 0 ? `+${charDiff}` : charDiff} chars
            {' · '}
            {wordDiff > 0 ? `+${wordDiff}` : wordDiff} words
          </span>
        </div>
        <div className="flex items-center gap-1.5 text-xs text-zinc-600">
          <Coins className="h-3 w-3" />
          <span>{result.tokens_used} tokens</span>
        </div>
      </div>

      {/* Split compare */}
      <div className="grid grid-cols-2 divide-x divide-border">
        {/* Original */}
        <div className="p-4 space-y-2">
          <p className="text-[10px] font-semibold uppercase tracking-widest text-zinc-600">Original</p>
          <p className="text-sm text-zinc-400 leading-relaxed whitespace-pre-wrap">
            {result.original_text}
          </p>
        </div>

        {/* Rewritten */}
        <div className="p-4 space-y-2">
          <p className="text-[10px] font-semibold uppercase tracking-widest text-zinc-400">
            Rewritten{' '}
            <span className="text-zinc-600 normal-case tracking-normal font-normal">
              — new words highlighted
            </span>
          </p>
          <p className="text-sm text-foreground leading-relaxed whitespace-pre-wrap">
            {renderDiff()}
          </p>
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center justify-between px-4 py-3 border-t border-border bg-surface-raised">
        <div className="flex items-center gap-2">
          {/* Accept */}
          <button
            onClick={handleAccept}
            disabled={accepted}
            className={cn(
              'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all',
              accepted
                ? 'bg-green-500/20 text-green-400 border border-green-500/30 cursor-default'
                : 'bg-accent text-white hover:bg-accent/90 active:scale-[0.98]',
            )}
          >
            {accepted ? <Check className="h-3.5 w-3.5" /> : <ArrowRight className="h-3.5 w-3.5" />}
            {accepted ? 'Applied' : 'Use This'}
          </button>

          {/* Copy */}
          <button
            onClick={copyToClipboard}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-surface border border-border text-muted hover:text-foreground hover:border-zinc-600 transition-all"
          >
            {copied ? <Check className="h-3.5 w-3.5 text-green-400" /> : <Copy className="h-3.5 w-3.5" />}
            {copied ? 'Copied' : 'Copy'}
          </button>

          {/* Regenerate */}
          <button
            onClick={onRegenerate}
            disabled={isRegenerating}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-surface border border-border text-muted hover:text-foreground hover:border-zinc-600 transition-all disabled:opacity-40"
          >
            <RefreshCw className={cn('h-3.5 w-3.5', isRegenerating && 'animate-spin')} />
            {isRegenerating ? 'Regenerating…' : 'Regenerate'}
          </button>
        </div>

        {/* Save */}
        <button
          onClick={() => onSave(result.id, !isSaved)}
          disabled={isSaving}
          className={cn(
            'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all',
            isSaved
              ? 'text-accent border border-accent/30 bg-accent/10'
              : 'text-muted border border-border bg-surface hover:text-foreground hover:border-zinc-600',
          )}
        >
          {isSaved
            ? <BookmarkCheck className="h-3.5 w-3.5" />
            : <Bookmark className="h-3.5 w-3.5" />
          }
          {isSaved ? 'Saved' : 'Save'}
        </button>
      </div>
    </div>
  )
}
