// GET /api/competitors/gaps?org_id=&days=7
// On-demand gap analysis: our active clusters vs competitor coverage
// Returns clusters sorted by gap opportunity score

import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient, getSessionUser } from '@/lib/supabase/server'
import type { GapEntry } from '@/lib/competitors/competitor.types'

export async function GET(req: NextRequest) {
  const p        = req.nextUrl.searchParams
  const orgId    = p.get('org_id')
  const days     = Number(p.get('days') ?? '7')
  const limit    = Math.min(Number(p.get('limit') ?? '30'), 50)
  const supabase = createServiceClient()

  const user = await getSessionUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  if (!orgId) return NextResponse.json({ error: 'org_id required' }, { status: 400 })

  const cutoff = new Date(Date.now() - days * 86_400_000).toISOString()

  // ── Fetch active clusters with scores ────────────────────────────────────────
  const { data: clusters } = await supabase
    .from('trend_clusters')
    .select('id, title, category, keywords, status')
    .eq('org_id', orgId)
    .in('status', ['active', 'trending'])
    .order('created_at', { ascending: false })
    .limit(limit)

  if (!clusters?.length) return NextResponse.json({ gaps: [] })

  const clusterIds = clusters.map((c) => c.id)

  // ── Fetch latest scores ───────────────────────────────────────────────────────
  const { data: scores } = await supabase
    .from('trend_scores')
    .select('cluster_id, urgency_score, total_priority_score')
    .in('cluster_id', clusterIds)
    .order('scored_at', { ascending: false })

  const scoreMap = new Map<string, { urgency: number; priority: number }>()
  for (const s of scores ?? []) {
    if (!scoreMap.has(s.cluster_id)) {
      scoreMap.set(s.cluster_id, {
        urgency:  (s.urgency_score as number) ?? 50,
        priority: (s.total_priority_score as number) ?? 50,
      })
    }
  }

  // ── Fetch active competitors ──────────────────────────────────────────────────
  const { data: competitors } = await supabase
    .from('competitors')
    .select('id, name')
    .eq('org_id', orgId)
    .eq('is_active', true)

  if (!competitors?.length) {
    // No competitors tracked yet — return clusters with no coverage data
    const gaps: GapEntry[] = clusters.map((c) => ({
      cluster_id:       c.id,
      cluster_title:    c.title,
      cluster_category: c.category ?? 'other',
      urgency_score:    scoreMap.get(c.id)?.urgency ?? 50,
      priority_score:   scoreMap.get(c.id)?.priority ?? 50,
      coverage_count:   0,
      gap_score:        scoreMap.get(c.id)?.urgency ?? 50,
      gap_type:         'uncovered' as const,
      covered_by:       [],
      missing_from:     [],
      sample_posts:     [],
    }))
    return NextResponse.json({ gaps })
  }

  // ── Fetch competitor posts that match these clusters (recent window) ───────────
  const { data: posts } = await supabase
    .from('competitor_posts')
    .select('id, title, url, competitor_id, matched_cluster_ids, topic_tags, published_at')
    .eq('org_id', orgId)
    .gte('published_at', cutoff)
    .not('matched_cluster_ids', 'eq', '{}')
    .order('published_at', { ascending: false })
    .limit(500)

  const competitorMap = new Map(competitors.map((c) => [c.id, c.name]))

  // ── Build per-cluster coverage ────────────────────────────────────────────────
  // cluster_id → Map<competitor_id, posts[]>
  const coverage = new Map<string, Map<string, Array<{ id: string; title: string | null; url: string | null }>>>()

  for (const post of posts ?? []) {
    const matchedIds = (post.matched_cluster_ids as string[]) ?? []
    for (const cid of matchedIds) {
      if (!coverage.has(cid)) coverage.set(cid, new Map())
      const byCmp = coverage.get(cid)!
      if (!byCmp.has(post.competitor_id)) byCmp.set(post.competitor_id, [])
      byCmp.get(post.competitor_id)!.push({ id: post.id, title: post.title, url: post.url })
    }
  }

  // ── Assemble gap entries ──────────────────────────────────────────────────────
  const gaps: GapEntry[] = clusters.map((cluster) => {
    const scores   = scoreMap.get(cluster.id) ?? { urgency: 50, priority: 50 }
    const byCmp    = coverage.get(cluster.id) ?? new Map<string, Array<{ id: string; title: string | null; url: string | null }>>()

    const coveredByIds   = Array.from(byCmp.keys())
    const missingFromIds = competitors.filter((c) => !byCmp.has(c.id)).map((c) => c.id)

    const covered_by = coveredByIds.map((cid) => ({
      competitor_id:   cid,
      competitor_name: competitorMap.get(cid) ?? 'Unknown',
      post_count:      byCmp.get(cid)!.length,
    }))

    const missing_from = missingFromIds.map((cid) => ({
      competitor_id:   cid,
      competitor_name: competitorMap.get(cid) ?? 'Unknown',
    }))

    const sample_posts = coveredByIds.flatMap((cid) =>
      (byCmp.get(cid) ?? []).slice(0, 2).map((p) => ({
        post_id:         p.id,
        title:           p.title,
        url:             p.url,
        competitor_name: competitorMap.get(cid) ?? 'Unknown',
      }))
    ).slice(0, 5)

    const coverageRatio = coveredByIds.length / Math.max(competitors.length, 1)
    // Gap score: high urgency + low coverage = big opportunity
    const gap_score = Math.round(scores.urgency * (1 - Math.min(coverageRatio, 1)))

    let gap_type: GapEntry['gap_type'] = 'uncovered'
    if (coverageRatio >= 0.6)      gap_type = 'saturated'
    else if (coverageRatio >= 0.2) gap_type = 'underserved'

    return {
      cluster_id:       cluster.id,
      cluster_title:    cluster.title,
      cluster_category: cluster.category ?? 'other',
      urgency_score:    scores.urgency,
      priority_score:   scores.priority,
      coverage_count:   coveredByIds.length,
      gap_score,
      gap_type,
      covered_by,
      missing_from,
      sample_posts,
    }
  })

  // Sort: biggest gaps first
  gaps.sort((a, b) => b.gap_score - a.gap_score)

  return NextResponse.json({ gaps, days, competitors_tracked: competitors.length })
}
