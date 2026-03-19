'use client'

import { useRef, useState, useCallback, forwardRef } from 'react'
import { Upload, X, Plus } from 'lucide-react'
import { cn } from '@/lib/utils/cn'
import type { MemeCanvasState, TextLayer } from '@/lib/meme/meme.types'

interface MemeEditorProps {
  state:        MemeCanvasState
  selectedLayerId: string | null
  onSelectLayer:   (id: string | null) => void
  onMoveLayer:     (id: string, x: number, y: number) => void
  onImageUpload:   (url: string, slot: 1 | 2) => void
  onClearImage:    (slot: 1 | 2) => void
}

// Aspect ratio helpers
function getAspectPadding(state: MemeCanvasState): string {
  if (!state.template) return '100%'
  const ratio = state.template.aspectRatio
  if (state.layout === 'side_by_side') return `${(1 / (ratio * 2)) * 100}%`
  return `${(1 / ratio) * 100}%`
}

function getFontFamily(fontStyle: TextLayer['fontStyle']): string {
  if (fontStyle === 'impact') return '"Impact", "Arial Black", sans-serif'
  if (fontStyle === 'bold')   return '"Arial Black", Arial, sans-serif'
  return 'Arial, sans-serif'
}

export const MemeEditor = forwardRef<HTMLDivElement, MemeEditorProps>(
  function MemeEditor({ state, selectedLayerId, onSelectLayer, onMoveLayer, onImageUpload, onClearImage }, ref) {
    const containerRef = useRef<HTMLDivElement>(null)
    const fileInputRef  = useRef<HTMLInputElement>(null)
    const fileInput2Ref = useRef<HTMLInputElement>(null)
    const dragState     = useRef<{
      layerId: string
      startMouseX: number
      startMouseY: number
      startLayerX: number
      startLayerY: number
    } | null>(null)

    // -----------------------------------------------------------------------
    // Drag handlers
    // -----------------------------------------------------------------------

    const startDrag = useCallback((clientX: number, clientY: number, layer: TextLayer) => {
      onSelectLayer(layer.id)
      dragState.current = {
        layerId:     layer.id,
        startMouseX: clientX,
        startMouseY: clientY,
        startLayerX: layer.x,
        startLayerY: layer.y,
      }
    }, [onSelectLayer])

    const moveDrag = useCallback((clientX: number, clientY: number) => {
      if (!dragState.current || !containerRef.current) return
      const rect = containerRef.current.getBoundingClientRect()
      const dx   = ((clientX - dragState.current.startMouseX) / rect.width)  * 100
      const dy   = ((clientY - dragState.current.startMouseY) / rect.height) * 100
      const newX = Math.max(0, Math.min(100, dragState.current.startLayerX + dx))
      const newY = Math.max(0, Math.min(100, dragState.current.startLayerY + dy))
      onMoveLayer(dragState.current.layerId, newX, newY)
    }, [onMoveLayer])

    const endDrag = useCallback(() => {
      dragState.current = null
    }, [])

    const handleLayerMouseDown = useCallback((e: React.MouseEvent, layer: TextLayer) => {
      e.stopPropagation()
      e.preventDefault()
      startDrag(e.clientX, e.clientY, layer)

      function onMouseMove(ev: MouseEvent) { moveDrag(ev.clientX, ev.clientY) }
      function onMouseUp() {
        endDrag()
        window.removeEventListener('mousemove', onMouseMove)
        window.removeEventListener('mouseup', onMouseUp)
      }

      window.addEventListener('mousemove', onMouseMove)
      window.addEventListener('mouseup', onMouseUp)
    }, [startDrag, moveDrag, endDrag])

    const handleLayerTouchStart = useCallback((e: React.TouchEvent, layer: TextLayer) => {
      e.stopPropagation()
      const touch = e.touches[0]
      if (!touch) return
      startDrag(touch.clientX, touch.clientY, layer)

      function onTouchMove(ev: TouchEvent) {
        ev.preventDefault()
        const t = ev.touches[0]
        if (t) moveDrag(t.clientX, t.clientY)
      }
      function onTouchEnd() {
        endDrag()
        window.removeEventListener('touchmove', onTouchMove)
        window.removeEventListener('touchend', onTouchEnd)
      }

      window.addEventListener('touchmove', onTouchMove, { passive: false })
      window.addEventListener('touchend', onTouchEnd)
    }, [startDrag, moveDrag, endDrag])

    // -----------------------------------------------------------------------
    // Image upload
    // -----------------------------------------------------------------------

    function handleFileChange(e: React.ChangeEvent<HTMLInputElement>, slot: 1 | 2) {
      const file = e.target.files?.[0]
      if (!file) return
      const url = URL.createObjectURL(file)
      onImageUpload(url, slot)
      e.target.value = ''
    }

    // -----------------------------------------------------------------------
    // Background rendering
    // -----------------------------------------------------------------------

    function renderBackground() {
      if (state.layout === 'side_by_side') {
        return (
          <div className="absolute inset-0 flex">
            <div className="relative flex-1 overflow-hidden">
              {state.customImageUrl
                ? <img src={state.customImageUrl} alt="" className="w-full h-full object-cover" />
                : <ImageSlot label="Image 1" onClick={() => fileInputRef.current?.click()} />
              }
            </div>
            <div className="relative flex-1 overflow-hidden">
              {state.customImage2Url
                ? <img src={state.customImage2Url} alt="" className="w-full h-full object-cover" />
                : <ImageSlot label="Image 2" onClick={() => fileInput2Ref.current?.click()} />
              }
            </div>
          </div>
        )
      }

      if (state.customImageUrl) {
        return (
          <img
            src={state.customImageUrl}
            alt=""
            className="absolute inset-0 w-full h-full object-cover"
          />
        )
      }

      // Template gradient preview
      if (state.template) {
        return (
          <div
            className="absolute inset-0 flex items-center justify-center"
            style={{ background: state.template.previewStyle }}
          >
            <button
              onClick={() => fileInputRef.current?.click()}
              className="flex flex-col items-center gap-1.5 text-white/50 hover:text-white/80 transition-colors"
            >
              <Upload className="h-8 w-8" />
              <span className="text-xs">Upload image</span>
            </button>
          </div>
        )
      }

      return (
        <div
          className="absolute inset-0 flex items-center justify-center bg-zinc-900 cursor-pointer"
          onClick={() => fileInputRef.current?.click()}
        >
          <div className="flex flex-col items-center gap-1.5 text-zinc-600">
            <Upload className="h-8 w-8" />
            <span className="text-xs">Upload image</span>
          </div>
        </div>
      )
    }

    // -----------------------------------------------------------------------
    // Render
    // -----------------------------------------------------------------------

    const paddingBottom = getAspectPadding(state)

    return (
      <div ref={ref}>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => handleFileChange(e, 1)}
        />
        <input
          ref={fileInput2Ref}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => handleFileChange(e, 2)}
        />

        {/* Main canvas */}
        <div
          ref={containerRef}
          className="relative w-full overflow-hidden rounded-lg select-none cursor-crosshair"
          style={{
            paddingBottom,
            backgroundColor: state.backgroundColor,
          }}
          onClick={() => onSelectLayer(null)}
        >
          {/* Background */}
          {renderBackground()}

          {/* Reaction image overlay */}
          {state.layout === 'reaction' && state.customImage2Url && (
            <div className="absolute bottom-2 right-2 w-[28%] rounded-lg overflow-hidden border-2 border-white shadow-lg">
              <img src={state.customImage2Url} alt="" className="w-full h-full object-cover" />
              <button
                onClick={(e) => { e.stopPropagation(); onClearImage(2) }}
                className="absolute top-0.5 right-0.5 h-4 w-4 bg-black/60 rounded-full flex items-center justify-center"
              >
                <X className="h-2.5 w-2.5 text-white" />
              </button>
            </div>
          )}

          {/* Text layers */}
          {state.layers.map((layer) => {
            const isSelected = selectedLayerId === layer.id
            const text = layer.uppercase ? layer.content.toUpperCase() : layer.content

            return (
              <div
                key={layer.id}
                onMouseDown={(e) => handleLayerMouseDown(e, layer)}
                onTouchStart={(e) => handleLayerTouchStart(e, layer)}
                className={cn(
                  'absolute cursor-grab active:cursor-grabbing',
                  isSelected && 'ring-1 ring-accent ring-offset-1 ring-offset-transparent rounded',
                )}
                style={{
                  left:      `${layer.x}%`,
                  top:       `${layer.y}%`,
                  transform: `translate(${layer.align === 'center' ? '-50%' : layer.align === 'right' ? '-100%' : '0'}, -50%)`,
                  fontFamily:   getFontFamily(layer.fontStyle),
                  fontSize:     `${layer.fontSize}px`,
                  fontWeight:   layer.bold || layer.fontStyle === 'impact' ? 'bold' : 'normal',
                  color:        layer.color,
                  textAlign:    layer.align,
                  maxWidth:     `${layer.maxWidthPct}%`,
                  lineHeight:   '1.15',
                  textShadow:   layer.stroke
                    ? '-2px -2px 0 #000, 2px -2px 0 #000, -2px 2px 0 #000, 2px 2px 0 #000, 0 2px 0 #000, 2px 0 0 #000, 0 -2px 0 #000, -2px 0 0 #000'
                    : 'none',
                  WebkitTextStroke: 'unset',
                  wordBreak: 'break-word',
                  whiteSpace:  'pre-wrap',
                  userSelect:  'none',
                  zIndex: isSelected ? 10 : 5,
                }}
              >
                {text}
              </div>
            )
          })}

          {/* OUTRAGE watermark */}
          {state.showWatermark && (
            <div
              className={cn(
                'absolute text-white/40 text-[11px] font-black tracking-widest uppercase pointer-events-none',
                state.watermarkPosition === 'top_left'     && 'top-2 left-2',
                state.watermarkPosition === 'top_right'    && 'top-2 right-2',
                state.watermarkPosition === 'bottom_left'  && 'bottom-2 left-2',
                state.watermarkPosition === 'bottom_right' && 'bottom-2 right-2',
              )}
            >
              OUTRAGE
            </div>
          )}
        </div>

        {/* Image action bar */}
        <div className="flex items-center gap-2 mt-2">
          <button
            onClick={() => fileInputRef.current?.click()}
            className="flex items-center gap-1.5 text-xs text-zinc-500 hover:text-muted border border-border rounded-lg px-2.5 py-1.5 bg-surface hover:border-zinc-600 transition-all"
          >
            <Upload className="h-3 w-3" />
            {state.customImageUrl ? 'Replace image' : 'Upload image'}
          </button>

          {state.customImageUrl && (
            <button
              onClick={() => onClearImage(1)}
              className="flex items-center gap-1.5 text-xs text-zinc-600 hover:text-red-400 border border-border rounded-lg px-2 py-1.5 bg-surface hover:border-red-900 transition-all"
            >
              <X className="h-3 w-3" />
              Remove
            </button>
          )}

          {state.layout === 'reaction' && (
            <button
              onClick={() => fileInput2Ref.current?.click()}
              className="flex items-center gap-1.5 text-xs text-zinc-500 hover:text-muted border border-border rounded-lg px-2.5 py-1.5 bg-surface hover:border-zinc-600 transition-all"
            >
              <Plus className="h-3 w-3" />
              Reaction image
            </button>
          )}
        </div>
      </div>
    )
  }
)

// ---------------------------------------------------------------------------
// Image slot placeholder
// ---------------------------------------------------------------------------

function ImageSlot({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <div
      onClick={onClick}
      className="absolute inset-0 flex flex-col items-center justify-center gap-1 bg-zinc-900 cursor-pointer hover:bg-zinc-800 transition-colors"
    >
      <Upload className="h-6 w-6 text-zinc-600" />
      <span className="text-[10px] text-zinc-600">{label}</span>
    </div>
  )
}
