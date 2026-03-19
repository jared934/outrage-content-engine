// POST /api/canva/export — create a new Canva export record
// GET  /api/canva/export — list exports for an org

import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient, getSessionUser } from '@/lib/supabase/server'
import {
  createExport,
  listExports,
  buildPayloadFromIdea,
  buildPayloadFromMemeDraft,
  buildBlankPayload,
} from '@/lib/canva/export.service'
import type {
  CanvaTemplateType, ExportListFilters,
} from '@/lib/canva/canva.types'

const VALID_TEMPLATE_TYPES: CanvaTemplateType[] = [
  'breaking_alert', 'meme', 'story', 'carousel_cover', 'reel_cover', 'quote_graphic',
]

async function getAuthedOrg(req: NextRequest) {
  const supabase = createServiceClient()
  const user = await getSessionUser()
  if (!user) return { user: null, org_id: null, supabase }

  const { searchParams } = new URL(req.url)
  const org_id_param = searchParams.get('org_id')

  const { data: membership } = await supabase
    .from('org_members')
    .select('org_id, role')
    .eq('user_id', user.id)
    .limit(1)
    .single()

  const org_id = org_id_param ?? membership?.org_id ?? null
  return { user, org_id, supabase }
}

// ---------------------------------------------------------------------------
// POST — create export
// ---------------------------------------------------------------------------

export async function POST(req: NextRequest) {
  const supabase = createServiceClient()
  const user = await getSessionUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  let body: {
    org_id:           string
    name?:            string
    template_type:    CanvaTemplateType
    source?:          'idea' | 'meme_draft' | 'manual'
    content_idea_id?: string
    meme_draft_id?:   string
    cluster_id?:      string
    design_notes?:    string
    payload?:         Record<string, unknown>
  }

  try { body = await req.json() }
  catch { return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 }) }

  const {
    org_id, name, template_type, source,
    content_idea_id, meme_draft_id, cluster_id, design_notes, payload,
  } = body

  if (!org_id)        return NextResponse.json({ error: 'org_id is required' }, { status: 400 })
  if (!template_type) return NextResponse.json({ error: 'template_type is required' }, { status: 400 })
  if (!VALID_TEMPLATE_TYPES.includes(template_type)) {
    return NextResponse.json({ error: `Invalid template_type. Must be one of: ${VALID_TEMPLATE_TYPES.join(', ')}` }, { status: 400 })
  }

  // Verify org membership
  const { data: membership } = await supabase
    .from('org_members').select('role').eq('org_id', org_id).eq('user_id', user.id).single()
  if (!membership) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  try {
    let resolvedPayload

    if (source === 'idea' && content_idea_id) {
      resolvedPayload = await buildPayloadFromIdea({ idea_id: content_idea_id, template_type, org_id, design_notes })
    } else if (source === 'meme_draft' && meme_draft_id) {
      resolvedPayload = await buildPayloadFromMemeDraft({ draft_id: meme_draft_id, org_id, design_notes })
    } else if (payload) {
      resolvedPayload = payload
    } else {
      resolvedPayload = await buildBlankPayload({ template_type, org_id })
    }

    const record = await createExport({
      org_id,
      name,
      template_type,
      payload: resolvedPayload as import('@/lib/canva/canva.types').CanvaExportPayload,
      content_idea_id: content_idea_id ?? null,
      meme_draft_id:   meme_draft_id   ?? null,
      cluster_id:      cluster_id      ?? null,
    })

    return NextResponse.json({ ok: true, export: record }, { status: 201 })
  } catch (err) {
    console.error('[canva/export POST]', err)
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}

// ---------------------------------------------------------------------------
// GET — list exports
// ---------------------------------------------------------------------------

export async function GET(req: NextRequest) {
  const { user, org_id } = await getAuthedOrg(req)
  if (!user)   return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!org_id) return NextResponse.json({ error: 'org_id is required' }, { status: 400 })

  const { searchParams } = new URL(req.url)
  const filters: ExportListFilters = {
    template_type: (searchParams.get('template_type') as CanvaTemplateType) || undefined,
    status:        (searchParams.get('status') as import('@/lib/canva/canva.types').ExportStatus) || undefined,
    cluster_id:    searchParams.get('cluster_id')    || undefined,
    limit:         Number(searchParams.get('limit') ?? '50'),
  }

  try {
    const exports = await listExports(org_id, filters)
    return NextResponse.json({ ok: true, exports })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
