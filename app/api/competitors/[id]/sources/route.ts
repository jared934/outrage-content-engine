// GET  /api/competitors/[id]/sources  — list sources for a competitor
// POST /api/competitors/[id]/sources  — add source

import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient, getSessionUser } from '@/lib/supabase/server'
import type { CreateSourceInput } from '@/lib/competitors/competitor.types'

type Ctx = { params: { id: string } }

export async function GET(_req: NextRequest, { params }: Ctx) {
  const supabase = createServiceClient()
  const user = await getSessionUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data, error } = await supabase
    .from('competitor_sources')
    .select('*')
    .eq('competitor_id', params.id)
    .order('created_at')

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ sources: data ?? [] })
}

export async function POST(req: NextRequest, { params }: Ctx) {
  const supabase = createServiceClient()
  const user = await getSessionUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // Resolve org_id from competitor
  const { data: comp } = await supabase
    .from('competitors')
    .select('org_id')
    .eq('id', params.id)
    .single()

  if (!comp) return NextResponse.json({ error: 'Competitor not found' }, { status: 404 })

  const body: CreateSourceInput = await req.json()
  if (!body.url?.trim()) return NextResponse.json({ error: 'url required' }, { status: 400 })

  const { data, error } = await supabase
    .from('competitor_sources')
    .insert({
      competitor_id: params.id,
      org_id:        comp.org_id,
      source_type:   body.source_type,
      url:           body.url.trim(),
      handle:        body.handle ?? null,
      label:         body.label ?? null,
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ source: data }, { status: 201 })
}
