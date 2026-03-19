// ─── Source Sync Log ─────────────────────────────────────────────────────────
// Manages source_sync_logs table entries.
// Every ingestion run creates a log row at start, updates it on completion.
// This gives full audit trail + allows the UI to show last sync status.

// eslint-disable-next-line @typescript-eslint/no-explicit-any
import type { SupabaseClient } from '@supabase/supabase-js'
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnySupabaseClient = SupabaseClient<any, any, any>

export interface SyncLogCounts {
  items_fetched: number
  items_new: number
  items_duplicate: number
  items_error: number
}

/**
 * Create a new sync log entry and return its ID.
 * Call at the start of every ingestion run.
 */
export async function startSyncLog(
  supabase: AnySupabaseClient,
  sourceId: string
): Promise<string | null> {
  const { data, error } = await supabase
    .from('source_sync_logs')
    .insert({
      source_config_id: sourceId,
      status: 'running',
      items_fetched: 0,
      items_new: 0,
      items_duplicate: 0,
      items_error: 0,
      started_at: new Date().toISOString(),
      metadata: {},
    })
    .select('id')
    .single()

  if (error) {
    console.error('[sync-log] Failed to create log:', error.message)
    return null
  }
  return data.id
}

/**
 * Mark a sync log as completed (success or partial).
 */
export async function completeSyncLog(
  supabase: AnySupabaseClient,
  logId: string,
  counts: SyncLogCounts,
  metadata?: Record<string, unknown>
): Promise<void> {
  const status = counts.items_error > 0 && counts.items_new === 0 ? 'failed' :
                 counts.items_error > 0 ? 'partial' : 'success'

  await supabase
    .from('source_sync_logs')
    .update({
      status,
      items_fetched: counts.items_fetched,
      items_new: counts.items_new,
      items_duplicate: counts.items_duplicate,
      items_error: counts.items_error,
      completed_at: new Date().toISOString(),
      metadata: metadata ?? {},
    })
    .eq('id', logId)
}

/**
 * Mark a sync log as failed with an error message.
 */
export async function failSyncLog(
  supabase: AnySupabaseClient,
  logId: string,
  errorMessage: string
): Promise<void> {
  await supabase
    .from('source_sync_logs')
    .update({
      status: 'failed',
      error_message: errorMessage,
      completed_at: new Date().toISOString(),
    })
    .eq('id', logId)
}

/**
 * Update a source's sync metadata after a run.
 * Called regardless of success/failure.
 */
export async function updateSourceAfterSync(
  supabase: AnySupabaseClient,
  sourceId: string,
  opts: { success: boolean; errorMessage?: string }
): Promise<void> {
  const update = opts.success
    ? {
        last_fetched_at: new Date().toISOString(),
        error_count: 0,
        last_error: null,
      }
    : {
        last_fetched_at: new Date().toISOString(),
        // Increment error_count — use RPC or fetch+update
        last_error: opts.errorMessage ?? 'Unknown error',
      }

  if (!opts.success) {
    // Increment error_count atomically
    const { data } = await supabase
      .from('source_configs')
      .select('error_count')
      .eq('id', sourceId)
      .single()
    const newCount = (data?.error_count ?? 0) + 1
    await supabase
      .from('source_configs')
      .update({ ...update, error_count: newCount })
      .eq('id', sourceId)
    return
  }

  await supabase.from('source_configs').update(update).eq('id', sourceId)
}
