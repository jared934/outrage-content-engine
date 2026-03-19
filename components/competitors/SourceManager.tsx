'use client'

import { useState } from 'react'
import { Plus, Trash2, AlertCircle, CheckCircle2, RefreshCw } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { cn } from '@/lib/utils/cn'
import { Button } from '@/components/ui/Button'
import { SOURCE_CONFIG } from '@/lib/competitors/competitor.types'
import { useAddSource, useDeleteSource } from '@/hooks/useCompetitors'
import type { Competitor, CompetitorSourceType } from '@/lib/competitors/competitor.types'

interface SourceManagerProps {
  competitor: Competitor
}

export function SourceManager({ competitor }: SourceManagerProps) {
  const [showAdd, setShowAdd] = useState(false)
  const [type,    setType]    = useState<CompetitorSourceType>('rss')
  const [url,     setUrl]     = useState('')
  const [label,   setLabel]   = useState('')
  const [handle,  setHandle]  = useState('')

  const { mutate: addSource,    isPending: adding   } = useAddSource()
  const { mutate: deleteSource, isPending: deleting } = useDeleteSource()

  function submit() {
    if (!url.trim()) return
    addSource(
      { competitorId: competitor.id, input: { source_type: type, url: url.trim(), handle: handle.trim() || null, label: label.trim() || null } },
      { onSuccess: () => { setShowAdd(false); setUrl(''); setLabel(''); setHandle('') } }
    )
  }

  const sources = competitor.sources ?? []

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <p className="text-[10px] font-semibold text-zinc-500 uppercase tracking-wide">Sources</p>
        <button
          onClick={() => setShowAdd((v) => !v)}
          className="flex items-center gap-0.5 text-[10px] text-zinc-600 hover:text-accent transition-colors"
        >
          <Plus className="h-3 w-3" />
          Add
        </button>
      </div>

      {sources.length === 0 && !showAdd && (
        <p className="text-xs text-zinc-700 italic">No sources — add an RSS feed or link to start tracking</p>
      )}

      {/* Source list */}
      {sources.map((src) => {
        const cfg = SOURCE_CONFIG[src.source_type]
        return (
          <div
            key={src.id}
            className={cn(
              'flex items-center gap-2 px-3 py-2 rounded-lg border text-xs',
              src.fetch_error
                ? 'border-red-800/40 bg-red-950/20'
                : 'border-border bg-surface-raised',
            )}
          >
            <span className="shrink-0">{cfg.icon}</span>
            <div className="flex-1 min-w-0">
              <p className="text-foreground truncate">{src.label ?? src.handle ?? src.url}</p>
              <div className="flex items-center gap-2 mt-0.5">
                <span className="text-[10px] text-zinc-600">{cfg.label}</span>
                {src.last_fetched_at && (
                  <span className="text-[10px] text-zinc-700">
                    · {formatDistanceToNow(new Date(src.last_fetched_at), { addSuffix: true })}
                  </span>
                )}
                {src.post_count > 0 && (
                  <span className="text-[10px] text-zinc-600">· {src.post_count} posts</span>
                )}
              </div>
              {src.fetch_error && (
                <p className="text-[10px] text-red-400 mt-0.5 flex items-center gap-1">
                  <AlertCircle className="h-2.5 w-2.5 shrink-0" />
                  {src.fetch_error.slice(0, 80)}
                </p>
              )}
            </div>
            {cfg.canAutoFetch && !src.fetch_error && src.last_fetched_at && (
              <CheckCircle2 className="h-3 w-3 text-green-500 shrink-0" />
            )}
            <button
              onClick={() => deleteSource({ competitorId: competitor.id, sourceId: src.id })}
              disabled={deleting}
              className="p-0.5 text-zinc-700 hover:text-red-500 transition-colors shrink-0"
            >
              <Trash2 className="h-3 w-3" />
            </button>
          </div>
        )
      })}

      {/* Add form */}
      {showAdd && (
        <div className="rounded-lg border border-accent/30 bg-accent/5 p-3 space-y-2">
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-[10px] text-muted mb-1">Type</label>
              <select
                className="w-full bg-surface border border-border rounded-lg px-2 py-1.5 text-xs text-foreground focus:outline-none focus:border-accent"
                value={type}
                onChange={(e) => setType(e.target.value as CompetitorSourceType)}
              >
                {(Object.entries(SOURCE_CONFIG) as Array<[CompetitorSourceType, (typeof SOURCE_CONFIG)[CompetitorSourceType]]>).map(([key, cfg]) => (
                  <option key={key} value={key}>
                    {cfg.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-[10px] text-muted mb-1">Label (optional)</label>
              <input
                className="w-full bg-surface border border-border rounded-lg px-2 py-1.5 text-xs text-foreground focus:outline-none focus:border-accent"
                placeholder="e.g. Main feed"
                value={label}
                onChange={(e) => setLabel(e.target.value)}
              />
            </div>
          </div>
          <div>
            <label className="block text-[10px] text-muted mb-1">URL / Feed URL</label>
            <input
              autoFocus
              className="w-full bg-surface border border-border rounded-lg px-2 py-1.5 text-xs text-foreground focus:outline-none focus:border-accent"
              placeholder="https://example.com/feed.xml"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
            />
            {SOURCE_CONFIG[type]?.canAutoFetch && (
              <p className="text-[10px] text-green-500 mt-1">
                ✓ RSS/Atom — will be auto-fetched when you click Refresh
              </p>
            )}
            {!SOURCE_CONFIG[type]?.canAutoFetch && (
              <p className="text-[10px] text-zinc-600 mt-1">
                Social sources require n8n to scrape and POST to /api/competitors/ingest
              </p>
            )}
          </div>
          <div className="flex gap-2 justify-end">
            <Button variant="ghost" size="sm" onClick={() => setShowAdd(false)}>Cancel</Button>
            <Button variant="primary" size="sm" disabled={!url.trim() || adding} onClick={submit}>
              {adding ? 'Adding…' : 'Add source'}
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
