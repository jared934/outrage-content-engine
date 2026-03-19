// ─── Ingestion Service ────────────────────────────────────────────────────────
// Main orchestration layer for source ingestion.
//
// Flow:
//   1. Load source_config from DB (or accept inline config)
//   2. Resolve adapter by source_type
//   3. Fetch raw items via adapter
//   4. Normalize items (dedup, extract, coerce)
//   5. Upsert to source_items table (on conflict: external_id → update)
//   6. Update sync log and source last_fetched_at
//
// Called by:
//   - app/api/ingestion/run/route.ts  (direct trigger, dev/testing)
//   - app/api/webhooks/ingest/route.ts (n8n webhook push)
//
// N8N HANDOFF:
//   For social platforms (TikTok, Instagram, Twitter), n8n uses Apify actors
//   and pushes results directly to the /api/webhooks/ingest endpoint.
//   This service handles all RSS/API-based sources that can be polled server-side.

// eslint-disable-next-line @typescript-eslint/no-explicit-any
import { createClient, SupabaseClient } from '@supabase/supabase-js'
import { getAdapter, AdapterConfig } from '@/lib/adapters'
import { normalizeItems, SourceItemRow } from '@/lib/ingestion/normalize'
import { startSyncLog, completeSyncLog, failSyncLog, updateSourceAfterSync } from '@/lib/ingestion/sync-log'

// Use a loose client type to avoid generic parameter drift
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnySupabaseClient = SupabaseClient<any, any, any>

// ─── Types ────────────────────────────────────────────────────────────────────

export interface IngestOptions {
  /** source_configs.id — load config from DB */
  sourceId?: string
  /** Inline config — skip DB lookup (useful for testing) */
  inlineConfig?: {
    source_type: string
    config: Record<string, unknown>
    name?: string
  }
  /** Max items to ingest (overrides source config) */
  limit?: number
  /** Supabase client — if not provided, creates one from env vars */
  supabase?: AnySupabaseClient
}

export interface IngestResult {
  sourceId:    string | null
  sourceName:  string
  sourceType:  string
  itemsFetched: number
  itemsUpserted: number
  itemsSkipped:  number
  errors:       string[]
  durationMs:   number
  syncLogId:    string | null
}

// ─── Main service ─────────────────────────────────────────────────────────────

export async function ingestSource(options: IngestOptions): Promise<IngestResult> {
  const startTime = Date.now()

  const supabase = options.supabase ?? createServiceClient()

  let sourceId:   string | null = options.sourceId ?? null
  let sourceName: string = 'Unknown'
  let sourceType: string = ''
  let adapterConfig: AdapterConfig = {}
  let syncLogId: string | null = null

  // ── Load source config from DB ─────────────────────────────────────────────
  if (options.sourceId && !options.inlineConfig) {
    const { data: source, error } = await supabase
      .from('source_configs')
      .select('*')
      .eq('id', options.sourceId)
      .single()

    if (error || !source) {
      return errorResult(sourceId, sourceName, sourceType, startTime, null,
        `Source config not found: ${options.sourceId}`)
    }

    if (source.status === 'paused') {
      return errorResult(sourceId, sourceName, sourceType, startTime, null,
        `Source ${source.name} is paused`)
    }

    sourceId     = source.id
    sourceName   = source.name
    sourceType   = source.source_type
    const srcConfig = (source.config as Record<string, unknown>) ?? {}
    adapterConfig = {
      ...srcConfig,
      limit: options.limit ?? (srcConfig.limit as number | undefined),
    }
  }

  // ── Or use inline config ───────────────────────────────────────────────────
  if (options.inlineConfig) {
    sourceType   = options.inlineConfig.source_type
    sourceName   = options.inlineConfig.name ?? sourceType
    adapterConfig = {
      ...options.inlineConfig.config,
      limit: options.limit,
    }
  }

  if (!sourceType) {
    return errorResult(sourceId, sourceName, sourceType, startTime, null, 'No source_type resolved')
  }

  // ── Resolve adapter ────────────────────────────────────────────────────────
  const adapter = getAdapter(sourceType)
  if (!adapter) {
    return errorResult(sourceId, sourceName, sourceType, startTime, null,
      `No adapter registered for source_type: "${sourceType}". ` +
      `Social sources (tiktok/instagram/twitter) are handled by n8n.`)
  }

  // ── Start sync log ─────────────────────────────────────────────────────────
  if (sourceId) {
    syncLogId = await startSyncLog(supabase, sourceId).catch(() => null)
  }

  // ── Fetch items ────────────────────────────────────────────────────────────
  let fetchResult
  try {
    fetchResult = await adapter.fetch(adapterConfig)
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Adapter fetch threw unexpectedly'
    if (sourceId) {
      if (syncLogId) await failSyncLog(supabase, syncLogId, msg).catch(() => null)
      await updateSourceAfterSync(supabase, sourceId, { success: false, errorMessage: msg }).catch(() => null)
    }
    return errorResult(sourceId, sourceName, sourceType, startTime, syncLogId, msg)
  }

  if (fetchResult.items.length === 0) {
    const msg = fetchResult.error ?? 'No items returned'
    if (sourceId && syncLogId) {
      await completeSyncLog(supabase, syncLogId, {
        items_fetched: 0, items_new: 0, items_duplicate: 0, items_error: 0,
      }).catch(() => null)
      await updateSourceAfterSync(supabase, sourceId, { success: true }).catch(() => null)
    }
    return {
      sourceId,
      sourceName,
      sourceType,
      itemsFetched: 0,
      itemsUpserted: 0,
      itemsSkipped: 0,
      errors: fetchResult.error ? [fetchResult.error] : [],
      durationMs: Date.now() - startTime,
      syncLogId,
    }
  }

  // ── Normalize ──────────────────────────────────────────────────────────────
  const rows = normalizeItems(fetchResult.items, sourceId ?? 'inline')

  // ── Upsert to source_items ─────────────────────────────────────────────────
  const { upserted, skipped, errors } = await upsertSourceItems(supabase, rows)

  // ── Complete sync log ──────────────────────────────────────────────────────
  if (sourceId) {
    const counts = {
      items_fetched:   fetchResult.items.length,
      items_new:       upserted,
      items_duplicate: skipped,
      items_error:     errors.length,
    }
    if (syncLogId) {
      await completeSyncLog(supabase, syncLogId, counts, {
        adapter_mock: adapter.isMock,
      }).catch(() => null)
    }
    await updateSourceAfterSync(supabase, sourceId, {
      success: errors.length === 0,
      errorMessage: errors[0],
    }).catch(() => null)
  }

  return {
    sourceId,
    sourceName,
    sourceType,
    itemsFetched: fetchResult.items.length,
    itemsUpserted: upserted,
    itemsSkipped:  skipped,
    errors,
    durationMs: Date.now() - startTime,
    syncLogId,
  }
}

// ─── Batch ingest all active sources ─────────────────────────────────────────

export async function ingestAllActiveSources(
  supabase?: AnySupabaseClient
): Promise<IngestResult[]> {
  const client = supabase ?? createServiceClient()

  const { data: sources } = await client
    .from('source_configs')
    .select('id, name, source_type')
    .eq('status', 'active')
    .order('priority', { ascending: false })

  if (!sources?.length) return []

  // Run all sources in parallel (up to 5 concurrent to be kind to rate limits)
  const results: IngestResult[] = []
  const batchSize = 5

  for (let i = 0; i < sources.length; i += batchSize) {
    const batch = sources.slice(i, i + batchSize)
    const batchResults = await Promise.allSettled(
      batch.map(s => ingestSource({ sourceId: s.id, supabase: client }))
    )
    for (const r of batchResults) {
      if (r.status === 'fulfilled') results.push(r.value)
    }
  }

  return results
}

// ─── Upsert helper ────────────────────────────────────────────────────────────

async function upsertSourceItems(
  supabase: AnySupabaseClient,
  rows: SourceItemRow[]
): Promise<{ upserted: number; skipped: number; errors: string[] }> {
  if (rows.length === 0) return { upserted: 0, skipped: 0, errors: [] }

  const errors: string[] = []
  let upserted = 0
  let skipped  = 0

  // Upsert in chunks of 50 to avoid payload limits
  const chunkSize = 50
  for (let i = 0; i < rows.length; i += chunkSize) {
    const chunk = rows.slice(i, i + chunkSize)

    const { error, data } = await supabase
      .from('source_items')
      .upsert(chunk, {
        onConflict: 'external_id',
        ignoreDuplicates: false,  // Update on conflict (refresh engagement data)
      })
      .select('id')

    if (error) {
      errors.push(`Chunk ${i / chunkSize + 1}: ${error.message}`)
      skipped += chunk.length
    } else {
      upserted += data?.length ?? chunk.length
    }
  }

  return { upserted, skipped, errors }
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function createServiceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!url || !key) {
    throw new Error('NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set')
  }

  return createClient(url, key, {
    auth: { persistSession: false },
  })
}

function errorResult(
  sourceId: string | null,
  sourceName: string,
  sourceType: string,
  startTime: number,
  syncLogId: string | null,
  error: string
): IngestResult {
  return {
    sourceId,
    sourceName,
    sourceType,
    itemsFetched: 0,
    itemsUpserted: 0,
    itemsSkipped: 0,
    errors: [error],
    durationMs: Date.now() - startTime,
    syncLogId,
  }
}
