// GET    /api/canva/export/[id] — get a single export
// PATCH  /api/canva/export/[id] — update status / link / notes
// DELETE /api/canva/export/[id] — delete export record

import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient, getSessionUser } from '@/lib/supabase/server'
import { getExport, updateExport, deleteExport } from '@/lib/canva/export.service'
import type { UpdateExportRequest, ExportStatus } from '@/lib/canva/canva.types'

const VALID_STATUSES: ExportStatus[] = [
  'pending', 'in_progress', 'designed', 'review', 'approved', 'published', 'archived',
]

async function resolveOrgId(supabase: ReturnType<typeof createServiceClient>, userId: string, paramOrgId: string | null) {
  if (paramOrgId) return paramOrgId
  const { data } = await supabase
    .from('org_members').select('org_id').eq('user_id', userId).limit(1).single()
  return data?.org_id ?? null
}

// ---------------------------------------------------------------------------
// GET
// ---------------------------------------------------------------------------

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const supabase = createServiceClient()
  const user = await getSessionUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const { searchParams } = new URL(req.url)
  const org_id = await resolveOrgId(supabase, user.id, searchParams.get('org_id'))
  if (!org_id) return NextResponse.json({ error: 'org_id required' }, { status: 400 })

  try {
    const record = await getExport(id, org_id)
    if (!record) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    return NextResponse.json({ ok: true, export: record })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}

// ---------------------------------------------------------------------------
// PATCH
// ---------------------------------------------------------------------------

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const supabase = createServiceClient()
  const user = await getSessionUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params

  let body: UpdateExportRequest & { org_id?: string }
  try { body = await req.json() }
  catch { return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 }) }

  const org_id = await resolveOrgId(supabase, user.id, body.org_id ?? null)
  if (!org_id) return NextResponse.json({ error: 'org_id required' }, { status: 400 })

  if (body.status && !VALID_STATUSES.includes(body.status)) {
    return NextResponse.json({ error: `Invalid status. Must be one of: ${VALID_STATUSES.join(', ')}` }, { status: 400 })
  }

  // Sanitise design URL
  if (body.canva_design_url) {
    try { new URL(body.canva_design_url) } catch {
      return NextResponse.json({ error: 'canva_design_url must be a valid URL' }, { status: 400 })
    }
  }

  try {
    const record = await updateExport(id, org_id, {
      status:           body.status,
      canva_design_url: body.canva_design_url,
      canva_design_id:  body.canva_design_id,
      designer_notes:   body.designer_notes,
      name:             body.name,
    })
    return NextResponse.json({ ok: true, export: record })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}

// ---------------------------------------------------------------------------
// DELETE
// ---------------------------------------------------------------------------

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const supabase = createServiceClient()
  const user = await getSessionUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const { searchParams } = new URL(req.url)
  const org_id = await resolveOrgId(supabase, user.id, searchParams.get('org_id'))
  if (!org_id) return NextResponse.json({ error: 'org_id required' }, { status: 400 })

  try {
    await deleteExport(id, org_id)
    return NextResponse.json({ ok: true })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
