-- =============================================================================
-- Migration 005 — Trend Scoring Engine
-- Extends trend_scores with 10-dimension score columns, recommended action,
-- score explanations (jsonb), recommended formats, and a per-org
-- scoring_weights configuration table.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 1. Extend trend_scores with new dimension columns
-- ---------------------------------------------------------------------------

ALTER TABLE trend_scores
  -- New dimension columns (the existing schema only has viral_potential,
  -- brand_fit, urgency, controversy_level, audience_relevance, overall_score)
  ADD COLUMN IF NOT EXISTS outrage_fit_score          int CHECK (outrage_fit_score >= 0 AND outrage_fit_score <= 100),
  ADD COLUMN IF NOT EXISTS meme_potential_score       int CHECK (meme_potential_score >= 0 AND meme_potential_score <= 100),
  ADD COLUMN IF NOT EXISTS debate_potential_score     int CHECK (debate_potential_score >= 0 AND debate_potential_score <= 100),
  ADD COLUMN IF NOT EXISTS shelf_life_score           int CHECK (shelf_life_score >= 0 AND shelf_life_score <= 100),
  ADD COLUMN IF NOT EXISTS visual_potential_score     int CHECK (visual_potential_score >= 0 AND visual_potential_score <= 100),
  ADD COLUMN IF NOT EXISTS reel_potential_score       int CHECK (reel_potential_score >= 0 AND reel_potential_score <= 100),
  ADD COLUMN IF NOT EXISTS instagram_shareability_score int CHECK (instagram_shareability_score >= 0 AND instagram_shareability_score <= 100),
  ADD COLUMN IF NOT EXISTS brand_safety_score         int CHECK (brand_safety_score >= 0 AND brand_safety_score <= 100),
  ADD COLUMN IF NOT EXISTS total_priority_score       int CHECK (total_priority_score >= 0 AND total_priority_score <= 100),

  -- Recommended action
  ADD COLUMN IF NOT EXISTS recommended_action         text CHECK (
    recommended_action IN ('post_now', 'post_soon', 'save_for_later', 'ignore', 'too_risky')
  ),

  -- Structured explanation per dimension (jsonb — see ScoreExplanations type)
  ADD COLUMN IF NOT EXISTS score_explanations         jsonb NOT NULL DEFAULT '{}'::jsonb,

  -- Recommended content formats (array of ContentType enum values)
  ADD COLUMN IF NOT EXISTS recommended_formats        text[] NOT NULL DEFAULT '{}',

  -- Which scoring engine version produced this row
  ADD COLUMN IF NOT EXISTS scoring_engine_version     text;

COMMENT ON COLUMN trend_scores.outrage_fit_score IS 'How well this trend fits the OUTRAGE brand angle (0-100).';
COMMENT ON COLUMN trend_scores.meme_potential_score IS 'Likelihood this trend can be turned into a viral meme (0-100).';
COMMENT ON COLUMN trend_scores.debate_potential_score IS 'Likelihood this trend sparks debate and comment engagement (0-100).';
COMMENT ON COLUMN trend_scores.shelf_life_score IS 'How long this trend will stay relevant (0-100, higher = longer).';
COMMENT ON COLUMN trend_scores.visual_potential_score IS 'Strength of visual assets or visual narrative (0-100).';
COMMENT ON COLUMN trend_scores.reel_potential_score IS 'Suitability for a short-form Reel or TikTok (0-100).';
COMMENT ON COLUMN trend_scores.instagram_shareability_score IS 'How shareable this trend is on Instagram (0-100).';
COMMENT ON COLUMN trend_scores.brand_safety_score IS 'Brand safety rating — higher is safer to post (0-100).';
COMMENT ON COLUMN trend_scores.total_priority_score IS 'Weighted composite priority score (0-100).';
COMMENT ON COLUMN trend_scores.recommended_action IS 'System recommendation: post_now | post_soon | save_for_later | ignore | too_risky.';
COMMENT ON COLUMN trend_scores.score_explanations IS 'Per-dimension explanation objects including factors and labels.';
COMMENT ON COLUMN trend_scores.recommended_formats IS 'Ordered list of recommended ContentType formats for this trend.';
COMMENT ON COLUMN trend_scores.scoring_engine_version IS 'Version of the scoring engine that produced this row.';

-- ---------------------------------------------------------------------------
-- 2. New indexes on frequently filtered columns
-- ---------------------------------------------------------------------------

CREATE INDEX IF NOT EXISTS idx_trend_scores_total_priority
  ON trend_scores(total_priority_score DESC);

CREATE INDEX IF NOT EXISTS idx_trend_scores_recommended_action
  ON trend_scores(recommended_action);

CREATE INDEX IF NOT EXISTS idx_trend_scores_brand_safety
  ON trend_scores(brand_safety_score);

-- ---------------------------------------------------------------------------
-- 3. scoring_weights — per-org configurable weight configuration
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS scoring_weights (
  id                            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id                        uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name                          text NOT NULL,
  description                   text,
  is_active                     boolean NOT NULL DEFAULT false,
  preset                        text CHECK (preset IN ('default', 'conservative', 'viral_maximiser', 'custom')),

  -- Dimension weights (must sum to ~1.0)
  w_virality                    numeric(5,4) NOT NULL DEFAULT 0.2200,
  w_outrage_fit                 numeric(5,4) NOT NULL DEFAULT 0.2000,
  w_urgency                     numeric(5,4) NOT NULL DEFAULT 0.1500,
  w_debate_potential            numeric(5,4) NOT NULL DEFAULT 0.1200,
  w_meme_potential              numeric(5,4) NOT NULL DEFAULT 0.1000,
  w_reel_potential              numeric(5,4) NOT NULL DEFAULT 0.0700,
  w_instagram_shareability      numeric(5,4) NOT NULL DEFAULT 0.0600,
  w_visual_potential            numeric(5,4) NOT NULL DEFAULT 0.0500,
  w_shelf_life                  numeric(5,4) NOT NULL DEFAULT 0.0300,

  -- Action thresholds
  t_post_now_priority           int NOT NULL DEFAULT 72,
  t_post_now_urgency            int NOT NULL DEFAULT 55,
  t_post_now_safety             int NOT NULL DEFAULT 55,
  t_post_soon_priority          int NOT NULL DEFAULT 52,
  t_post_soon_safety            int NOT NULL DEFAULT 45,
  t_save_for_later_priority     int NOT NULL DEFAULT 35,
  t_save_for_later_shelf_life   int NOT NULL DEFAULT 40,
  t_too_risky_safety            int NOT NULL DEFAULT 28,

  -- Misc
  engagement_viral_floor        int NOT NULL DEFAULT 5000,
  saturation_penalty_after      int NOT NULL DEFAULT 25,
  saturation_penalty_per_source numeric(4,2) NOT NULL DEFAULT 1.0,

  created_by                    uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at                    timestamptz NOT NULL DEFAULT now(),
  updated_at                    timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE scoring_weights IS 'Per-org configurable scoring engine weight profiles. One active profile per org at a time.';

-- Only one active profile per org
CREATE UNIQUE INDEX IF NOT EXISTS scoring_weights_active_per_org
  ON scoring_weights(org_id)
  WHERE is_active = true;

CREATE INDEX IF NOT EXISTS idx_scoring_weights_org_id ON scoring_weights(org_id);

-- ---------------------------------------------------------------------------
-- 4. RLS for scoring_weights
-- ---------------------------------------------------------------------------

ALTER TABLE scoring_weights ENABLE ROW LEVEL SECURITY;

CREATE POLICY "org_members_read_scoring_weights"
  ON scoring_weights FOR SELECT
  TO authenticated
  USING (org_id = ANY(auth.user_org_ids()));

CREATE POLICY "org_admins_manage_scoring_weights"
  ON scoring_weights FOR ALL
  TO authenticated
  USING (
    org_id IN (
      SELECT org_id FROM org_members
      WHERE user_id = auth.uid()
        AND role IN ('owner', 'admin')
    )
  )
  WITH CHECK (
    org_id IN (
      SELECT org_id FROM org_members
      WHERE user_id = auth.uid()
        AND role IN ('owner', 'admin')
    )
  );

CREATE POLICY "service_role_manage_scoring_weights"
  ON scoring_weights FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- ---------------------------------------------------------------------------
-- 5. updated_at trigger for scoring_weights
-- ---------------------------------------------------------------------------

CREATE OR REPLACE TRIGGER set_scoring_weights_updated_at
  BEFORE UPDATE ON scoring_weights
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ---------------------------------------------------------------------------
-- 6. Seed default weight profile for existing orgs
--    (safe to run multiple times — uses INSERT ... ON CONFLICT DO NOTHING)
-- ---------------------------------------------------------------------------

INSERT INTO scoring_weights (
  org_id, name, description, is_active, preset,
  w_virality, w_outrage_fit, w_urgency, w_debate_potential, w_meme_potential,
  w_reel_potential, w_instagram_shareability, w_visual_potential, w_shelf_life
)
SELECT
  id,
  'Default (OUTRAGE)',
  'Balanced weights tuned for the OUTRAGE brand — prioritises virality and outrage fit.',
  true,
  'default',
  0.2200, 0.2000, 0.1500, 0.1200, 0.1000,
  0.0700, 0.0600, 0.0500, 0.0300
FROM organizations
ON CONFLICT DO NOTHING;
