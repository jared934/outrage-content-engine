// GET  /api/assets  — list org assets with filters
// POST /api/assets  — save asset metadata after upload

import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient, getSessionUser } from '@/lib/supabase/server'
import type { AssetCategory, AssetType, CreateAssetInput } from '@/lib/assets/asset.types'

export async function GET(req: NextRequest) {
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
    let query = supabase
      .from('assets')
      .select('*')
      .eq('org_id', org_id)
      .eq('is_archived', false)
      .order('created_at', { ascending: false })

    const type     = searchParams.get('type')     as AssetType | null
    const category = searchParams.get('category') as AssetCategory | null
    const tag      = searchParams.get('tag')
    const search   = searchParams.get('q')

    if (type)     query = query.eq('type', type)
    if (category) query = query.eq('category', category)
    if (tag)      query = query.contains('tags', [tag])
    if (search)   query = query.ilike('name', `%${search}%`)

    const limit = Number(searchParams.get('limit') ?? 100)
    const offset = Number(searchParams.get('offset') ?? 0)
    query = query.range(offset, offset + limit - 1)

    const { data: assets, error, count } = await query
    if (error) throw error

    // Aggregate category counts for stats bar
    const { data: statsRaw } = await supabase
      .from('assets')
      .select('category, type')
      .eq('org_id', org_id)
      .eq('is_archived', false)

    const categoryCounts: Record<string, number> = {}
    const typeCounts: Record<string, number> = {}
    for (const a of statsRaw ?? []) {
      categoryCounts[a.category] = (categoryCounts[a.category] ?? 0) + 1
      typeCounts[a.type]         = (typeCounts[a.type]         ?? 0) + 1
    }

    // Collect all unique tags
    const { data: tagRaw } = await supabase
      .from('assets')
      .select('tags')
      .eq('org_id', org_id)
      .eq('is_archived', false)

    const allTags = Array.from(new Set(
      (tagRaw ?? []).flatMap((a: { tags: string[] }) => a.tags)
    )).sort()

    return NextResponse.json({
      ok: true,
      assets: assets ?? [],
      total: (statsRaw ?? []).length,
      categoryCounts,
      typeCounts,
      allTags,
    })
  } catch (err) {
    console.error('[assets GET]', err)
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
    const body: CreateAssetInput = await req.json()

    const { data: asset, error } = await supabase
      .from('assets')
      .insert({
        org_id,
        name:             body.name,
        type:             body.type,
        category:         body.category  ?? 'other',
        url:              body.url,
        storage_path:     body.storage_path    ?? null,
        mime_type:        body.mime_type        ?? null,
        file_size_bytes:  body.file_size_bytes  ?? null,
        width:            body.width            ?? null,
        height:           body.height           ?? null,
        alt_text:         body.alt_text         ?? null,
        description:      body.description      ?? null,
        tags:             body.tags             ?? [],
        metadata:         body.metadata         ?? {},
        created_by:       user.id,
      })
      .select()
      .single()

    if (error) throw error
    return NextResponse.json({ ok: true, asset }, { status: 201 })
  } catch (err) {
    console.error('[assets POST]', err)
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
