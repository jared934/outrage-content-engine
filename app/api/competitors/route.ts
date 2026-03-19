// GET  /api/competitors?org_id=  — list competitors
// POST /api/competitors?org_id=  — create competitor

import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient, getSessionUser } from '@/lib/supabase/server'
import type { CreateCompetitorInput } from '@/lib/competitors/competitor.types'

export async function GET(req: NextRequest) {
  const orgId    = req.nextUrl.searchParams.get('org_id')
  const category = req.nextUrl.searchParams.get('category')
  const inactive = req.nextUrl.searchParams.get('inactive') === '1'
  const supabase = createServiceClient()

  const user = await getSessionUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  let q = supabase
    .from('competitors')
    .select('*, competitor_sources(id, source_type, url, handle, label, is_active, last_fetched_at, last_post_at, fetch_error, post_count)')
    .order('name')

  if (orgId) q = q.eq('org_id', orgId)
  if (!inactive) q = q.eq('is_active', true)
  if (category) q = q.eq('category', category)

  const { data, error } = await q
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ competitors: data ?? [] })
}

export async function POST(req: NextRequest) {
  const orgId    = req.nextUrl.searchParams.get('org_id')
  const supabase = createServiceClient()

  const user = await getSessionUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  if (!orgId) return NextResponse.json({ error: 'org_id required' }, { status: 400 })

  const body: CreateCompetitorInput = await req.json()
  if (!body.name?.trim()) return NextResponse.json({ error: 'name required' }, { status: 400 })

  const { data, error } = await supabase
    .from('competitors')
    .insert({ ...body, org_id: orgId })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ competitor: data }, { status: 201 })
}
