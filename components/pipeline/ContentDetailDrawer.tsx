'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import {
  X, ExternalLink, Palette, Zap, Calendar, Tag,
  FileText, Link2, ChevronDown, CheckCircle2,
} from 'lucide-react'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { cn } from '@/lib/utils/cn'
import { useUpdatePipelineItem, useDeletePipelineItem } from '@/hooks/usePipelineItems'
import {
  PIPELINE_STATUSES,
  STATUS_CONFIG,
  FORMAT_OPTIONS,
  PLATFORM_OPTIONS,
} from '@/lib/pipeline/pipeline.types'
import type { PipelineItem, PipelineStatus, UpdatePipelineItemInput } from '@/lib/pipeline/pipeline.types'

interface ContentDetailDrawerProps {
  item:    PipelineItem | null
  onClose: () => void
}

export function ContentDetailDrawer({ item, onClose }: ContentDetailDrawerProps) {
  const { mutate: update, isPending: saving } = useUpdatePipelineItem()
  const { mutate: del }                        = useDeletePipelineItem()

  const [draft, setDraft] = useState<UpdatePipelineItemInput>({})
  const [tagInput, setTagInput] = useState('')

  useEffect(() => {
    if (item) {
      setDraft({
        title:       item.title,
        headline:    item.headline ?? '',
        caption:     item.caption  ?? '',
        format:      item.format   ?? '',
        platform:    item.platform ?? '',
        status:      item.status,
        urgency:     item.urgency,
        design_link: item.design_link ?? '',
        notes:       item.notes ?? '',
        tags:        [...(item.tags ?? [])],
        due_at:      item.due_at ?? '',
        publish_at:  item.publish_at ?? '',
      })
    }
  }, [item?.id])

  if (!item) return null

  const cfg = STATUS_CONFIG[draft.status ?? item.status]

  function save() {
    if (!item) return
    const payload: UpdatePipelineItemInput = { ...draft }
    // Clean empty strings to null
    if (!payload.headline)    delete payload.headline
    if (!payload.caption)     delete payload.caption
    if (!payload.design_link) delete payload.design_link
    if (!payload.notes)       delete payload.notes
    if (!payload.due_at)      delete payload.due_at
    if (!payload.publish_at)  delete payload.publish_at
    update({ id: item.id, updates: payload })
  }

  function addTag(e: React.KeyboardEvent) {
    if (e.key !== 'Enter' || !tagInput.trim()) return
    e.preventDefault()
    const tags = [...(draft.tags ?? []), tagInput.trim()]
    setDraft((d) => ({ ...d, tags }))
    setTagInput('')
  }

  function removeTag(tag: string) {
    setDraft((d) => ({ ...d, tags: (d.tags ?? []).filter((t) => t !== tag) }))
  }

  function setStatus(s: PipelineStatus) {
    setDraft((d) => ({ ...d, status: s }))
  }

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 z-40"
        onClick={onClose}
      />

      {/* Drawer */}
      <div className="fixed right-0 top-0 bottom-0 w-full max-w-lg bg-surface border-l border-border z-50 flex flex-col overflow-hidden shadow-2xl">

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-border shrink-0">
          <div className="flex items-center gap-2">
            <span className={cn('h-2 w-2 rounded-full', cfg.dotClass)} />
            <span className={cn('text-xs font-bold uppercase tracking-wider', cfg.textClass)}>
              {cfg.label}
            </span>
          </div>
          <div className="flex items-center gap-2">
            {item.cluster_id && (
              <Link
                href={`/trends/${item.cluster_id}`}
                className="text-xs text-muted hover:text-foreground transition-colors flex items-center gap-1"
              >
                View trend <ExternalLink className="h-3 w-3" />
              </Link>
            )}
            <button onClick={onClose} className="text-zinc-600 hover:text-foreground transition-colors">
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Scrollable body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-5">

          {/* Title */}
          <div>
            <label className="block text-xs text-muted mb-1 font-medium">Title</label>
            <input
              className="w-full bg-surface-raised border border-border rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:border-accent"
              value={String(draft.title ?? '')}
              onChange={(e) => setDraft((d) => ({ ...d, title: e.target.value }))}
            />
          </div>

          {/* Status selector */}
          <div>
            <label className="block text-xs text-muted mb-1.5 font-medium">Status</label>
            <div className="flex flex-wrap gap-1.5">
              {PIPELINE_STATUSES.map((s) => {
                const c = STATUS_CONFIG[s]
                const active = (draft.status ?? item.status) === s
                return (
                  <button
                    key={s}
                    onClick={() => setStatus(s)}
                    className={cn(
                      'px-2.5 py-1 rounded-full text-[10px] font-semibold uppercase tracking-wide transition-all border',
                      active
                        ? cn(c.bgClass, c.textClass, c.borderClass)
                        : 'bg-transparent text-zinc-600 border-zinc-800 hover:border-zinc-600',
                    )}
                  >
                    {c.label}
                  </button>
                )
              })}
            </div>
          </div>

          {/* Format + Platform */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-muted mb-1 font-medium">Format</label>
              <select
                className="w-full bg-surface-raised border border-border rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:border-accent"
                value={String(draft.format ?? '')}
                onChange={(e) => setDraft((d) => ({ ...d, format: e.target.value || null }))}
              >
                <option value="">—</option>
                {FORMAT_OPTIONS.map((f) => (
                  <option key={f.value} value={f.value}>{f.icon} {f.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs text-muted mb-1 font-medium">Platform</label>
              <select
                className="w-full bg-surface-raised border border-border rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:border-accent"
                value={String(draft.platform ?? '')}
                onChange={(e) => setDraft((d) => ({ ...d, platform: e.target.value || null }))}
              >
                <option value="">—</option>
                {PLATFORM_OPTIONS.map((p) => (
                  <option key={p.value} value={p.value}>{p.label}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Urgency */}
          <div>
            <label className="flex items-center gap-1.5 text-xs text-muted mb-1.5 font-medium">
              <Zap className="h-3 w-3" /> Urgency — {draft.urgency ?? item.urgency}
            </label>
            <input
              type="range" min={0} max={100}
              value={draft.urgency ?? item.urgency}
              onChange={(e) => setDraft((d) => ({ ...d, urgency: Number(e.target.value) }))}
              className="w-full accent-accent"
            />
          </div>

          {/* Headline */}
          <div>
            <label className="block text-xs text-muted mb-1 font-medium">Headline</label>
            <input
              className="w-full bg-surface-raised border border-border rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:border-accent"
              placeholder="Main hook or title for the post..."
              value={String(draft.headline ?? '')}
              onChange={(e) => setDraft((d) => ({ ...d, headline: e.target.value }))}
            />
          </div>

          {/* Caption */}
          <div>
            <label className="block text-xs text-muted mb-1 font-medium">Caption</label>
            <textarea
              rows={3}
              className="w-full bg-surface-raised border border-border rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:border-accent resize-none"
              placeholder="Post copy / caption..."
              value={String(draft.caption ?? '')}
              onChange={(e) => setDraft((d) => ({ ...d, caption: e.target.value }))}
            />
          </div>

          {/* Design link */}
          <div>
            <label className="flex items-center gap-1.5 text-xs text-muted mb-1 font-medium">
              <Palette className="h-3 w-3" /> Design Link
            </label>
            <div className="flex gap-2">
              <input
                className="flex-1 bg-surface-raised border border-border rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:border-accent"
                placeholder="https://www.canva.com/design/..."
                value={String(draft.design_link ?? '')}
                onChange={(e) => setDraft((d) => ({ ...d, design_link: e.target.value }))}
              />
              {draft.design_link && (
                <a
                  href={String(draft.design_link)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center px-3 rounded-lg border border-border hover:border-zinc-600 text-zinc-500 hover:text-foreground transition-colors"
                >
                  <ExternalLink className="h-3.5 w-3.5" />
                </a>
              )}
            </div>
          </div>

          {/* Due + Publish */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="flex items-center gap-1 text-xs text-muted mb-1 font-medium">
                <Calendar className="h-3 w-3" /> Due
              </label>
              <input
                type="datetime-local"
                className="w-full bg-surface-raised border border-border rounded-lg px-3 py-2 text-xs text-foreground focus:outline-none focus:border-accent"
                value={draft.due_at ? String(draft.due_at).slice(0, 16) : ''}
                onChange={(e) => setDraft((d) => ({ ...d, due_at: e.target.value || null }))}
              />
            </div>
            <div>
              <label className="flex items-center gap-1 text-xs text-muted mb-1 font-medium">
                <Calendar className="h-3 w-3" /> Publish
              </label>
              <input
                type="datetime-local"
                className="w-full bg-surface-raised border border-border rounded-lg px-3 py-2 text-xs text-foreground focus:outline-none focus:border-accent"
                value={draft.publish_at ? String(draft.publish_at).slice(0, 16) : ''}
                onChange={(e) => setDraft((d) => ({ ...d, publish_at: e.target.value || null }))}
              />
            </div>
          </div>

          {/* Tags */}
          <div>
            <label className="flex items-center gap-1.5 text-xs text-muted mb-1.5 font-medium">
              <Tag className="h-3 w-3" /> Tags
            </label>
            <div className="flex flex-wrap gap-1.5 mb-2">
              {(draft.tags ?? []).map((tag) => (
                <span
                  key={tag}
                  className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-zinc-800 text-xs text-zinc-300"
                >
                  {tag}
                  <button onClick={() => removeTag(tag)} className="text-zinc-500 hover:text-red-400">
                    <X className="h-2.5 w-2.5" />
                  </button>
                </span>
              ))}
            </div>
            <input
              className="w-full bg-surface-raised border border-border rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:border-accent"
              placeholder="Add tag, press Enter..."
              value={tagInput}
              onChange={(e) => setTagInput(e.target.value)}
              onKeyDown={addTag}
            />
          </div>

          {/* Notes */}
          <div>
            <label className="flex items-center gap-1.5 text-xs text-muted mb-1 font-medium">
              <FileText className="h-3 w-3" /> Notes
            </label>
            <textarea
              rows={4}
              className="w-full bg-surface-raised border border-border rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:border-accent resize-none"
              placeholder="Internal notes, context, ideas..."
              value={String(draft.notes ?? '')}
              onChange={(e) => setDraft((d) => ({ ...d, notes: e.target.value }))}
            />
          </div>

          {/* Linked trend */}
          {item.cluster_title && (
            <div className="flex items-center gap-2 px-3 py-2.5 rounded-lg bg-surface-raised border border-border">
              <Link2 className="h-3.5 w-3.5 text-muted shrink-0" />
              <span className="text-xs text-muted">Trend:</span>
              <span className="text-xs text-foreground flex-1 truncate">{item.cluster_title}</span>
              <Link href={`/trends/${item.cluster_id}`} className="text-zinc-600 hover:text-accent">
                <ExternalLink className="h-3 w-3" />
              </Link>
            </div>
          )}

          {/* Quick links to Meme Studio / Canva */}
          <div className="flex gap-2">
            <Link
              href={`/memes/studio${item.cluster_id ? `?cluster_id=${item.cluster_id}` : ''}`}
              className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg border border-border text-xs text-zinc-500 hover:text-foreground hover:border-zinc-600 transition-colors"
            >
              😂 Open Meme Studio
            </Link>
            <Link
              href="/brand/exports"
              className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg border border-border text-xs text-zinc-500 hover:text-foreground hover:border-zinc-600 transition-colors"
            >
              <Palette className="h-3.5 w-3.5" /> Canva Export
            </Link>
          </div>

          {/* Approved stamp */}
          {item.approved_at && (
            <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-green-950/40 border border-green-700/30">
              <CheckCircle2 className="h-3.5 w-3.5 text-green-500 shrink-0" />
              <span className="text-xs text-green-400">
                Approved {new Date(item.approved_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
              </span>
            </div>
          )}
        </div>

        {/* Footer actions */}
        <div className="flex items-center justify-between gap-3 px-5 py-4 border-t border-border shrink-0">
          <button
            onClick={() => { del(item.id); onClose() }}
            className="text-xs text-zinc-600 hover:text-red-500 transition-colors"
          >
            Delete item
          </button>
          <div className="flex gap-2">
            <Button variant="ghost" size="sm" onClick={onClose}>Cancel</Button>
            <Button variant="primary" size="sm" onClick={save} disabled={saving}>
              {saving ? 'Saving…' : 'Save changes'}
            </Button>
          </div>
        </div>
      </div>
    </>
  )
}
