// POST /api/competitors/ingest
// n8n webhook endpoint to push posts from social scraping (Twitter, Instagram, etc.)
// Also accepts X-Api-Key for automation.

import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient, getSessionUser } from '@/lib/supabase/server'
import { matchClusterKeywords, extractTopicTagsFromText } from '@/lib/competitors/rss.service'
import type { IngestPostInput } from '@/lib/competitors/competitor.types'

export async function POST(req: NextRequest) {
  const apiKey     = req.headers.get('x-api-key')
  const expectedKey = process.env.ALERT_FIRE_API_KEY  // reuse same key
  const supabase   = createServiceClient()

  let authed = false

  if (apiKey && expectedKey && apiKey === expectedKey) {
    authed = true
  } else {
    const user = await getSessionUser()
    if (user) authed = true
  }

  if (!authed) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const posts: IngestPostInput[] = Array.isArray(body) ? body : [body]

  if (posts.length === 0) return NextResponse.json({ ok: true, inserted: 0 })

  // Resolve source → competitor → org
  const sourceId = posts[0].source_id
  const { data: source } = await supabase
    .from('competitor_sources')
    .select('competitor_id, org_id')
    .eq('id', sourceId)
    .single()

  if (!source) return NextResponse.json({ error: 'source_id not found' }, { status: 404 })

  // Load cluster keywords for topic matching
  const { data: clusters } = await supabase
    .from('trend_clusters')
    .select('id, keywords, category')
    .eq('org_id', source.org_id)
    .in('status', ['active', 'trending'])
    .limit(100)

  const clusterKeywords = Array.from(new Set(
    (clusters ?? []).flatMap((c) => [...((c.keywords as string[] | null) ?? []), c.category ?? ''])
  ))

  const clusterKeywordMap = (clusters ?? []).map((c) => ({
    id:       c.id,
    keywords: [...((c.keywords as string[] | null) ?? []), c.category ?? ''],
  }))

  let inserted = 0

  for (const post of posts) {
    const title   = post.title ?? ''
    const content = post.content ?? ''

    const topicTags = Array.from(new Set([
      ...(post.topic_tags ?? []),
      ...extractTopicTagsFromText(title, content),
      ...matchClusterKeywords(title, content, clusterKeywords),
    ])).slice(0, 20)

    const matchedClusterIds = clusterKeywordMap
      .filter((c) => c.keywords.some((kw) =>
        kw.length > 2 && `${title} ${content}`.toLowerCase().includes(kw.toLowerCase())
      ))
      .map((c) => c.id)

    const { error } = await supabase
      .from('competitor_posts')
      .upsert({
        source_id:           post.source_id,
        competitor_id:       source.competitor_id,
        org_id:              source.org_id,
        external_id:         post.external_id?.slice(0, 255) ?? null,
        title:               title.slice(0, 500) || null,
        content:             content.slice(0, 2000) || null,
        url:                 post.url?.slice(0, 1000) ?? null,
        thumbnail_url:       post.thumbnail_url ?? null,
        published_at:        post.published_at,
        topic_tags:          topicTags,
        matched_cluster_ids: matchedClusterIds,
      }, {
        onConflict:       'source_id,external_id',
        ignoreDuplicates: true,
      })

    if (!error) inserted++
  }

  // Update competitor last_active_at
  await supabase
    .from('competitors')
    .update({ last_active_at: new Date().toISOString() })
    .eq('id', source.competitor_id)

  return NextResponse.json({ ok: true, inserted })
}
