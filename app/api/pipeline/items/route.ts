// GET /api/pipeline/items   — list items for org (with optional status/format/search filters)
// POST /api/pipeline/items  — create a new pipeline item

import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient, getSessionUser } from '@/lib/supabase/server'
import type { CreatePipelineItemInput, PipelineStatus } from '@/lib/pipeline/pipeline.types'

export async function GET(req: NextRequest) {
  const supabase = createServiceClient()
  const user = await getSessionUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // Resolve org_id
  const { searchParams } = new URL(req.url)
  let org_id = searchParams.get('org_id')
  if (!org_id) {
    const { data: m } = await supabase
      .from('org_members').select('org_id').eq('user_id', user.id).limit(1).single()
    org_id = m?.org_id ?? null
  }
  if (!org_id) return NextResponse.json({ error: 'No org found' }, { status: 400 })

  try {
    let query = supabase
      .from('content_pipeline_items')
      .select('*')
      .eq('org_id', org_id)
      .order('status')
      .order('position', { ascending: true })
      .order('updated_at', { ascending: false })

    const status  = searchParams.get('status') as PipelineStatus | null
    const format  = searchParams.get('format')
    const cluster = searchParams.get('cluster_id')
    const search  = searchParams.get('q')

    if (status)  query = query.eq('status', status)
    if (format)  query = query.eq('format', format)
    if (cluster) query = query.eq('cluster_id', cluster)
    if (search)  query = query.ilike('title', `%${search}%`)

    const { data: items, error } = await query
    if (error) throw error

    // Enrich with cluster titles
    const clusterIds = Array.from(new Set((items ?? []).map((i) => i.cluster_id).filter(Boolean))) as string[]
    let clusterTitleMap: Record<string, string> = {}
    if (clusterIds.length > 0) {
      const { data: clusters } = await supabase
        .from('trend_clusters').select('id, title').in('id', clusterIds.slice(0, 50))
      for (const c of clusters ?? []) clusterTitleMap[c.id] = c.title
    }

    const enriched = (items ?? []).map((item) => ({
      ...item,
      cluster_title: item.cluster_id ? (clusterTitleMap[item.cluster_id] ?? null) : null,
    }))

    return NextResponse.json({ ok: true, items: enriched })
  } catch (err) {
    console.error('[pipeline/items GET]', err)
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  const supabase = createServiceClient()
  const user = await getSessionUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  let org_id = searchParams.get('org_id')
  if (!org_id) {
    const { data: m } = await supabase
      .from('org_members').select('org_id').eq('user_id', user.id).limit(1).single()
    org_id = m?.org_id ?? null
  }
  if (!org_id) return NextResponse.json({ error: 'No org found' }, { status: 400 })

  try {
    const body: CreatePipelineItemInput = await req.json()

    const { data: item, error } = await supabase
      .from('content_pipeline_items')
      .insert({
        org_id,
        cluster_id:  body.cluster_id  ?? null,
        idea_id:     body.idea_id     ?? null,
        title:       body.title,
        headline:    body.headline    ?? null,
        caption:     body.caption     ?? null,
        format:      body.format      ?? null,
        platform:    body.platform    ?? null,
        status:      body.status      ?? 'detected',
        urgency:     body.urgency     ?? 50,
        notes:       body.notes       ?? null,
        tags:        body.tags        ?? [],
        due_at:      body.due_at      ?? null,
        publish_at:  body.publish_at  ?? null,
      })
      .select()
      .single()

    if (error) throw error
    return NextResponse.json({ ok: true, item }, { status: 201 })
  } catch (err) {
    console.error('[pipeline/items POST]', err)
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
