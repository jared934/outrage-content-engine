import { createServiceClient } from '@/lib/supabase/server'
import type {
  CanvaExport, CanvaExportPayload, CreateExportRequest, UpdateExportRequest,
  ExportListFilters, CanvaTemplateType, BrandTheme, LinkedAsset,
} from './canva.types'
import { TEMPLATE_DIMENSIONS } from './canva.types'

// ---------------------------------------------------------------------------
// Helpers — brand theme extraction
// ---------------------------------------------------------------------------

async function fetchBrandTheme(org_id: string): Promise<BrandTheme> {
  const supabase = createServiceClient()

  const { data } = await supabase
    .from('brand_settings')
    .select('color_palette, font_preferences, logo_url, tone_keywords, voice_description')
    .eq('org_id', org_id)
    .maybeSingle()

  const palette = (data?.color_palette as string[] | null) ?? []
  const fonts   = (data?.font_preferences as string[] | null) ?? []
  const tones   = (data?.tone_keywords as string[] | null) ?? []

  return {
    primary_color: palette[0] ?? '#09090B',
    accent_color:  palette[1] ?? '#EF4444',
    font_headline: fonts[0]   ?? 'Impact',
    font_body:     fonts[1]   ?? 'Arial',
    logo_url:      data?.logo_url ?? null,
    style_notes:   data?.voice_description ?? null,
    tone_keywords: tones,
  }
}

// ---------------------------------------------------------------------------
// Build payload from a content idea
// ---------------------------------------------------------------------------

export async function buildPayloadFromIdea(params: {
  idea_id:       string
  template_type: CanvaTemplateType
  org_id:        string
  design_notes?: string | null
}): Promise<CanvaExportPayload> {
  const supabase = createServiceClient()

  const { data: idea } = await supabase
    .from('content_ideas')
    .select('id, content, hook, cta, type, format_slug, structured_data, cluster_id, output_style')
    .eq('id', params.idea_id)
    .single()

  if (!idea) throw new Error('Content idea not found')

  // Extract structured data fields
  const sd      = (idea.structured_data as Record<string, unknown>) ?? {}
  const headline    = extractString(sd, ['headline', 'hook']) ?? idea.hook ?? (idea.content.slice(0, 80))
  const subheadline = extractString(sd, ['subtext', 'subheadline']) ?? null
  const caption     = idea.content
  const cta         = idea.cta ?? extractString(sd, ['cta', 'final_slide_cta', 'primary'])
  const visual      = extractVisualDirection(sd)

  // Cluster info for linked asset
  const assets: LinkedAsset[] = [
    { type: 'content_idea', label: 'Content Idea', url: null, id: idea.id },
  ]
  if (idea.cluster_id) {
    const { data: cluster } = await supabase
      .from('trend_clusters')
      .select('title')
      .eq('id', idea.cluster_id)
      .single()
    if (cluster) {
      assets.push({ type: 'external', label: `Trend: ${cluster.title}`, url: null, id: idea.cluster_id })
    }
  }

  const brand_theme = await fetchBrandTheme(params.org_id)

  return {
    headline,
    subheadline,
    caption,
    cta:              cta ?? null,
    visual_direction: visual,
    design_notes:     params.design_notes ?? null,
    template_type:    params.template_type,
    dimensions:       TEMPLATE_DIMENSIONS[params.template_type],
    brand_theme,
    linked_assets:    assets,
  }
}

// ---------------------------------------------------------------------------
// Build payload from a meme draft
// ---------------------------------------------------------------------------

export async function buildPayloadFromMemeDraft(params: {
  draft_id:    string
  org_id:      string
  design_notes?: string | null
}): Promise<CanvaExportPayload> {
  const supabase = createServiceClient()

  const { data: draft } = await supabase
    .from('meme_drafts')
    .select('id, name, state, cluster_id')
    .eq('id', params.draft_id)
    .eq('org_id', params.org_id)
    .single()

  if (!draft) throw new Error('Meme draft not found')

  // Extract text layers
  const state  = (draft.state as Record<string, unknown>) ?? {}
  const layers = (state.layers as Array<{ type: string; content: string }> | null) ?? []
  const topLayer    = layers.find((l) => l.type === 'top')
  const bottomLayer = layers.find((l) => l.type === 'bottom')
  const headline    = topLayer?.content ?? draft.name
  const caption     = [topLayer, bottomLayer]
    .filter(Boolean).map((l) => l!.content).join(' / ')

  const brand_theme = await fetchBrandTheme(params.org_id)
  const assets: LinkedAsset[] = [
    { type: 'meme_draft', label: draft.name, url: null, id: draft.id },
  ]
  if (draft.cluster_id) {
    const { data: cluster } = await supabase
      .from('trend_clusters').select('title').eq('id', draft.cluster_id).single()
    if (cluster) {
      assets.push({ type: 'external', label: `Trend: ${cluster.title}`, url: null, id: draft.cluster_id })
    }
  }

  return {
    headline,
    subheadline: bottomLayer?.content ?? null,
    caption:     caption || null,
    cta:         null,
    visual_direction: null,
    design_notes:     params.design_notes ?? null,
    template_type:    'meme',
    dimensions:       TEMPLATE_DIMENSIONS['meme'],
    brand_theme,
    linked_assets:    assets,
  }
}

// ---------------------------------------------------------------------------
// Build payload manually (bare bones — user fills fields)
// ---------------------------------------------------------------------------

export async function buildBlankPayload(params: {
  template_type: CanvaTemplateType
  org_id:        string
}): Promise<CanvaExportPayload> {
  const brand_theme = await fetchBrandTheme(params.org_id)
  return {
    headline:         '',
    subheadline:      null,
    caption:          null,
    cta:              null,
    visual_direction: null,
    design_notes:     null,
    template_type:    params.template_type,
    dimensions:       TEMPLATE_DIMENSIONS[params.template_type],
    brand_theme,
    linked_assets:    [],
  }
}

// ---------------------------------------------------------------------------
// CRUD
// ---------------------------------------------------------------------------

export async function createExport(req: CreateExportRequest): Promise<CanvaExport> {
  const supabase = createServiceClient()

  const { data: { user } } = await supabase.auth.getUser()

  const { data, error } = await supabase
    .from('canva_exports')
    .insert({
      org_id:          req.org_id,
      name:            req.name || deriveName(req.payload),
      template_type:   req.template_type,
      payload:         req.payload as unknown as Record<string, unknown>,
      status:          'pending',
      content_idea_id: req.content_idea_id ?? null,
      meme_draft_id:   req.meme_draft_id   ?? null,
      cluster_id:      req.cluster_id      ?? null,
      created_by:      user?.id            ?? null,
    })
    .select()
    .single()

  if (error) throw new Error(error.message)
  return data as CanvaExport
}

export async function updateExport(id: string, org_id: string, updates: UpdateExportRequest): Promise<CanvaExport> {
  const supabase = createServiceClient()

  const patch: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
  }
  if (updates.status           !== undefined) patch.status             = updates.status
  if (updates.canva_design_url !== undefined) patch.canva_design_url   = updates.canva_design_url
  if (updates.canva_design_id  !== undefined) patch.canva_design_id    = updates.canva_design_id
  if (updates.designer_notes   !== undefined) patch.designer_notes     = updates.designer_notes
  if (updates.name             !== undefined) patch.name               = updates.name

  // Auto-set designed_at when design URL is saved
  if (updates.canva_design_url && updates.canva_design_url.length > 0) {
    patch.designed_at = new Date().toISOString()
    if (!updates.status || updates.status === 'pending') {
      patch.status = 'designed'
    }
  }

  // Auto-set exported_at when first opened
  if (updates.status === 'in_progress') {
    patch.exported_at = new Date().toISOString()
  }

  const { data, error } = await supabase
    .from('canva_exports')
    .update(patch)
    .eq('id', id)
    .eq('org_id', org_id)
    .select()
    .single()

  if (error) throw new Error(error.message)
  return data as CanvaExport
}

export async function listExports(org_id: string, filters: ExportListFilters = {}): Promise<CanvaExport[]> {
  const supabase = createServiceClient()

  let query = supabase
    .from('canva_exports')
    .select('*')
    .eq('org_id', org_id)
    .order('created_at', { ascending: false })
    .limit(filters.limit ?? 50)

  if (filters.template_type) query = query.eq('template_type', filters.template_type)
  if (filters.status)        query = query.eq('status', filters.status)
  if (filters.cluster_id)    query = query.eq('cluster_id', filters.cluster_id)

  const { data, error } = await query
  if (error) throw new Error(error.message)
  return (data ?? []) as CanvaExport[]
}

export async function getExport(id: string, org_id: string): Promise<CanvaExport | null> {
  const supabase = createServiceClient()

  const { data } = await supabase
    .from('canva_exports')
    .select('*')
    .eq('id', id)
    .eq('org_id', org_id)
    .single()

  return data as CanvaExport | null
}

export async function deleteExport(id: string, org_id: string): Promise<void> {
  const supabase = createServiceClient()
  const { error } = await supabase
    .from('canva_exports').delete().eq('id', id).eq('org_id', org_id)
  if (error) throw new Error(error.message)
}

// ---------------------------------------------------------------------------
// Utils
// ---------------------------------------------------------------------------

function deriveName(payload: CanvaExportPayload): string {
  const h = payload.headline?.slice(0, 40).trim()
  if (h) return h
  return `${payload.template_type.replace(/_/g, ' ')} export`
}

function extractString(
  obj: Record<string, unknown>,
  keys: string[],
): string | null {
  for (const k of keys) {
    const v = obj[k]
    if (typeof v === 'string' && v.trim()) return v.trim()
  }
  return null
}

function extractVisualDirection(sd: Record<string, unknown>): string | null {
  const vd = sd['visual_direction']
  if (typeof vd === 'string') return vd
  if (typeof vd === 'object' && vd !== null) {
    const fields = ['aesthetic', 'color_mood', 'composition', 'text_overlay_suggestion']
    const parts  = fields.map((f) => (vd as Record<string, unknown>)[f]).filter(Boolean)
    return parts.join(' · ') || null
  }
  return null
}
