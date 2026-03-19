'use client'

import { useState } from 'react'
import { Send, ChevronDown } from 'lucide-react'
import { cn } from '@/lib/utils/cn'
import { CanvaHandoffModal } from './CanvaHandoffModal'
import type { CanvaTemplateType, CanvaExport } from '@/lib/canva/canva.types'
import { TEMPLATE_LABELS } from '@/lib/canva/canva.types'
import { useCreateCanvaExport, useUpdateCanvaExport } from '@/hooks/useCanvaExport'

// ---------------------------------------------------------------------------
// Template selector dropdown
// ---------------------------------------------------------------------------

const TEMPLATE_OPTIONS: { value: CanvaTemplateType; label: string; emoji: string }[] = [
  { value: 'breaking_alert', label: 'Breaking Alert', emoji: '🔴' },
  { value: 'meme',           label: 'Meme',           emoji: '😂' },
  { value: 'story',          label: 'Story',          emoji: '📱' },
  { value: 'carousel_cover', label: 'Carousel Cover', emoji: '🎠' },
  { value: 'reel_cover',     label: 'Reel Cover',     emoji: '🎬' },
  { value: 'quote_graphic',  label: 'Quote Graphic',  emoji: '💬' },
]

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface ExportToCanvaButtonProps {
  orgId:           string
  contentIdeaId?:  string
  memeDraftId?:    string
  clusterId?:      string
  /** If provided, jump straight to this template without the dropdown */
  defaultTemplate?: CanvaTemplateType
  size?:           'sm' | 'xs'
  className?:      string
}

export function ExportToCanvaButton({
  orgId, contentIdeaId, memeDraftId, clusterId,
  defaultTemplate, size = 'sm', className,
}: ExportToCanvaButtonProps) {
  const [dropdownOpen,  setDropdownOpen]  = useState(false)
  const [createdExport, setCreatedExport] = useState<CanvaExport | null>(null)
  const [handoffOpen,   setHandoffOpen]   = useState(false)

  const createExport = useCreateCanvaExport(orgId)
  const updateExport = useUpdateCanvaExport(orgId)

  async function handleSelect(templateType: CanvaTemplateType) {
    setDropdownOpen(false)

    const source = contentIdeaId ? 'idea'
                 : memeDraftId   ? 'meme_draft'
                 : 'manual'

    createExport.mutate(
      {
        template_type:   templateType,
        source,
        content_idea_id: contentIdeaId ?? null,
        meme_draft_id:   memeDraftId   ?? null,
        cluster_id:      clusterId     ?? null,
      },
      {
        onSuccess: (record) => {
          setCreatedExport(record)
          setHandoffOpen(true)
        },
      }
    )
  }

  function handleDirectClick() {
    if (defaultTemplate) {
      handleSelect(defaultTemplate)
    } else {
      setDropdownOpen((v) => !v)
    }
  }

  const isSmall = size === 'xs'

  return (
    <>
      <div className="relative inline-flex">
        <button
          onClick={handleDirectClick}
          disabled={createExport.isPending}
          className={cn(
            'flex items-center gap-1.5 rounded-lg font-medium border transition-all',
            'bg-surface border-border text-muted hover:text-foreground hover:border-zinc-600',
            'disabled:opacity-40',
            isSmall ? 'px-2 py-1 text-[10px]' : 'px-2.5 py-1.5 text-xs',
            className,
          )}
        >
          {createExport.isPending
            ? <span className="h-3 w-3 rounded-full border-2 border-current border-t-transparent animate-spin" />
            : <Send className={isSmall ? 'h-3 w-3' : 'h-3.5 w-3.5'} />
          }
          {createExport.isPending ? 'Creating…' : 'Export to Canva'}
          {!defaultTemplate && (
            <ChevronDown className={isSmall ? 'h-2.5 w-2.5' : 'h-3 w-3'} />
          )}
        </button>

        {dropdownOpen && (
          <div className="absolute top-full left-0 mt-1 z-20 w-44 rounded-lg border border-border bg-surface shadow-xl">
            {TEMPLATE_OPTIONS.map(({ value, label, emoji }) => (
              <button
                key={value}
                onClick={() => handleSelect(value)}
                className="w-full flex items-center gap-2 px-3 py-2 text-xs text-muted hover:text-foreground hover:bg-surface-raised transition-colors"
              >
                <span>{emoji}</span>
                {label}
              </button>
            ))}
          </div>
        )}
      </div>

      {createdExport && (
        <CanvaHandoffModal
          open={handoffOpen}
          onClose={() => { setHandoffOpen(false); setCreatedExport(null) }}
          record={createdExport}
          isSaving={updateExport.isPending}
          onUpdate={(updates) => {
            updateExport.mutate(
              { id: createdExport.id, ...updates },
              { onSuccess: (updated) => setCreatedExport(updated) }
            )
          }}
        />
      )}
    </>
  )
}
