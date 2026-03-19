'use client'

import { useState, useRef, useCallback } from 'react'
import { Wand2, RotateCcw, BookOpen, Sparkles, Info } from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils/cn'
import { RewriteToolbar }  from '@/components/brand/RewriteToolbar'
import { RewriteCompare }  from '@/components/brand/RewriteCompare'
import { RewriteHistory }  from '@/components/brand/RewriteHistory'
import {
  useRewrite,
  useRewriteHistory,
  useToggleSaveRewrite,
  useDeleteRewrite,
} from '@/hooks/useBrandRewrite'
import type { RewriteTool, RewriteResult } from '@/lib/brand/rewrite.types'

interface BrandRewriteClientProps {
  orgId: string
}

const PLACEHOLDER_EXAMPLES = [
  'She exposed everything and the internet exploded.',
  'This is the most insane thing to happen this week.',
  'Nobody saw this coming. The receipts are wild.',
  'The drama is unfolding in real time and we are HERE for it.',
]

export function BrandRewriteClient({ orgId }: BrandRewriteClientProps) {
  const [text, setText]                   = useState('')
  const [activeTool, setActiveTool]       = useState<RewriteTool | null>(null)
  const [customInstruction, setCustom]    = useState('')
  const [showCustom, setShowCustom]       = useState(false)
  const [result, setResult]               = useState<RewriteResult | null>(null)
  const [savedResultIds, setSavedResultIds] = useState<Set<string>>(new Set())
  const [showHistory, setShowHistory]     = useState(false)
  const [toolFilter, setToolFilter]       = useState<RewriteTool | ''>('')
  const [savedOnly, setSavedOnly]         = useState(false)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const { mutate: runRewrite, isPending }   = useRewrite({ orgId, onSuccess: setResult })
  const { data: history = [], isLoading: historyLoading } = useRewriteHistory(orgId, {
    tool:     toolFilter || undefined,
    is_saved: savedOnly || undefined,
    limit:    30,
  })
  const { mutate: toggleSave, isPending: isSaving } = useToggleSaveRewrite(orgId)
  const { mutate: deleteItem }                       = useDeleteRewrite(orgId)

  // ---------------------------------------------------------------------------
  // Run a rewrite
  // ---------------------------------------------------------------------------

  function handleToolSelect(tool: RewriteTool) {
    const trimmed = text.trim()
    if (!trimmed) {
      toast.error('Paste or type some text first.')
      textareaRef.current?.focus()
      return
    }
    setActiveTool(tool)
    runRewrite({
      text: trimmed,
      tool,
      customInstruction: showCustom && customInstruction.trim() ? customInstruction.trim() : undefined,
    })
  }

  // ---------------------------------------------------------------------------
  // Accept a rewrite — push it back into the editor
  // ---------------------------------------------------------------------------

  function handleAccept(rewrittenText: string) {
    setText(rewrittenText)
    setResult(null)
    setActiveTool(null)
    textareaRef.current?.focus()
  }

  // ---------------------------------------------------------------------------
  // Regenerate — re-run the active tool
  // ---------------------------------------------------------------------------

  function handleRegenerate() {
    if (!activeTool) return
    handleToolSelect(activeTool)
  }

  // ---------------------------------------------------------------------------
  // Save a result
  // ---------------------------------------------------------------------------

  function handleSave(id: string, saved: boolean) {
    toggleSave({ id, saved })
    setSavedResultIds((prev) => {
      const next = new Set(prev)
      saved ? next.add(id) : next.delete(id)
      return next
    })
  }

  // ---------------------------------------------------------------------------
  // Restore from history
  // ---------------------------------------------------------------------------

  function handleRestore(text: string) {
    setText(text)
    setResult(null)
    setActiveTool(null)
    setShowHistory(false)
    textareaRef.current?.focus()
  }

  // ---------------------------------------------------------------------------
  // Clear everything
  // ---------------------------------------------------------------------------

  function handleClear() {
    setText('')
    setResult(null)
    setActiveTool(null)
    setCustom('')
    textareaRef.current?.focus()
  }

  const charCount   = text.length
  const charLimit   = 4000
  const isOverLimit = charCount > charLimit

  return (
    <div className="p-6 max-w-screen-xl mx-auto space-y-6">

      {/* Page header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="font-display font-bold text-xl text-foreground flex items-center gap-2">
            <Wand2 className="h-5 w-5 text-accent" />
            Brand Voice Rewriter
          </h1>
          <p className="text-sm text-muted mt-0.5">
            Paste any copy and apply OUTRAGE voice tools to it.
          </p>
        </div>
        <button
          onClick={() => setShowHistory((v) => !v)}
          className={cn(
            'flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium border transition-all',
            showHistory
              ? 'bg-accent/10 border-accent/30 text-accent'
              : 'bg-surface border-border text-muted hover:text-foreground hover:border-zinc-600',
          )}
        >
          <BookOpen className="h-4 w-4" />
          History
          {history.length > 0 && (
            <span className="text-[10px] bg-accent text-white rounded-full px-1.5 py-0.5 font-bold">
              {history.length}
            </span>
          )}
        </button>
      </div>

      {/* Main layout */}
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_260px] gap-5">

        {/* Left: editor + results */}
        <div className="space-y-4">

          {/* Text editor */}
          <div className={cn(
            'rounded-xl border bg-surface overflow-hidden transition-colors',
            isOverLimit ? 'border-red-800' : 'border-border focus-within:border-zinc-600',
          )}>
            <div className="flex items-center justify-between px-4 py-2.5 border-b border-border bg-surface-raised">
              <p className="text-xs font-medium text-muted">Your text</p>
              <div className="flex items-center gap-3">
                {text && (
                  <button
                    onClick={handleClear}
                    className="flex items-center gap-1 text-xs text-zinc-600 hover:text-muted transition-colors"
                  >
                    <RotateCcw className="h-3 w-3" />
                    Clear
                  </button>
                )}
                <span className={cn('text-xs', isOverLimit ? 'text-red-400' : 'text-zinc-600')}>
                  {charCount}/{charLimit}
                </span>
              </div>
            </div>

            <textarea
              ref={textareaRef}
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder={PLACEHOLDER_EXAMPLES[Math.floor(Math.random() * PLACEHOLDER_EXAMPLES.length)]}
              rows={7}
              className="w-full bg-transparent px-4 py-3 text-sm text-foreground placeholder:text-zinc-700 resize-none focus:outline-none leading-relaxed"
            />

            {/* Example chips */}
            {!text && (
              <div className="px-4 pb-3 flex flex-wrap gap-1.5">
                <p className="text-[10px] text-zinc-600 w-full mb-0.5">Try an example:</p>
                {PLACEHOLDER_EXAMPLES.slice(0, 3).map((ex) => (
                  <button
                    key={ex}
                    onClick={() => setText(ex)}
                    className="text-[11px] px-2 py-1 rounded-md bg-zinc-900 border border-border text-zinc-500 hover:text-zinc-300 hover:border-zinc-600 transition-all truncate max-w-[200px]"
                  >
                    {ex}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Custom instruction (optional) */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowCustom((v) => !v)}
              className={cn(
                'flex items-center gap-1.5 text-xs font-medium border rounded-lg px-2.5 py-1.5 transition-all',
                showCustom
                  ? 'bg-accent/10 border-accent/30 text-accent'
                  : 'bg-surface border-border text-zinc-500 hover:text-muted hover:border-zinc-600',
              )}
            >
              <Sparkles className="h-3 w-3" />
              {showCustom ? 'Hide custom instruction' : 'Add custom instruction'}
            </button>

            {showCustom && (
              <div className="flex items-start gap-1 text-xs text-zinc-600">
                <Info className="h-3.5 w-3.5 mt-0.5 flex-shrink-0" />
                Adds extra guidance on top of the selected tool.
              </div>
            )}
          </div>

          {showCustom && (
            <input
              type="text"
              value={customInstruction}
              onChange={(e) => setCustom(e.target.value)}
              maxLength={300}
              placeholder='e.g. "keep it under 10 words" · "make it sound British" · "avoid mentioning the brand name"'
              className="w-full bg-surface border border-border rounded-lg px-3 py-2.5 text-sm text-foreground placeholder:text-zinc-700 focus:outline-none focus:ring-2 focus:ring-accent"
            />
          )}

          {/* Loading state */}
          {isPending && (
            <div className="rounded-xl border border-border bg-surface p-6 flex items-center justify-center gap-3 text-muted">
              <span className="h-4 w-4 rounded-full border-2 border-accent border-t-transparent animate-spin" />
              <span className="text-sm">Rewriting with OUTRAGE voice…</span>
            </div>
          )}

          {/* Compare result */}
          {result && !isPending && (
            <RewriteCompare
              result={result}
              onAccept={handleAccept}
              onRegenerate={handleRegenerate}
              onSave={handleSave}
              isRegenerating={isPending}
              isSaving={isSaving}
              isSaved={savedResultIds.has(result.id)}
            />
          )}

          {/* Hint when nothing has run yet */}
          {!text && !result && !isPending && (
            <div className="rounded-xl border border-dashed border-border p-8 flex flex-col items-center text-center gap-2">
              <Wand2 className="h-8 w-8 text-zinc-700" />
              <p className="text-sm text-muted">Paste your copy above, then pick a voice tool.</p>
              <p className="text-xs text-zinc-600">The rewritten version will appear here for comparison.</p>
            </div>
          )}
        </div>

        {/* Right: toolbar */}
        <div className="lg:sticky lg:top-6 lg:self-start">
          <div className="rounded-xl border border-border bg-surface p-4">
            <p className="text-xs font-semibold text-muted uppercase tracking-wider mb-4">Voice Tools</p>
            <RewriteToolbar
              activeTool={activeTool}
              loadingTool={isPending ? activeTool : null}
              disabled={!text.trim() || isOverLimit}
              onSelect={handleToolSelect}
            />
          </div>
        </div>
      </div>

      {/* History panel */}
      {showHistory && (
        <div className="rounded-xl border border-border bg-surface p-5">
          <div className="flex items-center gap-2 mb-4">
            <BookOpen className="h-4 w-4 text-muted" />
            <h2 className="font-semibold text-sm text-foreground">Rewrite History</h2>
            <span className="text-xs text-zinc-600">{history.length} entries</span>
          </div>
          <RewriteHistory
            items={history}
            isLoading={historyLoading}
            onRestore={handleRestore}
            onSave={handleSave}
            onDelete={(id) => deleteItem(id)}
            toolFilter={toolFilter}
            onToolFilterChange={setToolFilter}
            savedOnly={savedOnly}
            onSavedOnlyChange={setSavedOnly}
          />
        </div>
      )}
    </div>
  )
}
