// Webhook delivery — sends alert/digest payloads to n8n or direct webhooks.
// n8n handles routing to Telegram / Slack / Discord based on workflow config.

import type { WebhookAlertPayload } from './alert.types'
import type { NotificationSeverity } from '@/types'

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'https://app.outrage.co'

// ─── Build payload ───────────────────────────────────────────────────────────

export function buildAlertWebhookPayload(params: {
  type:       string
  severity:   NotificationSeverity
  title:      string
  message:    string
  cluster_id: string | null
  org_id:     string
  data?:      Record<string, unknown>
}): WebhookAlertPayload {
  return {
    event:       'alert',
    type:        params.type,
    severity:    params.severity,
    title:       params.title,
    message:     params.message,
    cluster_id:  params.cluster_id,
    cluster_url: params.cluster_id
      ? `${APP_URL}/trends/${params.cluster_id}`
      : null,
    timestamp:   new Date().toISOString(),
    org_id:      params.org_id,
    data:        params.data ?? {},
  }
}

export function buildDigestWebhookPayload(params: {
  type:    'morning' | 'evening'
  summary: string
  org_id:  string
  data:    Record<string, unknown>
}): WebhookAlertPayload {
  return {
    event:       'digest',
    type:        `${params.type}_digest`,
    severity:    'info',
    title:       `${params.type === 'morning' ? '🌅 Morning' : '🌆 Evening'} Digest`,
    message:     params.summary,
    cluster_id:  null,
    cluster_url: null,
    timestamp:   new Date().toISOString(),
    org_id:      params.org_id,
    data:        params.data,
  }
}

// ─── Delivery ────────────────────────────────────────────────────────────────

export interface DeliveryResult {
  ok:      boolean
  status?: number
  error?:  string
}

export async function deliverWebhook(
  webhookUrl: string,
  payload:    WebhookAlertPayload,
): Promise<DeliveryResult> {
  try {
    const res = await fetch(webhookUrl, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify(payload),
      signal:  AbortSignal.timeout(10_000),
    })
    return { ok: res.ok, status: res.status }
  } catch (err) {
    return { ok: false, error: String(err) }
  }
}

// ─── Slack-shaped block kit (for direct Slack webhooks, bypassing n8n) ────────

export function toSlackBlocks(payload: WebhookAlertPayload): Record<string, unknown> {
  const emoji: Record<string, string> = {
    critical: '🔴', high: '🟠', medium: '🟡', info: '🔵',
  }
  const header = `${emoji[payload.severity] ?? '⚪'} *${payload.title}*`
  const blocks: unknown[] = [
    { type: 'section', text: { type: 'mrkdwn', text: header } },
    { type: 'section', text: { type: 'mrkdwn', text: payload.message } },
  ]
  if (payload.cluster_url) {
    blocks.push({
      type: 'actions',
      elements: [{
        type: 'button',
        text: { type: 'plain_text', text: 'View Trend' },
        url:  payload.cluster_url,
      }],
    })
  }
  return { blocks }
}

// ─── Telegram message (for direct Telegram bot webhook) ───────────────────────

export function toTelegramMessage(payload: WebhookAlertPayload, chatId: string): Record<string, unknown> {
  const emoji: Record<string, string> = {
    critical: '🔴', high: '🟠', medium: '🟡', info: '🔵',
  }
  let text = `${emoji[payload.severity] ?? '⚪'} *${escapeMarkdown(payload.title)}*\n\n${escapeMarkdown(payload.message)}`
  if (payload.cluster_url) {
    text += `\n\n[View Trend](${payload.cluster_url})`
  }
  return { chat_id: chatId, text, parse_mode: 'MarkdownV2' }
}

function escapeMarkdown(text: string): string {
  return text.replace(/[_*[\]()~`>#+\-=|{}.!]/g, '\\$&')
}
