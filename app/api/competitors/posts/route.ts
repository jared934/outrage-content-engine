// GET /api/competitors/posts
// Unified feed of competitor posts, filterable by competitor/tag/cluster/date

import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient, getSessionUser } from '@/lib/supabase/server'

export async function GET(req: NextRequest) {
  const p          = req.nextUrl.searchParams
  const orgId      = p.get('org_id')
  const compId     = p.get('competitor_id')
  const tag        = p.get('tag')
  const clusterId  = p.get('cluster_id')
  const days       = Number(p.get('days') ?? '7')
  const limit      = Math.min(Number(p.get('limit') ?? '50'), 100)
  const supabase   = createServiceClient()

  const user = await getSessionUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const cutoff = new Date(Date.now() - days * 86_400_000).toISOString()

  let q = supabase
    .from('competitor_posts')
    .select(`
      id, title, content, url, thumbnail_url, published_at,
      topic_tags, matched_cluster_ids, engagement_score, created_at,
      competitor_id,
      competitors!inner(name, category, avatar_url)
    `)
    .gte('published_at', cutoff)
    .order('published_at', { ascending: false })
    .limit(limit)

  if (orgId)     q = q.eq('org_id', orgId)
  if (compId)    q = q.eq('competitor_id', compId)
  if (tag)       q = q.contains('topic_tags', [tag])
  if (clusterId) q = q.contains('matched_cluster_ids', [clusterId])

  const { data, error } = await q
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Flatten competitor info onto each post
  const posts = (data ?? []).map((row) => {
    const r = row as unknown as Record<string, unknown> & {
      competitors: { name: string; category: string; avatar_url: string | null } | { name: string; category: string; avatar_url: string | null }[] | null
    }
    const comp = Array.isArray(r.competitors) ? r.competitors[0] ?? null : r.competitors
    const { competitors: _comp, ...rest } = r
    return {
      ...rest,
      competitor_name:     comp?.name ?? null,
      competitor_category: comp?.category ?? null,
      competitor_avatar:   comp?.avatar_url ?? null,
    }
  })

  return NextResponse.json({ posts })
}
