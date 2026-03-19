// POST /api/alerts/digest — generate a morning or evening digest, persist, optionally deliver

import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient, getSessionUser } from '@/lib/supabase/server'
import { buildMorningDigest, buildEveningDigest, digestToPlainText } from '@/lib/alerts/digest.service'
import { buildDigestWebhookPayload, deliverWebhook } from '@/lib/alerts/delivery'
import type { DigestType } from '@/lib/alerts/alert.types'
import type { TrendWithScore } from '@/lib/dashboard/dashboard.types'

export async function POST(req: NextRequest) {
  const supabase = createServiceClient()
  const user = await getSessionUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  let org_id = searchParams.get('org_id')
  if (!org_id) {
    const { data: m } = await supabase
      .from('org_members').select('org_id').eq('user_id', user.id).limit(1).single()
    org_id = m?.org_id ?? null
  }
  if (!org_id) return NextResponse.json({ error: 'No org found' }, { status: 400 })

  try {
    const body: { type: DigestType; deliver?: boolean } = await req.json()
    const digestType = body.type ?? 'morning'

    // ── Fetch active trends ──
    const { data: clusters } = await supabase
      .from('trend_clusters')
      .select('id, title, summary, category, status, keywords, source_count, overall_score, created_at')
      .in('status', ['active', 'trending'])
      .order('overall_score', { ascending: false })
      .limit(40)

    const clusterList = clusters ?? []
    let scoreMap: Record<string, Record<string, unknown>> = {}

    if (clusterList.length > 0) {
      const { data: scores } = await supabase
        .from('trend_scores')
        .select([
          'cluster_id', 'virality_score', 'outrage_fit_score', 'meme_potential_score',
          'urgency_score', 'shelf_life_score', 'brand_safety_score',
          'total_priority_score', 'recommended_action', 'scored_at',
        ].join(', '))
        .in('cluster_id', clusterList.map((c) => c.id))
        .order('scored_at', { ascending: false })

      for (const s of (scores ?? []) as unknown as Array<Record<string, unknown>>) {
        const cid = s['cluster_id'] as string
        if (cid && !scoreMap[cid]) scoreMap[cid] = s
      }
    }

    const trends: TrendWithScore[] = clusterList.map((c) => ({
      ...c,
      keywords: (c.keywords as string[] | null) ?? [],
      ...(scoreMap[c.id] ?? {}),
    })) as TrendWithScore[]

    // ── New trends last 24h ──
    const cutoff24h = new Date(Date.now() - 86_400_000).toISOString()
    const { count: newLast24h } = await supabase
      .from('trend_clusters')
      .select('id', { count: 'exact', head: true })
      .gte('created_at', cutoff24h)

    // ── Build payload ──
    const payload = digestType === 'morning'
      ? buildMorningDigest({ orgId: org_id, trends, newLast24h: newLast24h ?? 0, ideasToday: 0 })
      : buildEveningDigest({ orgId: org_id, trends, postedToday: 0, ideasGenerated: 0, trendsReviewed: trends.length, topAlertCount: 0 })

    // ── Persist digest ──
    const { data: digest } = await supabase
      .from('digests')
      .insert({ org_id, type: digestType, payload })
      .select()
      .single()

    // ── Create in-app notification ──
    await supabase.from('notifications').insert({
      org_id,
      user_id:  user.id,
      type:     digestType === 'morning' ? 'morning_digest' : 'evening_digest',
      severity: 'info',
      title:    digestType === 'morning' ? '🌅 Morning Digest Ready' : '🌆 Evening Digest Ready',
      message:  payload.summary ?? '',
      metadata: { digest_id: digest?.id },
    })

    // ── Webhook delivery (if rule configured + deliver=true) ──
    let deliveryResult = null
    if (body.deliver) {
      const { data: rules } = await supabase
        .from('alert_rules')
        .select('webhook_url')
        .eq('org_id', org_id)
        .eq('trigger_type', 'digest')
        .eq('enabled', true)
        .not('webhook_url', 'is', null)

      for (const rule of rules ?? []) {
        if (rule.webhook_url) {
          const webhookPayload = buildDigestWebhookPayload({
            type:    digestType,
            summary: payload.summary ?? '',
            org_id,
            data:    payload as unknown as Record<string, unknown>,
          })
          deliveryResult = await deliverWebhook(rule.webhook_url, webhookPayload)
        }
      }

      if (digest) {
        await supabase.from('digests').update({ delivered_at: new Date().toISOString() }).eq('id', digest.id)
      }
    }

    return NextResponse.json({
      ok: true,
      digest,
      payload,
      plainText:      digestToPlainText(payload),
      deliveryResult,
    })
  } catch (err) {
    console.error('[digest POST]', err)
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}

export async function GET(req: NextRequest) {
  const supabase = createServiceClient()
  const user = await getSessionUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  let org_id = searchParams.get('org_id')
  if (!org_id) {
    const { data: m } = await supabase
      .from('org_members').select('org_id').eq('user_id', user.id).limit(1).single()
    org_id = m?.org_id ?? null
  }
  if (!org_id) return NextResponse.json({ error: 'No org' }, { status: 400 })

  const { data: digests } = await supabase
    .from('digests')
    .select('*')
    .eq('org_id', org_id)
    .order('created_at', { ascending: false })
    .limit(14)

  return NextResponse.json({ ok: true, digests: digests ?? [] })
}
