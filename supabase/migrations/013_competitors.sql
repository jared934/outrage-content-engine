-- ─── Competitor Watchlist ─────────────────────────────────────────────────────
-- Tracks competitor pages, accounts, feeds, and posts for whitespace analysis

-- ── Enums ────────────────────────────────────────────────────────────────────

DO $$ BEGIN
  CREATE TYPE competitor_category AS ENUM (
    'media_brand', 'meme_account', 'news_outlet',
    'influencer', 'competitor_brand', 'platform', 'other'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE competitor_source_type AS ENUM (
    'rss', 'atom', 'twitter', 'instagram', 'youtube',
    'tiktok', 'facebook', 'reddit', 'website', 'other'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ── Tables ───────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS competitors (
  id            uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id        uuid        NOT NULL REFERENCES orgs(id) ON DELETE CASCADE,
  name          text        NOT NULL,
  description   text,
  category      competitor_category NOT NULL DEFAULT 'other',
  avatar_url    text,
  website_url   text,
  notes         text,
  is_active     boolean     NOT NULL DEFAULT true,
  post_count    integer     NOT NULL DEFAULT 0,
  last_active_at timestamptz,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS competitor_sources (
  id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  competitor_id   uuid        NOT NULL REFERENCES competitors(id) ON DELETE CASCADE,
  org_id          uuid        NOT NULL REFERENCES orgs(id) ON DELETE CASCADE,
  source_type     competitor_source_type NOT NULL DEFAULT 'rss',
  url             text        NOT NULL,
  handle          text,
  label           text,
  is_active       boolean     NOT NULL DEFAULT true,
  last_fetched_at timestamptz,
  last_post_at    timestamptz,
  fetch_error     text,
  post_count      integer     NOT NULL DEFAULT 0,
  created_at      timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS competitor_posts (
  id                   uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  source_id            uuid        NOT NULL REFERENCES competitor_sources(id) ON DELETE CASCADE,
  competitor_id        uuid        NOT NULL REFERENCES competitors(id) ON DELETE CASCADE,
  org_id               uuid        NOT NULL REFERENCES orgs(id) ON DELETE CASCADE,
  external_id          text,                          -- for deduplication
  title                text,
  content              text,
  url                  text,
  thumbnail_url        text,
  published_at         timestamptz NOT NULL DEFAULT now(),
  topic_tags           text[]      NOT NULL DEFAULT '{}',
  matched_cluster_ids  uuid[]      NOT NULL DEFAULT '{}',
  engagement_score     integer,
  created_at           timestamptz NOT NULL DEFAULT now(),
  UNIQUE(source_id, external_id)
);

-- ── Indexes ───────────────────────────────────────────────────────────────────

CREATE INDEX IF NOT EXISTS competitors_org_idx      ON competitors(org_id, is_active);
CREATE INDEX IF NOT EXISTS comp_sources_comp_idx    ON competitor_sources(competitor_id);
CREATE INDEX IF NOT EXISTS comp_sources_org_idx     ON competitor_sources(org_id);
CREATE INDEX IF NOT EXISTS comp_posts_comp_idx      ON competitor_posts(competitor_id, published_at DESC);
CREATE INDEX IF NOT EXISTS comp_posts_org_idx       ON competitor_posts(org_id, published_at DESC);
CREATE INDEX IF NOT EXISTS comp_posts_cluster_idx   ON competitor_posts USING GIN(matched_cluster_ids);
CREATE INDEX IF NOT EXISTS comp_posts_tags_idx      ON competitor_posts USING GIN(topic_tags);

-- ── updated_at trigger ────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION touch_updated_at()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

DROP TRIGGER IF EXISTS competitors_updated_at ON competitors;
CREATE TRIGGER competitors_updated_at
  BEFORE UPDATE ON competitors
  FOR EACH ROW EXECUTE FUNCTION touch_updated_at();

-- ── RLS ───────────────────────────────────────────────────────────────────────

ALTER TABLE competitors       ENABLE ROW LEVEL SECURITY;
ALTER TABLE competitor_sources ENABLE ROW LEVEL SECURITY;
ALTER TABLE competitor_posts   ENABLE ROW LEVEL SECURITY;

-- org members can read/write their own data
CREATE POLICY "org members manage competitors"
  ON competitors FOR ALL
  USING (
    org_id IN (
      SELECT org_id FROM org_members WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "org members manage sources"
  ON competitor_sources FOR ALL
  USING (
    org_id IN (
      SELECT org_id FROM org_members WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "org members manage posts"
  ON competitor_posts FOR ALL
  USING (
    org_id IN (
      SELECT org_id FROM org_members WHERE user_id = auth.uid()
    )
  );
