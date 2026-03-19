-- ============================================================
-- 010_pipeline_v2.sql — Content Pipeline v2 (9-status kanban)
-- ============================================================

-- New status enum
CREATE TYPE pipeline_status AS ENUM (
  'detected',
  'worth_exploring',
  'drafting',
  'designed',
  'approved',
  'scheduled',
  'posted',
  'archived',
  'rejected'
);

-- Main pipeline items table
CREATE TABLE IF NOT EXISTS content_pipeline_items (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id       uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  cluster_id   uuid REFERENCES trend_clusters(id) ON DELETE SET NULL,
  idea_id      uuid REFERENCES content_ideas(id) ON DELETE SET NULL,

  -- Core content
  title        text NOT NULL,
  headline     text,
  caption      text,
  format       text,    -- post, reel, story, meme, carousel, article, poll, tweet
  platform     text,    -- instagram, tiktok, twitter, facebook, youtube, linkedin

  -- Pipeline state
  status       pipeline_status NOT NULL DEFAULT 'detected',
  urgency      integer DEFAULT 50 CHECK (urgency BETWEEN 0 AND 100),
  position     integer DEFAULT 0,

  -- Design & assets
  design_link  text,
  asset_refs   jsonb DEFAULT '[]'::jsonb,

  -- Metadata
  tags         text[]    DEFAULT '{}',
  notes        text,

  -- Ownership & timing
  owner_id     uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  due_at       timestamptz,
  publish_at   timestamptz,

  -- Approval
  approved_at  timestamptz,
  approved_by  uuid REFERENCES auth.users(id) ON DELETE SET NULL,

  metadata     jsonb DEFAULT '{}'::jsonb,
  created_at   timestamptz DEFAULT now(),
  updated_at   timestamptz DEFAULT now()
);

-- Auto-update timestamp
CREATE OR REPLACE FUNCTION update_pipeline_items_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER pipeline_items_updated_at
  BEFORE UPDATE ON content_pipeline_items
  FOR EACH ROW EXECUTE FUNCTION update_pipeline_items_updated_at();

-- Indexes
CREATE INDEX idx_pipeline_items_org_status ON content_pipeline_items(org_id, status);
CREATE INDEX idx_pipeline_items_cluster    ON content_pipeline_items(cluster_id) WHERE cluster_id IS NOT NULL;
CREATE INDEX idx_pipeline_items_updated    ON content_pipeline_items(updated_at DESC);

-- RLS
ALTER TABLE content_pipeline_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "org members can manage pipeline items"
  ON content_pipeline_items
  USING (org_id IN (
    SELECT org_id FROM org_members WHERE user_id = auth.uid()
  ))
  WITH CHECK (org_id IN (
    SELECT org_id FROM org_members WHERE user_id = auth.uid()
  ));
