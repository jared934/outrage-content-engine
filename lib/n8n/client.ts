// ─── n8n REST API Client ──────────────────────────────────────────────────────
// Low-level HTTP client for communicating with the n8n instance.
//
// Two communication patterns:
//
//  1. TRIGGER (App → n8n)
//     POST {N8N_BASE_URL}/webhook/{path}
//     Header: Authorization: Bearer {N8N_WEBHOOK_SECRET}
//     Body: { org_id, callback_url, ...payload }
//
//  2. STATUS CHECK (App → n8n API)
//     GET {N8N_BASE_URL}/api/v1/executions/{id}
//     Header: X-N8N-API-KEY: {N8N_API_KEY}
//
// Environment variables:
//   N8N_BASE_URL       — e.g. https://n8n.yourdomain.com
//   N8N_WEBHOOK_SECRET — shared secret for webhook auth (both directions)
//   N8N_API_KEY        — n8n API key for execution status queries

import type { N8NExecutionStatus } from './types'

const DEFAULT_TIMEOUT = 15_000   // 15 seconds — n8n should accept trigger quickly

// ─── Trigger a webhook ────────────────────────────────────────────────────────

export interface TriggerOptions {
  webhookPath: string
  payload:     Record<string, unknown>
  /** Use test webhooks (/webhook-test/) instead of production (/webhook/) */
  test?:       boolean
  timeout?:    number
}

export interface TriggerResult {
  ok:          boolean
  status:      number
  executionId: string | null
  data:        unknown
  error?:      string
}

export async function triggerN8NWebhook(opts: TriggerOptions): Promise<TriggerResult> {
  const baseUrl = process.env.N8N_BASE_URL
  const secret  = process.env.N8N_WEBHOOK_SECRET

  if (!baseUrl) {
    return { ok: false, status: 0, executionId: null, data: null,
      error: 'N8N_BASE_URL is not configured' }
  }

  const prefix = opts.test ? 'webhook-test' : 'webhook'
  const url    = `${baseUrl.replace(/\/$/, '')}/${prefix}/${opts.webhookPath}`
  const timeout = opts.timeout ?? DEFAULT_TIMEOUT

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(secret ? { Authorization: `Bearer ${secret}` } : {}),
      },
      body: JSON.stringify(opts.payload),
      signal: AbortSignal.timeout(timeout),
    })

    let data: unknown = null
    try { data = await res.json() } catch { /* non-JSON response */ }

    // n8n returns { executionId: 'uuid' } on successful webhook trigger
    const executionId =
      (data && typeof data === 'object' && 'executionId' in data)
        ? String((data as Record<string, unknown>).executionId)
        : null

    return {
      ok:          res.ok,
      status:      res.status,
      executionId,
      data,
      error:       res.ok ? undefined : `HTTP ${res.status}`,
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : 'n8n request failed'
    return { ok: false, status: 0, executionId: null, data: null, error: message }
  }
}

// ─── Get execution status ─────────────────────────────────────────────────────

export async function getExecutionStatus(
  executionId: string
): Promise<N8NExecutionStatus | null> {
  const baseUrl = process.env.N8N_BASE_URL
  const apiKey  = process.env.N8N_API_KEY

  if (!baseUrl || !apiKey) return null

  const url = `${baseUrl.replace(/\/$/, '')}/api/v1/executions/${executionId}`

  try {
    const res = await fetch(url, {
      headers: { 'X-N8N-API-KEY': apiKey },
      signal: AbortSignal.timeout(8_000),
    })

    if (!res.ok) return null
    return await res.json() as N8NExecutionStatus
  } catch {
    return null
  }
}

// ─── Health check ─────────────────────────────────────────────────────────────

export interface N8NHealthResult {
  reachable:  boolean
  status?:    string
  version?:   string
  latency_ms: number
}

export async function checkN8NHealth(): Promise<N8NHealthResult> {
  const baseUrl = process.env.N8N_BASE_URL

  if (!baseUrl) {
    return { reachable: false, latency_ms: 0 }
  }

  const start = Date.now()
  const url   = `${baseUrl.replace(/\/$/, '')}/healthz`

  try {
    const res = await fetch(url, {
      signal: AbortSignal.timeout(5_000),
    })

    const latency_ms = Date.now() - start
    let version: string | undefined

    try {
      const data = await res.json()
      version = data?.n8nVersion
    } catch { /* no JSON */ }

    return {
      reachable:  res.ok,
      status:     res.ok ? 'ok' : `HTTP ${res.status}`,
      version,
      latency_ms,
    }
  } catch (err) {
    return {
      reachable:  false,
      status:     err instanceof Error ? err.message : 'unreachable',
      latency_ms: Date.now() - start,
    }
  }
}

// ─── Map n8n execution status to our internal status ─────────────────────────

export function mapN8NStatus(
  n8nStatus: N8NExecutionStatus['status']
): 'pending' | 'running' | 'success' | 'failed' | 'cancelled' {
  switch (n8nStatus) {
    case 'new':      return 'pending'
    case 'waiting':
    case 'running':  return 'running'
    case 'success':  return 'success'
    case 'error':    return 'failed'
    case 'canceled': return 'cancelled'
    default:         return 'pending'
  }
}
