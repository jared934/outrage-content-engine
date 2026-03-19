'use client'

import { useState } from 'react'
import { X } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { cn } from '@/lib/utils/cn'
import { useCreatePipelineItem } from '@/hooks/usePipelineItems'
import {
  PIPELINE_STATUSES,
  STATUS_CONFIG,
  FORMAT_OPTIONS,
  PLATFORM_OPTIONS,
} from '@/lib/pipeline/pipeline.types'
import type { PipelineStatus } from '@/lib/pipeline/pipeline.types'

interface AddContentModalProps {
  orgId:          string
  defaultStatus?: PipelineStatus
  onClose:        () => void
}

export function AddContentModal({ orgId, defaultStatus = 'detected', onClose }: AddContentModalProps) {
  const { mutate: create, isPending } = useCreatePipelineItem(orgId)

  const [title,    setTitle]    = useState('')
  const [format,   setFormat]   = useState('')
  const [platform, setPlatform] = useState('')
  const [status,   setStatus]   = useState<PipelineStatus>(defaultStatus)
  const [urgency,  setUrgency]  = useState(50)

  function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!title.trim()) return
    create(
      {
        title: title.trim(),
        format:   format   || null,
        platform: platform || null,
        status,
        urgency,
      },
      { onSuccess: onClose },
    )
  }

  return (
    <>
      <div className="fixed inset-0 bg-black/60 z-50" onClick={onClose} />
      <div className="fixed inset-0 flex items-center justify-center z-50 p-4 pointer-events-none">
        <form
          onSubmit={submit}
          onClick={(e) => e.stopPropagation()}
          className="pointer-events-auto w-full max-w-md bg-surface border border-border rounded-2xl shadow-2xl"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-5 py-4 border-b border-border">
            <h2 className="font-display font-bold text-sm text-foreground">Add to Pipeline</h2>
            <button type="button" onClick={onClose} className="text-zinc-600 hover:text-foreground">
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="p-5 space-y-4">
            {/* Title */}
            <div>
              <label className="block text-xs text-muted mb-1 font-medium">Title *</label>
              <input
                autoFocus
                required
                className="w-full bg-surface-raised border border-border rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:border-accent"
                placeholder="What are you creating?"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
              />
            </div>

            {/* Status */}
            <div>
              <label className="block text-xs text-muted mb-1.5 font-medium">Status</label>
              <div className="flex flex-wrap gap-1.5">
                {PIPELINE_STATUSES.filter((s) => !['posted', 'archived', 'rejected'].includes(s)).map((s) => {
                  const c = STATUS_CONFIG[s]
                  const active = status === s
                  return (
                    <button
                      key={s} type="button"
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
                  value={format}
                  onChange={(e) => setFormat(e.target.value)}
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
                  value={platform}
                  onChange={(e) => setPlatform(e.target.value)}
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
              <label className="block text-xs text-muted mb-1.5 font-medium">
                Urgency — {urgency}
              </label>
              <input
                type="range" min={0} max={100}
                value={urgency}
                onChange={(e) => setUrgency(Number(e.target.value))}
                className="w-full accent-accent"
              />
            </div>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-end gap-2 px-5 py-4 border-t border-border">
            <Button type="button" variant="ghost" size="sm" onClick={onClose}>Cancel</Button>
            <Button type="submit" variant="primary" size="sm" disabled={isPending || !title.trim()}>
              {isPending ? 'Adding…' : 'Add item'}
            </Button>
          </div>
        </form>
      </div>
    </>
  )
}
