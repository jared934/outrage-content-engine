// ---------------------------------------------------------------------------
// Meme Studio — core types
// ---------------------------------------------------------------------------

export type MemeLayout =
  | 'standard'      // single image, top + bottom text
  | 'side_by_side'  // two images side by side
  | 'reaction'      // image + reaction image in bottom-right corner
  | 'headline'      // large headline overlaid on image
  | 'quote_card'    // text-primary quote with minimal background

export type TextLayerType = 'top' | 'bottom' | 'free' | 'headline' | 'quote'

export type ExportSize = 'square' | 'portrait' | 'story'

export type TextAlign = 'left' | 'center' | 'right'

export type FontStyle = 'impact' | 'bold' | 'normal'

export type QuickAction =
  | 'funnier'
  | 'savage'
  | 'mainstream'
  | 'safer'
  | 'less_cringe'
  | 'shorter'
  | 'regenerate'

export const EXPORT_SIZES: Record<ExportSize, { width: number; height: number; label: string }> = {
  square:   { width: 1080, height: 1080, label: 'Square (1:1)' },
  portrait: { width: 1080, height: 1350, label: 'Portrait (4:5)' },
  story:    { width: 1080, height: 1920, label: 'Story (9:16)' },
}

// ---------------------------------------------------------------------------
// Text layer
// ---------------------------------------------------------------------------

export interface TextLayer {
  id: string
  type: TextLayerType
  content: string
  /** Position as percentage of canvas dimensions (0–100) */
  x: number
  y: number
  fontSize: number
  fontStyle: FontStyle
  color: string
  stroke: boolean
  align: TextAlign
  bold: boolean
  uppercase: boolean
  maxWidthPct: number // % of canvas width for text wrapping
}

export type PartialTextLayer = Omit<TextLayer, 'id' | 'content'>

// ---------------------------------------------------------------------------
// Template
// ---------------------------------------------------------------------------

export interface MemeTemplate {
  id: string
  name: string
  /** CSS background value for preview (gradient or solid) */
  previewStyle: string
  /** Emoji/icon for template picker */
  previewEmoji: string
  /** Width / height ratio */
  aspectRatio: number
  /** Which layouts this template supports */
  layouts: MemeLayout[]
  /** Default layer configs for 'standard' layout */
  defaultLayers: PartialTextLayer[]
  tags: string[]
}

// ---------------------------------------------------------------------------
// Canvas state
// ---------------------------------------------------------------------------

export interface MemeCanvasState {
  layout: MemeLayout
  template: MemeTemplate | null
  /** Object URL from file upload */
  customImageUrl: string | null
  /** Second image for side_by_side / reaction */
  customImage2Url: string | null
  layers: TextLayer[]
  exportSize: ExportSize
  showWatermark: boolean
  watermarkPosition: 'top_left' | 'top_right' | 'bottom_left' | 'bottom_right'
  backgroundColor: string
}

// ---------------------------------------------------------------------------
// Draft (DB-persisted)
// ---------------------------------------------------------------------------

export interface MemeDraft {
  id: string
  org_id: string
  name: string
  state: MemeCanvasState
  thumbnail_data_url: string | null
  cluster_id: string | null
  created_at: string
  updated_at: string
}

// ---------------------------------------------------------------------------
// AI punchlines
// ---------------------------------------------------------------------------

export interface PunchlineSuggestion {
  id: string
  top_text: string
  bottom_text: string | null
  /** One-liner describing the comedic angle */
  concept: string
}

export interface PunchlineRequest {
  org_id: string
  cluster_id?: string
  topic?: string
  template_id?: string
  num_suggestions?: number
  quick_action?: QuickAction
  current_top?: string
  current_bottom?: string
}

export interface PunchlineResponse {
  suggestions: PunchlineSuggestion[]
  tokens_used: number
}
