'use client'

import { useState } from 'react'
import { Plus, Eye, RefreshCw, BarChart2, Search } from 'lucide-react'
import { cn } from '@/lib/utils/cn'
import { Button } from '@/components/ui/Button'
import { Skeleton } from '@/components/ui/Skeleton'
import { EmptyState } from '@/components/ui/EmptyState'
import { CATEGORY_CONFIG } from '@/lib/competitors/competitor.types'
import { useCompetitors, useRefreshCompetitor } from '@/hooks/useCompetitors'

import { CompetitorCard } from '@/components/competitors/CompetitorCard'
import { AddCompetitorModal } from '@/components/competitors/AddCompetitorModal'
import { PostFeed } from '@/components/competitors/PostFeed'
import { GapAnalysis } from '@/components/competitors/GapAnalysis'
import type { Competitor, CompetitorCategory } from '@/lib/competitors/competitor.types'

type Tab = 'watchlist' | 'feed' | 'gaps'

interface CompetitorWatchlistClientProps {
  orgId: string
}

export function CompetitorWatchlistClient({ orgId }: CompetitorWatchlistClientProps) {
  const [tab,          setTab]          = useState<Tab>('watchlist')
  const [showAdd,      setShowAdd]      = useState(false)
  const [selected,     setSelected]     = useState<Competitor | null>(null)
  const [search,       setSearch]       = useState('')
  const [catFilter,    setCatFilter]    = useState<CompetitorCategory | ''>('')

  const { data: competitors = [], isLoading } = useCompetitors(orgId)
  const { mutate: refreshAll, isPending: refreshingAll } = useRefreshCompetitor(orgId)

  const TABS: { id: Tab; label: string; icon: React.ReactNode }[] = [
    { id: 'watchlist', label: 'Watchlist', icon: <Eye className="h-3.5 w-3.5" /> },
    { id: 'feed',      label: 'Feed',      icon: <RefreshCw className="h-3.5 w-3.5" /> },
    { id: 'gaps',      label: 'Gap Analysis', icon: <BarChart2 className="h-3.5 w-3.5" /> },
  ]

  const filtered = competitors.filter((c) => {
    const matchSearch = !search || c.name.toLowerCase().includes(search.toLowerCase())
    const matchCat    = !catFilter || c.category === catFilter
    return matchSearch && matchCat
  })

  // Collect categories actually in use
  const usedCategories = Array.from(new Set(competitors.map((c) => c.category)))

  // Total RSS-fetchable sources across all competitors
  const totalRssSources = competitors.reduce(
    (sum, c) => sum + (c.sources ?? []).filter((s) => s.source_type === 'rss' || s.source_type === 'atom').length,
    0
  )

  return (
    <div className="p-5 max-w-screen-lg mx-auto space-y-5">
      {/* Page header */}
      <div className="flex items-center gap-3">
        <Eye className="h-4 w-4 text-muted shrink-0" />
        <h1 className="font-display font-bold text-xl text-foreground flex-1">Competitor Watchlist</h1>
        <div className="flex items-center gap-2">
          {totalRssSources > 0 && (
            <Button
              variant="secondary" size="sm"
              icon={<RefreshCw className={cn('h-3.5 w-3.5', refreshingAll && 'animate-spin')} />}
              loading={refreshingAll}
              onClick={() => {
                // Refresh all competitors with RSS sources
                competitors
                  .filter((c) => (c.sources ?? []).some((s) => s.source_type === 'rss' || s.source_type === 'atom'))
                  .forEach((c) => refreshAll(c.id))
              }}
            >
              Refresh all
            </Button>
          )}
          <Button
            variant="primary" size="sm"
            icon={<Plus className="h-3.5 w-3.5" />}
            onClick={() => setShowAdd(true)}
          >
            Add Competitor
          </Button>
        </div>
      </div>

      {/* Stats pills */}
      {competitors.length > 0 && (
        <div className="flex flex-wrap items-center gap-2">
          {[
            { label: 'Tracked',       value: competitors.length },
            { label: 'RSS Sources',   value: totalRssSources },
            { label: 'Total Posts',   value: competitors.reduce((s, c) => s + c.post_count, 0) },
          ].map(({ label, value }) => (
            <div key={label} className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-surface border border-border">
              <span className="text-sm font-bold text-foreground tabular-nums">{value}</span>
              <span className="text-xs text-muted">{label}</span>
            </div>
          ))}
        </div>
      )}

      {/* Tabs */}
      <div className="flex items-center gap-0.5 border-b border-border">
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={cn(
              'flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors -mb-px',
              tab === t.id
                ? 'border-accent text-foreground'
                : 'border-transparent text-muted hover:text-foreground',
            )}
          >
            {t.icon}
            {t.label}
          </button>
        ))}
      </div>

      {/* ── Watchlist tab ── */}
      {tab === 'watchlist' && (
        <div className="space-y-4">
          {/* Search + category filter */}
          {competitors.length > 0 && (
            <div className="flex flex-wrap items-center gap-2">
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-zinc-600" />
                <input
                  className="pl-8 pr-3 py-1.5 bg-surface border border-border rounded-lg text-xs text-foreground focus:outline-none focus:border-accent w-48"
                  placeholder="Search competitors…"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
              <button
                onClick={() => setCatFilter('')}
                className={cn(
                  'px-2.5 py-1 rounded-full text-[10px] font-semibold border transition-all',
                  !catFilter
                    ? 'border-accent bg-accent/10 text-accent'
                    : 'border-border text-zinc-600 hover:border-zinc-600',
                )}
              >
                All
              </button>
              {usedCategories.map((cat) => {
                const cfg = CATEGORY_CONFIG[cat]
                return (
                  <button
                    key={cat}
                    onClick={() => setCatFilter(catFilter === cat ? '' : cat)}
                    className={cn(
                      'flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-semibold border transition-all',
                      catFilter === cat
                        ? 'border-accent bg-accent/10 text-accent'
                        : 'border-border text-zinc-600 hover:border-zinc-600',
                    )}
                  >
                    {cfg.icon} {cfg.label}
                  </button>
                )
              })}
            </div>
          )}

          {/* Competitor grid */}
          {isLoading ? (
            <div className="space-y-2">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-16 w-full rounded-xl" />
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <EmptyState
              icon={<Eye className="h-10 w-10" />}
              title={competitors.length === 0 ? 'No competitors tracked yet' : 'No matches'}
              description={
                competitors.length === 0
                  ? 'Add competitor pages, meme accounts, and media brands to start tracking what they cover — and what they miss.'
                  : 'Try adjusting your search or filters.'
              }
              action={competitors.length === 0 ? { label: 'Add first competitor', onClick: () => setShowAdd(true) } : undefined}
            />
          ) : (
            <div className="space-y-2">
              {filtered.map((c) => (
                <CompetitorCard
                  key={c.id}
                  competitor={c}
                  orgId={orgId}
                  onSelect={setSelected}
                  selected={selected?.id === c.id}
                />
              ))}
            </div>
          )}

          {/* Architecture note */}
          <div className="rounded-xl border border-border bg-surface p-4 space-y-2">
            <p className="text-xs font-semibold text-foreground">Feed Architecture</p>
            <ul className="text-xs text-muted space-y-1 list-none">
              <li>
                <span className="text-green-400 font-semibold">📡 RSS/Atom</span> — fetched directly server-side.
                Add feed URLs and click <strong>Refresh</strong> (or automate via n8n).
              </li>
              <li>
                <span className="text-amber-400 font-semibold">𝕏 Twitter / 📸 Instagram</span> — requires n8n scraping.
                n8n monitors the handle and POSTs to <code className="text-zinc-500">/api/competitors/ingest</code>.
              </li>
              <li>
                <span className="text-purple-400 font-semibold">👽 Reddit</span> — use the subreddit's built-in RSS feed
                (<code className="text-zinc-500">/r/subreddit.rss</code>). Works automatically.
              </li>
            </ul>
          </div>
        </div>
      )}

      {/* ── Feed tab ── */}
      {tab === 'feed' && <PostFeed orgId={orgId} />}

      {/* ── Gap analysis tab ── */}
      {tab === 'gaps' && <GapAnalysis orgId={orgId} />}

      {/* Add competitor modal */}
      {showAdd && <AddCompetitorModal orgId={orgId} onClose={() => setShowAdd(false)} />}
    </div>
  )
}
