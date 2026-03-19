'use client'

import { useState } from 'react'
import { cn } from '@/lib/utils/cn'
import { MEME_TEMPLATES } from '@/lib/meme/templates.data'
import type { MemeTemplate } from '@/lib/meme/meme.types'

interface TemplatePickerProps {
  selected: MemeTemplate | null
  onSelect: (template: MemeTemplate) => void
}

const TAG_FILTERS = ['all', 'classic', 'news', 'quote', 'reaction', 'comparison', 'story']

export function TemplatePicker({ selected, onSelect }: TemplatePickerProps) {
  const [activeTag, setActiveTag] = useState('all')

  const filtered = activeTag === 'all'
    ? MEME_TEMPLATES
    : MEME_TEMPLATES.filter((t) => t.tags.some((tag) => tag.includes(activeTag)))

  return (
    <div className="space-y-3">
      {/* Tag filters */}
      <div className="flex flex-wrap gap-1">
        {TAG_FILTERS.map((tag) => (
          <button
            key={tag}
            onClick={() => setActiveTag(tag)}
            className={cn(
              'text-[10px] font-medium px-2 py-1 rounded-md border transition-all capitalize',
              activeTag === tag
                ? 'bg-accent/10 border-accent/30 text-accent'
                : 'bg-surface border-border text-zinc-500 hover:text-muted hover:border-zinc-600',
            )}
          >
            {tag}
          </button>
        ))}
      </div>

      {/* Template grid */}
      <div className="grid grid-cols-3 gap-2">
        {filtered.map((t) => (
          <button
            key={t.id}
            onClick={() => onSelect(t)}
            className={cn(
              'relative rounded-lg border-2 overflow-hidden transition-all hover:scale-[1.02] text-left',
              selected?.id === t.id
                ? 'border-accent ring-1 ring-accent/30'
                : 'border-border hover:border-zinc-600',
            )}
          >
            {/* Color preview */}
            <div
              className="h-14 w-full flex items-center justify-center text-2xl"
              style={{ background: t.previewStyle }}
            >
              {t.previewEmoji}
            </div>
            <p className="text-[10px] text-muted px-1.5 py-1 truncate bg-surface">
              {t.name}
            </p>
            {selected?.id === t.id && (
              <div className="absolute top-1 right-1 h-3.5 w-3.5 bg-accent rounded-full flex items-center justify-center">
                <span className="text-[8px] text-white font-bold">✓</span>
              </div>
            )}
          </button>
        ))}
      </div>
    </div>
  )
}
