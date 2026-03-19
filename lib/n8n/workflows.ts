// ─── n8n Workflow Registry ────────────────────────────────────────────────────
// Single source of truth for all n8n workflows.
// Webhook paths here must match the paths configured in your n8n instances.
//
// SETUP:
//   1. In n8n, create a Webhook trigger node for each workflow
//   2. Set the webhook path to match webhookPath below
//   3. Set N8N_BASE_URL in .env.local to your n8n instance URL
//   4. Copy the workflow IDs into the n8n_workflow_id column in the workflows table

import type { WorkflowDefinition, WorkflowKey } from './types'

export const WORKFLOW_REGISTRY: Record<WorkflowKey, WorkflowDefinition> = {

  // ── Trend Polling ─────────────────────────────────────────────────────────
  // Triggered manually or on a 30-minute schedule by n8n's own scheduler.
  // Polls all active sources, normalizes items, and pushes to /webhooks/ingest.
  TREND_POLLING: {
    key:           'TREND_POLLING',
    name:          'Source Polling',
    webhookPath:   'outrage/trend-polling',
    description:   'Poll all active sources and ingest new items',
    triggerType:   'webhook',
    schedule:      '*/30 * * * *',
    callbackRoute: '/api/webhooks/ingest',
    timeout:       120_000,
  },

  // ── Morning Digest ────────────────────────────────────────────────────────
  // Runs every morning at 7am. Summarizes top trends + top content ideas.
  // Posts result to /webhooks/digest which creates a notification.
  MORNING_DIGEST: {
    key:           'MORNING_DIGEST',
    name:          'Morning Digest',
    webhookPath:   'outrage/morning-digest',
    description:   'Generate daily digest of top trends and content ideas',
    triggerType:   'schedule',
    schedule:      '0 7 * * *',
    callbackRoute: '/api/webhooks/digest',
    timeout:       60_000,
  },

  // ── Urgent Alert Detection ────────────────────────────────────────────────
  // Runs every 15 minutes. Evaluates alert rules against hot clusters.
  // Posts matched alerts to /webhooks/alert.
  URGENT_ALERT: {
    key:           'URGENT_ALERT',
    name:          'Urgent Alert Detection',
    webhookPath:   'outrage/urgent-alert',
    description:   'Evaluate alert rules against recent trend clusters',
    triggerType:   'webhook',
    schedule:      '*/15 * * * *',
    callbackRoute: '/api/webhooks/alert',
    timeout:       30_000,
  },

  // ── Content Pack Generation ───────────────────────────────────────────────
  // Triggered manually or when a cluster hits score >= 75.
  // Calls OpenAI to generate content ideas, posts to /webhooks/suggestions.
  CONTENT_PACK: {
    key:           'CONTENT_PACK',
    name:          'Content Pack Generation',
    webhookPath:   'outrage/content-pack',
    description:   'Generate AI content ideas for a trend cluster',
    triggerType:   'webhook',
    callbackRoute: '/api/webhooks/suggestions',
    timeout:       90_000,
  },

  // ── Meme Generation ───────────────────────────────────────────────────────
  // Triggered manually from Meme Studio or automatically for hot clusters.
  // Uses imgflip API or OpenAI DALL-E, posts results to /webhooks/meme.
  MEME_GENERATION: {
    key:           'MEME_GENERATION',
    name:          'Meme Generation',
    webhookPath:   'outrage/meme-generation',
    description:   'Generate meme captions and images for a trend cluster',
    triggerType:   'webhook',
    callbackRoute: '/api/webhooks/meme',
    timeout:       60_000,
  },

  // ── Source Polling ────────────────────────────────────────────────────────
  // Alias for TREND_POLLING — kept separate so it can be triggered standalone.
  // Useful for adding a new source and immediately ingesting its backlog.
  SOURCE_POLLING: {
    key:           'SOURCE_POLLING',
    name:          'Single Source Poll',
    webhookPath:   'outrage/source-poll',
    description:   'Poll a specific source by ID',
    triggerType:   'webhook',
    callbackRoute: '/api/webhooks/ingest',
    timeout:       60_000,
  },

  // ── Cluster Related Stories ───────────────────────────────────────────────
  // Groups recent source_items into trend_clusters using keyword similarity.
  // Runs every hour. Posts new/updated clusters to /webhooks/cluster.
  CLUSTER_STORIES: {
    key:           'CLUSTER_STORIES',
    name:          'Cluster Related Stories',
    webhookPath:   'outrage/cluster-stories',
    description:   'Group recent source items into trend clusters',
    triggerType:   'webhook',
    schedule:      '0 * * * *',
    callbackRoute: '/api/webhooks/cluster',
    timeout:       180_000,
  },

  // ── Stale Trend Cleanup ───────────────────────────────────────────────────
  // Runs daily at 2am. Archives clusters with no new items in 48+ hours.
  // Posts cleanup stats to /webhooks/cleanup.
  STALE_CLEANUP: {
    key:           'STALE_CLEANUP',
    name:          'Stale Trend Cleanup',
    webhookPath:   'outrage/stale-cleanup',
    description:   'Archive stale trend clusters older than 48 hours',
    triggerType:   'schedule',
    schedule:      '0 2 * * *',
    callbackRoute: '/api/webhooks/cleanup',
    timeout:       60_000,
  },

  // ── Canva Export ──────────────────────────────────────────────────────────
  // Triggered manually from the UI when an editor clicks "Export to Canva".
  // Calls Canva Connect API, posts design URLs to /webhooks/canva.
  CANVA_EXPORT: {
    key:           'CANVA_EXPORT',
    name:          'Canva Export',
    webhookPath:   'outrage/canva-export',
    description:   'Generate a Canva design for a content variant or trend cluster',
    triggerType:   'webhook',
    callbackRoute: '/api/webhooks/canva',
    timeout:       120_000,
  },

  // ── Performance Sync ──────────────────────────────────────────────────────
  // Runs daily at noon. Fetches engagement metrics from social platforms
  // for published posts. Posts metrics to /webhooks/performance.
  PERFORMANCE_SYNC: {
    key:           'PERFORMANCE_SYNC',
    name:          'Performance Sync',
    webhookPath:   'outrage/performance-sync',
    description:   'Sync post performance metrics from social platforms',
    triggerType:   'schedule',
    schedule:      '0 12 * * *',
    callbackRoute: '/api/webhooks/performance',
    timeout:       120_000,
  },
}

/** Resolve a workflow by key. Throws if not found. */
export function getWorkflow(key: WorkflowKey): WorkflowDefinition {
  const w = WORKFLOW_REGISTRY[key]
  if (!w) throw new Error(`Unknown workflow key: ${key}`)
  return w
}

/** Returns the full n8n webhook URL for a workflow. */
export function getWebhookUrl(key: WorkflowKey, test = false): string {
  const base = process.env.N8N_BASE_URL
  if (!base) throw new Error('N8N_BASE_URL is not set')
  const { webhookPath } = getWorkflow(key)
  const prefix = test ? 'webhook-test' : 'webhook'
  return `${base.replace(/\/$/, '')}/${prefix}/${webhookPath}`
}

/** All workflow keys. */
export const ALL_WORKFLOW_KEYS = Object.keys(WORKFLOW_REGISTRY) as WorkflowKey[]
