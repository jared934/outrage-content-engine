'use client'

import { useState, useEffect, useCallback, useRef, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Command } from 'cmdk'
import Link from 'next/link'
import {
  Search, ArrowRight, CornerDownLeft, Loader2,
  ChevronLeft, ExternalLink, Zap, TrendingUp,
} from 'lucide-react'
import { cn } from '@/lib/utils/cn'
import { useCommandBar } from '@/hooks/useCommandBar'
import { COMMAND_REGISTRY } from '@/lib/commands/command.registry'
import { parseQueryIntent } from '@/lib/commands/command.router'
import { useQuickCaptureStore } from '@/hooks/useQuickCapture'
import { toast } from 'sonner'
import type { StaticCommand, CommandResult, TrendItem, GapItem } from '@/lib/commands/command.types'

// ── Category config ───────────────────────────────────────────────────────────

const CATEGORY_ORDER = ['query', 'action', 'generate', 'navigate'] as const
const CATEGORY_LABELS: Record<string, string> = {
  query:    'Smart Queries',
  action:   'Actions',
  generate: 'Generate',
  navigate: 'Navigate',
}

// ── Score colouring ───────────────────────────────────────────────────────────

function scoreColor(n: number) {
  if (n >= 80) return 'text-green-400'
  if (n >= 60) return 'text-amber-400'
  if (n >= 40) return 'text-zinc-400'
  return 'text-red-400'
}

function actionBadge(action: string) {
  if (action === 'post_now')   return { label: '⚡ Post Now',  cls: 'bg-red-950/40 text-red-400 border-red-800/40' }
  if (action === 'post_soon')  return { label: '🔜 Post Soon', cls: 'bg-amber-950/40 text-amber-400 border-amber-800/40' }
  return { label: '👁 Monitor', cls: 'bg-zinc-800/40 text-zinc-500 border-zinc-700/40' }
}

// ── Inline trend card ─────────────────────────────────────────────────────────

function TrendCard({ item, onClose }: { item: TrendItem; onClose: () => void }) {
  const badge = actionBadge(item.recommended_action)
  return (
    <Link
      href={`/trends/${item.id}`}
      onClick={onClose}
      className="flex items-start gap-3 px-4 py-3 rounded-xl border border-border bg-surface hover:border-zinc-600 hover:bg-surface-raised transition-all group"
    >
      <div className="flex-1 min-w-0">
        <p className="text-sm text-foreground font-medium leading-snug line-clamp-2 group-hover:text-accent transition-colors">
          {item.title}
        </p>
        <div className="flex flex-wrap items-center gap-1.5 mt-1.5">
          <span className="text-[9px] text-zinc-600 capitalize">{item.category}</span>
          <span className={cn('text-[9px] px-1.5 py-0.5 rounded-full border font-semibold', badge.cls)}>
            {badge.label}
          </span>
        </div>
      </div>
      <div className="flex flex-col items-end gap-1 shrink-0">
        <span className={cn('text-sm font-bold tabular-nums', scoreColor(item.total_priority_score))}>
          {Math.round(item.total_priority_score)}
        </span>
        <span className="text-[9px] text-zinc-700">score</span>
      </div>
      <ExternalLink className="h-3 w-3 text-zinc-700 group-hover:text-accent transition-colors shrink-0 mt-0.5" />
    </Link>
  )
}

function GapCard({ item, onClose }: { item: GapItem; onClose: () => void }) {
  const color =
    item.gap_type === 'uncovered'   ? 'text-green-400 border-green-800/40 bg-green-950/30' :
    item.gap_type === 'underserved' ? 'text-amber-400 border-amber-800/40 bg-amber-950/30' :
                                      'text-red-400 border-red-800/40 bg-red-950/30'
  return (
    <Link
      href={`/trends/${item.cluster_id}`}
      onClick={onClose}
      className="flex items-center gap-3 px-4 py-2.5 rounded-xl border border-border bg-surface hover:border-zinc-600 transition-all group"
    >
      <span className={cn('text-[9px] px-1.5 py-0.5 rounded-full border font-semibold uppercase tracking-wide shrink-0', color)}>
        {item.gap_type}
      </span>
      <p className="text-sm text-foreground flex-1 truncate">{item.cluster_title}</p>
      <span className={cn('text-sm font-bold tabular-nums shrink-0', scoreColor(item.gap_score))}>
        {item.gap_score}
      </span>
    </Link>
  )
}

// ── Results pane ──────────────────────────────────────────────────────────────

function ResultsPane({
  result,
  onBack,
  onClose,
}: {
  result: CommandResult
  onBack:  () => void
  onClose: () => void
}) {
  return (
    <div className="flex flex-col gap-3 px-4 pb-4">
      {/* Header */}
      <div className="flex items-start gap-2 pt-1">
        <button
          onClick={onBack}
          className="flex items-center gap-1 text-[10px] text-zinc-600 hover:text-foreground transition-colors shrink-0 mt-0.5"
        >
          <ChevronLeft className="h-3 w-3" />
          Back
        </button>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-foreground">{result.title}</p>
          <p className="text-xs text-muted mt-0.5">{result.message}</p>
        </div>
        {result.href && (
          <Link
            href={result.href}
            onClick={onClose}
            className="shrink-0 flex items-center gap-0.5 text-[10px] text-accent hover:underline"
          >
            See all <ArrowRight className="h-3 w-3" />
          </Link>
        )}
      </div>

      {/* Trend results */}
      {result.type === 'trends' && result.items && result.items.length > 0 && (
        <div className="space-y-1.5">
          {result.items.map((item) => (
            <TrendCard key={item.id} item={item} onClose={onClose} />
          ))}
        </div>
      )}

      {/* Gap results */}
      {result.type === 'gaps' && result.gaps && result.gaps.length > 0 && (
        <div className="space-y-1.5">
          {result.gaps.map((g) => (
            <GapCard key={g.cluster_id} item={g} onClose={onClose} />
          ))}
        </div>
      )}

      {/* Text / empty result */}
      {(result.type === 'text' || result.type === 'success' || result.type === 'error') && (
        <div className={cn(
          'rounded-xl border px-4 py-3 text-sm',
          result.type === 'success' ? 'border-green-800/40 bg-green-950/20 text-green-400' :
          result.type === 'error'   ? 'border-red-800/40 bg-red-950/20 text-red-400'       :
                                      'border-border bg-surface text-muted',
        )}>
          {result.message}
        </div>
      )}
    </div>
  )
}

// ── Main CommandBar ───────────────────────────────────────────────────────────

export function CommandBar() {
  const { isOpen, open, close, navigate } = useCommandBar()
  const openCapture = useQuickCaptureStore((s) => s.open)
  const router = useRouter()

  const [query,   setQuery]   = useState('')
  const [result,  setResult]  = useState<CommandResult | null>(null)
  const [loading, setLoading] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  // ── Keyboard shortcut ─────────────────────────────────────────────────────────
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        isOpen ? close() : open()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [isOpen, open, close])

  // Reset on close
  useEffect(() => {
    if (!isOpen) {
      setTimeout(() => { setQuery(''); setResult(null); setLoading(false) }, 200)
    }
  }, [isOpen])

  // Focus input on open
  useEffect(() => {
    if (isOpen) setTimeout(() => inputRef.current?.focus(), 50)
  }, [isOpen])

  if (!isOpen) return null

  // ── Execute a smart query command ─────────────────────────────────────────────
  async function runQuery(intent: string, keyword?: string) {
    setLoading(true)
    setResult(null)
    try {
      const params = new URLSearchParams({ intent })
      if (keyword) params.set('keyword', keyword)
      const res = await fetch(`/api/commands/query?${params}`)
      const data: CommandResult = await res.json()
      setResult(data)
    } catch {
      setResult({ type: 'error', title: 'Query failed', message: 'Could not fetch results. Try again.' })
    } finally {
      setLoading(false)
    }
  }

  // ── Execute a server action ───────────────────────────────────────────────────
  async function runAction(actionId: string) {
    setLoading(true)
    try {
      if (actionId === 'capture_idea') {
        close()
        openCapture()
        setLoading(false)
        return
      } else if (actionId === 'fire_alerts') {
        const res = await fetch('/api/alerts/fire', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' })
        const data = await res.json()
        setResult({ type: 'success', title: 'Alert rules evaluated', message: `${data.fired ?? 0} alerts fired across ${data.evaluated ?? 0} trends.` })
      } else if (actionId === 'morning_digest' || actionId === 'evening_digest') {
        const type = actionId === 'morning_digest' ? 'morning' : 'evening'
        const res = await fetch(`/api/alerts/digest`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ type }) })
        if (res.ok) setResult({ type: 'success', title: `${type === 'morning' ? 'Morning' : 'Evening'} digest generated`, message: 'View it in the Alerts → Digest tab.', href: '/alerts' })
        else        setResult({ type: 'error', title: 'Digest failed', message: 'Could not generate digest.' })
      } else if (actionId === 'refresh_competitors') {
        setResult({ type: 'text', title: 'Refreshing competitor feeds…', message: 'Use the Refresh All button in the Competitor Watchlist for a full refresh.', href: '/competitors' })
        navigate('/competitors')
        return
      } else {
        // Navigate-based generate actions
        const navMap: Record<string, string> = {
          generate_headlines: '/content',
          create_meme:        '/memes',
          export_canva:       '/content',
          rewrite_savage:     '/brand',
          log_performance:    '/performance',
        }
        if (navMap[actionId]) { navigate(navMap[actionId]); return }
      }
    } catch {
      setResult({ type: 'error', title: 'Action failed', message: 'Something went wrong. Please try again.' })
    } finally {
      setLoading(false)
    }
  }

  // ── Select a command ──────────────────────────────────────────────────────────
  function selectCommand(cmd: StaticCommand) {
    if (cmd.href && !cmd.actionId) {
      navigate(cmd.href)
      return
    }
    if (cmd.queryIntent) {
      runQuery(cmd.queryIntent, cmd.queryKeyword)
      return
    }
    if (cmd.actionId) {
      runAction(cmd.actionId)
      return
    }
    if (cmd.href) {
      navigate(cmd.href)
    }
  }

  // ── Smart query from raw input ────────────────────────────────────────────────
  function runSmartQuery() {
    if (!query.trim()) return
    const parsed = parseQueryIntent(query)
    runQuery(parsed.intent, parsed.keyword)
  }

  // Group commands by category
  const grouped = CATEGORY_ORDER.map((cat) => ({
    category: cat,
    label:    CATEGORY_LABELS[cat],
    commands: COMMAND_REGISTRY.filter((c) => c.category === cat),
  }))

  // ── Render ────────────────────────────────────────────────────────────────────
  return (
    <div className="fixed inset-0 z-[100] flex items-start justify-center pt-[12vh] p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        onClick={close}
      />

      {/* Panel */}
      <Command
        className="relative z-10 w-full max-w-xl bg-[#0c0c0d] border border-zinc-800 rounded-2xl shadow-2xl overflow-hidden"
        shouldFilter={!result && !loading}
        loop
      >
        {/* Input row */}
        <div className="flex items-center gap-3 px-4 border-b border-zinc-800">
          {loading ? (
            <Loader2 className="h-4 w-4 text-accent shrink-0 animate-spin" />
          ) : result ? (
            <TrendingUp className="h-4 w-4 text-accent shrink-0" />
          ) : (
            <Search className="h-4 w-4 text-zinc-500 shrink-0" />
          )}
          <Command.Input
            ref={inputRef as React.Ref<HTMLInputElement>}
            placeholder={result ? 'Type another command…' : 'Search or type any command…'}
            className="flex-1 h-12 bg-transparent text-sm text-foreground placeholder:text-zinc-600 focus:outline-none"
            value={query}
            onValueChange={(v) => { setQuery(v); if (result) setResult(null) }}
            onKeyDown={(e) => {
              if (e.key === 'Escape') { if (result) { setResult(null) } else { close() } }
              if (e.key === 'Enter' && !result && !loading && query.trim() && e.metaKey) {
                runSmartQuery()
              }
            }}
          />
          <div className="flex items-center gap-1 shrink-0">
            {!result && query.trim() && (
              <button
                onClick={runSmartQuery}
                className="flex items-center gap-1 text-[10px] text-zinc-500 hover:text-accent transition-colors bg-zinc-800/60 px-2 py-0.5 rounded"
                title="Run smart query"
              >
                <Zap className="h-2.5 w-2.5" />
                Search
              </button>
            )}
            <kbd className="text-[10px] text-zinc-600 bg-zinc-800/60 px-1.5 py-0.5 rounded font-mono">ESC</kbd>
          </div>
        </div>

        {/* Loading state */}
        {loading && (
          <div className="flex items-center justify-center gap-2 py-10 text-sm text-zinc-500">
            <Loader2 className="h-4 w-4 animate-spin" />
            Fetching results…
          </div>
        )}

        {/* Results pane */}
        {!loading && result && (
          <div className="max-h-[420px] overflow-y-auto py-2">
            <ResultsPane result={result} onBack={() => setResult(null)} onClose={close} />
          </div>
        )}

        {/* Command list (hidden when showing results or loading) */}
        {!loading && !result && (
          <Command.List className="max-h-[420px] overflow-y-auto py-2">
            <Command.Empty className="py-10 text-center text-sm text-zinc-500">
              No commands match. Press{' '}
              <kbd className="bg-zinc-800 px-1 rounded text-xs">⌘↩</kbd>{' '}
              or click <span className="text-accent">Search</span> to run a smart query.
            </Command.Empty>

            {/* Smart query item (always visible when typing) */}
            {query.trim().length > 1 && (
              <Command.Group
                heading="Smart Query"
                className={groupClass}
              >
                <Command.Item
                  value={`__smart__${query}`}
                  onSelect={runSmartQuery}
                  className={itemClass}
                >
                  <span className="text-base shrink-0">🔍</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-foreground">Search for <span className="text-accent">"{query}"</span></p>
                    <p className="text-[10px] text-zinc-600">Run as a smart trend query</p>
                  </div>
                  <CornerDownLeft className="h-3 w-3 text-zinc-600 shrink-0" />
                </Command.Item>
              </Command.Group>
            )}

            {/* Grouped commands */}
            {grouped.map(({ category, label, commands }) => (
              <Command.Group
                key={category}
                heading={label}
                className={groupClass}
              >
                {commands.map((cmd) => (
                  <Command.Item
                    key={cmd.id}
                    value={`${cmd.id} ${cmd.label} ${cmd.description} ${cmd.keywords.join(' ')}`}
                    onSelect={() => selectCommand(cmd)}
                    className={itemClass}
                  >
                    <span className="text-base shrink-0 leading-none">{cmd.icon}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-foreground leading-snug">{cmd.label}</p>
                      <p className="text-[10px] text-zinc-600 leading-tight">{cmd.description}</p>
                    </div>
                    {cmd.shortcut && (
                      <kbd className="text-[10px] text-zinc-600 bg-zinc-800/60 px-1.5 py-0.5 rounded font-mono shrink-0">
                        {cmd.shortcut}
                      </kbd>
                    )}
                    {cmd.category === 'navigate' && (
                      <ArrowRight className="h-3 w-3 text-zinc-700 shrink-0" />
                    )}
                    {(cmd.category === 'query' || cmd.category === 'action' || cmd.category === 'generate') && (
                      <CornerDownLeft className="h-3 w-3 text-zinc-700 shrink-0" />
                    )}
                  </Command.Item>
                ))}
              </Command.Group>
            ))}
          </Command.List>
        )}

        {/* Footer hints */}
        {!loading && (
          <div className="flex items-center justify-between px-4 py-2 border-t border-zinc-800/60">
            <div className="flex items-center gap-3 text-[10px] text-zinc-700">
              <span><kbd className="bg-zinc-800/60 px-1 py-0.5 rounded">↑↓</kbd> navigate</span>
              <span><kbd className="bg-zinc-800/60 px-1 py-0.5 rounded">↩</kbd> select</span>
              <span><kbd className="bg-zinc-800/60 px-1 py-0.5 rounded">ESC</kbd> close</span>
            </div>
            <div className="text-[10px] text-zinc-700">
              <kbd className="bg-zinc-800/60 px-1 py-0.5 rounded">⌘K</kbd> to toggle
            </div>
          </div>
        )}
      </Command>
    </div>
  )
}

// ── Class helpers ─────────────────────────────────────────────────────────────

const groupClass = `
  [&_[cmdk-group-heading]]:px-4
  [&_[cmdk-group-heading]]:py-1.5
  [&_[cmdk-group-heading]]:text-[10px]
  [&_[cmdk-group-heading]]:font-semibold
  [&_[cmdk-group-heading]]:text-zinc-600
  [&_[cmdk-group-heading]]:uppercase
  [&_[cmdk-group-heading]]:tracking-wider
`

const itemClass = `
  flex items-center gap-3 px-4 py-2.5 text-sm cursor-pointer transition-colors
  data-[selected=true]:bg-zinc-800/60
  data-[selected=true]:text-foreground
  text-zinc-400
  hover:bg-zinc-800/40
`
