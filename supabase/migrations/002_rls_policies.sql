-- =============================================================================
-- OUTRAGE Content Engine — Migration 002: RLS Policies
-- Version: 1.0.0
-- Description: Row Level Security — enable on all tables + create all policies.
-- Run AFTER 001_initial_schema.sql.
-- =============================================================================

-- =============================================================================
-- HELPER FUNCTION (ensure it exists)
-- =============================================================================

CREATE OR REPLACE FUNCTION auth.user_org_ids()
RETURNS uuid[] LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT ARRAY(SELECT org_id FROM org_members WHERE user_id = auth.uid())
$$;

-- =============================================================================
-- ENABLE ROW LEVEL SECURITY ON ALL TABLES
-- =============================================================================

ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE org_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE sources ENABLE ROW LEVEL SECURITY;
ALTER TABLE source_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE source_sync_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE trend_clusters ENABLE ROW LEVEL SECURITY;
ALTER TABLE trend_cluster_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE trend_entities ENABLE ROW LEVEL SECURITY;
ALTER TABLE trend_cluster_entities ENABLE ROW LEVEL SECURITY;
ALTER TABLE trend_scores ENABLE ROW LEVEL SECURITY;
ALTER TABLE prompt_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE content_ideas ENABLE ROW LEVEL SECURITY;
ALTER TABLE content_variants ENABLE ROW LEVEL SECURITY;
ALTER TABLE meme_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE assets ENABLE ROW LEVEL SECURITY;
ALTER TABLE memes ENABLE ROW LEVEL SECURITY;
ALTER TABLE pipeline_stages_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE content_pipeline_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE content_calendar_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE post_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE performance_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE brand_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE alert_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE workflows ENABLE ROW LEVEL SECURITY;
ALTER TABLE canva_exports ENABLE ROW LEVEL SECURITY;
ALTER TABLE competitor_watchlist ENABLE ROW LEVEL SECURITY;
ALTER TABLE tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE cluster_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE content_idea_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE asset_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- =============================================================================
-- RLS POLICIES — organizations
-- =============================================================================

CREATE POLICY "org_members_can_read_their_org"
  ON organizations FOR SELECT
  TO authenticated
  USING (id = ANY(auth.user_org_ids()));

CREATE POLICY "service_role_manage_organizations"
  ON organizations FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- =============================================================================
-- RLS POLICIES — profiles
-- =============================================================================

CREATE POLICY "users_read_own_and_org_profiles"
  ON profiles FOR SELECT
  TO authenticated
  USING (
    id = auth.uid()
    OR id IN (
      SELECT om2.user_id
      FROM org_members om1
      JOIN org_members om2 ON om1.org_id = om2.org_id
      WHERE om1.user_id = auth.uid()
    )
  );

CREATE POLICY "users_insert_own_profile"
  ON profiles FOR INSERT
  TO authenticated
  WITH CHECK (id = auth.uid());

CREATE POLICY "users_update_own_profile"
  ON profiles FOR UPDATE
  TO authenticated
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

CREATE POLICY "service_role_manage_profiles"
  ON profiles FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- =============================================================================
-- RLS POLICIES — org_members
-- =============================================================================

CREATE POLICY "org_members_can_read_membership"
  ON org_members FOR SELECT
  TO authenticated
  USING (org_id = ANY(auth.user_org_ids()));

CREATE POLICY "org_admins_manage_members"
  ON org_members FOR ALL
  TO authenticated
  USING (
    org_id IN (
      SELECT org_id FROM org_members
      WHERE user_id = auth.uid() AND role IN ('owner','admin')
    )
  )
  WITH CHECK (
    org_id IN (
      SELECT org_id FROM org_members
      WHERE user_id = auth.uid() AND role IN ('owner','admin')
    )
  );

CREATE POLICY "service_role_manage_org_members"
  ON org_members FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- =============================================================================
-- RLS POLICIES — sources
-- =============================================================================

CREATE POLICY "org_members_read_sources"
  ON sources FOR SELECT
  TO authenticated
  USING (org_id = ANY(auth.user_org_ids()));

CREATE POLICY "editors_manage_sources"
  ON sources FOR ALL
  TO authenticated
  USING (
    org_id IN (
      SELECT org_id FROM org_members
      WHERE user_id = auth.uid() AND role IN ('owner','admin','editor')
    )
  )
  WITH CHECK (
    org_id IN (
      SELECT org_id FROM org_members
      WHERE user_id = auth.uid() AND role IN ('owner','admin','editor')
    )
  );

CREATE POLICY "service_role_manage_sources"
  ON sources FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- =============================================================================
-- RLS POLICIES — source_items
-- =============================================================================

CREATE POLICY "org_members_read_source_items"
  ON source_items FOR SELECT
  TO authenticated
  USING (
    source_id IN (
      SELECT id FROM sources WHERE org_id = ANY(auth.user_org_ids())
    )
  );

CREATE POLICY "editors_manage_source_items"
  ON source_items FOR ALL
  TO authenticated
  USING (
    source_id IN (
      SELECT s.id FROM sources s
      JOIN org_members om ON s.org_id = om.org_id
      WHERE om.user_id = auth.uid() AND om.role IN ('owner','admin','editor')
    )
  )
  WITH CHECK (
    source_id IN (
      SELECT s.id FROM sources s
      JOIN org_members om ON s.org_id = om.org_id
      WHERE om.user_id = auth.uid() AND om.role IN ('owner','admin','editor')
    )
  );

CREATE POLICY "service_role_manage_source_items"
  ON source_items FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- =============================================================================
-- RLS POLICIES — source_sync_logs
-- =============================================================================

CREATE POLICY "org_members_read_sync_logs"
  ON source_sync_logs FOR SELECT
  TO authenticated
  USING (
    source_id IN (
      SELECT id FROM sources WHERE org_id = ANY(auth.user_org_ids())
    )
  );

CREATE POLICY "service_role_manage_sync_logs"
  ON source_sync_logs FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- =============================================================================
-- RLS POLICIES — trend_clusters
-- =============================================================================

CREATE POLICY "org_members_read_trend_clusters"
  ON trend_clusters FOR SELECT
  TO authenticated
  USING (org_id = ANY(auth.user_org_ids()));

CREATE POLICY "editors_manage_trend_clusters"
  ON trend_clusters FOR ALL
  TO authenticated
  USING (
    org_id IN (
      SELECT org_id FROM org_members
      WHERE user_id = auth.uid() AND role IN ('owner','admin','editor')
    )
  )
  WITH CHECK (
    org_id IN (
      SELECT org_id FROM org_members
      WHERE user_id = auth.uid() AND role IN ('owner','admin','editor')
    )
  );

CREATE POLICY "service_role_manage_trend_clusters"
  ON trend_clusters FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- =============================================================================
-- RLS POLICIES — trend_cluster_items
-- =============================================================================

CREATE POLICY "org_members_read_cluster_items"
  ON trend_cluster_items FOR SELECT
  TO authenticated
  USING (
    cluster_id IN (
      SELECT id FROM trend_clusters WHERE org_id = ANY(auth.user_org_ids())
    )
  );

CREATE POLICY "service_role_manage_cluster_items"
  ON trend_cluster_items FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- =============================================================================
-- RLS POLICIES — trend_entities (global read)
-- =============================================================================

CREATE POLICY "authenticated_read_trend_entities"
  ON trend_entities FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "service_role_manage_trend_entities"
  ON trend_entities FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- =============================================================================
-- RLS POLICIES — trend_cluster_entities
-- =============================================================================

CREATE POLICY "org_members_read_cluster_entities"
  ON trend_cluster_entities FOR SELECT
  TO authenticated
  USING (
    cluster_id IN (
      SELECT id FROM trend_clusters WHERE org_id = ANY(auth.user_org_ids())
    )
  );

CREATE POLICY "service_role_manage_cluster_entities"
  ON trend_cluster_entities FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- =============================================================================
-- RLS POLICIES — trend_scores
-- =============================================================================

CREATE POLICY "org_members_read_trend_scores"
  ON trend_scores FOR SELECT
  TO authenticated
  USING (
    cluster_id IN (
      SELECT id FROM trend_clusters WHERE org_id = ANY(auth.user_org_ids())
    )
  );

CREATE POLICY "service_role_manage_trend_scores"
  ON trend_scores FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- =============================================================================
-- RLS POLICIES — prompt_templates
-- =============================================================================

CREATE POLICY "org_members_read_prompt_templates"
  ON prompt_templates FOR SELECT
  TO authenticated
  USING (org_id = ANY(auth.user_org_ids()));

CREATE POLICY "admins_manage_prompt_templates"
  ON prompt_templates FOR ALL
  TO authenticated
  USING (
    org_id IN (
      SELECT org_id FROM org_members
      WHERE user_id = auth.uid() AND role IN ('owner','admin')
    )
  )
  WITH CHECK (
    org_id IN (
      SELECT org_id FROM org_members
      WHERE user_id = auth.uid() AND role IN ('owner','admin')
    )
  );

CREATE POLICY "service_role_manage_prompt_templates"
  ON prompt_templates FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- =============================================================================
-- RLS POLICIES — content_ideas
-- =============================================================================

CREATE POLICY "org_members_read_content_ideas"
  ON content_ideas FOR SELECT
  TO authenticated
  USING (org_id = ANY(auth.user_org_ids()));

CREATE POLICY "editors_manage_content_ideas"
  ON content_ideas FOR ALL
  TO authenticated
  USING (
    org_id IN (
      SELECT org_id FROM org_members
      WHERE user_id = auth.uid() AND role IN ('owner','admin','editor')
    )
  )
  WITH CHECK (
    org_id IN (
      SELECT org_id FROM org_members
      WHERE user_id = auth.uid() AND role IN ('owner','admin','editor')
    )
  );

CREATE POLICY "service_role_manage_content_ideas"
  ON content_ideas FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- =============================================================================
-- RLS POLICIES — content_variants
-- =============================================================================

CREATE POLICY "org_members_read_content_variants"
  ON content_variants FOR SELECT
  TO authenticated
  USING (org_id = ANY(auth.user_org_ids()));

CREATE POLICY "editors_manage_content_variants"
  ON content_variants FOR ALL
  TO authenticated
  USING (
    org_id IN (
      SELECT org_id FROM org_members
      WHERE user_id = auth.uid() AND role IN ('owner','admin','editor')
    )
  )
  WITH CHECK (
    org_id IN (
      SELECT org_id FROM org_members
      WHERE user_id = auth.uid() AND role IN ('owner','admin','editor')
    )
  );

CREATE POLICY "service_role_manage_content_variants"
  ON content_variants FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- =============================================================================
-- RLS POLICIES — meme_templates (global read)
-- =============================================================================

CREATE POLICY "authenticated_read_meme_templates"
  ON meme_templates FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "service_role_manage_meme_templates"
  ON meme_templates FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- =============================================================================
-- RLS POLICIES — assets
-- =============================================================================

CREATE POLICY "org_members_read_assets"
  ON assets FOR SELECT
  TO authenticated
  USING (org_id = ANY(auth.user_org_ids()));

CREATE POLICY "editors_manage_assets"
  ON assets FOR ALL
  TO authenticated
  USING (
    org_id IN (
      SELECT org_id FROM org_members
      WHERE user_id = auth.uid() AND role IN ('owner','admin','editor')
    )
  )
  WITH CHECK (
    org_id IN (
      SELECT org_id FROM org_members
      WHERE user_id = auth.uid() AND role IN ('owner','admin','editor')
    )
  );

CREATE POLICY "service_role_manage_assets"
  ON assets FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- =============================================================================
-- RLS POLICIES — memes
-- =============================================================================

CREATE POLICY "org_members_read_memes"
  ON memes FOR SELECT
  TO authenticated
  USING (org_id = ANY(auth.user_org_ids()));

CREATE POLICY "editors_manage_memes"
  ON memes FOR ALL
  TO authenticated
  USING (
    org_id IN (
      SELECT org_id FROM org_members
      WHERE user_id = auth.uid() AND role IN ('owner','admin','editor')
    )
  )
  WITH CHECK (
    org_id IN (
      SELECT org_id FROM org_members
      WHERE user_id = auth.uid() AND role IN ('owner','admin','editor')
    )
  );

CREATE POLICY "service_role_manage_memes"
  ON memes FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- =============================================================================
-- RLS POLICIES — pipeline_stages_config
-- =============================================================================

CREATE POLICY "org_members_read_pipeline_stages"
  ON pipeline_stages_config FOR SELECT
  TO authenticated
  USING (org_id = ANY(auth.user_org_ids()));

CREATE POLICY "admins_manage_pipeline_stages"
  ON pipeline_stages_config FOR ALL
  TO authenticated
  USING (
    org_id IN (
      SELECT org_id FROM org_members
      WHERE user_id = auth.uid() AND role IN ('owner','admin')
    )
  )
  WITH CHECK (
    org_id IN (
      SELECT org_id FROM org_members
      WHERE user_id = auth.uid() AND role IN ('owner','admin')
    )
  );

CREATE POLICY "service_role_manage_pipeline_stages"
  ON pipeline_stages_config FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- =============================================================================
-- RLS POLICIES — content_pipeline_items
-- =============================================================================

CREATE POLICY "org_members_read_pipeline_items"
  ON content_pipeline_items FOR SELECT
  TO authenticated
  USING (org_id = ANY(auth.user_org_ids()));

CREATE POLICY "editors_manage_pipeline_items"
  ON content_pipeline_items FOR ALL
  TO authenticated
  USING (
    org_id IN (
      SELECT org_id FROM org_members
      WHERE user_id = auth.uid() AND role IN ('owner','admin','editor')
    )
  )
  WITH CHECK (
    org_id IN (
      SELECT org_id FROM org_members
      WHERE user_id = auth.uid() AND role IN ('owner','admin','editor')
    )
  );

CREATE POLICY "service_role_manage_pipeline_items"
  ON content_pipeline_items FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- =============================================================================
-- RLS POLICIES — content_calendar_items
-- =============================================================================

CREATE POLICY "org_members_read_calendar_items"
  ON content_calendar_items FOR SELECT
  TO authenticated
  USING (org_id = ANY(auth.user_org_ids()));

CREATE POLICY "editors_manage_calendar_items"
  ON content_calendar_items FOR ALL
  TO authenticated
  USING (
    org_id IN (
      SELECT org_id FROM org_members
      WHERE user_id = auth.uid() AND role IN ('owner','admin','editor')
    )
  )
  WITH CHECK (
    org_id IN (
      SELECT org_id FROM org_members
      WHERE user_id = auth.uid() AND role IN ('owner','admin','editor')
    )
  );

CREATE POLICY "service_role_manage_calendar_items"
  ON content_calendar_items FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- =============================================================================
-- RLS POLICIES — post_results
-- =============================================================================

CREATE POLICY "org_members_read_post_results"
  ON post_results FOR SELECT
  TO authenticated
  USING (org_id = ANY(auth.user_org_ids()));

CREATE POLICY "service_role_manage_post_results"
  ON post_results FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- =============================================================================
-- RLS POLICIES — performance_metrics
-- =============================================================================

CREATE POLICY "org_members_read_performance_metrics"
  ON performance_metrics FOR SELECT
  TO authenticated
  USING (
    post_result_id IN (
      SELECT id FROM post_results WHERE org_id = ANY(auth.user_org_ids())
    )
  );

CREATE POLICY "service_role_manage_performance_metrics"
  ON performance_metrics FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- =============================================================================
-- RLS POLICIES — brand_settings
-- =============================================================================

CREATE POLICY "org_members_read_brand_settings"
  ON brand_settings FOR SELECT
  TO authenticated
  USING (org_id = ANY(auth.user_org_ids()));

CREATE POLICY "admins_manage_brand_settings"
  ON brand_settings FOR ALL
  TO authenticated
  USING (
    org_id IN (
      SELECT org_id FROM org_members
      WHERE user_id = auth.uid() AND role IN ('owner','admin')
    )
  )
  WITH CHECK (
    org_id IN (
      SELECT org_id FROM org_members
      WHERE user_id = auth.uid() AND role IN ('owner','admin')
    )
  );

CREATE POLICY "service_role_manage_brand_settings"
  ON brand_settings FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- =============================================================================
-- RLS POLICIES — alert_rules
-- =============================================================================

CREATE POLICY "org_members_read_alert_rules"
  ON alert_rules FOR SELECT
  TO authenticated
  USING (org_id = ANY(auth.user_org_ids()));

CREATE POLICY "admins_manage_alert_rules"
  ON alert_rules FOR ALL
  TO authenticated
  USING (
    org_id IN (
      SELECT org_id FROM org_members
      WHERE user_id = auth.uid() AND role IN ('owner','admin')
    )
  )
  WITH CHECK (
    org_id IN (
      SELECT org_id FROM org_members
      WHERE user_id = auth.uid() AND role IN ('owner','admin')
    )
  );

CREATE POLICY "service_role_manage_alert_rules"
  ON alert_rules FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- =============================================================================
-- RLS POLICIES — notifications
-- =============================================================================

CREATE POLICY "users_read_own_notifications"
  ON notifications FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "users_update_own_notifications"
  ON notifications FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "service_role_manage_notifications"
  ON notifications FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- =============================================================================
-- RLS POLICIES — workflows
-- =============================================================================

CREATE POLICY "org_members_read_workflows"
  ON workflows FOR SELECT
  TO authenticated
  USING (org_id = ANY(auth.user_org_ids()));

CREATE POLICY "admins_manage_workflows"
  ON workflows FOR ALL
  TO authenticated
  USING (
    org_id IN (
      SELECT org_id FROM org_members
      WHERE user_id = auth.uid() AND role IN ('owner','admin')
    )
  )
  WITH CHECK (
    org_id IN (
      SELECT org_id FROM org_members
      WHERE user_id = auth.uid() AND role IN ('owner','admin')
    )
  );

CREATE POLICY "service_role_manage_workflows"
  ON workflows FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- =============================================================================
-- RLS POLICIES — canva_exports
-- =============================================================================

CREATE POLICY "org_members_read_canva_exports"
  ON canva_exports FOR SELECT
  TO authenticated
  USING (org_id = ANY(auth.user_org_ids()));

CREATE POLICY "editors_manage_canva_exports"
  ON canva_exports FOR ALL
  TO authenticated
  USING (
    org_id IN (
      SELECT org_id FROM org_members
      WHERE user_id = auth.uid() AND role IN ('owner','admin','editor')
    )
  )
  WITH CHECK (
    org_id IN (
      SELECT org_id FROM org_members
      WHERE user_id = auth.uid() AND role IN ('owner','admin','editor')
    )
  );

CREATE POLICY "service_role_manage_canva_exports"
  ON canva_exports FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- =============================================================================
-- RLS POLICIES — competitor_watchlist
-- =============================================================================

CREATE POLICY "org_members_read_competitor_watchlist"
  ON competitor_watchlist FOR SELECT
  TO authenticated
  USING (org_id = ANY(auth.user_org_ids()));

CREATE POLICY "editors_manage_competitor_watchlist"
  ON competitor_watchlist FOR ALL
  TO authenticated
  USING (
    org_id IN (
      SELECT org_id FROM org_members
      WHERE user_id = auth.uid() AND role IN ('owner','admin','editor')
    )
  )
  WITH CHECK (
    org_id IN (
      SELECT org_id FROM org_members
      WHERE user_id = auth.uid() AND role IN ('owner','admin','editor')
    )
  );

CREATE POLICY "service_role_manage_competitor_watchlist"
  ON competitor_watchlist FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- =============================================================================
-- RLS POLICIES — tags
-- =============================================================================

CREATE POLICY "org_members_read_tags"
  ON tags FOR SELECT
  TO authenticated
  USING (org_id = ANY(auth.user_org_ids()));

CREATE POLICY "editors_manage_tags"
  ON tags FOR ALL
  TO authenticated
  USING (
    org_id IN (
      SELECT org_id FROM org_members
      WHERE user_id = auth.uid() AND role IN ('owner','admin','editor')
    )
  )
  WITH CHECK (
    org_id IN (
      SELECT org_id FROM org_members
      WHERE user_id = auth.uid() AND role IN ('owner','admin','editor')
    )
  );

CREATE POLICY "service_role_manage_tags"
  ON tags FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- =============================================================================
-- RLS POLICIES — cluster_tags
-- =============================================================================

CREATE POLICY "org_members_read_cluster_tags"
  ON cluster_tags FOR SELECT
  TO authenticated
  USING (
    cluster_id IN (
      SELECT id FROM trend_clusters WHERE org_id = ANY(auth.user_org_ids())
    )
  );

CREATE POLICY "service_role_manage_cluster_tags"
  ON cluster_tags FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- =============================================================================
-- RLS POLICIES — content_idea_tags
-- =============================================================================

CREATE POLICY "org_members_read_content_idea_tags"
  ON content_idea_tags FOR SELECT
  TO authenticated
  USING (
    idea_id IN (
      SELECT id FROM content_ideas WHERE org_id = ANY(auth.user_org_ids())
    )
  );

CREATE POLICY "service_role_manage_content_idea_tags"
  ON content_idea_tags FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- =============================================================================
-- RLS POLICIES — asset_tags
-- =============================================================================

CREATE POLICY "org_members_read_asset_tags"
  ON asset_tags FOR SELECT
  TO authenticated
  USING (
    asset_id IN (
      SELECT id FROM assets WHERE org_id = ANY(auth.user_org_ids())
    )
  );

CREATE POLICY "service_role_manage_asset_tags"
  ON asset_tags FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- =============================================================================
-- RLS POLICIES — audit_logs
-- =============================================================================

CREATE POLICY "admins_read_audit_logs"
  ON audit_logs FOR SELECT
  TO authenticated
  USING (
    org_id IN (
      SELECT org_id FROM org_members
      WHERE user_id = auth.uid() AND role IN ('owner','admin')
    )
  );

CREATE POLICY "service_role_insert_audit_logs"
  ON audit_logs FOR INSERT
  TO service_role
  WITH CHECK (true);

CREATE POLICY "service_role_read_audit_logs"
  ON audit_logs FOR SELECT
  TO service_role
  USING (true);
