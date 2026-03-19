// ─── n8n Workflow Trigger Service ────────────────────────────────────────────
// High-level trigger functions — one per workflow.
// Each function:
//   1. Creates a workflow_runs record (status: pending)
//   2. Triggers the n8n webhook with the app's callback URL
//   3. Updates the workflow_runs record with the execution ID
//   4. Returns the run ID for frontend polling
//
// Usage:
//   const { runId } = await triggerContentPack({ orgId, clusterId, userId })
//
// The n8n workflow will POST results back to callbackRoute when finished.
// The callback route updates the workflow_runs record to 'success' or 'failed'.

import { createClient } from '@supabase/supabase-js'
import { triggerN8NWebhook } from './client'
import { getWorkflow, getWebhookUrl } from './workflows'
import type {
  WorkflowKey,
  WorkflowRun,
  CreateWorkflowRunInput,
  ExecutionStatus,
} from './types'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnySupabaseClient = ReturnType<typeof createClient<any, any, any>>

// ─── Core orchestration ───────────────────────────────────────────────────────

export interface TriggerResult {
  ok:           boolean
  runId:        string | null
  executionId:  string | null
  error?:       string
}

export async function triggerWorkflow(
  key:     WorkflowKey,
  opts: {
    orgId:       string
    payload?:    Record<string, unknown>
    triggeredBy?: string
    supabase?:   AnySupabaseClient
  }
): Promise<TriggerResult> {
  const workflow = getWorkflow(key)
  const supabase = opts.supabase ?? createServiceClient()
  const appBase  = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'

  // 1. Create pending run record
  const runId = await createRunRecord(supabase, {
    org_id:        opts.orgId,
    workflow_key:  key,
    workflow_name: workflow.name,
    trigger_type:  'api',
    triggered_by:  opts.triggeredBy,
    input_payload: opts.payload ?? {},
  })

  // 2. Build payload — always include callback URL and run_id for correlation
  const fullPayload = {
    ...opts.payload,
    org_id:       opts.orgId,
    run_id:       runId,
    callback_url: `${appBase}${workflow.callbackRoute}`,
    webhook_secret: process.env.N8N_WEBHOOK_SECRET,  // echoed back for validation
  }

  // 3. Trigger n8n
  const result = await triggerN8NWebhook({
    webhookPath: workflow.webhookPath,
    payload:     fullPayload,
    timeout:     15_000,
  })

  // 4. Update run record with execution ID or error
  if (result.ok && result.executionId) {
    await updateRunRecord(supabase, runId, {
      status:           'running',
      n8n_execution_id: result.executionId,
    })

    // Update workflow.last_run_at in the workflows table
    await supabase
      .from('workflows')
      .update({
        last_run_at:     new Date().toISOString(),
        last_run_status: 'running',
      })
      .eq('n8n_workflow_id', key)   // stored as the WorkflowKey string
      .eq('org_id', opts.orgId)

  } else {
    await updateRunRecord(supabase, runId, {
      status:        'failed',
      error_message: result.error ?? 'n8n trigger failed',
      completed_at:  new Date().toISOString(),
    })
  }

  return {
    ok:          result.ok,
    runId,
    executionId: result.executionId,
    error:       result.error,
  }
}

// ─── Named trigger functions ──────────────────────────────────────────────────

export async function triggerTrendPolling(opts: {
  orgId:        string
  triggeredBy?: string
  supabase?:    AnySupabaseClient
}) {
  return triggerWorkflow('TREND_POLLING', opts)
}

export async function triggerSourcePoll(opts: {
  orgId:        string
  sourceId:     string
  triggeredBy?: string
  supabase?:    AnySupabaseClient
}) {
  return triggerWorkflow('SOURCE_POLLING', {
    ...opts,
    payload: { source_id: opts.sourceId },
  })
}

export async function triggerMorningDigest(opts: {
  orgId:        string
  triggeredBy?: string
  supabase?:    AnySupabaseClient
}) {
  return triggerWorkflow('MORNING_DIGEST', opts)
}

export async function triggerUrgentAlert(opts: {
  orgId:        string
  triggeredBy?: string
  supabase?:    AnySupabaseClient
}) {
  return triggerWorkflow('URGENT_ALERT', opts)
}

export async function triggerContentPack(opts: {
  orgId:        string
  clusterId:    string
  triggeredBy?: string
  supabase?:    AnySupabaseClient
}) {
  return triggerWorkflow('CONTENT_PACK', {
    ...opts,
    payload: { cluster_id: opts.clusterId },
  })
}

export async function triggerMemeGeneration(opts: {
  orgId:        string
  clusterId:    string
  variantId?:   string
  count?:       number
  triggeredBy?: string
  supabase?:    AnySupabaseClient
}) {
  return triggerWorkflow('MEME_GENERATION', {
    ...opts,
    payload: {
      cluster_id: opts.clusterId,
      variant_id: opts.variantId,
      count:      opts.count ?? 3,
    },
  })
}

export async function triggerClusterStories(opts: {
  orgId:        string
  triggeredBy?: string
  supabase?:    AnySupabaseClient
}) {
  return triggerWorkflow('CLUSTER_STORIES', opts)
}

export async function triggerStaleCleanup(opts: {
  orgId:        string
  olderThanHours?: number
  triggeredBy?: string
  supabase?:    AnySupabaseClient
}) {
  return triggerWorkflow('STALE_CLEANUP', {
    ...opts,
    payload: { older_than_hours: opts.olderThanHours ?? 48 },
  })
}

export async function triggerCanvaExport(opts: {
  orgId:        string
  clusterId?:   string
  variantId?:   string
  platform?:    string
  triggeredBy?: string
  supabase?:    AnySupabaseClient
}) {
  if (!opts.clusterId && !opts.variantId) {
    return { ok: false, runId: null, executionId: null, error: 'clusterId or variantId required' }
  }
  return triggerWorkflow('CANVA_EXPORT', {
    ...opts,
    payload: {
      cluster_id: opts.clusterId,
      variant_id: opts.variantId,
      platform:   opts.platform ?? 'instagram',
    },
  })
}

export async function triggerPerformanceSync(opts: {
  orgId:        string
  triggeredBy?: string
  supabase?:    AnySupabaseClient
}) {
  return triggerWorkflow('PERFORMANCE_SYNC', opts)
}

// ─── Run record CRUD ──────────────────────────────────────────────────────────

async function createRunRecord(
  supabase: AnySupabaseClient,
  input: CreateWorkflowRunInput
): Promise<string> {
  const { data, error } = await supabase
    .from('workflow_runs')
    .insert({
      org_id:         input.org_id,
      workflow_key:   input.workflow_key,
      workflow_name:  input.workflow_name,
      status:         'pending',
      trigger_type:   input.trigger_type,
      triggered_by:   input.triggered_by ?? null,
      input_payload:  input.input_payload ?? {},
      result_payload: null,
      error_message:  null,
      started_at:     new Date().toISOString(),
    })
    .select('id')
    .single()

  if (error || !data) {
    console.error('[trigger-service] Failed to create run record:', error?.message)
    return `local_${Date.now()}`  // fallback — won't track in DB
  }
  return data.id
}

export async function updateRunRecord(
  supabase: AnySupabaseClient,
  runId: string,
  update: {
    status?:           ExecutionStatus
    n8n_execution_id?: string
    error_message?:    string
    result_payload?:   Record<string, unknown>
    items_processed?:  number
    completed_at?:     string
  }
): Promise<void> {
  if (runId.startsWith('local_')) return   // no DB record to update

  const payload: Record<string, unknown> = { ...update }

  if (update.status === 'success' || update.status === 'failed') {
    const completedAt = update.completed_at ?? new Date().toISOString()
    payload.completed_at = completedAt
  }

  await supabase
    .from('workflow_runs')
    .update(payload)
    .eq('id', runId)
}

/** Mark a run as complete from a callback webhook. */
export async function completeRunFromCallback(
  supabase: AnySupabaseClient,
  runId: string,
  opts: {
    status:          'success' | 'partial' | 'error'
    itemsProcessed?: number
    resultPayload?:  Record<string, unknown>
    error?:          string
    durationMs?:     number
  }
): Promise<void> {
  const status: ExecutionStatus = opts.status === 'error' ? 'failed' :
                                  opts.status === 'partial' ? 'success' : 'success'

  await updateRunRecord(supabase, runId, {
    status,
    result_payload:  opts.resultPayload,
    error_message:   opts.error,
    items_processed: opts.itemsProcessed,
    completed_at:    new Date().toISOString(),
  })
}

// ─── Service client ───────────────────────────────────────────────────────────

function createServiceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) throw new Error('Supabase env vars not set')
  return createClient(url, key, { auth: { persistSession: false } })
}

// ─── Recent runs query ────────────────────────────────────────────────────────

export async function getRecentRuns(
  supabase: AnySupabaseClient,
  orgId:    string,
  limit = 20
): Promise<WorkflowRun[]> {
  const { data } = await supabase
    .from('workflow_runs')
    .select('*')
    .eq('org_id', orgId)
    .order('started_at', { ascending: false })
    .limit(limit)

  return (data ?? []) as WorkflowRun[]
}

export async function getRunById(
  supabase: AnySupabaseClient,
  runId:    string
): Promise<WorkflowRun | null> {
  const { data } = await supabase
    .from('workflow_runs')
    .select('*')
    .eq('id', runId)
    .single()

  return data as WorkflowRun | null
}
