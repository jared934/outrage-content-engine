// GET    /api/meme/drafts         — list drafts for org
// POST   /api/meme/drafts         — create or update a draft
// DELETE /api/meme/drafts?id=...  — delete a draft

import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient, getSessionUser } from '@/lib/supabase/server'
import { saveDraft, listDrafts, deleteDraft } from '@/lib/meme/draft.service'
import type { MemeCanvasState } from '@/lib/meme/meme.types'

async function getAuthedUser() {
  const supabase = createServiceClient()
  const user = await getSessionUser()
  return { supabase, user }
}

// ---------------------------------------------------------------------------
// GET — list drafts
// ---------------------------------------------------------------------------

export async function GET(req: NextRequest) {
  const { supabase, user } = await getAuthedUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const org_id = searchParams.get('org_id')
  const limit  = Number(searchParams.get('limit') ?? '20')

  if (!org_id) return NextResponse.json({ error: 'org_id is required' }, { status: 400 })

  // Verify membership
  const { data: membership } = await supabase
    .from('org_members').select('role').eq('org_id', org_id).eq('user_id', user.id).single()
  if (!membership) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  try {
    const drafts = await listDrafts(org_id, Math.min(limit, 50))
    return NextResponse.json({ ok: true, drafts })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}

// ---------------------------------------------------------------------------
// POST — save / update draft
// ---------------------------------------------------------------------------

export async function POST(req: NextRequest) {
  const { supabase, user } = await getAuthedUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  let body: {
    org_id: string
    name?: string
    state: MemeCanvasState
    thumbnail_data_url?: string | null
    cluster_id?: string | null
    draft_id?: string | null
  }
  try { body = await req.json() }
  catch { return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 }) }

  const { org_id, name, state, thumbnail_data_url, cluster_id, draft_id } = body

  if (!org_id) return NextResponse.json({ error: 'org_id is required' }, { status: 400 })
  if (!state)  return NextResponse.json({ error: 'state is required' }, { status: 400 })

  // Verify membership
  const { data: membership } = await supabase
    .from('org_members').select('role').eq('org_id', org_id).eq('user_id', user.id).single()
  if (!membership) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  try {
    const draft = await saveDraft({
      org_id,
      name: name || 'Untitled Meme',
      state,
      thumbnail_data_url,
      cluster_id,
      draft_id,
    })
    return NextResponse.json({ ok: true, draft })
  } catch (err) {
    console.error('[meme/drafts POST] Error:', err)
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}

// ---------------------------------------------------------------------------
// DELETE — delete draft
// ---------------------------------------------------------------------------

export async function DELETE(req: NextRequest) {
  const { supabase, user } = await getAuthedUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const id     = searchParams.get('id')
  const org_id = searchParams.get('org_id')

  if (!id || !org_id) return NextResponse.json({ error: 'id and org_id are required' }, { status: 400 })

  // Verify membership
  const { data: membership } = await supabase
    .from('org_members').select('role').eq('org_id', org_id).eq('user_id', user.id).single()
  if (!membership) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  try {
    await deleteDraft(id, org_id)
    return NextResponse.json({ ok: true })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
