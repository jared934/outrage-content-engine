// PATCH  /api/competitors/[id]/sources/[sourceId]  — update source
// DELETE /api/competitors/[id]/sources/[sourceId]  — remove source

import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient, getSessionUser } from '@/lib/supabase/server'

type Ctx = { params: { id: string; sourceId: string } }

export async function PATCH(req: NextRequest, { params }: Ctx) {
  const supabase = createServiceClient()
  const user = await getSessionUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const updates = await req.json()

  const { data, error } = await supabase
    .from('competitor_sources')
    .update(updates)
    .eq('id', params.sourceId)
    .eq('competitor_id', params.id)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ source: data })
}

export async function DELETE(_req: NextRequest, { params }: Ctx) {
  const supabase = createServiceClient()
  const user = await getSessionUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { error } = await supabase
    .from('competitor_sources')
    .delete()
    .eq('id', params.sourceId)
    .eq('competitor_id', params.id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ ok: true })
}
