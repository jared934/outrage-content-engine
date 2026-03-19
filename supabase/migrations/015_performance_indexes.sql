-- =============================================================================
-- Migration 015 — Performance Indexes + Retention Policies
-- =============================================================================
-- Adds missing composite indexes for common query patterns and a pg_cron job
-- to keep workflow_runs from growing unbounded.

-- ─── workflow_runs: composite index for getRecentRuns() ──────────────────────
-- Query pattern: WHERE org_id = $1 ORDER BY started_at DESC LIMIT $2
-- Replaces two separate single-column indexes with one that covers both.

CREATE INDEX IF NOT EXISTS idx_workflow_runs_org_started
  ON workflow_runs(org_id, started_at DESC);

-- ─── content_packs: dedup lookup index ───────────────────────────────────────
-- Query pattern in generatePack():
--   WHERE cluster_id = $1 AND org_id = $2 AND output_style = $3
--     AND status = 'complete' AND created_at >= $4
--   ORDER BY created_at DESC LIMIT 1
-- Covers the deduplication check without a seq scan.

CREATE INDEX IF NOT EXISTS idx_content_packs_dedup
  ON content_packs(cluster_id, org_id, output_style, status, created_at DESC);

-- ─── trend_scores: latest score per cluster ───────────────────────────────────
-- Query pattern in dashboard: WHERE cluster_id IN (...) ORDER BY scored_at DESC
-- The existing index on cluster_id alone forces a sort; this covers it.

CREATE INDEX IF NOT EXISTS idx_trend_scores_cluster_scored
  ON trend_scores(cluster_id, scored_at DESC);

-- ─── content_ideas: org feed queries ─────────────────────────────────────────
-- Query pattern: WHERE org_id = $1 ORDER BY created_at DESC LIMIT $2
-- Also covers the saved-ideas filter: WHERE org_id = $1 AND is_saved = true

CREATE INDEX IF NOT EXISTS idx_content_ideas_org_created
  ON content_ideas(org_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_content_ideas_org_saved
  ON content_ideas(org_id, is_saved, created_at DESC)
  WHERE is_saved = true;

-- ─── source_sync_logs: latest log per source ─────────────────────────────────
-- Query pattern: WHERE source_id IN (...) ORDER BY created_at DESC LIMIT 50

CREATE INDEX IF NOT EXISTS idx_source_sync_logs_source_created
  ON source_sync_logs(source_id, created_at DESC);

-- ─── workflow_runs: retention policy via pg_cron ─────────────────────────────
-- Requires the pg_cron extension (enabled by default on Supabase Pro).
-- Deletes runs older than 90 days daily at 03:00 UTC to keep the table lean.
-- If pg_cron is not available, run the DELETE manually or via a Supabase
-- Edge Function scheduled with cron.

DO $$
BEGIN
  -- Only schedule if pg_cron extension is present
  IF EXISTS (
    SELECT 1 FROM pg_extension WHERE extname = 'pg_cron'
  ) THEN
    PERFORM cron.schedule(
      'workflow_runs_retention',   -- job name (idempotent)
      '0 3 * * *',                 -- daily at 03:00 UTC
      $$
        DELETE FROM workflow_runs
        WHERE started_at < now() - INTERVAL '90 days';
      $$
    );
  END IF;
EXCEPTION WHEN OTHERS THEN
  -- pg_cron not available — skip silently, retention must be handled externally
  NULL;
END $$;

-- ─── Manual retention statement (reference) ──────────────────────────────────
-- Run this yourself if pg_cron is unavailable:
--
--   DELETE FROM workflow_runs
--   WHERE started_at < now() - INTERVAL '90 days';
--
-- Recommended: wire this into the morning_digest n8n workflow as a cleanup step.
