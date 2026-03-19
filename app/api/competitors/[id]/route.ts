// GET    /api/competitors/[id]  — single competitor with sources
// PATCH  /api/competitors/[id]  — update
// DELETE /api/competitors/[id]  — soft-delete (is_active = false) or ?hard=1

import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient, getSessionUser } from '@/lib/supabase/server'
import type { UpdateCompetitorInput } from '@/lib/competitors/competitor.types'

type Ctx = { params: { id: string } }

export async function GET(_req: NextRequest, { params }: Ctx) {
  const supabase = createServiceClient()
  const user = await getSessionUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data, error } = await supabase
    .from('competitors')
    .select('*, competitor_sources(*), competitor_posts(id, title, url, published_at, topic_tags, thumbnail_url, created_at)')
    .eq('id', params.id)
    .order('published_at', { referencedTable: 'competitor_posts', ascending: false })
    .limit(20, { referencedTable: 'competitor_posts' })
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 404 })

  return NextResponse.json({ competitor: data })
}

export async function PATCH(req: NextRequest, { params }: Ctx) {
  const supabase = createServiceClient()
  const user = await getSessionUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const updates: UpdateCompetitorInput = await req.json()

  const { data, error } = await supabase
    .from('competitors')
    .update(updates)
    .eq('id', params.id)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ competitor: data })
}

export async function DELETE(req: NextRequest, { params }: Ctx) {
  const supabase = createServiceClient()
  const user = await getSessionUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const hard = req.nextUrl.searchParams.get('hard') === '1'

  if (hard) {
    const { error } = await supabase.from('competitors').delete().eq('id', params.id)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  } else {
    const { error } = await supabase.from('competitors').update({ is_active: false }).eq('id', params.id)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
