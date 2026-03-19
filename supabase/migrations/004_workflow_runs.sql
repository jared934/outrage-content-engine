-- =============================================================================
-- Migration 004 — Workflow Run Execution Log
-- =============================================================================
-- Adds workflow_runs table for tracking n8n execution history.
-- Each trigger creates a record; callback webhooks update it to success/failed.
--
-- Also adds a source_configs view aliasing the sources table so that
-- the ingestion layer code (which uses source_configs) works without rename.

-- ─── Enum ──────────────────────────────────────────────────────────────────

DO $$ BEGIN
  CREATE TYPE execution_status AS ENUM (
    'pending', 'running', 'success', 'failed', 'timeout', 'cancelled'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE workflow_trigger_type AS ENUM (
    'scheduled', 'manual', 'webhook', 'api'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ─── workflow_runs ──────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS workflow_runs (
  id                uuid          PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id            uuid          NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  workflow_key      text          NOT NULL,   -- WorkflowKey enum value
  workflow_name     text          NOT NULL,
  n8n_execution_id  text,
  status            execution_status NOT NULL DEFAULT 'pending',
  trigger_type      workflow_trigger_type NOT NULL DEFAULT 'api',
  triggered_by      uuid          REFERENCES auth.users(id) ON DELETE SET NULL,
  input_payload     jsonb         NOT NULL DEFAULT '{}'::jsonb,
  result_payload    jsonb,
  error_message     text,
  items_processed   int,
  started_at        timestamptz   NOT NULL DEFAULT now(),
  completed_at      timestamptz,
  duration_ms       int GENERATED ALWAYS AS (
    CASE WHEN completed_at IS NOT NULL
      THEN EXTRACT(EPOCH FROM (completed_at - started_at))::int * 1000
      ELSE NULL
    END
  ) STORED
);

COMMENT ON TABLE workflow_runs IS
  'Execution log for n8n workflow runs. Created on trigger, updated by callback webhooks.';

-- ─── Indexes ────────────────────────────────────────────────────────────────

CREATE INDEX IF NOT EXISTS idx_workflow_runs_org_id
  ON workflow_runs(org_id);

CREATE INDEX IF NOT EXISTS idx_workflow_runs_status
  ON workflow_runs(status);

CREATE INDEX IF NOT EXISTS idx_workflow_runs_workflow_key
  ON workflow_runs(workflow_key);

CREATE INDEX IF NOT EXISTS idx_workflow_runs_started_at
  ON workflow_runs(started_at DESC);

CREATE INDEX IF NOT EXISTS idx_workflow_runs_n8n_execution_id
  ON workflow_runs(n8n_execution_id)
  WHERE n8n_execution_id IS NOT NULL;

-- ─── Auto-timeout: mark runs still in pending/running after 10 min ──────────
-- Handled by a scheduled Postgres function or n8n itself.
-- For reference — run this periodically:
--
--   UPDATE workflow_runs
--   SET status = 'timeout', completed_at = now()
--   WHERE status IN ('pending', 'running')
--     AND started_at < now() - INTERVAL '10 minutes';

-- ─── source_configs view (alias for sources table) ──────────────────────────
-- The ingestion layer uses source_configs; the schema table is named sources.
-- This view makes both names work without renaming the table.

CREATE OR REPLACE VIEW source_configs AS
  SELECT
    id,
    org_id,
    name,
    source_type,
    status,
    config,
    priority,
    last_fetched_at,
    error_count,
    last_error,
    created_at,
    updated_at
  FROM sources;

COMMENT ON VIEW source_configs IS
  'Alias view for the sources table — used by ingestion layer code.';

-- Allow inserts/updates/deletes through the view
CREATE OR REPLACE RULE source_configs_insert AS
  ON INSERT TO source_configs DO INSTEAD
  INSERT INTO sources VALUES (NEW.*);

CREATE OR REPLACE RULE source_configs_update AS
  ON UPDATE TO source_configs DO INSTEAD
  UPDATE sources SET
    org_id = NEW.org_id, name = NEW.name, source_type = NEW.source_type,
    status = NEW.status, config = NEW.config, priority = NEW.priority,
    last_fetched_at = NEW.last_fetched_at, error_count = NEW.error_count,
    last_error = NEW.last_error, created_at = NEW.created_at, updated_at = NEW.updated_at
  WHERE id = OLD.id;

CREATE OR REPLACE RULE source_configs_delete AS
  ON DELETE TO source_configs DO INSTEAD
  DELETE FROM sources WHERE id = OLD.id;

-- ─── RLS ─────────────────────────────────────────────────────────────────────

ALTER TABLE workflow_runs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "org_members_read_runs"
  ON workflow_runs FOR SELECT
  USING (
    org_id IN (
      SELECT org_id FROM org_members WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "admins_manage_runs"
  ON workflow_runs FOR ALL
  USING (
    org_id IN (
      SELECT org_id FROM org_members
      WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
    )
  );

CREATE POLICY "service_role_manage_runs"
  ON workflow_runs FOR ALL
  USING (auth.role() = 'service_role');
