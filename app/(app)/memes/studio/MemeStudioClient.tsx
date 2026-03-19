'use client'

import { useState, useRef, useCallback } from 'react'
import {
  ImageIcon, Wand2, Download, Layers, BookOpen,
  Save, Trash2, ChevronDown, LayoutGrid,
} from 'lucide-react'
import { cn } from '@/lib/utils/cn'
import { MemeEditor }       from '@/components/meme/MemeEditor'
import { TemplatePicker }   from '@/components/meme/TemplatePicker'
import { TextLayerPanel }   from '@/components/meme/TextLayerPanel'
import { PunchlinePanel }   from '@/components/meme/PunchlinePanel'
import { ExportControls }   from '@/components/meme/ExportControls'
import {
  useMemeCanvas,
  useMemeExport,
  useSaveDraft,
  useDeleteDraft,
  useDrafts,
  useGeneratePunchlines,
} from '@/hooks/useMemeStudio'
import type { PunchlineSuggestion, MemeLayout, QuickAction } from '@/lib/meme/meme.types'

interface MemeStudioClientProps {
  orgId:     string
  clusterId?: string
  topic?:    string
}

type LeftTab  = 'templates' | 'ai' | 'drafts'
type RightTab = 'text' | 'export'

const LAYOUTS: { value: MemeLayout; label: string; emoji: string }[] = [
  { value: 'standard',    label: 'Standard',   emoji: '🖼️' },
  { value: 'headline',    label: 'Headline',   emoji: '📰' },
  { value: 'quote_card',  label: 'Quote',      emoji: '💬' },
  { value: 'side_by_side',label: 'Side × Side',emoji: '⚔️' },
  { value: 'reaction',    label: 'Reaction',   emoji: '😂' },
]

export function MemeStudioClient({ orgId, clusterId, topic }: MemeStudioClientProps) {
  const [leftTab,  setLeftTab]  = useState<LeftTab>('templates')
  const [rightTab, setRightTab] = useState<RightTab>('text')
  const [selectedLayerId, setSelectedLayerId] = useState<string | null>(null)
  const [isExporting, setIsExporting]         = useState(false)
  const [punchlines, setPunchlines]           = useState<PunchlineSuggestion[]>([])
  const [draftName, setDraftName]             = useState('Untitled Meme')

  const editorRef = useRef<HTMLDivElement>(null)

  const canvas     = useMemeCanvas()
  const { exportMeme } = useMemeExport(editorRef)
  const saveDraft  = useSaveDraft(orgId)
  const delDraft   = useDeleteDraft(orgId)
  const { data: drafts = [] } = useDrafts(orgId)
  const genPunchlines = useGeneratePunchlines(orgId)

  // -----------------------------------------------------------------------
  // Punchline apply
  // -----------------------------------------------------------------------

  function handleApplyPunchline(top: string, bottom: string | null) {
    const topLayer    = canvas.state.layers.find((l) => l.type === 'top')
    const bottomLayer = canvas.state.layers.find((l) => l.type === 'bottom')

    if (topLayer) {
      canvas.updateLayer(topLayer.id, { content: top })
    } else {
      canvas.addLayer('top')
    }
    if (bottom) {
      if (bottomLayer) {
        canvas.updateLayer(bottomLayer.id, { content: bottom })
      } else {
        canvas.addLayer('bottom')
      }
    }
  }

  // -----------------------------------------------------------------------
  // Export
  // -----------------------------------------------------------------------

  async function handleExport() {
    setIsExporting(true)
    try {
      await exportMeme(canvas.state, draftName || 'outrage-meme')
    } finally {
      setIsExporting(false)
    }
  }

  // -----------------------------------------------------------------------
  // Save draft
  // -----------------------------------------------------------------------

  async function handleSaveDraft() {
    saveDraft.mutate({
      name:  draftName || 'Untitled Meme',
      state: canvas.state,
    })
  }

  // -----------------------------------------------------------------------
  // Render
  // -----------------------------------------------------------------------

  return (
    <div className="p-4 max-w-screen-2xl mx-auto space-y-4">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <ImageIcon className="h-5 w-5 text-accent" />
          <h1 className="font-display font-bold text-xl text-foreground">Meme Studio</h1>
          <span className="text-xs text-zinc-600 bg-zinc-800 px-2 py-0.5 rounded-full">Beta</span>
        </div>
        <div className="flex items-center gap-2">
          <input
            type="text"
            value={draftName}
            onChange={(e) => setDraftName(e.target.value)}
            className="bg-surface border border-border rounded-lg px-3 py-1.5 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-accent w-44"
            placeholder="Draft name"
          />
          <button
            onClick={handleSaveDraft}
            disabled={saveDraft.isPending}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border bg-surface text-xs text-muted hover:text-foreground hover:border-zinc-600 transition-all disabled:opacity-40"
          >
            <Save className="h-3.5 w-3.5" />
            {saveDraft.isPending ? 'Saving…' : 'Save Draft'}
          </button>
        </div>
      </div>

      {/* Studio layout: 3-column */}
      <div className="grid grid-cols-[260px_1fr_260px] gap-4 items-start">

        {/* ------------------------------------------------------------------ */}
        {/* LEFT PANEL — templates / AI / drafts                               */}
        {/* ------------------------------------------------------------------ */}
        <div className="rounded-xl border border-border bg-surface overflow-hidden">

          {/* Tab bar */}
          <div className="flex border-b border-border">
            {([
              { id: 'templates', icon: LayoutGrid,  label: 'Templates' },
              { id: 'ai',        icon: Wand2,        label: 'AI' },
              { id: 'drafts',    icon: BookOpen,     label: 'Drafts' },
            ] as const).map(({ id, icon: Icon, label }) => (
              <button
                key={id}
                onClick={() => setLeftTab(id)}
                className={cn(
                  'flex-1 flex flex-col items-center gap-0.5 py-2.5 text-[10px] font-medium transition-all',
                  leftTab === id
                    ? 'text-accent border-b-2 border-accent bg-accent/5'
                    : 'text-zinc-500 hover:text-muted',
                )}
              >
                <Icon className="h-3.5 w-3.5" />
                {label}
              </button>
            ))}
          </div>

          <div className="p-3 max-h-[calc(100vh-220px)] overflow-y-auto">

            {leftTab === 'templates' && (
              <div className="space-y-4">
                {/* Layout selector */}
                <div>
                  <p className="text-[10px] text-zinc-500 uppercase tracking-wider font-semibold mb-2">
                    Layout
                  </p>
                  <div className="grid grid-cols-2 gap-1">
                    {LAYOUTS.map(({ value, label, emoji }) => (
                      <button
                        key={value}
                        onClick={() => canvas.setLayout(value)}
                        className={cn(
                          'flex items-center gap-1.5 px-2 py-1.5 rounded-lg border text-xs transition-all',
                          canvas.state.layout === value
                            ? 'border-accent/50 bg-accent/5 text-foreground'
                            : 'border-border bg-surface text-zinc-500 hover:text-muted hover:border-zinc-600',
                        )}
                      >
                        <span>{emoji}</span>
                        <span className="truncate">{label}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Background color */}
                <div>
                  <p className="text-[10px] text-zinc-500 uppercase tracking-wider font-semibold mb-2">
                    Background
                  </p>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={canvas.state.backgroundColor}
                      onChange={(e) => canvas.setBgColor(e.target.value)}
                      className="h-8 w-8 rounded-md cursor-pointer border border-border"
                    />
                    <span className="text-xs text-zinc-600">{canvas.state.backgroundColor}</span>
                  </div>
                </div>

                {/* Templates */}
                <div>
                  <p className="text-[10px] text-zinc-500 uppercase tracking-wider font-semibold mb-2">
                    Templates
                  </p>
                  <TemplatePicker
                    selected={canvas.state.template}
                    onSelect={canvas.setTemplate}
                  />
                </div>
              </div>
            )}

            {leftTab === 'ai' && (
              <PunchlinePanel
                orgId={orgId}
                clusterId={clusterId}
                topic={topic}
                onApply={handleApplyPunchline}
                isPending={genPunchlines.isPending}
                suggestions={punchlines}
                onGenerate={(params) => {
                  genPunchlines.mutate(params, {
                    onSuccess: (data) => setPunchlines(data.suggestions),
                  })
                }}
                currentTop={canvas.state.layers.find((l) => l.type === 'top')?.content}
                currentBottom={canvas.state.layers.find((l) => l.type === 'bottom')?.content}
              />
            )}

            {leftTab === 'drafts' && (
              <DraftsList
                drafts={drafts}
                onLoad={(s) => canvas.loadState(s)}
                onDelete={(id) => delDraft.mutate(id)}
              />
            )}
          </div>
        </div>

        {/* ------------------------------------------------------------------ */}
        {/* CENTER — editor canvas                                              */}
        {/* ------------------------------------------------------------------ */}
        <div className="space-y-2">
          <MemeEditor
            ref={editorRef}
            state={canvas.state}
            selectedLayerId={selectedLayerId}
            onSelectLayer={setSelectedLayerId}
            onMoveLayer={canvas.moveLayer}
            onImageUpload={(url, slot) => {
              if (slot === 1) canvas.setCustomImage(url)
              else canvas.setCustomImage2(url)
            }}
            onClearImage={(slot) => {
              if (slot === 1) canvas.setCustomImage(null)
              else canvas.setCustomImage2(null)
            }}
          />
        </div>

        {/* ------------------------------------------------------------------ */}
        {/* RIGHT PANEL — text layers / export                                 */}
        {/* ------------------------------------------------------------------ */}
        <div className="rounded-xl border border-border bg-surface overflow-hidden">

          {/* Tab bar */}
          <div className="flex border-b border-border">
            {([
              { id: 'text',   icon: Layers,   label: 'Text' },
              { id: 'export', icon: Download, label: 'Export' },
            ] as const).map(({ id, icon: Icon, label }) => (
              <button
                key={id}
                onClick={() => setRightTab(id)}
                className={cn(
                  'flex-1 flex flex-col items-center gap-0.5 py-2.5 text-[10px] font-medium transition-all',
                  rightTab === id
                    ? 'text-accent border-b-2 border-accent bg-accent/5'
                    : 'text-zinc-500 hover:text-muted',
                )}
              >
                <Icon className="h-3.5 w-3.5" />
                {label}
              </button>
            ))}
          </div>

          <div className="p-3 max-h-[calc(100vh-220px)] overflow-y-auto">
            {rightTab === 'text' && (
              <TextLayerPanel
                layers={canvas.state.layers}
                selectedId={selectedLayerId}
                onSelect={setSelectedLayerId}
                onUpdate={canvas.updateLayer}
                onDelete={canvas.deleteLayer}
                onAdd={() => canvas.addLayer('free')}
              />
            )}

            {rightTab === 'export' && (
              <ExportControls
                exportSize={canvas.state.exportSize}
                onSizeChange={canvas.setExportSize}
                showWatermark={canvas.state.showWatermark}
                onWatermarkChange={canvas.setWatermark}
                watermarkPosition={canvas.state.watermarkPosition}
                onWatermarkPos={canvas.setWatermarkPos}
                onExport={handleExport}
                isExporting={isExporting}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Drafts list sub-component
// ---------------------------------------------------------------------------

interface DraftsListProps {
  drafts:   import('@/lib/meme/meme.types').MemeDraft[]
  onLoad:   (state: import('@/lib/meme/meme.types').MemeCanvasState) => void
  onDelete: (id: string) => void
}

function DraftsList({ drafts, onLoad, onDelete }: DraftsListProps) {
  if (drafts.length === 0) {
    return (
      <div className="flex flex-col items-center py-8 text-center">
        <BookOpen className="h-6 w-6 text-zinc-700 mb-2" />
        <p className="text-xs text-muted">No drafts saved</p>
        <p className="text-[10px] text-zinc-600 mt-0.5">Click "Save Draft" to keep your work</p>
      </div>
    )
  }

  return (
    <div className="space-y-2">
      {drafts.map((draft) => (
        <div
          key={draft.id}
          className="rounded-lg border border-border bg-surface-raised overflow-hidden"
        >
          {/* Thumbnail or placeholder */}
          {draft.thumbnail_data_url ? (
            <img
              src={draft.thumbnail_data_url}
              alt={draft.name}
              className="w-full h-20 object-cover"
            />
          ) : (
            <div className="w-full h-16 bg-zinc-900 flex items-center justify-center">
              <ImageIcon className="h-5 w-5 text-zinc-700" />
            </div>
          )}

          <div className="p-2 flex items-center justify-between gap-1">
            <div className="flex-1 min-w-0">
              <p className="text-xs text-foreground font-medium truncate">{draft.name}</p>
              <p className="text-[10px] text-zinc-600">
                {new Date(draft.updated_at).toLocaleDateString([], { month: 'short', day: 'numeric' })}
              </p>
            </div>
            <div className="flex items-center gap-1">
              <button
                onClick={() => onLoad(draft.state)}
                className="text-[10px] px-2 py-1 rounded-md bg-accent text-white hover:bg-accent/90 transition-all"
              >
                Load
              </button>
              <button
                onClick={() => onDelete(draft.id)}
                className="p-1 text-zinc-600 hover:text-red-400 transition-colors"
              >
                <Trash2 className="h-3 w-3" />
              </button>
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}
