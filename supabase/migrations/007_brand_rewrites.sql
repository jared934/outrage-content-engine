-- =============================================================================
-- Migration 007 — Brand Voice Rewrite History
-- Stores every AI rewrite request with full diff context.
-- =============================================================================

CREATE TABLE IF NOT EXISTS brand_rewrites (
  id                      uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id                  uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,

  -- Optional links to source content
  cluster_id              uuid REFERENCES trend_clusters(id) ON DELETE SET NULL,
  idea_id                 uuid REFERENCES content_ideas(id) ON DELETE SET NULL,

  -- Core content
  original_text           text NOT NULL,
  rewritten_text          text NOT NULL,
  tool                    text NOT NULL CHECK (tool IN (
    'make_sharper', 'make_funnier', 'make_savage', 'make_mainstream',
    'make_editorial', 'make_meme_native', 'make_safer', 'shorten_headline',
    'improve_hook', 'make_more_shareable', 'reduce_cringe', 'reduce_repetition'
  )),
  custom_instruction      text,

  -- Generation meta
  model_used              text,
  tokens_used             int,
  estimated_cost_usd      numeric(10, 6),
  prompt_version          text,

  -- Snapshot of brand settings at generation time (for audit)
  brand_settings_snapshot jsonb NOT NULL DEFAULT '{}'::jsonb,

  -- User actions
  is_saved                bool NOT NULL DEFAULT false,
  is_accepted             bool NOT NULL DEFAULT false,

  created_by              uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at              timestamptz NOT NULL DEFAULT now(),
  updated_at              timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE brand_rewrites IS 'History of all AI brand voice rewrite operations with original/rewritten text pairs.';

CREATE INDEX IF NOT EXISTS idx_brand_rewrites_org_id     ON brand_rewrites(org_id);
CREATE INDEX IF NOT EXISTS idx_brand_rewrites_tool        ON brand_rewrites(tool);
CREATE INDEX IF NOT EXISTS idx_brand_rewrites_created_at  ON brand_rewrites(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_brand_rewrites_is_saved    ON brand_rewrites(org_id, is_saved) WHERE is_saved = true;

-- Full-text search on original + rewritten
CREATE INDEX IF NOT EXISTS idx_brand_rewrites_fts ON brand_rewrites
  USING gin(to_tsvector('english', original_text || ' ' || rewritten_text));

-- RLS
ALTER TABLE brand_rewrites ENABLE ROW LEVEL SECURITY;

CREATE POLICY "org_members_read_brand_rewrites"
  ON brand_rewrites FOR SELECT
  TO authenticated
  USING (org_id = ANY(auth.user_org_ids()));

CREATE POLICY "org_editors_manage_brand_rewrites"
  ON brand_rewrites FOR ALL
  TO authenticated
  USING (
    org_id IN (
      SELECT org_id FROM org_members
      WHERE user_id = auth.uid()
        AND role IN ('owner', 'admin', 'editor')
    )
  )
  WITH CHECK (
    org_id IN (
      SELECT org_id FROM org_members
      WHERE user_id = auth.uid()
        AND role IN ('owner', 'admin', 'editor')
    )
  );

CREATE POLICY "service_role_manage_brand_rewrites"
  ON brand_rewrites FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

CREATE OR REPLACE TRIGGER set_brand_rewrites_updated_at
  BEFORE UPDATE ON brand_rewrites
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
