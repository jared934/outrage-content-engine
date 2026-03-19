-- =============================================================================
-- Migration 008 — Meme Studio
-- =============================================================================
-- Adds meme_drafts table and extends existing memes table with studio fields.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- meme_drafts — client-side canvas state persisted before final export
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS meme_drafts (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id              UUID NOT NULL REFERENCES orgs(id) ON DELETE CASCADE,
  name                TEXT NOT NULL DEFAULT 'Untitled Meme',
  state               JSONB NOT NULL DEFAULT '{}',
  thumbnail_data_url  TEXT,                         -- base64 or data URL preview
  cluster_id          UUID REFERENCES trend_clusters(id) ON DELETE SET NULL,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_meme_drafts_org_id     ON meme_drafts(org_id);
CREATE INDEX idx_meme_drafts_cluster_id ON meme_drafts(cluster_id) WHERE cluster_id IS NOT NULL;
CREATE INDEX idx_meme_drafts_updated_at ON meme_drafts(updated_at DESC);

-- ---------------------------------------------------------------------------
-- Extend memes table with studio output fields
-- ---------------------------------------------------------------------------

ALTER TABLE memes
  ADD COLUMN IF NOT EXISTS draft_id          UUID REFERENCES meme_drafts(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS layout            TEXT CHECK (layout IN ('standard','side_by_side','reaction','headline','quote_card')),
  ADD COLUMN IF NOT EXISTS export_size       TEXT CHECK (export_size IN ('square','portrait','story')) DEFAULT 'square',
  ADD COLUMN IF NOT EXISTS layers_snapshot   JSONB,
  ADD COLUMN IF NOT EXISTS punchline_concept TEXT,
  ADD COLUMN IF NOT EXISTS tokens_used       INTEGER DEFAULT 0;

CREATE INDEX IF NOT EXISTS idx_memes_draft_id ON memes(draft_id) WHERE draft_id IS NOT NULL;

-- ---------------------------------------------------------------------------
-- meme_punchlines — track AI punchline generations per org
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS meme_punchlines (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id       UUID NOT NULL REFERENCES orgs(id) ON DELETE CASCADE,
  cluster_id   UUID REFERENCES trend_clusters(id) ON DELETE SET NULL,
  topic        TEXT,
  suggestions  JSONB NOT NULL DEFAULT '[]',
  tokens_used  INTEGER NOT NULL DEFAULT 0,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_meme_punchlines_org_id     ON meme_punchlines(org_id);
CREATE INDEX idx_meme_punchlines_cluster_id ON meme_punchlines(cluster_id) WHERE cluster_id IS NOT NULL;
CREATE INDEX idx_meme_punchlines_created_at ON meme_punchlines(created_at DESC);

-- ---------------------------------------------------------------------------
-- RLS — meme_drafts
-- ---------------------------------------------------------------------------

ALTER TABLE meme_drafts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "org members can read drafts"
  ON meme_drafts FOR SELECT
  USING (
    org_id IN (
      SELECT org_id FROM org_members WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "org members can insert drafts"
  ON meme_drafts FOR INSERT
  WITH CHECK (
    org_id IN (
      SELECT org_id FROM org_members WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "org members can update drafts"
  ON meme_drafts FOR UPDATE
  USING (
    org_id IN (
      SELECT org_id FROM org_members WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "org members can delete drafts"
  ON meme_drafts FOR DELETE
  USING (
    org_id IN (
      SELECT org_id FROM org_members WHERE user_id = auth.uid()
    )
  );

-- ---------------------------------------------------------------------------
-- RLS — meme_punchlines
-- ---------------------------------------------------------------------------

ALTER TABLE meme_punchlines ENABLE ROW LEVEL SECURITY;

CREATE POLICY "org members can read punchlines"
  ON meme_punchlines FOR SELECT
  USING (
    org_id IN (
      SELECT org_id FROM org_members WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "org members can insert punchlines"
  ON meme_punchlines FOR INSERT
  WITH CHECK (
    org_id IN (
      SELECT org_id FROM org_members WHERE user_id = auth.uid()
    )
  );

-- ---------------------------------------------------------------------------
-- updated_at trigger for meme_drafts
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION update_meme_drafts_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_meme_drafts_updated_at
  BEFORE UPDATE ON meme_drafts
  FOR EACH ROW EXECUTE FUNCTION update_meme_drafts_updated_at();
