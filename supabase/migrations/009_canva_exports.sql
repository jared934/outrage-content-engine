-- =============================================================================
-- Migration 009 — Canva Export Workflow
-- =============================================================================
-- Adds canva_exports table to track all content handoffs to Canva production.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- Enums
-- ---------------------------------------------------------------------------

DO $$ BEGIN
  CREATE TYPE canva_template_type AS ENUM (
    'breaking_alert', 'meme', 'story', 'carousel_cover', 'reel_cover', 'quote_graphic'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE canva_export_status AS ENUM (
    'pending', 'in_progress', 'designed', 'review', 'approved', 'published', 'archived'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ---------------------------------------------------------------------------
-- canva_exports
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS canva_exports (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id            UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  created_by        UUID REFERENCES auth.users(id) ON DELETE SET NULL,

  -- Human-readable name
  name              TEXT NOT NULL DEFAULT 'Untitled Export',

  -- Template / format
  template_type     canva_template_type NOT NULL,

  -- Full export payload (copy + specs + brand + assets)
  payload           JSONB NOT NULL DEFAULT '{}',

  -- Status lifecycle
  status            canva_export_status NOT NULL DEFAULT 'pending',

  -- Canva link (saved after designer creates design)
  canva_design_url  TEXT,
  canva_design_id   TEXT,

  -- Notes from designer or requester
  designer_notes    TEXT,

  -- Source content references
  content_idea_id   UUID REFERENCES content_ideas(id) ON DELETE SET NULL,
  meme_draft_id     UUID REFERENCES meme_drafts(id) ON DELETE SET NULL,
  cluster_id        UUID REFERENCES trend_clusters(id) ON DELETE SET NULL,

  -- Timestamps
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  exported_at       TIMESTAMPTZ,  -- when first "opened in Canva"
  designed_at       TIMESTAMPTZ   -- when design link saved
);

-- ---------------------------------------------------------------------------
-- Indexes
-- ---------------------------------------------------------------------------

CREATE INDEX idx_canva_exports_org_id          ON canva_exports(org_id);
CREATE INDEX idx_canva_exports_status          ON canva_exports(status);
CREATE INDEX idx_canva_exports_template_type   ON canva_exports(template_type);
CREATE INDEX idx_canva_exports_cluster_id      ON canva_exports(cluster_id) WHERE cluster_id IS NOT NULL;
CREATE INDEX idx_canva_exports_content_idea_id ON canva_exports(content_idea_id) WHERE content_idea_id IS NOT NULL;
CREATE INDEX idx_canva_exports_meme_draft_id   ON canva_exports(meme_draft_id) WHERE meme_draft_id IS NOT NULL;
CREATE INDEX idx_canva_exports_created_at      ON canva_exports(created_at DESC);

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------

ALTER TABLE canva_exports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "org_members_read_canva_exports"
  ON canva_exports FOR SELECT
  USING (
    org_id IN (
      SELECT org_id FROM org_members WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "org_members_insert_canva_exports"
  ON canva_exports FOR INSERT
  WITH CHECK (
    org_id IN (
      SELECT org_id FROM org_members WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "org_members_update_canva_exports"
  ON canva_exports FOR UPDATE
  USING (
    org_id IN (
      SELECT org_id FROM org_members WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "org_members_delete_canva_exports"
  ON canva_exports FOR DELETE
  USING (
    org_id IN (
      SELECT org_id FROM org_members WHERE user_id = auth.uid()
    )
  );

-- ---------------------------------------------------------------------------
-- updated_at trigger
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION update_canva_exports_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_canva_exports_updated_at
  BEFORE UPDATE ON canva_exports
  FOR EACH ROW EXECUTE FUNCTION update_canva_exports_updated_at();

-- ---------------------------------------------------------------------------
-- Summary view — useful for listing without full payload
-- ---------------------------------------------------------------------------

CREATE OR REPLACE VIEW v_canva_exports_summary AS
SELECT
  ce.id,
  ce.org_id,
  ce.name,
  ce.template_type,
  ce.status,
  ce.canva_design_url,
  ce.content_idea_id,
  ce.meme_draft_id,
  ce.cluster_id,
  tc.title AS cluster_title,
  ce.created_at,
  ce.updated_at,
  ce.exported_at,
  ce.designed_at,
  ce.created_by,
  -- Payload summary fields (avoid returning full JSONB blob in list views)
  ce.payload->>'headline'         AS headline,
  ce.payload->>'caption'          AS caption,
  ce.payload->>'visual_direction' AS visual_direction
FROM canva_exports ce
LEFT JOIN trend_clusters tc ON tc.id = ce.cluster_id;
