// GET   /api/performance/posts/[id]
// PATCH /api/performance/posts/[id]
// DELETE /api/performance/posts/[id]

import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient, getSessionUser } from '@/lib/supabase/server'
import { computePerformanceScore } from '@/lib/performance/performance.types'

type Ctx = { params: { id: string } }

export async function GET(_req: NextRequest, { params }: Ctx) {
  const supabase = createServiceClient()
  const user = await getSessionUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data, error } = await supabase
    .from('performance_posts')
    .select('*')
    .eq('id', params.id)
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 404 })

  return NextResponse.json({ post: data })
}

export async function PATCH(req: NextRequest, { params }: Ctx) {
  const supabase = createServiceClient()
  const user = await getSessionUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const updates = await req.json()

  // Recompute score if metric fields changed
  if (
    updates.engagement_rate !== undefined ||
    updates.views !== undefined ||
    updates.shares !== undefined ||
    updates.saves !== undefined ||
    updates.likes !== undefined ||
    updates.comments !== undefined ||
    updates.platform !== undefined
  ) {
    const { data: existing } = await supabase
      .from('performance_posts')
      .select('platform, engagement_rate, views, shares, saves, likes, comments')
      .eq('id', params.id)
      .single()

    if (existing) {
      updates.performance_score = computePerformanceScore(
        updates.platform       ?? existing.platform,
        updates.engagement_rate ?? existing.engagement_rate,
        updates.views           ?? existing.views,
        updates.shares          ?? existing.shares,
        updates.saves           ?? existing.saves,
        updates.likes           ?? existing.likes,
        updates.comments        ?? existing.comments,
      )
    }
  }

  const { data, error } = await supabase
    .from('performance_posts')
    .update(updates)
    .eq('id', params.id)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ post: data })
}

export async function DELETE(_req: NextRequest, { params }: Ctx) {
  const supabase = createServiceClient()
  const user = await getSessionUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { error } = await supabase.from('performance_posts').delete().eq('id', params.id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ ok: true })
}
