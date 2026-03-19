// GET /api/dashboard — aggregated dashboard data for the main content manager view

import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient, getSessionUser } from '@/lib/supabase/server'
import type {
  DashboardPayload, DashboardStats, TrendWithScore,
  RecentIdea, SourceHealth,
} from '@/lib/dashboard/dashboard.types'

export async function GET(req: NextRequest) {
  const supabase = createServiceClient()
  const user = await getSessionUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // Resolve org_id
  const { searchParams } = new URL(req.url)
  let org_id = searchParams.get('org_id')
  if (!org_id) {
    const { data: m } = await supabase
      .from('org_members').select('org_id').eq('user_id', user.id).limit(1).single()
    org_id = m?.org_id ?? null
  }
  if (!org_id) return NextResponse.json({ error: 'No org found' }, { status: 400 })

  try {
    // -------------------------------------------------------------------------
    // Group 1: Fully parallel — no cross-dependencies
    // -------------------------------------------------------------------------
    const [
      { data: clusters },
      { data: recentIdeasRaw },
      { data: savedIdeasRaw },
      { data: sources },
    ] = await Promise.all([
      supabase
        .from('trend_clusters')
        .select('id, title, summary, category, status, keywords, source_count, overall_score, created_at, updated_at, first_seen_at')
        .in('status', ['active', 'trending'])
        .order('overall_score', { ascending: false })
        .limit(40),

      supabase
        .from('content_ideas')
        .select('id, content, hook, type, platform, format_slug, is_saved, is_used, cluster_id, created_at')
        .eq('org_id', org_id)
        .order('created_at', { ascending: false })
        .limit(10),

      supabase
        .from('content_ideas')
        .select('id, content, hook, type, platform, format_slug, is_saved, is_used, cluster_id, created_at')
        .eq('org_id', org_id)
        .eq('is_saved', true)
        .eq('is_used', false)
        .order('created_at', { ascending: false })
        .limit(6),

      supabase
        .from('sources')
        .select('id, name, type, is_active, last_sync_at')
        .eq('org_id', org_id)
        .eq('is_active', true)
        .limit(10),
    ])

    const clusterList = clusters ?? []
    const sourceList  = sources  ?? []

    // Collect IDs needed for Group 2
    const clusterIds = clusterList.map((c) => c.id)

    const allIdeaClusterIds = [
      ...(recentIdeasRaw ?? []),
      ...(savedIdeasRaw  ?? []),
    ]
      .map((i) => i.cluster_id)
      .filter(Boolean) as string[]
    const uniqueIdeaClusterIds = Array.from(new Set(allIdeaClusterIds)).slice(0, 20)

    // -------------------------------------------------------------------------
    // Group 2: Parallel — depends on Group 1 results
    // -------------------------------------------------------------------------
    const [
      { data: scores },
      { data: titles },
      { data: syncLogs },
    ] = await Promise.all([
      clusterIds.length > 0
        ? supabase
            .from('trend_scores')
            .select([
              'cluster_id', 'virality_score', 'outrage_fit_score', 'meme_potential_score',
              'debate_potential_score', 'urgency_score', 'shelf_life_score',
              'visual_potential_score', 'reel_potential_score', 'instagram_shareability_score',
              'brand_safety_score', 'total_priority_score', 'recommended_action',
              'recommended_formats', 'score_explanations', 'scored_at',
            ].join(', '))
            .in('cluster_id', clusterIds)
            .order('scored_at', { ascending: false })
        : Promise.resolve({ data: [] as unknown[] }),

      uniqueIdeaClusterIds.length > 0
        ? supabase
            .from('trend_clusters')
            .select('id, title')
            .in('id', uniqueIdeaClusterIds)
        : Promise.resolve({ data: [] as unknown[] }),

      sourceList.length > 0
        ? supabase
            .from('source_sync_logs')
            .select('source_id, items_fetched, status, created_at')
            .in('source_id', sourceList.map((s) => s.id))
            .order('created_at', { ascending: false })
            .limit(50)
        : Promise.resolve({ data: [] as unknown[] }),
    ])

    // -------------------------------------------------------------------------
    // Build score map (latest per cluster)
    // -------------------------------------------------------------------------
    const scoreMap: Record<string, Record<string, unknown>> = {}
    for (const s of (scores ?? []) as unknown as Array<Record<string, unknown>>) {
      const cid = s['cluster_id'] as string
      if (cid && !scoreMap[cid]) scoreMap[cid] = s
    }

    // -------------------------------------------------------------------------
    // Build TrendWithScore array
    // -------------------------------------------------------------------------
    const trendsWithScores: TrendWithScore[] = clusterList.map((c) => ({
      ...c,
      keywords: (c.keywords as string[] | null) ?? [],
      ...(scoreMap[c.id] ?? {}),
    })) as TrendWithScore[]

    trendsWithScores.sort((a, b) => {
      const scoreA = a.total_priority_score ?? a.overall_score ?? 0
      const scoreB = b.total_priority_score ?? b.overall_score ?? 0
      return scoreB - scoreA
    })

    // -------------------------------------------------------------------------
    // Segment trends into views
    // -------------------------------------------------------------------------
    const post_now = trendsWithScores
      .filter((t) => t.recommended_action === 'post_now')
      .slice(0, 4)

    const top_opportunities = trendsWithScores.slice(0, 8)

    const meme_ready = trendsWithScores
      .filter((t) => (t.meme_potential_score ?? 0) >= 68)
      .sort((a, b) => (b.meme_potential_score ?? 0) - (a.meme_potential_score ?? 0))
      .slice(0, 5)

    // -------------------------------------------------------------------------
    // Enrich ideas with cluster titles
    // -------------------------------------------------------------------------
    const clusterTitleMap: Record<string, string> = {}
    for (const t of (titles ?? []) as unknown as Array<{ id: string; title: string }>) {
      clusterTitleMap[t.id] = t.title
    }

    const enrichIdea = (idea: Record<string, unknown>): RecentIdea => ({
      id:          idea.id as string,
      content:     idea.content as string,
      hook:        idea.hook as string | null,
      type:        idea.type as string,
      platform:    idea.platform as string,
      format_slug: idea.format_slug as string | null,
      is_saved:    idea.is_saved as boolean,
      is_used:     idea.is_used as boolean,
      cluster_id:  idea.cluster_id as string | null,
      created_at:  idea.created_at as string,
      cluster_title: idea.cluster_id ? (clusterTitleMap[idea.cluster_id as string] ?? null) : null,
    })

    const recent_ideas = (recentIdeasRaw ?? []).map(enrichIdea)
    const saved_ideas  = (savedIdeasRaw  ?? []).map(enrichIdea)

    // -------------------------------------------------------------------------
    // Source health
    // -------------------------------------------------------------------------
    const sourceSyncMap: Record<string, { items_fetched: number; status: string; synced_at: string }> = {}
    for (const log of (syncLogs ?? []) as unknown as Array<{ source_id: string; items_fetched: number; status: string; created_at: string }>) {
      if (!sourceSyncMap[log.source_id]) {
        sourceSyncMap[log.source_id] = {
          items_fetched: log.items_fetched ?? 0,
          status:        log.status ?? 'unknown',
          synced_at:     log.created_at,
        }
      }
    }

    const now = Date.now()
    const source_health: SourceHealth[] = sourceList.map((src) => {
      const log      = sourceSyncMap[src.id]
      const lastSync = log?.synced_at ?? src.last_sync_at ?? null
      const ageMs    = lastSync ? now - new Date(lastSync).getTime() : Infinity
      let status: SourceHealth['status'] = 'never'
      if (log?.status === 'error') status = 'error'
      else if (!lastSync) status = 'never'
      else if (ageMs < 3_600_000)  status = 'healthy' // < 1h
      else if (ageMs < 86_400_000) status = 'stale'   // < 24h
      else status = 'error'

      return {
        source_id:     src.id,
        source_name:   src.name,
        source_type:   src.type,
        last_synced:   lastSync,
        items_fetched: log?.items_fetched ?? 0,
        status,
      }
    })

    // -------------------------------------------------------------------------
    // Stats
    // -------------------------------------------------------------------------
    const scoredTrends = trendsWithScores.filter((t) => t.total_priority_score != null)
    const avgPriority  = scoredTrends.length
      ? Math.round(scoredTrends.reduce((s, t) => s + (t.total_priority_score ?? 0), 0) / scoredTrends.length)
      : Math.round(trendsWithScores.reduce((s, t) => s + (t.overall_score ?? 0), 0) / Math.max(trendsWithScores.length, 1))

    const stats: DashboardStats = {
      active_count:       trendsWithScores.length,
      post_now_count:     post_now.length,
      meme_ready_count:   meme_ready.length,
      saved_ideas_count:  saved_ideas.length,
      avg_priority_score: avgPriority,
      sources_healthy:    source_health.filter((s) => s.status === 'healthy').length,
      sources_total:      source_health.length,
    }

    const payload: DashboardPayload = {
      stats,
      post_now,
      top_opportunities,
      meme_ready,
      recent_ideas,
      saved_ideas,
      source_health,
    }

    return NextResponse.json({ ok: true, ...payload })
  } catch (err) {
    console.error('[dashboard GET]', err)
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
