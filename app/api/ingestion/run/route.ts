// ─── Direct Ingestion Trigger ──────────────────────────────────────────────────
// Dev/testing endpoint to trigger source ingestion without n8n.
// Also useful for one-off manual ingestion from the UI.
//
// POST /api/ingestion/run
//
// Body (one of):
//   { source_id: string }                       — run specific source from DB
//   { source_type, config, name? }              — run inline (no DB record needed)
//   { run_all: true }                            — run all active sources
//
// Optional: { limit: number }  — override max items
//
// Auth: Bearer token (CRON_SECRET) or n8n webhook secret
//
// Examples:
//   Run a specific source:
//     POST /api/ingestion/run
//     { "source_id": "uuid-here" }
//
//   Run inline (dev testing):
//     POST /api/ingestion/run
//     { "source_type": "reddit", "config": { "subreddit": "PublicFreakout", "limit": 10 } }
//
//   Run all active sources:
//     POST /api/ingestion/run
//     { "run_all": true }

import { NextRequest, NextResponse } from 'next/server'
import { ingestSource, ingestAllActiveSources } from '@/lib/ingestion/ingest.service'

function isAuthorized(req: NextRequest): boolean {
  const auth   = req.headers.get('authorization')
  const secret = req.headers.get('x-webhook-secret')

  const cronSecret    = process.env.CRON_SECRET
  const webhookSecret = process.env.N8N_WEBHOOK_SECRET

  if (cronSecret    && auth   === `Bearer ${cronSecret}`) return true
  if (webhookSecret && secret === webhookSecret)          return true

  // Explicit dev bypass — must set ALLOW_UNAUTHENTICATED_INGESTION=true in .env.local
  // Never set this in production. NODE_ENV alone is not a safe gate (Vercel preview envs).
  if (process.env.ALLOW_UNAUTHENTICATED_INGESTION === 'true') return true

  return false
}

export async function POST(req: NextRequest) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let body: Record<string, unknown>
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const limit = body.limit as number | undefined

  // ── Run all active sources ─────────────────────────────────────────────────
  if (body.run_all) {
    const results = await ingestAllActiveSources()
    const summary = {
      sources_run:  results.length,
      total_fetched: results.reduce((n, r) => n + r.itemsFetched,  0),
      total_upserted: results.reduce((n, r) => n + r.itemsUpserted, 0),
      errors:        results.filter(r => r.errors.length > 0).map(r => ({
        source: r.sourceName,
        errors: r.errors,
      })),
      results,
    }
    return NextResponse.json({ ok: true, ...summary })
  }

  // ── Run specific source by ID ─────────────────────────────────────────────
  if (body.source_id) {
    const result = await ingestSource({
      sourceId: body.source_id as string,
      limit,
    })
    return NextResponse.json({ ok: result.errors.length === 0, ...result })
  }

  // ── Run inline config (no DB record) ─────────────────────────────────────
  if (body.source_type) {
    const result = await ingestSource({
      inlineConfig: {
        source_type: body.source_type as string,
        config:      (body.config as Record<string, unknown>) ?? {},
        name:        body.name as string | undefined,
      },
      limit,
    })
    return NextResponse.json({ ok: result.errors.length === 0, ...result })
  }

  return NextResponse.json(
    { error: 'Provide source_id, source_type+config, or run_all:true' },
    { status: 400 }
  )
}

// Also support GET for quick dev triggers via browser
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)

  if (!isAuthorized(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const sourceType = searchParams.get('type')
  const subreddit  = searchParams.get('subreddit')
  const query      = searchParams.get('q')
  const limit      = searchParams.get('limit') ? parseInt(searchParams.get('limit')!) : undefined

  if (!sourceType) {
    return NextResponse.json({
      hint: 'Use ?type=<adapter_type> to trigger a test run',
      examples: [
        '/api/ingestion/run?type=google_trends',
        '/api/ingestion/run?type=reddit&subreddit=PublicFreakout&limit=5',
        '/api/ingestion/run?type=google_news&q=celebrity+drama',
        '/api/ingestion/run?type=youtube&q=trending+music',
      ],
    })
  }

  const config: Record<string, unknown> = {}
  if (subreddit) config.subreddit = subreddit
  if (query)     config.query     = query

  const result = await ingestSource({
    inlineConfig: { source_type: sourceType, config },
    limit,
  })

  return NextResponse.json({ ok: result.errors.length === 0, ...result })
}
