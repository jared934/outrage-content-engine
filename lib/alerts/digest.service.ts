// Generates morning and evening digest payloads from live data.
// Pure data transform — caller handles DB persistence.

import type { TrendWithScore } from '@/lib/dashboard/dashboard.types'
import type { DigestPayload, DigestTrendItem } from './alert.types'

function toDigestItem(t: TrendWithScore): DigestTrendItem {
  return {
    id:                   t.id,
    title:                t.title,
    overall_score:        t.overall_score ?? 0,
    total_priority_score: t.total_priority_score ?? null,
    recommended_action:   t.recommended_action ?? null,
    urgency_score:        t.urgency_score ?? null,
    meme_potential_score: t.meme_potential_score ?? null,
    category:             t.category ?? null,
    source_count:         t.source_count ?? 0,
  }
}

export interface MorningDigestInput {
  orgId:       string
  trends:      TrendWithScore[]
  newLast24h:  number
  ideasToday:  number
}

export function buildMorningDigest(input: MorningDigestInput): DigestPayload {
  const { orgId, trends, newLast24h, ideasToday } = input

  const postNow   = trends.filter((t) => t.recommended_action === 'post_now')
  const memeReady = trends.filter((t) => (t.meme_potential_score ?? 0) >= 68)

  const top5 = [...trends]
    .sort((a, b) =>
      ((b.total_priority_score ?? b.overall_score ?? 0)) -
      ((a.total_priority_score ?? a.overall_score ?? 0))
    )
    .slice(0, 5)

  const avgScore = trends.length
    ? Math.round(trends.reduce((s, t) => s + (t.total_priority_score ?? t.overall_score ?? 0), 0) / trends.length)
    : 0

  const urgentTitles = postNow.slice(0, 2).map((t) => t.title).join(', ')
  const summary = postNow.length > 0
    ? `${postNow.length} trend${postNow.length > 1 ? 's' : ''} ready to post today. Start with: ${urgentTitles}.`
    : `${trends.length} active trends, average priority ${avgScore}. ${memeReady.length} meme-ready opportunities.`

  return {
    type:              'morning',
    generated_at:      new Date().toISOString(),
    org_id:            orgId,
    top_trends:        top5.map(toDigestItem),
    post_now_count:    postNow.length,
    meme_ready_count:  memeReady.length,
    new_trends_24h:    newLast24h,
    summary,
  }
}

export interface EveningDigestInput {
  orgId:         string
  trends:        TrendWithScore[]
  postedToday:   number
  ideasGenerated: number
  trendsReviewed: number
  topAlertCount:  number
}

export function buildEveningDigest(input: EveningDigestInput): DigestPayload {
  const { orgId, trends, postedToday, ideasGenerated, trendsReviewed, topAlertCount } = input

  // Highlights: high-urgency trends with shelf_life < 50 — act tomorrow
  const highlights = [...trends]
    .filter((t) => (t.urgency_score ?? 0) >= 60 || (t.shelf_life_score ?? 100) < 50)
    .sort((a, b) => (b.urgency_score ?? 0) - (a.urgency_score ?? 0))
    .slice(0, 4)
    .map(toDigestItem)

  return {
    type:            'evening',
    generated_at:    new Date().toISOString(),
    org_id:          orgId,
    posted_today:    postedToday,
    ideas_generated: ideasGenerated,
    trends_reviewed: trendsReviewed,
    top_alert_count: topAlertCount,
    highlights,
    summary:         postedToday > 0
      ? `Good work — ${postedToday} piece${postedToday > 1 ? 's' : ''} posted today. ${highlights.length} trends need attention tomorrow.`
      : `${trendsReviewed} trends reviewed today. ${highlights.length} trends worth acting on tomorrow.`,
  }
}

// ─── Plain-text versions for email/webhook ─────────────────────────────────

export function digestToPlainText(payload: DigestPayload): string {
  const lines: string[] = []
  const emoji = payload.type === 'morning' ? '🌅' : '🌆'
  const label = payload.type === 'morning' ? 'Morning Digest' : 'Evening Digest'

  lines.push(`${emoji} OUTRAGE ${label}`)
  lines.push(`${new Date(payload.generated_at).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}`)
  lines.push('')
  lines.push(payload.summary ?? '')
  lines.push('')

  if (payload.type === 'morning' && payload.top_trends) {
    lines.push(`📊 Top ${payload.top_trends.length} Trends`)
    for (const t of payload.top_trends) {
      const score = Math.round(t.total_priority_score ?? t.overall_score)
      const action = t.recommended_action === 'post_now' ? ' ⚡' : ''
      lines.push(`  • ${t.title} (${score})${action}`)
    }
    lines.push('')
    lines.push(`⚡ Post Now: ${payload.post_now_count ?? 0}   😂 Meme Ready: ${payload.meme_ready_count ?? 0}   🆕 New: ${payload.new_trends_24h ?? 0}`)
  }

  if (payload.type === 'evening' && payload.highlights) {
    lines.push(`📋 Stats`)
    lines.push(`  • Posted: ${payload.posted_today ?? 0}`)
    lines.push(`  • Ideas generated: ${payload.ideas_generated ?? 0}`)
    lines.push(`  • Trends reviewed: ${payload.trends_reviewed ?? 0}`)
    if ((payload.highlights ?? []).length > 0) {
      lines.push('')
      lines.push('🔮 Watch Tomorrow')
      for (const t of payload.highlights!) {
        lines.push(`  • ${t.title}`)
      }
    }
  }

  return lines.join('\n')
}
