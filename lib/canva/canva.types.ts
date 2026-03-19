// =============================================================================
// OUTRAGE Canva Export Workflow — Types
// =============================================================================

// ---------------------------------------------------------------------------
// Template types
// ---------------------------------------------------------------------------

export type CanvaTemplateType =
  | 'breaking_alert'  // 1080×1080 — urgent news card
  | 'meme'            // 1080×1080 — classic meme format
  | 'story'           // 1080×1920 — full-bleed story
  | 'carousel_cover'  // 1080×1080 — carousel slide 1
  | 'reel_cover'      // 1080×1920 — reel thumbnail
  | 'quote_graphic'   // 1080×1080 — text-first quote

// ---------------------------------------------------------------------------
// Export status lifecycle
// ---------------------------------------------------------------------------

export type ExportStatus =
  | 'pending'      // created, not yet sent to designer
  | 'in_progress'  // designer has opened / is working
  | 'designed'     // Canva design URL saved
  | 'review'       // submitted for approval
  | 'approved'     // approved to publish
  | 'published'    // live on platform
  | 'archived'     // no longer relevant

// ---------------------------------------------------------------------------
// Dimensions
// ---------------------------------------------------------------------------

export interface CanvaDimensions {
  width:  number
  height: number
  label:  string
  unit:   'px'
}

export const TEMPLATE_DIMENSIONS: Record<CanvaTemplateType, CanvaDimensions> = {
  breaking_alert: { width: 1080, height: 1080, label: 'Square (1:1)',   unit: 'px' },
  meme:           { width: 1080, height: 1080, label: 'Square (1:1)',   unit: 'px' },
  story:          { width: 1080, height: 1920, label: 'Story (9:16)',   unit: 'px' },
  carousel_cover: { width: 1080, height: 1080, label: 'Square (1:1)',   unit: 'px' },
  reel_cover:     { width: 1080, height: 1920, label: 'Reel (9:16)',    unit: 'px' },
  quote_graphic:  { width: 1080, height: 1080, label: 'Square (1:1)',   unit: 'px' },
}

export const TEMPLATE_LABELS: Record<CanvaTemplateType, string> = {
  breaking_alert: 'Breaking Alert',
  meme:           'Meme',
  story:          'Story',
  carousel_cover: 'Carousel Cover',
  reel_cover:     'Reel Cover',
  quote_graphic:  'Quote Graphic',
}

/** Canva creation URLs (public page links for each format) */
export const CANVA_CREATE_URLS: Record<CanvaTemplateType, string> = {
  breaking_alert: 'https://www.canva.com/create/instagram-posts/',
  meme:           'https://www.canva.com/create/memes/',
  story:          'https://www.canva.com/create/instagram-stories/',
  carousel_cover: 'https://www.canva.com/create/instagram-posts/',
  reel_cover:     'https://www.canva.com/create/instagram-reels/',
  quote_graphic:  'https://www.canva.com/create/quote-graphics/',
}

// ---------------------------------------------------------------------------
// Brand theme (extracted from brand_settings)
// ---------------------------------------------------------------------------

export interface BrandTheme {
  primary_color:  string
  accent_color:   string
  font_headline:  string
  font_body:      string
  logo_url:       string | null
  style_notes:    string | null
  tone_keywords:  string[]
}

// ---------------------------------------------------------------------------
// Linked assets
// ---------------------------------------------------------------------------

export type LinkedAssetType = 'image' | 'video' | 'meme_draft' | 'content_idea' | 'external'

export interface LinkedAsset {
  type:  LinkedAssetType
  label: string
  url:   string | null
  id:    string | null
}

// ---------------------------------------------------------------------------
// Export payload — the full spec sent to Canva
// ---------------------------------------------------------------------------

export interface CanvaExportPayload {
  // Copy
  headline:       string
  subheadline:    string | null
  caption:        string | null
  cta:            string | null

  // Direction
  visual_direction: string | null
  design_notes:     string | null

  // Specs
  template_type: CanvaTemplateType
  dimensions:    CanvaDimensions

  // Brand
  brand_theme:   BrandTheme

  // Assets
  linked_assets: LinkedAsset[]
}

// ---------------------------------------------------------------------------
// DB record
// ---------------------------------------------------------------------------

export interface CanvaExport {
  id:                string
  org_id:            string
  created_by:        string | null
  template_type:     CanvaTemplateType
  payload:           CanvaExportPayload
  status:            ExportStatus
  canva_design_url:  string | null
  canva_design_id:   string | null
  designer_notes:    string | null
  content_idea_id:   string | null
  meme_draft_id:     string | null
  cluster_id:        string | null
  name:              string
  created_at:        string
  updated_at:        string
  exported_at:       string | null
  designed_at:       string | null
}

// ---------------------------------------------------------------------------
// Request types
// ---------------------------------------------------------------------------

export interface CreateExportRequest {
  org_id:           string
  name?:            string
  template_type:    CanvaTemplateType
  payload:          CanvaExportPayload
  content_idea_id?: string | null
  meme_draft_id?:   string | null
  cluster_id?:      string | null
}

export interface UpdateExportRequest {
  canva_design_url?: string | null
  canva_design_id?:  string | null
  designer_notes?:   string | null
  status?:           ExportStatus
  name?:             string
}

// ---------------------------------------------------------------------------
// List filters
// ---------------------------------------------------------------------------

export interface ExportListFilters {
  template_type?: CanvaTemplateType
  status?:        ExportStatus
  cluster_id?:    string
  limit?:         number
}

// ---------------------------------------------------------------------------
// Status display config
// ---------------------------------------------------------------------------

export const STATUS_CONFIG: Record<ExportStatus, {
  label:   string
  variant: 'muted' | 'info' | 'warning' | 'success' | 'accent' | 'danger' | 'default'
  dot:     boolean
}> = {
  pending:     { label: 'Pending',     variant: 'muted',   dot: false },
  in_progress: { label: 'In Progress', variant: 'info',    dot: true  },
  designed:    { label: 'Designed',    variant: 'warning', dot: true  },
  review:      { label: 'In Review',   variant: 'warning', dot: true  },
  approved:    { label: 'Approved',    variant: 'success', dot: false },
  published:   { label: 'Published',   variant: 'accent',  dot: false },
  archived:    { label: 'Archived',    variant: 'default', dot: false },
}
