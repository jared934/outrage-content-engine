// GET /api/performance/analytics?org_id=&days=90
// Fetches all posts for the period, runs JS aggregations, returns analytics object.

import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient, getSessionUser } from '@/lib/supabase/server'
import { computeAnalytics } from '@/lib/performance/performance.analytics'
import type { PerformancePost } from '@/lib/performance/performance.types'

export async function GET(req: NextRequest) {
  const p        = req.nextUrl.searchParams
  const orgId    = p.get('org_id')
  const days     = Number(p.get('days') ?? '90')
  const supabase = createServiceClient()

  const user = await getSessionUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  if (!orgId) return NextResponse.json({ error: 'org_id required' }, { status: 400 })

  const cutoff = new Date(Date.now() - days * 86_400_000).toISOString()

  const { data, error } = await supabase
    .from('performance_posts')
    .select('*')
    .eq('org_id', orgId)
    .gte('posted_at', cutoff)
    .order('posted_at', { ascending: false })
    .limit(500)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const analytics = computeAnalytics((data ?? []) as PerformancePost[], days)

  return NextResponse.json({ analytics })
}
