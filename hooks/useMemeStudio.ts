'use client'

import { useCallback, useReducer, useRef } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import type {
  MemeCanvasState, TextLayer, TextLayerType, MemeTemplate,
  ExportSize, MemeLayout, QuickAction, MemeDraft,
  PunchlineSuggestion, PunchlineRequest,
} from '@/lib/meme/meme.types'
import { EXPORT_SIZES, getDefaultTemplate } from '@/lib/meme'

function uid(len = 8): string {
  return Math.random().toString(36).slice(2, 2 + len)
}

// ---------------------------------------------------------------------------
// Query key factory
// ---------------------------------------------------------------------------

export const memeKeys = {
  all:    ['meme'] as const,
  drafts: (orgId: string) => ['meme', 'drafts', orgId] as const,
}

// ---------------------------------------------------------------------------
// Canvas state reducer
// ---------------------------------------------------------------------------

type CanvasAction =
  | { type: 'SET_LAYOUT';        layout: MemeLayout }
  | { type: 'SET_TEMPLATE';      template: MemeTemplate }
  | { type: 'SET_CUSTOM_IMAGE';  url: string | null }
  | { type: 'SET_CUSTOM_IMAGE2'; url: string | null }
  | { type: 'SET_EXPORT_SIZE';   size: ExportSize }
  | { type: 'SET_WATERMARK';     show: boolean }
  | { type: 'SET_WATERMARK_POS'; pos: MemeCanvasState['watermarkPosition'] }
  | { type: 'SET_BG_COLOR';      color: string }
  | { type: 'ADD_LAYER';         layerType?: TextLayerType }
  | { type: 'UPDATE_LAYER';      id: string; updates: Partial<TextLayer> }
  | { type: 'DELETE_LAYER';      id: string }
  | { type: 'MOVE_LAYER';        id: string; x: number; y: number }
  | { type: 'LOAD_STATE';        state: MemeCanvasState }
  | { type: 'RESET' }

function makeDefaultLayer(type: TextLayerType = 'free'): TextLayer {
  return {
    id:          uid(),
    type,
    content:     type === 'top' ? 'TOP TEXT' : type === 'bottom' ? 'BOTTOM TEXT' : 'TEXT',
    x:           50,
    y:           type === 'top' ? 8 : type === 'bottom' ? 88 : 50,
    fontSize:    36,
    fontStyle:   'impact',
    color:       '#FFFFFF',
    stroke:      true,
    align:       'center',
    bold:        false,
    uppercase:   true,
    maxWidthPct: 90,
  }
}

function makeInitialState(): MemeCanvasState {
  const template = getDefaultTemplate()
  return {
    layout:             'standard',
    template,
    customImageUrl:     null,
    customImage2Url:    null,
    layers:             template.defaultLayers.map((l, i) => ({
      ...l, id: `default_${i}`, content: i === 0 ? 'TOP TEXT' : 'BOTTOM TEXT',
    })),
    exportSize:         'square',
    showWatermark:      true,
    watermarkPosition:  'bottom_right',
    backgroundColor:    '#000000',
  }
}

function canvasReducer(state: MemeCanvasState, action: CanvasAction): MemeCanvasState {
  switch (action.type) {

    case 'SET_LAYOUT':
      return { ...state, layout: action.layout }

    case 'SET_TEMPLATE': {
      const layers = action.template.defaultLayers.map((l, i) => ({
        ...l, id: `default_${i}`, content: i === 0 ? 'TOP TEXT' : 'BOTTOM TEXT',
      }))
      return {
        ...state,
        template: action.template,
        layers,
        layout: action.template.layouts[0] ?? 'standard',
      }
    }

    case 'SET_CUSTOM_IMAGE':
      return { ...state, customImageUrl: action.url }

    case 'SET_CUSTOM_IMAGE2':
      return { ...state, customImage2Url: action.url }

    case 'SET_EXPORT_SIZE':
      return { ...state, exportSize: action.size }

    case 'SET_WATERMARK':
      return { ...state, showWatermark: action.show }

    case 'SET_WATERMARK_POS':
      return { ...state, watermarkPosition: action.pos }

    case 'SET_BG_COLOR':
      return { ...state, backgroundColor: action.color }

    case 'ADD_LAYER':
      return { ...state, layers: [...state.layers, makeDefaultLayer(action.layerType)] }

    case 'UPDATE_LAYER':
      return {
        ...state,
        layers: state.layers.map((l) => l.id === action.id ? { ...l, ...action.updates } : l),
      }

    case 'DELETE_LAYER':
      return { ...state, layers: state.layers.filter((l) => l.id !== action.id) }

    case 'MOVE_LAYER':
      return {
        ...state,
        layers: state.layers.map((l) =>
          l.id === action.id ? { ...l, x: action.x, y: action.y } : l
        ),
      }

    case 'LOAD_STATE':
      return action.state

    case 'RESET':
      return makeInitialState()

    default:
      return state
  }
}

// ---------------------------------------------------------------------------
// Main hook
// ---------------------------------------------------------------------------

export function useMemeCanvas() {
  const [state, dispatch] = useReducer(canvasReducer, undefined, makeInitialState)

  const setLayout      = (layout: MemeLayout)                => dispatch({ type: 'SET_LAYOUT', layout })
  const setTemplate    = (template: MemeTemplate)             => dispatch({ type: 'SET_TEMPLATE', template })
  const setCustomImage = (url: string | null)                 => dispatch({ type: 'SET_CUSTOM_IMAGE', url })
  const setCustomImage2= (url: string | null)                 => dispatch({ type: 'SET_CUSTOM_IMAGE2', url })
  const setExportSize  = (size: ExportSize)                   => dispatch({ type: 'SET_EXPORT_SIZE', size })
  const setWatermark   = (show: boolean)                      => dispatch({ type: 'SET_WATERMARK', show })
  const setWatermarkPos= (pos: MemeCanvasState['watermarkPosition']) => dispatch({ type: 'SET_WATERMARK_POS', pos })
  const setBgColor     = (color: string)                      => dispatch({ type: 'SET_BG_COLOR', color })
  const addLayer       = (type?: TextLayerType)               => dispatch({ type: 'ADD_LAYER', layerType: type })
  const updateLayer    = (id: string, updates: Partial<TextLayer>) => dispatch({ type: 'UPDATE_LAYER', id, updates })
  const deleteLayer    = (id: string)                         => dispatch({ type: 'DELETE_LAYER', id })
  const moveLayer      = (id: string, x: number, y: number)  => dispatch({ type: 'MOVE_LAYER', id, x, y })
  const loadState      = (s: MemeCanvasState)                 => dispatch({ type: 'LOAD_STATE', state: s })
  const reset          = ()                                   => dispatch({ type: 'RESET' })

  return {
    state,
    setLayout, setTemplate, setCustomImage, setCustomImage2,
    setExportSize, setWatermark, setWatermarkPos, setBgColor,
    addLayer, updateLayer, deleteLayer, moveLayer, loadState, reset,
  }
}

// ---------------------------------------------------------------------------
// Export hook — draws state to canvas and triggers download
// ---------------------------------------------------------------------------

export function useMemeExport(editorRef: React.RefObject<HTMLDivElement | null>) {
  const exportMeme = useCallback(async (
    state: MemeCanvasState,
    filename = 'outrage-meme'
  ) => {
    const { width, height } = EXPORT_SIZES[state.exportSize]
    const canvas = document.createElement('canvas')
    canvas.width  = width
    canvas.height = height
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    // Background
    ctx.fillStyle = state.backgroundColor
    ctx.fillRect(0, 0, width, height)

    // Draw background image if available
    const bgUrl = state.customImageUrl
    if (bgUrl) {
      await new Promise<void>((resolve) => {
        const img = new Image()
        img.crossOrigin = 'anonymous'
        img.onload = () => {
          if (state.layout === 'side_by_side') {
            ctx.drawImage(img, 0, 0, width / 2, height)
          } else {
            ctx.drawImage(img, 0, 0, width, height)
          }
          resolve()
        }
        img.onerror = () => resolve()
        img.src = bgUrl
      })
    }

    // Second image for side_by_side/reaction
    if (state.layout === 'side_by_side' && state.customImage2Url) {
      await new Promise<void>((resolve) => {
        const img = new Image()
        img.crossOrigin = 'anonymous'
        img.onload = () => {
          ctx.drawImage(img, width / 2, 0, width / 2, height)
          resolve()
        }
        img.onerror = () => resolve()
        img.src = state.customImage2Url!
      })
    } else if (state.layout === 'reaction' && state.customImage2Url) {
      await new Promise<void>((resolve) => {
        const reactionSize = Math.round(width * 0.28)
        const img = new Image()
        img.crossOrigin = 'anonymous'
        img.onload = () => {
          ctx.drawImage(img, width - reactionSize - 12, height - reactionSize - 12, reactionSize, reactionSize)
          resolve()
        }
        img.onerror = () => resolve()
        img.src = state.customImage2Url!
      })
    }

    // Draw text layers
    for (const layer of state.layers) {
      const text      = layer.uppercase ? layer.content.toUpperCase() : layer.content
      const px        = (layer.x / 100) * width
      const py        = (layer.y / 100) * height
      const scale     = width / 500
      const fontSize  = Math.round(layer.fontSize * scale)
      const maxWidth  = (layer.maxWidthPct / 100) * width

      const fontWeight  = layer.bold ? 'bold ' : ''
      const fontFamily  = layer.fontStyle === 'impact' ? 'Impact, Arial Black, sans-serif'
                        : layer.fontStyle === 'bold'   ? 'Arial Black, sans-serif'
                        : 'Arial, sans-serif'
      ctx.font      = `${fontWeight}${fontSize}px ${fontFamily}`
      ctx.textAlign = layer.align
      ctx.textBaseline = 'middle'

      if (layer.stroke) {
        ctx.strokeStyle = '#000000'
        ctx.lineWidth   = Math.max(2, fontSize * 0.08)
        ctx.strokeText(text, px, py, maxWidth)
      }
      ctx.fillStyle = layer.color
      ctx.fillText(text, px, py, maxWidth)
    }

    // OUTRAGE watermark
    if (state.showWatermark) {
      const wFontSize = Math.round(width * 0.022)
      ctx.font      = `bold ${wFontSize}px Arial Black, sans-serif`
      ctx.textBaseline = 'alphabetic'
      const margin  = Math.round(width * 0.025)
      const [wpos]  = state.watermarkPosition.split('_')
      const isBottom = state.watermarkPosition.startsWith('bottom')
      const isRight  = state.watermarkPosition.endsWith('right')
      ctx.textAlign  = isRight ? 'right' : 'left'
      const wx = isRight ? width - margin : margin
      const wy = isBottom ? height - margin : margin + wFontSize
      ctx.fillStyle   = 'rgba(255,255,255,0.55)'
      ctx.fillText('OUTRAGE', wx, wy)
    }

    // Download
    canvas.toBlob((blob) => {
      if (!blob) return
      const url = URL.createObjectURL(blob)
      const a   = document.createElement('a')
      a.href     = url
      a.download = `${filename}-${state.exportSize}.png`
      a.click()
      URL.revokeObjectURL(url)
    }, 'image/png')
  }, [])

  return { exportMeme }
}

// ---------------------------------------------------------------------------
// Drafts hooks
// ---------------------------------------------------------------------------

export function useDrafts(orgId: string) {
  return useQuery<MemeDraft[]>({
    queryKey: memeKeys.drafts(orgId),
    queryFn: async () => {
      const res  = await fetch(`/api/meme/drafts?org_id=${orgId}`)
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Failed to load drafts')
      return data.drafts as MemeDraft[]
    },
    staleTime: 30_000,
  })
}

export function useSaveDraft(orgId: string) {
  const qc = useQueryClient()
  return useMutation<MemeDraft, Error, {
    name: string
    state: MemeCanvasState
    thumbnail_data_url?: string | null
    cluster_id?: string | null
    draft_id?: string | null
  }>({
    mutationFn: async (payload) => {
      const res  = await fetch('/api/meme/drafts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ org_id: orgId, ...payload }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Save failed')
      return data.draft as MemeDraft
    },
    onSuccess: () => {
      toast.success('Draft saved')
      qc.invalidateQueries({ queryKey: memeKeys.drafts(orgId) })
    },
    onError: (err) => toast.error(err.message),
  })
}

export function useDeleteDraft(orgId: string) {
  const qc = useQueryClient()
  return useMutation<void, Error, string>({
    mutationFn: async (id) => {
      const res = await fetch(`/api/meme/drafts?id=${id}&org_id=${orgId}`, { method: 'DELETE' })
      if (!res.ok) throw new Error('Failed to delete draft')
    },
    onSuccess: () => {
      toast.success('Draft deleted')
      qc.invalidateQueries({ queryKey: memeKeys.drafts(orgId) })
    },
    onError: (err) => toast.error(err.message),
  })
}

// ---------------------------------------------------------------------------
// Punchlines hook
// ---------------------------------------------------------------------------

export function useGeneratePunchlines(orgId: string) {
  return useMutation<
    { suggestions: PunchlineSuggestion[]; tokens_used: number },
    Error,
    Omit<PunchlineRequest, 'org_id'>
  >({
    mutationFn: async (payload) => {
      const res  = await fetch('/api/meme/punchlines', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ org_id: orgId, ...payload }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Punchline generation failed')
      return data
    },
    onError: (err) => toast.error(err.message),
  })
}
