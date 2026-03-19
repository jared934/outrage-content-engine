// POST /api/competitors/[id]/refresh
// Fetches all RSS/Atom sources for a competitor, ingests new posts,
// matches them against active trend clusters, updates source stats.

import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient, getSessionUser } from '@/lib/supabase/server'
import { fetchFeed, matchClusterKeywords, extractTopicTagsFromText } from '@/lib/competitors/rss.service'
import type { CompetitorSource } from '@/lib/competitors/competitor.types'

type Ctx = { params: { id: string } }

export async function POST(_req: NextRequest, { params }: Ctx) {
  const supabase = createServiceClient()

  // Accept both user auth and API key for n8n scheduled calls
  const user = await getSessionUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // Load competitor + active sources
  const { data: comp } = await supabase
    .from('competitors')
    .select('id, org_id, name')
    .eq('id', params.id)
    .single()

  if (!comp) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const { data: sources } = await supabase
    .from('competitor_sources')
    .select('*')
    .eq('competitor_id', params.id)
    .eq('is_active', true)

  const feedSources = ((sources ?? []) as CompetitorSource[]).filter(
    (s) => s.source_type === 'rss' || s.source_type === 'atom' || s.source_type === 'reddit'
  )

  // Load org's active cluster keywords for topic matching
  const { data: clusters } = await supabase
    .from('trend_clusters')
    .select('id, keywords, category')
    .eq('org_id', comp.org_id)
    .in('status', ['active', 'trending'])
    .limit(100)

  const clusterKeywords: string[] = []
  const clusterKeywordMap: Array<{ id: string; keywords: string[] }> = []

  for (const c of clusters ?? []) {
    const kws = (c.keywords as string[] | null) ?? []
    if (c.category) kws.push(c.category)
    clusterKeywords.push(...kws)
    clusterKeywordMap.push({ id: c.id, keywords: kws })
  }

  const uniqueKeywords = Array.from(new Set(clusterKeywords))

  // Fetch each feed
  const results: Array<{ source_id: string; fetched: number; inserted: number; error?: string }> = []

  for (const source of feedSources) {
    const { items, error: fetchErr } = await fetchFeed(source.url)

    if (fetchErr) {
      await supabase
        .from('competitor_sources')
        .update({ fetch_error: fetchErr, last_fetched_at: new Date().toISOString() })
        .eq('id', source.id)

      results.push({ source_id: source.id, fetched: 0, inserted: 0, error: fetchErr })
      continue
    }

    let inserted = 0

    for (const item of items) {
      const topicTagsFromFeed = item.tags
      const topicTagsFromText = extractTopicTagsFromText(item.title, item.description)
      const matchedKeywords   = matchClusterKeywords(item.title, item.description, uniqueKeywords)

      const topicTags = Array.from(new Set([
        ...topicTagsFromFeed,
        ...topicTagsFromText,
        ...matchedKeywords,
      ])).slice(0, 20)

      // Match cluster IDs
      const matchedClusterIds = clusterKeywordMap
        .filter((c) => c.keywords.some((kw) =>
          kw.length > 2 &&
          `${item.title} ${item.description}`.toLowerCase().includes(kw.toLowerCase())
        ))
        .map((c) => c.id)

      const pubDate = item.pubDate ? new Date(item.pubDate) : new Date()
      const publishedAt = isNaN(pubDate.getTime()) ? new Date().toISOString() : pubDate.toISOString()

      const { error: insertErr } = await supabase
        .from('competitor_posts')
        .upsert({
          source_id:           source.id,
          competitor_id:       params.id,
          org_id:              comp.org_id,
          external_id:         item.guid.slice(0, 255),
          title:               item.title.slice(0, 500) || null,
          content:             item.description.slice(0, 2000) || null,
          url:                 item.link.slice(0, 1000) || null,
          thumbnail_url:       item.thumbnail ?? null,
          published_at:        publishedAt,
          topic_tags:          topicTags,
          matched_cluster_ids: matchedClusterIds,
        }, {
          onConflict:        'source_id,external_id',
          ignoreDuplicates:  true,
        })

      if (!insertErr) inserted++
    }

    // Update source stats
    const lastPost = items[0]?.pubDate ? new Date(items[0].pubDate).toISOString() : null
    await supabase
      .from('competitor_sources')
      .update({
        last_fetched_at: new Date().toISOString(),
        last_post_at:    lastPost,
        fetch_error:     null,
        post_count:      source.post_count + inserted,
      })
      .eq('id', source.id)

    results.push({ source_id: source.id, fetched: items.length, inserted })
  }

  // Update competitor aggregate stats
  const totalInserted = results.reduce((s, r) => s + r.inserted, 0)
  if (totalInserted > 0) {
    const { count } = await supabase
      .from('competitor_posts')
      .select('id', { count: 'exact', head: true })
      .eq('competitor_id', params.id)

    await supabase
      .from('competitors')
      .update({
        post_count:     count ?? 0,
        last_active_at: new Date().toISOString(),
      })
      .eq('id', params.id)
  }

  return NextResponse.json({
    ok:           true,
    sources_fetched: feedSources.length,
    total_inserted:  totalInserted,
    results,
  })
}
