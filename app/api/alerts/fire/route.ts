// POST /api/alerts/fire — evaluate alert rules against current trends, fire notifications
// Called by n8n on a schedule (e.g., every 30 minutes)
// Accepts X-Api-Key header or standard auth

import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient, getSessionUser } from '@/lib/supabase/server'
import { evaluateTrendsAgainstRules } from '@/lib/alerts/alert-engine'
import { buildAlertWebhookPayload, deliverWebhook } from '@/lib/alerts/delivery'
import type { AlertRuleV2 } from '@/lib/alerts/alert.types'
import type { TrendWithScore } from '@/lib/dashboard/dashboard.types'

export async function POST(req: NextRequest) {
  // Accept both bearer auth and an API key header for n8n calls
  const apiKey = req.headers.get('x-api-key')
  const expectedKey = process.env.ALERT_FIRE_API_KEY
  const supabase = createServiceClient()

  let org_id: string | null = null

  if (apiKey && expectedKey && apiKey === expectedKey) {
    // n8n call — org_id must be in body
    const body = await req.json().catch(() => ({}))
    org_id = body.org_id ?? null
  } else {
    // Normal authenticated call
    const user = await getSessionUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const { data: m } = await supabase
      .from('org_members').select('org_id').eq('user_id', user.id).limit(1).single()
    org_id = m?.org_id ?? null
  }

  if (!org_id) return NextResponse.json({ error: 'No org_id' }, { status: 400 })

  try {
    // ── Fetch org members (to create notifications for) ──
    const { data: members } = await supabase
      .from('org_members').select('user_id').eq('org_id', org_id)

    const userIds = (members ?? []).map((m) => m.user_id)
    if (userIds.length === 0) return NextResponse.json({ ok: true, fired: 0 })

    // ── Fetch enabled alert rules ──
    const { data: rulesRaw } = await supabase
      .from('alert_rules')
      .select('*')
      .eq('org_id', org_id)
      .eq('enabled', true)
      .neq('trigger_type', 'digest')

    const rules = (rulesRaw ?? []) as AlertRuleV2[]

    // ── Fetch recent alert cooldowns ──
    const cooldownCutoff = new Date(Date.now() - 3_600_000).toISOString()
    const { data: recentNotifs } = await supabase
      .from('notifications')
      .select('rule_id, cluster_id')
      .eq('org_id', org_id)
      .gte('created_at', cooldownCutoff)
      .not('rule_id', 'is', null)
      .not('cluster_id', 'is', null)

    const recentKeys = new Set<string>(
      (recentNotifs ?? []).map((n) => `${n.rule_id}:${n.cluster_id}`)
    )

    // ── Fetch active trend clusters + scores ──
    const { data: clusters } = await supabase
      .from('trend_clusters')
      .select('id, title, summary, category, status, keywords, source_count, overall_score, created_at, updated_at, first_seen_at')
      .in('status', ['active', 'trending'])
      .order('overall_score', { ascending: false })
      .limit(50)

    let scoreMap: Record<string, Record<string, unknown>> = {}
    if ((clusters ?? []).length > 0) {
      const { data: scores } = await supabase
        .from('trend_scores')
        .select([
          'cluster_id', 'virality_score', 'outrage_fit_score', 'meme_potential_score',
          'urgency_score', 'shelf_life_score', 'brand_safety_score',
          'total_priority_score', 'recommended_action', 'scored_at',
        ].join(', '))
        .in('cluster_id', (clusters ?? []).map((c) => c.id))
        .order('scored_at', { ascending: false })

      for (const s of (scores ?? []) as unknown as Array<Record<string, unknown>>) {
        const cid = s['cluster_id'] as string
        if (cid && !scoreMap[cid]) scoreMap[cid] = s
      }
    }

    const trends: TrendWithScore[] = (clusters ?? []).map((c) => ({
      ...c,
      keywords: (c.keywords as string[] | null) ?? [],
      ...(scoreMap[c.id] ?? {}),
    })) as TrendWithScore[]

    // ── Evaluate rules ──
    const firedAlerts = evaluateTrendsAgainstRules(trends, rules, recentKeys)

    if (firedAlerts.length === 0) {
      return NextResponse.json({ ok: true, fired: 0, evaluated: trends.length })
    }

    // ── Persist notifications for all org members ──
    const rows = firedAlerts.flatMap((alert) =>
      userIds.map((uid) => ({
        org_id,
        user_id:    uid,
        type:       alert.type,
        severity:   alert.severity,
        title:      alert.title,
        message:    alert.message,
        cluster_id: alert.cluster_id,
        rule_id:    alert.rule_id,
        metadata:   alert.metadata,
      }))
    )

    await supabase.from('notifications').insert(rows)

    // ── Webhook delivery per rule ──
    const ruleMap = Object.fromEntries(rules.map((r) => [r.id, r]))
    const deliveries: Array<{ rule_id: string; result: unknown }> = []

    for (const alert of firedAlerts) {
      const rule = ruleMap[alert.rule_id]
      if (!rule?.webhook_url) continue

      const payload = buildAlertWebhookPayload({
        type:       alert.type,
        severity:   alert.severity,
        title:      alert.title,
        message:    alert.message,
        cluster_id: alert.cluster_id,
        org_id,
        data:       alert.metadata,
      })

      const result = await deliverWebhook(rule.webhook_url, payload)
      deliveries.push({ rule_id: rule.id, result })
    }

    return NextResponse.json({
      ok:         true,
      fired:      firedAlerts.length,
      evaluated:  trends.length,
      deliveries,
    })
  } catch (err) {
    console.error('[alerts/fire POST]', err)
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
