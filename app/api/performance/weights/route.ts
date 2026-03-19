// GET /api/performance/weights?org_id=        — current weights
// PUT /api/performance/weights?org_id=        — recalculate from performance data

import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient, getSessionUser } from '@/lib/supabase/server'
import { deriveWeights } from '@/lib/performance/performance.analytics'
import type { PerformancePost } from '@/lib/performance/performance.types'

export async function GET(req: NextRequest) {
  const orgId    = req.nextUrl.searchParams.get('org_id')
  const supabase = createServiceClient()

  const user = await getSessionUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  if (!orgId) return NextResponse.json({ error: 'org_id required' }, { status: 400 })

  const { data } = await supabase
    .from('performance_weights')
    .select('*')
    .eq('org_id', orgId)
    .single()

  return NextResponse.json({ weights: data ?? null })
}

export async function PUT(req: NextRequest) {
  const orgId    = req.nextUrl.searchParams.get('org_id')
  const supabase = createServiceClient()

  const user = await getSessionUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  if (!orgId) return NextResponse.json({ error: 'org_id required' }, { status: 400 })

  // Fetch all posts (last 180 days) for weight computation
  const cutoff = new Date(Date.now() - 180 * 86_400_000).toISOString()
  const { data: posts, error } = await supabase
    .from('performance_posts')
    .select('*')
    .eq('org_id', orgId)
    .gte('posted_at', cutoff)
    .limit(500)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  if (!posts?.length) return NextResponse.json({ weights: null, message: 'No posts to learn from' })

  const derived = deriveWeights(posts as PerformancePost[])

  const upsertData = {
    org_id:                orgId,
    topic_weights:         derived.topic         ?? {},
    hook_type_weights:     derived.hook_type     ?? {},
    post_type_weights:     derived.post_type     ?? {},
    caption_style_weights: derived.caption_style ?? {},
    hour_weights:          derived.hour          ?? {},
    platform_weights:      derived.platform      ?? {},
    category_weights:      derived.category      ?? {},
    recalculated_at:       new Date().toISOString(),
  }

  const { data, error: upsertErr } = await supabase
    .from('performance_weights')
    .upsert(upsertData, { onConflict: 'org_id' })
    .select()
    .single()

  if (upsertErr) return NextResponse.json({ error: upsertErr.message }, { status: 500 })

  return NextResponse.json({ weights: data, posts_analysed: posts.length })
}
