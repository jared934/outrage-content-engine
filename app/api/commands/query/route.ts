// GET /api/commands/query?intent=post_now&keyword=celebrity
// Smart query endpoint used by the command bar to fetch contextual trend results.
// Resolves org from session — no org_id param needed.

import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient, getSessionUser } from '@/lib/supabase/server'
import type { TrendItem, GapItem, CommandResult, QueryIntent } from '@/lib/commands/command.types'

const RESULT_LIMIT = 7

export async function GET(req: NextRequest) {
  const p      = req.nextUrl.searchParams
  const intent  = (p.get('intent') ?? 'hottest') as QueryIntent
  const keyword = p.get('keyword') ?? ''
  const supabase = createServiceClient()

  // Resolve org from session
  const user = await getSessionUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: m } = await supabase
    .from('org_members').select('org_id').eq('user_id', user.id).limit(1).single()
  const orgId = m?.org_id ?? null
  if (!orgId) return NextResponse.json({ error: 'No org found' }, { status: 400 })

  // ── Competitor gaps (special path) ───────────────────────────────────────────
  if (intent === 'competitor_gaps') {
    const gapRes = await fetch(
      `${req.nextUrl.origin}/api/competitors/gaps?org_id=${orgId}&days=7&limit=7`,
      { headers: { cookie: req.headers.get('cookie') ?? '' } }
    )

    if (!gapRes.ok) {
      return NextResponse.json<CommandResult>({
        type: 'text',
        title: 'Competitor gap analysis',
        message: 'No competitor data yet. Add competitors and their RSS feeds first.',
        href: '/competitors',
      })
    }

    const { gaps = [] } = await gapRes.json()
    const uncovered = (gaps as GapItem[]).filter((g) => g.gap_type === 'uncovered').slice(0, RESULT_LIMIT)

    return NextResponse.json<CommandResult>({
      type: 'gaps',
      title: `${uncovered.length} stories competitors haven't touched`,
      message: uncovered.length
        ? 'These are your biggest whitespace opportunities right now.'
        : 'No uncovered gaps found — competitors are covering everything. Check a wider window.',
      gaps: uncovered,
      href: '/competitors',
    })
  }

  // ── Fetch trend clusters + scores ─────────────────────────────────────────────
  let clusterQuery = supabase
    .from('trend_clusters')
    .select('id, title, category, overall_score, status, keywords, summary')
    .in('status', ['active', 'trending'])

  // Apply keyword filter for search intent
  if (intent === 'search' && keyword) {
    clusterQuery = clusterQuery.or(
      `title.ilike.%${keyword}%,category.ilike.%${keyword}%,summary.ilike.%${keyword}%`
    )
  }

  clusterQuery = clusterQuery
    .order('overall_score', { ascending: false })
    .limit(30)

  const { data: clusters, error } = await clusterQuery
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  if (!clusters?.length) {
    return NextResponse.json<CommandResult>({
      type: 'text',
      title: keyword ? `No trends found for "${keyword}"` : 'No active trends',
      message: 'Try a different search term or wait for new trends to be ingested.',
      href: '/trends',
    })
  }

  // Fetch latest scores
  const { data: scores } = await supabase
    .from('trend_scores')
    .select([
      'cluster_id', 'meme_potential_score', 'urgency_score',
      'total_priority_score', 'recommended_action', 'brand_safety_score',
    ].join(', '))
    .in('cluster_id', clusters.map((c) => c.id))
    .order('scored_at', { ascending: false })

  const scoreMap = new Map<string, Record<string, number | string>>()
  for (const s of (scores ?? []) as unknown as Array<Record<string, unknown>>) {
    const cid = s['cluster_id'] as string
    if (cid && !scoreMap.has(cid)) scoreMap.set(cid, s as Record<string, number | string>)
  }

  // Merge
  const merged = clusters.map((c) => {
    const s = scoreMap.get(c.id) ?? {}
    return {
      id:                   c.id,
      title:                c.title,
      category:             c.category ?? 'other',
      overall_score:        Number(c.overall_score ?? 0),
      urgency_score:        Number(s.urgency_score ?? 0),
      meme_potential_score: Number(s.meme_potential_score ?? 0),
      total_priority_score: Number(s.total_priority_score ?? 0),
      recommended_action:   String(s.recommended_action ?? 'monitor'),
      brand_safety_score:   Number(s.brand_safety_score ?? 80),
    }
  })

  // ── Sort + filter by intent ────────────────────────────────────────────────────

  let sorted: typeof merged
  let title: string
  let message: string

  switch (intent) {
    case 'post_now':
      sorted = merged
        .filter((t) => t.recommended_action === 'post_now' || t.urgency_score >= 75)
        .sort((a, b) => b.urgency_score - a.urgency_score)
      title   = `${Math.min(sorted.length, RESULT_LIMIT)} post-now opportunities`
      message = sorted.length
        ? 'These trends have the tightest windows — act before they cool.'
        : 'No urgent post-now opportunities right now. Check back soon.'
      break

    case 'meme_ready':
      sorted = [...merged].sort((a, b) => b.meme_potential_score - a.meme_potential_score)
      title   = 'Best meme-ready trends'
      message = 'Sorted by meme potential score — highest virality upside.'
      break

    case 'urgent':
      sorted = merged
        .filter((t) => t.urgency_score >= 65)
        .sort((a, b) => b.urgency_score - a.urgency_score)
      title   = `${Math.min(sorted.length, RESULT_LIMIT)} urgent opportunities`
      message = sorted.length
        ? 'Time-sensitive trends with closing windows.'
        : 'No high-urgency trends at the moment — all windows are open.'
      break

    case 'risky':
      sorted = [...merged]
        .filter((t) => t.brand_safety_score < 55)
        .sort((a, b) => a.brand_safety_score - b.brand_safety_score)
      title   = 'Risky trends — handle with care'
      message = 'Low brand-safety score. Use sparingly and with strong framing.'
      break

    case 'search':
    case 'hottest':
    default:
      sorted = [...merged].sort((a, b) => b.total_priority_score - a.total_priority_score)
      title   = intent === 'search' && keyword
        ? `Trends matching "${keyword}"`
        : 'Hottest trends right now'
      message = `Sorted by priority score across all active clusters.`
      break
  }

  const items = sorted.slice(0, RESULT_LIMIT) as TrendItem[]

  return NextResponse.json<CommandResult>({
    type:    'trends',
    title,
    message: items.length === 0 ? 'No results found.' : message,
    items,
    href:    '/trends',
  })
}
