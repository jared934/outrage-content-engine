'use client'

import { useState } from 'react'
import { Send, Plus, LayoutGrid } from 'lucide-react'
import { cn } from '@/lib/utils/cn'
import { ExportHistory } from '@/components/canva/ExportHistory'
import { CanvaHandoffModal } from '@/components/canva/CanvaHandoffModal'
import type { CanvaTemplateType, CanvaExport } from '@/lib/canva/canva.types'
import { TEMPLATE_LABELS } from '@/lib/canva/canva.types'
import { useCreateCanvaExport, useUpdateCanvaExport } from '@/hooks/useCanvaExport'

interface ExportsClientProps {
  orgId: string
}

// Template type cards for "New Export" flow
const TEMPLATE_CARDS: Array<{
  value:   CanvaTemplateType
  emoji:   string
  dims:    string
  purpose: string
}> = [
  { value: 'breaking_alert', emoji: '🔴', dims: '1080×1080', purpose: 'Urgent news card' },
  { value: 'meme',           emoji: '😂', dims: '1080×1080', purpose: 'Classic meme' },
  { value: 'story',          emoji: '📱', dims: '1080×1920', purpose: 'Full-bleed story' },
  { value: 'carousel_cover', emoji: '🎠', dims: '1080×1080', purpose: 'Carousel slide 1' },
  { value: 'reel_cover',     emoji: '🎬', dims: '1080×1920', purpose: 'Reel thumbnail' },
  { value: 'quote_graphic',  emoji: '💬', dims: '1080×1080', purpose: 'Text-first quote' },
]

export function ExportsClient({ orgId }: ExportsClientProps) {
  const [showNew,       setShowNew]       = useState(false)
  const [createdExport, setCreatedExport] = useState<CanvaExport | null>(null)
  const [handoffOpen,   setHandoffOpen]   = useState(false)

  const createExport = useCreateCanvaExport(orgId)
  const updateExport = useUpdateCanvaExport(orgId)

  function handleCreateBlank(templateType: CanvaTemplateType) {
    setShowNew(false)
    createExport.mutate(
      { template_type: templateType, source: 'manual' },
      {
        onSuccess: (record) => {
          setCreatedExport(record)
          setHandoffOpen(true)
        },
      }
    )
  }

  return (
    <div className="p-6 max-w-screen-xl mx-auto space-y-6">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display font-bold text-xl text-foreground flex items-center gap-2">
            <Send className="h-5 w-5 text-accent" />
            Canva Exports
          </h1>
          <p className="text-sm text-muted mt-0.5">
            Track content handoffs to Canva production workflows.
          </p>
        </div>
        <button
          onClick={() => setShowNew((v) => !v)}
          className={cn(
            'flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium border transition-all',
            showNew
              ? 'bg-accent/10 border-accent/30 text-accent'
              : 'bg-surface border-border text-muted hover:text-foreground hover:border-zinc-600',
          )}
        >
          <Plus className="h-4 w-4" />
          New Export
        </button>
      </div>

      {/* New export — template picker */}
      {showNew && (
        <div className="rounded-xl border border-border bg-surface p-5">
          <div className="flex items-center gap-2 mb-4">
            <LayoutGrid className="h-4 w-4 text-muted" />
            <h2 className="text-sm font-semibold text-foreground">Choose a template format</h2>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            {TEMPLATE_CARDS.map(({ value, emoji, dims, purpose }) => (
              <button
                key={value}
                onClick={() => handleCreateBlank(value)}
                disabled={createExport.isPending}
                className="rounded-xl border border-border bg-surface-raised hover:border-zinc-600 hover:bg-zinc-800 p-4 text-center transition-all group disabled:opacity-40"
              >
                <span className="text-3xl block mb-2">{emoji}</span>
                <p className="text-xs font-semibold text-foreground group-hover:text-accent transition-colors">
                  {TEMPLATE_LABELS[value]}
                </p>
                <p className="text-[10px] text-zinc-600 mt-0.5">{dims}</p>
                <p className="text-[10px] text-zinc-500 mt-0.5">{purpose}</p>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Export history */}
      <div className="rounded-xl border border-border bg-surface p-5">
        <ExportHistory orgId={orgId} />
      </div>

      {/* Handoff modal for newly created exports */}
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
    </div>
  )
}
