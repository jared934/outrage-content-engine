'use client'

import { useState } from 'react'
import { X } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { cn } from '@/lib/utils/cn'
import { CATEGORY_CONFIG } from '@/lib/competitors/competitor.types'
import { useCreateCompetitor } from '@/hooks/useCompetitors'
import type { CompetitorCategory } from '@/lib/competitors/competitor.types'

interface AddCompetitorModalProps {
  orgId:    string
  onClose:  () => void
}

export function AddCompetitorModal({ orgId, onClose }: AddCompetitorModalProps) {
  const [name,       setName]       = useState('')
  const [category,   setCategory]   = useState<CompetitorCategory>('media_brand')
  const [description, setDescription] = useState('')
  const [websiteUrl, setWebsiteUrl] = useState('')
  const [avatarUrl,  setAvatarUrl]  = useState('')
  const [notes,      setNotes]      = useState('')

  const { mutate: create, isPending } = useCreateCompetitor(orgId)

  function submit() {
    if (!name.trim()) return
    create(
      {
        name:        name.trim(),
        category,
        description: description.trim() || null,
        website_url: websiteUrl.trim() || null,
        avatar_url:  avatarUrl.trim() || null,
        notes:       notes.trim() || null,
      },
      { onSuccess: onClose }
    )
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="w-full max-w-md rounded-2xl border border-border bg-surface shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-border">
          <h2 className="text-sm font-semibold text-foreground">Add Competitor</h2>
          <button onClick={onClose} className="text-zinc-600 hover:text-foreground transition-colors">
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Form */}
        <div className="p-5 space-y-4">
          {/* Name */}
          <div>
            <label className="block text-xs text-muted mb-1">Name *</label>
            <input
              autoFocus
              className="w-full bg-surface-raised border border-border rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:border-accent"
              placeholder="e.g. MemesForDays, BuzzFeed, @viraldude"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>

          {/* Category */}
          <div>
            <label className="block text-xs text-muted mb-1.5">Category</label>
            <div className="flex flex-wrap gap-2">
              {(Object.entries(CATEGORY_CONFIG) as Array<[CompetitorCategory, typeof CATEGORY_CONFIG[CompetitorCategory]]>).map(([key, cfg]) => (
                <button
                  key={key}
                  onClick={() => setCategory(key)}
                  className={cn(
                    'flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-xs transition-all',
                    category === key
                      ? 'border-accent bg-accent/10 text-accent'
                      : 'border-border text-zinc-600 hover:border-zinc-600',
                  )}
                >
                  <span>{cfg.icon}</span>
                  {cfg.label}
                </button>
              ))}
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="block text-xs text-muted mb-1">Description</label>
            <input
              className="w-full bg-surface-raised border border-border rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:border-accent"
              placeholder="What do they cover? Why are they relevant?"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            {/* Website */}
            <div>
              <label className="block text-xs text-muted mb-1">Website URL</label>
              <input
                className="w-full bg-surface-raised border border-border rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:border-accent"
                placeholder="https://..."
                value={websiteUrl}
                onChange={(e) => setWebsiteUrl(e.target.value)}
              />
            </div>

            {/* Avatar */}
            <div>
              <label className="block text-xs text-muted mb-1">Avatar URL</label>
              <input
                className="w-full bg-surface-raised border border-border rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:border-accent"
                placeholder="https://..."
                value={avatarUrl}
                onChange={(e) => setAvatarUrl(e.target.value)}
              />
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-xs text-muted mb-1">Notes</label>
            <textarea
              rows={2}
              className="w-full bg-surface-raised border border-border rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:border-accent resize-none"
              placeholder="Internal notes about this competitor..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>
        </div>

        {/* Footer */}
        <div className="flex gap-2 justify-end px-5 py-4 border-t border-border">
          <Button variant="ghost" size="sm" onClick={onClose}>Cancel</Button>
          <Button
            variant="primary" size="sm"
            disabled={!name.trim() || isPending}
            onClick={submit}
          >
            {isPending ? 'Adding…' : 'Add competitor'}
          </Button>
        </div>
      </div>
    </div>
  )
}
