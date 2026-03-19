// ─── n8n Integration Types ────────────────────────────────────────────────────
// Shared types for n8n webhook payloads, workflow configs, and execution records.
// Used by: trigger.service.ts, webhook routes, app/api/n8n/*, DB schema.

// ─── Workflow Registry ────────────────────────────────────────────────────────

export type WorkflowKey =
  | 'TREND_POLLING'
  | 'MORNING_DIGEST'
  | 'URGENT_ALERT'
  | 'CONTENT_PACK'
  | 'MEME_GENERATION'
  | 'SOURCE_POLLING'
  | 'CLUSTER_STORIES'
  | 'STALE_CLEANUP'
  | 'CANVA_EXPORT'
  | 'PERFORMANCE_SYNC'

export interface WorkflowDefinition {
  key:           WorkflowKey
  name:          string
  webhookPath:   string       // path after /webhook/ in n8n
  description:   string
  triggerType:   'webhook' | 'schedule' | 'manual'
  schedule?:     string       // cron expression (for reference only)
  callbackRoute: string       // app route that n8n POSTs results to
  timeout?:      number       // expected max run duration in ms
}

// ─── Execution Tracking ───────────────────────────────────────────────────────

export type ExecutionStatus =
  | 'pending'
  | 'running'
  | 'success'
  | 'failed'
  | 'timeout'
  | 'cancelled'

/** Stored in workflow_runs table */
export interface WorkflowRun {
  id:               string
  org_id:           string
  workflow_key:     WorkflowKey
  workflow_name:    string
  n8n_execution_id: string | null
  status:           ExecutionStatus
  trigger_type:     'scheduled' | 'manual' | 'webhook' | 'api'
  triggered_by:     string | null   // user_id or 'system'
  input_payload:    Record<string, unknown>
  result_payload:   Record<string, unknown> | null
  error_message:    string | null
  items_processed:  number | null
  started_at:       string
  completed_at:     string | null
  duration_ms:      number | null
}

/** Input for creating a new workflow run record */
export interface CreateWorkflowRunInput {
  org_id:        string
  workflow_key:  WorkflowKey
  workflow_name: string
  trigger_type:  WorkflowRun['trigger_type']
  triggered_by?: string
  input_payload?: Record<string, unknown>
}

// ─── Trigger API Payloads ─────────────────────────────────────────────────────

/** POST /api/n8n/trigger */
export interface TriggerWorkflowRequest {
  workflow:      WorkflowKey
  org_id:        string
  payload?:      Record<string, unknown>
  triggered_by?: string   // user_id
}

export interface TriggerWorkflowResponse {
  ok:           boolean
  run_id:       string | null   // workflow_runs.id
  execution_id: string | null   // n8n execution ID
  message:      string
}

// ─── Webhook Callback Payloads ────────────────────────────────────────────────
// Each workflow POSTs results back to a dedicated Next.js webhook route.
// All share a base envelope.

export interface N8NCallbackBase {
  run_id?:       string      // workflow_runs.id — echoed back for correlation
  execution_id?: string      // n8n execution ID
  org_id:        string
  status:        'success' | 'partial' | 'error'
  error?:        string
  duration_ms?:  number
  items_processed?: number
}

// POST /api/webhooks/digest
export interface DigestCallbackPayload extends N8NCallbackBase {
  digest: {
    date:           string        // ISO date
    top_clusters:   Array<{
      cluster_id:   string
      title:        string
      overall_score: number
      item_count:   number
      top_keywords: string[]
    }>
    top_ideas: Array<{
      idea_id:  string
      title:    string
      type:     string
      platform: string
    }>
    stats: {
      total_clusters:    number
      new_since_yesterday: number
      avg_score:         number
      hot_count:         number
    }
  }
}

// POST /api/webhooks/cluster
export interface ClusterCallbackPayload extends N8NCallbackBase {
  clusters: Array<{
    cluster_id?:     string   // existing cluster to update, or null for new
    title:           string
    summary?:        string
    keywords:        string[]
    entities:        Record<string, unknown>
    source_item_ids: string[]
    item_count:      number
    velocity:        number
    category?:       string
  }>
}

// POST /api/webhooks/meme
export interface MemeCallbackPayload extends N8NCallbackBase {
  memes: Array<{
    cluster_id?:  string
    variant_id?:  string
    template_id?: string
    caption:      string
    top_text?:    string
    bottom_text?: string
    image_url?:   string
    imgflip_url?: string
    ai_prompt?:   string
  }>
}

// POST /api/webhooks/canva
export interface CanvaCallbackPayload extends N8NCallbackBase {
  exports: Array<{
    cluster_id?:  string
    variant_id?:  string
    design_name:  string
    design_url:   string
    edit_url?:    string
    preview_url?: string
    platform?:    string
  }>
}

// POST /api/webhooks/performance
export interface PerformanceCallbackPayload extends N8NCallbackBase {
  metrics: Array<{
    post_result_id: string
    platform:       string
    external_post_id: string
    views?:         number
    likes?:         number
    comments?:      number
    shares?:        number
    saves?:         number
    reach?:         number
    impressions?:   number
    engagement_rate?: number
    measured_at:    string
  }>
}

// POST /api/webhooks/cleanup (stale trend cleanup results)
export interface CleanupCallbackPayload extends N8NCallbackBase {
  archived_count:  number
  declined_count:  number
  cluster_ids:     string[]   // clusters that were updated
}

// ─── n8n API Response Types ───────────────────────────────────────────────────

/** n8n GET /api/v1/executions/:id response (simplified) */
export interface N8NExecutionStatus {
  id:         string
  finished:   boolean
  mode:       string
  status:     'new' | 'running' | 'success' | 'error' | 'canceled' | 'waiting'
  startedAt:  string
  stoppedAt?: string
  workflowData?: { name: string }
  data?: {
    resultData?: {
      error?: { message: string }
    }
  }
}
