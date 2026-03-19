// GET    /api/pipeline/items/[id]  — fetch single item
// PATCH  /api/pipeline/items/[id]  — update item (status, fields)
// DELETE /api/pipeline/items/[id]  — delete item

import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient, getSessionUser } from '@/lib/supabase/server'
import type { UpdatePipelineItemInput } from '@/lib/pipeline/pipeline.types'

type Ctx = { params: { id: string } }

export async function GET(_req: NextRequest, { params }: Ctx) {
  const supabase = createServiceClient()
  const user = await getSessionUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: item, error } = await supabase
    .from('content_pipeline_items')
    .select('*')
    .eq('id', params.id)
    .single()

  if (error || !item) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  // Enrich cluster title
  let cluster_title: string | null = null
  if (item.cluster_id) {
    const { data: c } = await supabase
      .from('trend_clusters').select('title').eq('id', item.cluster_id).single()
    cluster_title = c?.title ?? null
  }

  return NextResponse.json({ ok: true, item: { ...item, cluster_title } })
}

export async function PATCH(req: NextRequest, { params }: Ctx) {
  const supabase = createServiceClient()
  const user = await getSessionUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const updates: UpdatePipelineItemInput = await req.json()

    // Auto-set approved_at when status → approved
    if (updates.status === 'approved' && !updates.approved_at) {
      updates.approved_at = new Date().toISOString()
      updates.approved_by = user.id
    }

    const { data: item, error } = await supabase
      .from('content_pipeline_items')
      .update(updates)
      .eq('id', params.id)
      .select()
      .single()

    if (error) throw error
    return NextResponse.json({ ok: true, item })
  } catch (err) {
    console.error('[pipeline/items PATCH]', err)
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}

export async function DELETE(_req: NextRequest, { params }: Ctx) {
  const supabase = createServiceClient()
  const user = await getSessionUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { error } = await supabase
    .from('content_pipeline_items')
    .delete()
    .eq('id', params.id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
