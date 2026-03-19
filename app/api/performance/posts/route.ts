// GET  /api/performance/posts?org_id=&days=30&platform=&post_type=
// POST /api/performance/posts?org_id=  — log a new post result

import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient, getSessionUser } from '@/lib/supabase/server'
import { computePerformanceScore } from '@/lib/performance/performance.types'
import type { CreatePerformancePostInput } from '@/lib/performance/performance.types'

export async function GET(req: NextRequest) {
  const p        = req.nextUrl.searchParams
  const orgId    = p.get('org_id')
  const days     = Number(p.get('days') ?? '90')
  const platform = p.get('platform')
  const postType = p.get('post_type')
  const limit    = Math.min(Number(p.get('limit') ?? '200'), 500)
  const supabase = createServiceClient()

  const user = await getSessionUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const cutoff = new Date(Date.now() - days * 86_400_000).toISOString()

  let q = supabase
    .from('performance_posts')
    .select('*')
    .gte('posted_at', cutoff)
    .order('posted_at', { ascending: false })
    .limit(limit)

  if (orgId)    q = q.eq('org_id', orgId)
  if (platform) q = q.eq('platform', platform)
  if (postType) q = q.eq('post_type', postType)

  const { data, error } = await q
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ posts: data ?? [] })
}

export async function POST(req: NextRequest) {
  const orgId    = req.nextUrl.searchParams.get('org_id')
  const supabase = createServiceClient()

  const user = await getSessionUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  if (!orgId) return NextResponse.json({ error: 'org_id required' }, { status: 400 })

  const body: CreatePerformancePostInput = await req.json()
  if (!body.title?.trim()) return NextResponse.json({ error: 'title required' }, { status: 400 })

  // Compute performance score server-side
  const performance_score = computePerformanceScore(
    body.platform,
    body.engagement_rate ?? null,
    body.views   ?? null,
    body.shares  ?? null,
    body.saves   ?? null,
    body.likes   ?? null,
    body.comments ?? null,
  )

  const { data, error } = await supabase
    .from('performance_posts')
    .insert({ ...body, org_id: orgId, performance_score })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ post: data }, { status: 201 })
}
