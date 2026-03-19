'use client'

import { useState } from 'react'
import { ExternalLink, Save, ArrowRight, CheckCircle2, ChevronDown } from 'lucide-react'
import { cn } from '@/lib/utils/cn'
import { Modal, ModalFooter } from '@/components/ui/Modal'
import { ExportPayloadCard } from './ExportPayloadCard'
import { CanvaStatusBadge } from './CanvaStatusBadge'
import type { CanvaExport, ExportStatus, CanvaTemplateType } from '@/lib/canva/canva.types'
import { CANVA_CREATE_URLS, TEMPLATE_LABELS, STATUS_CONFIG } from '@/lib/canva/canva.types'

// ---------------------------------------------------------------------------
// Status stepper
// ---------------------------------------------------------------------------

const STATUS_STEPS: ExportStatus[] = [
  'pending', 'in_progress', 'designed', 'review', 'approved', 'published',
]

function StatusStepper({ current }: { current: ExportStatus }) {
  const currentIndex = STATUS_STEPS.indexOf(current)
  return (
    <div className="flex items-center gap-0">
      {STATUS_STEPS.map((step, i) => {
        const done   = i < currentIndex
        const active = i === currentIndex
        return (
          <div key={step} className="flex items-center">
            <div className={cn(
              'flex items-center justify-center h-5 w-5 rounded-full text-[9px] font-bold border flex-shrink-0',
              done   && 'bg-emerald-500/20 border-emerald-500/40 text-emerald-400',
              active && 'bg-accent/20 border-accent/40 text-accent',
              !done && !active && 'bg-zinc-900 border-zinc-700 text-zinc-600',
            )}>
              {done ? '✓' : i + 1}
            </div>
            {i < STATUS_STEPS.length - 1 && (
              <div className={cn(
                'h-px w-4 flex-shrink-0',
                done ? 'bg-emerald-500/40' : 'bg-zinc-800',
              )} />
            )}
          </div>
        )
      })}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface CanvaHandoffModalProps {
  open:      boolean
  onClose:   () => void
  record:    CanvaExport
  onUpdate:  (updates: { status?: ExportStatus; canva_design_url?: string; designer_notes?: string }) => void
  isSaving?: boolean
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export function CanvaHandoffModal({
  open, onClose, record, onUpdate, isSaving,
}: CanvaHandoffModalProps) {
  const [designUrl,     setDesignUrl]     = useState(record.canva_design_url ?? '')
  const [designerNotes, setDesignerNotes] = useState(record.designer_notes ?? '')
  const [statusOpen,    setStatusOpen]    = useState(false)

  const canvaUrl = CANVA_CREATE_URLS[record.template_type as CanvaTemplateType]

  function handleOpenCanva() {
    window.open(canvaUrl, '_blank', 'noopener,noreferrer')
    if (record.status === 'pending') {
      onUpdate({ status: 'in_progress' })
    }
  }

  function handleSaveDesignLink() {
    if (!designUrl.trim()) return
    onUpdate({
      canva_design_url: designUrl.trim(),
      designer_notes:   designerNotes.trim() || undefined,
      status:           'designed',
    })
  }

  function handleStatusChange(status: ExportStatus) {
    onUpdate({ status })
    setStatusOpen(false)
  }

  const isDesigned = record.status !== 'pending' && record.status !== 'in_progress'

  return (
    <Modal
      open={open}
      onClose={onClose}
      size="xl"
      title={record.name}
      description={`${TEMPLATE_LABELS[record.template_type as CanvaTemplateType]} — ${record.payload.dimensions.width}×${record.payload.dimensions.height}px`}
    >
      <div className="space-y-5">

        {/* Status stepper */}
        <div className="flex items-center justify-between">
          <StatusStepper current={record.status as ExportStatus} />
          <div className="relative">
            <button
              onClick={() => setStatusOpen((v) => !v)}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg border border-border bg-surface text-xs text-muted hover:border-zinc-600 transition-all"
            >
              <CanvaStatusBadge status={record.status as ExportStatus} size="sm" />
              <ChevronDown className="h-3 w-3 text-zinc-600" />
            </button>
            {statusOpen && (
              <div className="absolute right-0 top-full mt-1 z-20 w-40 rounded-lg border border-border bg-surface shadow-xl">
                {(Object.keys(STATUS_CONFIG) as ExportStatus[]).map((s) => (
                  <button
                    key={s}
                    onClick={() => handleStatusChange(s)}
                    className={cn(
                      'w-full text-left px-3 py-2 text-xs hover:bg-surface-raised transition-colors',
                      record.status === s && 'text-accent',
                    )}
                  >
                    {STATUS_CONFIG[s].label}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Export payload */}
        <ExportPayloadCard payload={record.payload} />

        {/* Canva handoff actions */}
        <div className="rounded-xl border border-border bg-surface-raised p-4 space-y-4">
          <p className="text-xs font-semibold text-muted uppercase tracking-wider">Canva Workflow</p>

          {/* Step 1: Open Canva */}
          <div className="flex items-start gap-3">
            <div className={cn(
              'flex-shrink-0 h-5 w-5 rounded-full flex items-center justify-center text-[10px] font-bold border',
              record.status !== 'pending'
                ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-400'
                : 'bg-zinc-900 border-zinc-700 text-zinc-500',
            )}>
              {record.status !== 'pending' ? '✓' : '1'}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium text-foreground mb-1">Open in Canva and create design</p>
              <p className="text-[10px] text-zinc-600 mb-2">
                Creates a new {TEMPLATE_LABELS[record.template_type as CanvaTemplateType].toLowerCase()} in Canva.
                Copy the payload fields above into your design.
              </p>
              <button
                onClick={handleOpenCanva}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#7D2AE8] hover:bg-[#6a23c9] text-white text-xs font-semibold transition-all"
              >
                <ExternalLink className="h-3.5 w-3.5" />
                Open Canva
                <ArrowRight className="h-3 w-3 ml-0.5" />
              </button>
            </div>
          </div>

          {/* Step 2: Save link */}
          <div className="flex items-start gap-3">
            <div className={cn(
              'flex-shrink-0 h-5 w-5 rounded-full flex items-center justify-center text-[10px] font-bold border',
              isDesigned
                ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-400'
                : 'bg-zinc-900 border-zinc-700 text-zinc-500',
            )}>
              {isDesigned ? '✓' : '2'}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium text-foreground mb-1">Paste Canva design link</p>
              <p className="text-[10px] text-zinc-600 mb-2">
                After saving your design in Canva, share → copy link, then paste it here.
              </p>
              <div className="flex gap-2">
                <input
                  type="url"
                  value={designUrl}
                  onChange={(e) => setDesignUrl(e.target.value)}
                  placeholder="https://www.canva.com/design/DAF…/view"
                  className="flex-1 bg-surface border border-border rounded-lg px-3 py-2 text-xs text-foreground placeholder:text-zinc-700 focus:outline-none focus:ring-1 focus:ring-accent"
                />
                <button
                  onClick={handleSaveDesignLink}
                  disabled={!designUrl.trim() || isSaving}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-accent text-white text-xs font-semibold hover:bg-accent/90 transition-all disabled:opacity-40"
                >
                  {isSaving
                    ? <span className="h-3 w-3 rounded-full border-2 border-white border-t-transparent animate-spin" />
                    : <Save className="h-3.5 w-3.5" />
                  }
                  Save
                </button>
              </div>

              {/* Existing design link */}
              {record.canva_design_url && (
                <div className="mt-2 flex items-center gap-2">
                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400 flex-shrink-0" />
                  <a
                    href={record.canva_design_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[11px] text-accent hover:underline truncate"
                  >
                    {record.canva_design_url}
                  </a>
                </div>
              )}
            </div>
          </div>

          {/* Designer notes */}
          <div>
            <p className="text-[10px] text-zinc-600 mb-1.5">Designer notes (optional)</p>
            <textarea
              value={designerNotes}
              onChange={(e) => setDesignerNotes(e.target.value)}
              rows={2}
              placeholder="Feedback, revision notes, or handoff instructions…"
              className="w-full bg-surface border border-border rounded-lg px-3 py-2 text-xs text-foreground placeholder:text-zinc-700 focus:outline-none focus:ring-1 focus:ring-accent resize-none"
            />
          </div>
        </div>
      </div>

      <ModalFooter>
        <button
          onClick={onClose}
          className="px-3 py-1.5 rounded-lg text-xs text-muted hover:text-foreground border border-border hover:border-zinc-600 transition-all"
        >
          Close
        </button>
        {designerNotes !== (record.designer_notes ?? '') && (
          <button
            onClick={() => onUpdate({ designer_notes: designerNotes })}
            disabled={isSaving}
            className="px-3 py-1.5 rounded-lg text-xs bg-accent text-white hover:bg-accent/90 transition-all disabled:opacity-40"
          >
            Save notes
          </button>
        )}
      </ModalFooter>
    </Modal>
  )
}
