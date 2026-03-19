-- =============================================================================
-- OUTRAGE Content Engine — Master Schema
-- Version: 1.0.0
-- Description: Complete production schema for OUTRAGE AI-powered viral content
--              management system. Run on a fresh Supabase database.
-- =============================================================================

-- =============================================================================
-- EXTENSIONS
-- =============================================================================
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";
CREATE EXTENSION IF NOT EXISTS "unaccent";

-- =============================================================================
-- ENUMS
-- =============================================================================

DO $$ BEGIN
  CREATE TYPE source_type AS ENUM ('rss','reddit','youtube','twitter','instagram','tiktok','manual','api');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE source_status AS ENUM ('active','paused','error','pending');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE source_item_status AS ENUM ('new','processed','clustered','ignored','error');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE sync_status AS ENUM ('running','success','partial','failed');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE cluster_status AS ENUM ('new','active','hot','declining','archived','acted_on');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE content_category AS ENUM ('celebrity','music','sports','politics','entertainment','meme','viral','fashion','tech','culture','crime','drama','other');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE entity_type AS ENUM ('person','brand','place','event','show','song','movie','topic','hashtag','other');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE content_type AS ENUM ('headline','hook','caption','meme_idea','reel_idea','tweet','poll','post_copy','thread','short_form_video','long_form','newsletter');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE content_angle AS ENUM ('outrage','humor','informational','reaction','hot_take','educational','inspirational','controversial','nostalgic');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE content_platform AS ENUM ('instagram','tiktok','twitter','youtube','threads','facebook','linkedin','newsletter','all');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE variant_status AS ENUM ('draft','review','approved','rejected','published','archived');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE meme_status AS ENUM ('draft','generated','approved','rejected','published');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE asset_type AS ENUM ('image','video','gif','audio','document','template','other');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE pipeline_stage AS ENUM ('idea','drafting','review','approved','scheduling','published','archived');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE notification_type AS ENUM ('trend_alert','score_threshold','trend_spike','content_approved','content_rejected','mention','system','competitor_alert');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE notification_severity AS ENUM ('info','medium','high','critical');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE alert_trigger_type AS ENUM ('score_threshold','trend_spike','keyword_match','competitor_mention','source_error','new_trend');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE workflow_status AS ENUM ('active','inactive','error','running');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE org_plan AS ENUM ('free','pro','enterprise');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE member_role AS ENUM ('owner','admin','editor','viewer');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE prompt_type AS ENUM ('scoring','content','meme','clustering','brand');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- =============================================================================
-- HELPER FUNCTIONS
-- =============================================================================

CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION auth.user_org_ids()
RETURNS uuid[] LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT ARRAY(SELECT org_id FROM org_members WHERE user_id = auth.uid())
$$;

-- =============================================================================
-- TABLES — AUTH / ORG DOMAIN
-- =============================================================================

CREATE TABLE IF NOT EXISTS organizations (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name            text NOT NULL,
  slug            text NOT NULL UNIQUE,
  logo_url        text,
  plan            org_plan NOT NULL DEFAULT 'free',
  settings        jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);
COMMENT ON TABLE organizations IS 'Top-level tenant organizations using OUTRAGE.';

CREATE TABLE IF NOT EXISTS profiles (
  id              uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email           text NOT NULL,
  full_name       text,
  avatar_url      text,
  role            member_role NOT NULL DEFAULT 'viewer',
  timezone        text NOT NULL DEFAULT 'UTC',
  preferences     jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);
COMMENT ON TABLE profiles IS 'Extended user profile data, one row per auth.users record.';

CREATE TABLE IF NOT EXISTS org_members (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id          uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  user_id         uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role            member_role NOT NULL DEFAULT 'viewer',
  invited_by      uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  joined_at       timestamptz NOT NULL DEFAULT now(),
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now(),
  UNIQUE(org_id, user_id)
);
COMMENT ON TABLE org_members IS 'Many-to-many mapping of users to organizations with their role.';

-- =============================================================================
-- TABLES — INGESTION DOMAIN
-- =============================================================================

CREATE TABLE IF NOT EXISTS sources (
  id                      uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id                  uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name                    text NOT NULL,
  type                    source_type NOT NULL DEFAULT 'rss',
  url                     text,
  config                  jsonb NOT NULL DEFAULT '{}'::jsonb,
  status                  source_status NOT NULL DEFAULT 'pending',
  category                content_category,
  tags                    text[] NOT NULL DEFAULT '{}'::text[],
  fetch_interval_minutes  int NOT NULL DEFAULT 30,
  last_fetched_at         timestamptz,
  error_count             int NOT NULL DEFAULT 0,
  last_error              text,
  created_by              uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at              timestamptz NOT NULL DEFAULT now(),
  updated_at              timestamptz NOT NULL DEFAULT now()
);
COMMENT ON TABLE sources IS 'Configured content ingestion sources (RSS, Reddit, social, etc.).';

CREATE TABLE IF NOT EXISTS source_items (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source_id       uuid NOT NULL REFERENCES sources(id) ON DELETE CASCADE,
  external_id     text,
  title           text,
  body            text,
  url             text,
  author          text,
  thumbnail_url   text,
  media_urls      text[] NOT NULL DEFAULT '{}'::text[],
  published_at    timestamptz,
  fetched_at      timestamptz NOT NULL DEFAULT now(),
  status          source_item_status NOT NULL DEFAULT 'new',
  keywords        text[] NOT NULL DEFAULT '{}'::text[],
  entities        jsonb NOT NULL DEFAULT '{}'::jsonb,
  sentiment_score numeric(4,3),
  engagement_data jsonb NOT NULL DEFAULT '{}'::jsonb,
  raw_data        jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);
COMMENT ON TABLE source_items IS 'Individual content items fetched from sources, deduplicated by source+external_id.';

-- Partial unique index for dedup (only when external_id is not null)
CREATE UNIQUE INDEX IF NOT EXISTS source_items_dedup_idx
  ON source_items(source_id, external_id)
  WHERE external_id IS NOT NULL;

CREATE TABLE IF NOT EXISTS source_sync_logs (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source_id         uuid NOT NULL REFERENCES sources(id) ON DELETE CASCADE,
  status            sync_status NOT NULL DEFAULT 'running',
  items_fetched     int NOT NULL DEFAULT 0,
  items_new         int NOT NULL DEFAULT 0,
  items_duplicate   int NOT NULL DEFAULT 0,
  items_error       int NOT NULL DEFAULT 0,
  error_message     text,
  started_at        timestamptz NOT NULL DEFAULT now(),
  completed_at      timestamptz,
  metadata          jsonb NOT NULL DEFAULT '{}'::jsonb
);
COMMENT ON TABLE source_sync_logs IS 'Audit log of each sync run per source with item counts and errors.';

-- =============================================================================
-- TABLES — TREND DOMAIN
-- =============================================================================

CREATE TABLE IF NOT EXISTS trend_clusters (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id          uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  title           text NOT NULL,
  summary         text,
  category        content_category,
  status          cluster_status NOT NULL DEFAULT 'new',
  overall_score   int NOT NULL DEFAULT 0 CHECK (overall_score >= 0 AND overall_score <= 100),
  source_count    int NOT NULL DEFAULT 0,
  keywords        text[] NOT NULL DEFAULT '{}'::text[],
  thumbnail_url   text,
  first_seen_at   timestamptz NOT NULL DEFAULT now(),
  last_seen_at    timestamptz NOT NULL DEFAULT now(),
  peaked_at       timestamptz,
  acted_on        bool NOT NULL DEFAULT false,
  acted_on_at     timestamptz,
  acted_on_by     uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  is_manual       bool NOT NULL DEFAULT false,
  created_by      uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);
COMMENT ON TABLE trend_clusters IS 'Grouped clusters of related source items representing a single trending topic.';

CREATE TABLE IF NOT EXISTS trend_cluster_items (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cluster_id        uuid NOT NULL REFERENCES trend_clusters(id) ON DELETE CASCADE,
  source_item_id    uuid NOT NULL REFERENCES source_items(id) ON DELETE CASCADE,
  relevance_score   numeric(4,3),
  created_at        timestamptz NOT NULL DEFAULT now(),
  UNIQUE(cluster_id, source_item_id)
);
COMMENT ON TABLE trend_cluster_items IS 'Join table linking source items to trend clusters with a relevance score.';

CREATE TABLE IF NOT EXISTS trend_entities (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name        text NOT NULL UNIQUE,
  type        entity_type NOT NULL DEFAULT 'other',
  aliases     text[] NOT NULL DEFAULT '{}'::text[],
  metadata    jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);
COMMENT ON TABLE trend_entities IS 'Named entities (people, brands, places, etc.) extracted from trend data.';

CREATE TABLE IF NOT EXISTS trend_cluster_entities (
  cluster_id      uuid NOT NULL REFERENCES trend_clusters(id) ON DELETE CASCADE,
  entity_id       uuid NOT NULL REFERENCES trend_entities(id) ON DELETE CASCADE,
  mention_count   int NOT NULL DEFAULT 1,
  created_at      timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY(cluster_id, entity_id)
);
COMMENT ON TABLE trend_cluster_entities IS 'Many-to-many: entities mentioned within a trend cluster with counts.';

CREATE TABLE IF NOT EXISTS trend_scores (
  id                      uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cluster_id              uuid NOT NULL REFERENCES trend_clusters(id) ON DELETE CASCADE,
  viral_potential         int NOT NULL DEFAULT 0 CHECK (viral_potential >= 0 AND viral_potential <= 100),
  brand_fit               int NOT NULL DEFAULT 0 CHECK (brand_fit >= 0 AND brand_fit <= 100),
  urgency                 int NOT NULL DEFAULT 0 CHECK (urgency >= 0 AND urgency <= 100),
  controversy_level       int NOT NULL DEFAULT 0 CHECK (controversy_level >= 0 AND controversy_level <= 100),
  audience_relevance      int NOT NULL DEFAULT 0 CHECK (audience_relevance >= 0 AND audience_relevance <= 100),
  overall_score           int NOT NULL DEFAULT 0 CHECK (overall_score >= 0 AND overall_score <= 100),
  scoring_model           text,
  scoring_prompt_version  text,
  reasoning               text,
  raw_response            jsonb NOT NULL DEFAULT '{}'::jsonb,
  scored_at               timestamptz NOT NULL DEFAULT now(),
  scored_by               uuid REFERENCES auth.users(id) ON DELETE SET NULL
);
COMMENT ON TABLE trend_scores IS 'AI-generated multi-dimensional virality scores for trend clusters.';

-- =============================================================================
-- TABLES — BRAND / AI DOMAIN (must come before content_ideas)
-- =============================================================================

CREATE TABLE IF NOT EXISTS prompt_templates (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id          uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name            text NOT NULL,
  description     text,
  prompt_type     prompt_type NOT NULL DEFAULT 'content',
  system_prompt   text NOT NULL,
  user_prompt     text NOT NULL,
  variables       text[] NOT NULL DEFAULT '{}'::text[],
  model           text NOT NULL DEFAULT 'gpt-4o',
  temperature     numeric(3,2) NOT NULL DEFAULT 0.7 CHECK (temperature >= 0 AND temperature <= 2),
  max_tokens      int NOT NULL DEFAULT 1000,
  version         int NOT NULL DEFAULT 1,
  is_active       bool NOT NULL DEFAULT true,
  is_default      bool NOT NULL DEFAULT false,
  created_by      uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);
COMMENT ON TABLE prompt_templates IS 'Versioned AI prompt templates for scoring, content generation, meme captions, etc.';

-- =============================================================================
-- TABLES — CONTENT DOMAIN
-- =============================================================================

CREATE TABLE IF NOT EXISTS content_ideas (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cluster_id          uuid REFERENCES trend_clusters(id) ON DELETE SET NULL,
  org_id              uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  type                content_type NOT NULL DEFAULT 'caption',
  angle               content_angle NOT NULL DEFAULT 'outrage',
  platform            content_platform NOT NULL DEFAULT 'instagram',
  content             text NOT NULL,
  hook                text,
  cta                 text,
  tags                text[] NOT NULL DEFAULT '{}'::text[],
  is_saved            bool NOT NULL DEFAULT false,
  is_used             bool NOT NULL DEFAULT false,
  used_at             timestamptz,
  generated_by        text,
  prompt_template_id  uuid REFERENCES prompt_templates(id) ON DELETE SET NULL,
  model_used          text,
  created_by          uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now()
);
COMMENT ON TABLE content_ideas IS 'AI-generated content ideas (headlines, captions, hooks, etc.) linked to trend clusters.';

CREATE TABLE IF NOT EXISTS content_variants (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  idea_id           uuid REFERENCES content_ideas(id) ON DELETE SET NULL,
  cluster_id        uuid REFERENCES trend_clusters(id) ON DELETE SET NULL,
  org_id            uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  title             text,
  body              text NOT NULL,
  platform          content_platform NOT NULL DEFAULT 'instagram',
  type              content_type NOT NULL DEFAULT 'caption',
  status            variant_status NOT NULL DEFAULT 'draft',
  version           int NOT NULL DEFAULT 1,
  parent_variant_id uuid REFERENCES content_variants(id) ON DELETE SET NULL,
  metadata          jsonb NOT NULL DEFAULT '{}'::jsonb,
  scheduled_for     timestamptz,
  published_at      timestamptz,
  created_by        uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  assigned_to       uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  approved_by       uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now()
);
COMMENT ON TABLE content_variants IS 'Editable content drafts and their version history for publishing.';

-- =============================================================================
-- TABLES — MEME DOMAIN
-- =============================================================================

CREATE TABLE IF NOT EXISTS meme_templates (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name            text NOT NULL,
  external_id     text,
  source          text NOT NULL DEFAULT 'imgflip',
  image_url       text NOT NULL,
  thumbnail_url   text,
  box_count       int NOT NULL DEFAULT 2,
  tags            text[] NOT NULL DEFAULT '{}'::text[],
  usage_count     int NOT NULL DEFAULT 0,
  is_active       bool NOT NULL DEFAULT true,
  metadata        jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);
COMMENT ON TABLE meme_templates IS 'Library of meme image templates (imgflip or custom) used for meme generation.';

CREATE TABLE IF NOT EXISTS assets (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id              uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name                text NOT NULL,
  type                asset_type NOT NULL DEFAULT 'image',
  url                 text NOT NULL,
  storage_path        text,
  mime_type           text,
  file_size_bytes     bigint,
  width               int,
  height              int,
  duration_seconds    numeric,
  alt_text            text,
  tags                text[] NOT NULL DEFAULT '{}'::text[],
  metadata            jsonb NOT NULL DEFAULT '{}'::jsonb,
  is_archived         bool NOT NULL DEFAULT false,
  created_by          uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now()
);
COMMENT ON TABLE assets IS 'Media asset library (images, videos, GIFs, etc.) stored in Supabase Storage.';

CREATE TABLE IF NOT EXISTS memes (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cluster_id        uuid REFERENCES trend_clusters(id) ON DELETE SET NULL,
  variant_id        uuid REFERENCES content_variants(id) ON DELETE SET NULL,
  template_id       uuid REFERENCES meme_templates(id) ON DELETE SET NULL,
  org_id            uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  captions          text[] NOT NULL DEFAULT '{}'::text[],
  generated_url     text,
  asset_id          uuid REFERENCES assets(id) ON DELETE SET NULL,
  status            meme_status NOT NULL DEFAULT 'draft',
  generation_params jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_by        uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now()
);
COMMENT ON TABLE memes IS 'Generated memes linked to trend clusters, content variants, and meme templates.';

-- =============================================================================
-- TABLES — PIPELINE / CALENDAR DOMAIN
-- =============================================================================

CREATE TABLE IF NOT EXISTS pipeline_stages_config (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id      uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name        text NOT NULL,
  stage       pipeline_stage NOT NULL,
  color       text NOT NULL DEFAULT '#6366f1',
  position    int NOT NULL DEFAULT 0,
  is_active   bool NOT NULL DEFAULT true,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);
COMMENT ON TABLE pipeline_stages_config IS 'Per-org customizable pipeline stage configuration (name, color, position).';

CREATE TABLE IF NOT EXISTS content_pipeline_items (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id          uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  variant_id      uuid REFERENCES content_variants(id) ON DELETE CASCADE,
  cluster_id      uuid REFERENCES trend_clusters(id) ON DELETE SET NULL,
  stage           pipeline_stage NOT NULL DEFAULT 'idea',
  stage_config_id uuid REFERENCES pipeline_stages_config(id) ON DELETE SET NULL,
  position        int NOT NULL DEFAULT 0,
  due_date        date,
  assigned_to     uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  notes           text,
  metadata        jsonb NOT NULL DEFAULT '{}'::jsonb,
  moved_at        timestamptz,
  moved_by        uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);
COMMENT ON TABLE content_pipeline_items IS 'Kanban-style pipeline items tracking content through editorial stages.';

CREATE TABLE IF NOT EXISTS content_calendar_items (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id            uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  pipeline_item_id  uuid REFERENCES content_pipeline_items(id) ON DELETE SET NULL,
  variant_id        uuid REFERENCES content_variants(id) ON DELETE CASCADE,
  cluster_id        uuid REFERENCES trend_clusters(id) ON DELETE SET NULL,
  platform          content_platform NOT NULL DEFAULT 'instagram',
  scheduled_at      timestamptz NOT NULL,
  posted_at         timestamptz,
  title             text,
  status            variant_status NOT NULL DEFAULT 'draft',
  recurring_rule    text,
  color             text,
  created_by        uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now()
);
COMMENT ON TABLE content_calendar_items IS 'Scheduled publishing calendar entries for content variants.';

-- =============================================================================
-- TABLES — PUBLISHING DOMAIN
-- =============================================================================

CREATE TABLE IF NOT EXISTS post_results (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id              uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  variant_id          uuid REFERENCES content_variants(id) ON DELETE SET NULL,
  calendar_item_id    uuid REFERENCES content_calendar_items(id) ON DELETE SET NULL,
  platform            content_platform NOT NULL,
  external_post_id    text,
  post_url            text,
  published_at        timestamptz NOT NULL DEFAULT now(),
  content_snapshot    text,
  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now()
);
COMMENT ON TABLE post_results IS 'Record of each successful post publish event with external platform IDs.';

CREATE TABLE IF NOT EXISTS performance_metrics (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  post_result_id    uuid NOT NULL REFERENCES post_results(id) ON DELETE CASCADE,
  measured_at       timestamptz NOT NULL DEFAULT now(),
  likes             int NOT NULL DEFAULT 0,
  comments          int NOT NULL DEFAULT 0,
  shares            int NOT NULL DEFAULT 0,
  saves             int NOT NULL DEFAULT 0,
  views             int NOT NULL DEFAULT 0,
  reach             int NOT NULL DEFAULT 0,
  impressions       int NOT NULL DEFAULT 0,
  clicks            int NOT NULL DEFAULT 0,
  engagement_rate   numeric(6,4) NOT NULL DEFAULT 0,
  follower_change   int NOT NULL DEFAULT 0,
  extra_metrics     jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at        timestamptz NOT NULL DEFAULT now()
);
COMMENT ON TABLE performance_metrics IS 'Point-in-time performance snapshots for published posts.';

-- =============================================================================
-- TABLES — BRAND SETTINGS
-- =============================================================================

CREATE TABLE IF NOT EXISTS brand_settings (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id              uuid NOT NULL UNIQUE REFERENCES organizations(id) ON DELETE CASCADE,
  name                text NOT NULL,
  voice_description   text,
  system_prompt       text,
  tone_keywords       text[] NOT NULL DEFAULT '{}'::text[],
  avoid_keywords      text[] NOT NULL DEFAULT '{}'::text[],
  target_audience     text,
  content_pillars     text[] NOT NULL DEFAULT '{}'::text[],
  hashtag_sets        jsonb NOT NULL DEFAULT '{}'::jsonb,
  posting_guidelines  text,
  color_palette       text[] NOT NULL DEFAULT '{}'::text[],
  font_preferences    text[] NOT NULL DEFAULT '{}'::text[],
  logo_url            text,
  created_by          uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now()
);
COMMENT ON TABLE brand_settings IS 'Per-org brand voice configuration used to guide AI content generation.';

-- =============================================================================
-- TABLES — NOTIFICATIONS DOMAIN
-- =============================================================================

CREATE TABLE IF NOT EXISTS alert_rules (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id          uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name            text NOT NULL,
  trigger_type    alert_trigger_type NOT NULL DEFAULT 'score_threshold',
  threshold       numeric,
  keywords        text[] NOT NULL DEFAULT '{}'::text[],
  categories      text[] NOT NULL DEFAULT '{}'::text[],
  platforms       text[] NOT NULL DEFAULT '{}'::text[],
  channels        text[] NOT NULL DEFAULT '{}'::text[],
  cooldown_hours  int NOT NULL DEFAULT 1,
  enabled         bool NOT NULL DEFAULT true,
  created_by      uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);
COMMENT ON TABLE alert_rules IS 'Configurable rules that trigger notifications when trend conditions are met.';

CREATE TABLE IF NOT EXISTS notifications (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id          uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  user_id         uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type            notification_type NOT NULL DEFAULT 'system',
  severity        notification_severity NOT NULL DEFAULT 'info',
  title           text NOT NULL,
  message         text NOT NULL,
  cluster_id      uuid REFERENCES trend_clusters(id) ON DELETE SET NULL,
  rule_id         uuid REFERENCES alert_rules(id) ON DELETE SET NULL,
  metadata        jsonb NOT NULL DEFAULT '{}'::jsonb,
  is_read         bool NOT NULL DEFAULT false,
  read_at         timestamptz,
  is_dismissed    bool NOT NULL DEFAULT false,
  dismissed_at    timestamptz,
  created_at      timestamptz NOT NULL DEFAULT now()
);
COMMENT ON TABLE notifications IS 'In-app and push notifications for trend alerts, content events, and system messages.';

-- =============================================================================
-- TABLES — INTEGRATION DOMAIN
-- =============================================================================

CREATE TABLE IF NOT EXISTS workflows (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id            uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name              text NOT NULL,
  n8n_workflow_id   text,
  status            workflow_status NOT NULL DEFAULT 'inactive',
  description       text,
  trigger_type      text,
  schedule          text,
  last_run_at       timestamptz,
  last_run_status   text,
  run_count         int NOT NULL DEFAULT 0,
  error_count       int NOT NULL DEFAULT 0,
  last_error        text,
  config            jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now()
);
COMMENT ON TABLE workflows IS 'n8n automation workflow registry linked to org, with run history metadata.';

CREATE TABLE IF NOT EXISTS canva_exports (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id          uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  cluster_id      uuid REFERENCES trend_clusters(id) ON DELETE SET NULL,
  variant_id      uuid REFERENCES content_variants(id) ON DELETE SET NULL,
  design_url      text,
  edit_url        text,
  preview_url     text,
  platform        content_platform,
  design_name     text,
  exported_at     timestamptz NOT NULL DEFAULT now(),
  created_by      uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);
COMMENT ON TABLE canva_exports IS 'Canva design exports associated with content variants or trend clusters.';

-- =============================================================================
-- TABLES — COMPETITOR DOMAIN
-- =============================================================================

CREATE TABLE IF NOT EXISTS competitor_watchlist (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id            uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name              text NOT NULL,
  platform          text NOT NULL,
  handle            text NOT NULL,
  profile_url       text,
  notes             text,
  is_active         bool NOT NULL DEFAULT true,
  last_checked_at   timestamptz,
  created_by        uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now(),
  UNIQUE(org_id, platform, handle)
);
COMMENT ON TABLE competitor_watchlist IS 'Competitor accounts monitored for content intelligence.';

-- =============================================================================
-- TABLES — TAGS DOMAIN
-- =============================================================================

CREATE TABLE IF NOT EXISTS tags (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id      uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name        text NOT NULL,
  color       text NOT NULL DEFAULT '#6366f1',
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now(),
  UNIQUE(org_id, name)
);
COMMENT ON TABLE tags IS 'Org-scoped content taxonomy tags for filtering and organization.';

CREATE TABLE IF NOT EXISTS cluster_tags (
  cluster_id  uuid NOT NULL REFERENCES trend_clusters(id) ON DELETE CASCADE,
  tag_id      uuid NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
  created_at  timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY(cluster_id, tag_id)
);
COMMENT ON TABLE cluster_tags IS 'Many-to-many: tags applied to trend clusters.';

CREATE TABLE IF NOT EXISTS content_idea_tags (
  idea_id     uuid NOT NULL REFERENCES content_ideas(id) ON DELETE CASCADE,
  tag_id      uuid NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
  created_at  timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY(idea_id, tag_id)
);
COMMENT ON TABLE content_idea_tags IS 'Many-to-many: tags applied to content ideas.';

CREATE TABLE IF NOT EXISTS asset_tags (
  asset_id    uuid NOT NULL REFERENCES assets(id) ON DELETE CASCADE,
  tag_id      uuid NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
  created_at  timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY(asset_id, tag_id)
);
COMMENT ON TABLE asset_tags IS 'Many-to-many: tags applied to media assets.';

-- =============================================================================
-- TABLES — AUDIT DOMAIN
-- =============================================================================

CREATE TABLE IF NOT EXISTS audit_logs (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id          uuid REFERENCES organizations(id) ON DELETE SET NULL,
  user_id         uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  action          text NOT NULL,
  resource_type   text NOT NULL,
  resource_id     uuid,
  old_data        jsonb,
  new_data        jsonb,
  ip_address      inet,
  created_at      timestamptz NOT NULL DEFAULT now()
);
COMMENT ON TABLE audit_logs IS 'Immutable audit trail for all create/update/delete actions. Never cascades delete.';

-- =============================================================================
-- INDEXES
-- =============================================================================

-- organizations
CREATE INDEX IF NOT EXISTS idx_organizations_slug ON organizations(slug);
CREATE INDEX IF NOT EXISTS idx_organizations_plan ON organizations(plan);

-- profiles
CREATE INDEX IF NOT EXISTS idx_profiles_email ON profiles(email);
CREATE INDEX IF NOT EXISTS idx_profiles_role ON profiles(role);

-- org_members
CREATE INDEX IF NOT EXISTS idx_org_members_org_id ON org_members(org_id);
CREATE INDEX IF NOT EXISTS idx_org_members_user_id ON org_members(user_id);
CREATE INDEX IF NOT EXISTS idx_org_members_role ON org_members(role);

-- sources
CREATE INDEX IF NOT EXISTS idx_sources_org_id ON sources(org_id);
CREATE INDEX IF NOT EXISTS idx_sources_status ON sources(status);
CREATE INDEX IF NOT EXISTS idx_sources_type ON sources(type);
CREATE INDEX IF NOT EXISTS idx_sources_category ON sources(category);
CREATE INDEX IF NOT EXISTS idx_sources_tags ON sources USING GIN(tags);
CREATE INDEX IF NOT EXISTS idx_sources_created_by ON sources(created_by);

-- source_items
CREATE INDEX IF NOT EXISTS idx_source_items_source_id ON source_items(source_id);
CREATE INDEX IF NOT EXISTS idx_source_items_status ON source_items(status);
CREATE INDEX IF NOT EXISTS idx_source_items_published_at ON source_items(published_at);
CREATE INDEX IF NOT EXISTS idx_source_items_fetched_at ON source_items(fetched_at);
CREATE INDEX IF NOT EXISTS idx_source_items_created_at ON source_items(created_at);
CREATE INDEX IF NOT EXISTS idx_source_items_keywords ON source_items USING GIN(keywords);
CREATE INDEX IF NOT EXISTS idx_source_items_entities ON source_items USING GIN(entities);
CREATE INDEX IF NOT EXISTS idx_source_items_sentiment ON source_items(sentiment_score);

-- source_sync_logs
CREATE INDEX IF NOT EXISTS idx_source_sync_logs_source_id ON source_sync_logs(source_id);
CREATE INDEX IF NOT EXISTS idx_source_sync_logs_status ON source_sync_logs(status);
CREATE INDEX IF NOT EXISTS idx_source_sync_logs_started_at ON source_sync_logs(started_at);

-- trend_clusters
CREATE INDEX IF NOT EXISTS idx_trend_clusters_org_id ON trend_clusters(org_id);
CREATE INDEX IF NOT EXISTS idx_trend_clusters_status ON trend_clusters(status);
CREATE INDEX IF NOT EXISTS idx_trend_clusters_overall_score ON trend_clusters(overall_score DESC);
CREATE INDEX IF NOT EXISTS idx_trend_clusters_category ON trend_clusters(category);
CREATE INDEX IF NOT EXISTS idx_trend_clusters_first_seen_at ON trend_clusters(first_seen_at);
CREATE INDEX IF NOT EXISTS idx_trend_clusters_last_seen_at ON trend_clusters(last_seen_at DESC);
CREATE INDEX IF NOT EXISTS idx_trend_clusters_keywords ON trend_clusters USING GIN(keywords);
CREATE INDEX IF NOT EXISTS idx_trend_clusters_title_trgm ON trend_clusters USING GIN(title gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_trend_clusters_acted_on ON trend_clusters(acted_on);
CREATE INDEX IF NOT EXISTS idx_trend_clusters_created_by ON trend_clusters(created_by);

-- trend_cluster_items
CREATE INDEX IF NOT EXISTS idx_trend_cluster_items_cluster_id ON trend_cluster_items(cluster_id);
CREATE INDEX IF NOT EXISTS idx_trend_cluster_items_source_item_id ON trend_cluster_items(source_item_id);

-- trend_entities
CREATE INDEX IF NOT EXISTS idx_trend_entities_type ON trend_entities(type);
CREATE INDEX IF NOT EXISTS idx_trend_entities_name_trgm ON trend_entities USING GIN(name gin_trgm_ops);

-- trend_cluster_entities
CREATE INDEX IF NOT EXISTS idx_trend_cluster_entities_cluster_id ON trend_cluster_entities(cluster_id);
CREATE INDEX IF NOT EXISTS idx_trend_cluster_entities_entity_id ON trend_cluster_entities(entity_id);

-- trend_scores
CREATE INDEX IF NOT EXISTS idx_trend_scores_cluster_id ON trend_scores(cluster_id);
CREATE INDEX IF NOT EXISTS idx_trend_scores_overall_score ON trend_scores(overall_score DESC);
CREATE INDEX IF NOT EXISTS idx_trend_scores_scored_at ON trend_scores(scored_at);

-- prompt_templates
CREATE INDEX IF NOT EXISTS idx_prompt_templates_org_id ON prompt_templates(org_id);
CREATE INDEX IF NOT EXISTS idx_prompt_templates_prompt_type ON prompt_templates(prompt_type);
CREATE INDEX IF NOT EXISTS idx_prompt_templates_is_active ON prompt_templates(is_active);
CREATE INDEX IF NOT EXISTS idx_prompt_templates_is_default ON prompt_templates(is_default);

-- content_ideas
CREATE INDEX IF NOT EXISTS idx_content_ideas_org_id ON content_ideas(org_id);
CREATE INDEX IF NOT EXISTS idx_content_ideas_cluster_id ON content_ideas(cluster_id);
CREATE INDEX IF NOT EXISTS idx_content_ideas_type ON content_ideas(type);
CREATE INDEX IF NOT EXISTS idx_content_ideas_platform ON content_ideas(platform);
CREATE INDEX IF NOT EXISTS idx_content_ideas_is_saved ON content_ideas(is_saved);
CREATE INDEX IF NOT EXISTS idx_content_ideas_is_used ON content_ideas(is_used);
CREATE INDEX IF NOT EXISTS idx_content_ideas_created_at ON content_ideas(created_at);
CREATE INDEX IF NOT EXISTS idx_content_ideas_tags ON content_ideas USING GIN(tags);

-- content_variants
CREATE INDEX IF NOT EXISTS idx_content_variants_org_id ON content_variants(org_id);
CREATE INDEX IF NOT EXISTS idx_content_variants_idea_id ON content_variants(idea_id);
CREATE INDEX IF NOT EXISTS idx_content_variants_cluster_id ON content_variants(cluster_id);
CREATE INDEX IF NOT EXISTS idx_content_variants_status ON content_variants(status);
CREATE INDEX IF NOT EXISTS idx_content_variants_platform ON content_variants(platform);
CREATE INDEX IF NOT EXISTS idx_content_variants_scheduled_for ON content_variants(scheduled_for);
CREATE INDEX IF NOT EXISTS idx_content_variants_published_at ON content_variants(published_at);
CREATE INDEX IF NOT EXISTS idx_content_variants_assigned_to ON content_variants(assigned_to);
CREATE INDEX IF NOT EXISTS idx_content_variants_created_by ON content_variants(created_by);

-- meme_templates
CREATE INDEX IF NOT EXISTS idx_meme_templates_is_active ON meme_templates(is_active);
CREATE INDEX IF NOT EXISTS idx_meme_templates_usage_count ON meme_templates(usage_count DESC);
CREATE INDEX IF NOT EXISTS idx_meme_templates_tags ON meme_templates USING GIN(tags);

-- assets
CREATE INDEX IF NOT EXISTS idx_assets_org_id ON assets(org_id);
CREATE INDEX IF NOT EXISTS idx_assets_type ON assets(type);
CREATE INDEX IF NOT EXISTS idx_assets_is_archived ON assets(is_archived);
CREATE INDEX IF NOT EXISTS idx_assets_tags ON assets USING GIN(tags);
CREATE INDEX IF NOT EXISTS idx_assets_created_at ON assets(created_at);

-- memes
CREATE INDEX IF NOT EXISTS idx_memes_org_id ON memes(org_id);
CREATE INDEX IF NOT EXISTS idx_memes_cluster_id ON memes(cluster_id);
CREATE INDEX IF NOT EXISTS idx_memes_template_id ON memes(template_id);
CREATE INDEX IF NOT EXISTS idx_memes_status ON memes(status);
CREATE INDEX IF NOT EXISTS idx_memes_created_at ON memes(created_at);

-- pipeline_stages_config
CREATE INDEX IF NOT EXISTS idx_pipeline_stages_config_org_id ON pipeline_stages_config(org_id);
CREATE INDEX IF NOT EXISTS idx_pipeline_stages_config_stage ON pipeline_stages_config(stage);
CREATE INDEX IF NOT EXISTS idx_pipeline_stages_config_position ON pipeline_stages_config(position);

-- content_pipeline_items
CREATE INDEX IF NOT EXISTS idx_content_pipeline_items_org_id ON content_pipeline_items(org_id);
CREATE INDEX IF NOT EXISTS idx_content_pipeline_items_variant_id ON content_pipeline_items(variant_id);
CREATE INDEX IF NOT EXISTS idx_content_pipeline_items_stage ON content_pipeline_items(stage);
CREATE INDEX IF NOT EXISTS idx_content_pipeline_items_assigned_to ON content_pipeline_items(assigned_to);
CREATE INDEX IF NOT EXISTS idx_content_pipeline_items_due_date ON content_pipeline_items(due_date);

-- content_calendar_items
CREATE INDEX IF NOT EXISTS idx_content_calendar_items_org_id ON content_calendar_items(org_id);
CREATE INDEX IF NOT EXISTS idx_content_calendar_items_variant_id ON content_calendar_items(variant_id);
CREATE INDEX IF NOT EXISTS idx_content_calendar_items_scheduled_at ON content_calendar_items(scheduled_at);
CREATE INDEX IF NOT EXISTS idx_content_calendar_items_platform ON content_calendar_items(platform);
CREATE INDEX IF NOT EXISTS idx_content_calendar_items_status ON content_calendar_items(status);
CREATE INDEX IF NOT EXISTS idx_content_calendar_items_posted_at ON content_calendar_items(posted_at);

-- post_results
CREATE INDEX IF NOT EXISTS idx_post_results_org_id ON post_results(org_id);
CREATE INDEX IF NOT EXISTS idx_post_results_variant_id ON post_results(variant_id);
CREATE INDEX IF NOT EXISTS idx_post_results_platform ON post_results(platform);
CREATE INDEX IF NOT EXISTS idx_post_results_published_at ON post_results(published_at);

-- performance_metrics
CREATE INDEX IF NOT EXISTS idx_performance_metrics_post_result_id ON performance_metrics(post_result_id);
CREATE INDEX IF NOT EXISTS idx_performance_metrics_measured_at ON performance_metrics(measured_at);
CREATE INDEX IF NOT EXISTS idx_performance_metrics_engagement_rate ON performance_metrics(engagement_rate DESC);

-- brand_settings
CREATE INDEX IF NOT EXISTS idx_brand_settings_org_id ON brand_settings(org_id);

-- alert_rules
CREATE INDEX IF NOT EXISTS idx_alert_rules_org_id ON alert_rules(org_id);
CREATE INDEX IF NOT EXISTS idx_alert_rules_trigger_type ON alert_rules(trigger_type);
CREATE INDEX IF NOT EXISTS idx_alert_rules_enabled ON alert_rules(enabled);

-- notifications
CREATE INDEX IF NOT EXISTS idx_notifications_org_id ON notifications(org_id);
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_type ON notifications(type);
CREATE INDEX IF NOT EXISTS idx_notifications_is_read ON notifications(is_read);
CREATE INDEX IF NOT EXISTS idx_notifications_is_dismissed ON notifications(is_dismissed);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications(created_at);
CREATE INDEX IF NOT EXISTS idx_notifications_cluster_id ON notifications(cluster_id);

-- workflows
CREATE INDEX IF NOT EXISTS idx_workflows_org_id ON workflows(org_id);
CREATE INDEX IF NOT EXISTS idx_workflows_status ON workflows(status);
CREATE INDEX IF NOT EXISTS idx_workflows_n8n_workflow_id ON workflows(n8n_workflow_id);

-- canva_exports
CREATE INDEX IF NOT EXISTS idx_canva_exports_org_id ON canva_exports(org_id);
CREATE INDEX IF NOT EXISTS idx_canva_exports_cluster_id ON canva_exports(cluster_id);
CREATE INDEX IF NOT EXISTS idx_canva_exports_variant_id ON canva_exports(variant_id);

-- competitor_watchlist
CREATE INDEX IF NOT EXISTS idx_competitor_watchlist_org_id ON competitor_watchlist(org_id);
CREATE INDEX IF NOT EXISTS idx_competitor_watchlist_platform ON competitor_watchlist(platform);
CREATE INDEX IF NOT EXISTS idx_competitor_watchlist_is_active ON competitor_watchlist(is_active);

-- tags
CREATE INDEX IF NOT EXISTS idx_tags_org_id ON tags(org_id);
CREATE INDEX IF NOT EXISTS idx_tags_name ON tags(name);

-- cluster_tags
CREATE INDEX IF NOT EXISTS idx_cluster_tags_tag_id ON cluster_tags(tag_id);

-- content_idea_tags
CREATE INDEX IF NOT EXISTS idx_content_idea_tags_tag_id ON content_idea_tags(tag_id);

-- asset_tags
CREATE INDEX IF NOT EXISTS idx_asset_tags_tag_id ON asset_tags(tag_id);

-- audit_logs
CREATE INDEX IF NOT EXISTS idx_audit_logs_org_id ON audit_logs(org_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON audit_logs(action);
CREATE INDEX IF NOT EXISTS idx_audit_logs_resource_type ON audit_logs(resource_type);
CREATE INDEX IF NOT EXISTS idx_audit_logs_resource_id ON audit_logs(resource_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at);

-- =============================================================================
-- TRIGGERS — updated_at
-- =============================================================================

CREATE OR REPLACE TRIGGER set_organizations_updated_at
  BEFORE UPDATE ON organizations
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE OR REPLACE TRIGGER set_profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE OR REPLACE TRIGGER set_org_members_updated_at
  BEFORE UPDATE ON org_members
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE OR REPLACE TRIGGER set_sources_updated_at
  BEFORE UPDATE ON sources
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE OR REPLACE TRIGGER set_source_items_updated_at
  BEFORE UPDATE ON source_items
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE OR REPLACE TRIGGER set_trend_clusters_updated_at
  BEFORE UPDATE ON trend_clusters
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE OR REPLACE TRIGGER set_trend_cluster_items_updated_at
  BEFORE UPDATE ON trend_cluster_items
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE OR REPLACE TRIGGER set_trend_entities_updated_at
  BEFORE UPDATE ON trend_entities
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE OR REPLACE TRIGGER set_trend_scores_updated_at
  BEFORE UPDATE ON trend_scores
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE OR REPLACE TRIGGER set_prompt_templates_updated_at
  BEFORE UPDATE ON prompt_templates
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE OR REPLACE TRIGGER set_content_ideas_updated_at
  BEFORE UPDATE ON content_ideas
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE OR REPLACE TRIGGER set_content_variants_updated_at
  BEFORE UPDATE ON content_variants
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE OR REPLACE TRIGGER set_meme_templates_updated_at
  BEFORE UPDATE ON meme_templates
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE OR REPLACE TRIGGER set_assets_updated_at
  BEFORE UPDATE ON assets
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE OR REPLACE TRIGGER set_memes_updated_at
  BEFORE UPDATE ON memes
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE OR REPLACE TRIGGER set_pipeline_stages_config_updated_at
  BEFORE UPDATE ON pipeline_stages_config
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE OR REPLACE TRIGGER set_content_pipeline_items_updated_at
  BEFORE UPDATE ON content_pipeline_items
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE OR REPLACE TRIGGER set_content_calendar_items_updated_at
  BEFORE UPDATE ON content_calendar_items
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE OR REPLACE TRIGGER set_post_results_updated_at
  BEFORE UPDATE ON post_results
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE OR REPLACE TRIGGER set_brand_settings_updated_at
  BEFORE UPDATE ON brand_settings
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE OR REPLACE TRIGGER set_alert_rules_updated_at
  BEFORE UPDATE ON alert_rules
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE OR REPLACE TRIGGER set_workflows_updated_at
  BEFORE UPDATE ON workflows
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE OR REPLACE TRIGGER set_canva_exports_updated_at
  BEFORE UPDATE ON canva_exports
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE OR REPLACE TRIGGER set_competitor_watchlist_updated_at
  BEFORE UPDATE ON competitor_watchlist
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE OR REPLACE TRIGGER set_tags_updated_at
  BEFORE UPDATE ON tags
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- =============================================================================
-- ROW LEVEL SECURITY — ENABLE
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
-- RLS POLICIES
-- =============================================================================

-- organizations
CREATE POLICY "org_members_can_read_their_org"
  ON organizations FOR SELECT
  TO authenticated
  USING (id = ANY(auth.user_org_ids()));

CREATE POLICY "service_role_manage_organizations"
  ON organizations FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- profiles
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

-- org_members
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

-- sources
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

-- source_items
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

-- source_sync_logs
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

-- trend_clusters
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

-- trend_cluster_items
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

-- trend_entities (global read for all authenticated users)
CREATE POLICY "authenticated_read_trend_entities"
  ON trend_entities FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "service_role_manage_trend_entities"
  ON trend_entities FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- trend_cluster_entities
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

-- trend_scores
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

-- prompt_templates
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

-- content_ideas
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

-- content_variants
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

-- meme_templates (global read for all authenticated)
CREATE POLICY "authenticated_read_meme_templates"
  ON meme_templates FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "service_role_manage_meme_templates"
  ON meme_templates FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- assets
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

-- memes
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

-- pipeline_stages_config
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

-- content_pipeline_items
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

-- content_calendar_items
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

-- post_results
CREATE POLICY "org_members_read_post_results"
  ON post_results FOR SELECT
  TO authenticated
  USING (org_id = ANY(auth.user_org_ids()));

CREATE POLICY "service_role_manage_post_results"
  ON post_results FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- performance_metrics
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

-- brand_settings
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

-- alert_rules
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

-- notifications
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

-- workflows
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

-- canva_exports
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

-- competitor_watchlist
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

-- tags
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

-- cluster_tags
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

-- content_idea_tags
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

-- asset_tags
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

-- audit_logs (read only for admins, insert via service_role)
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
