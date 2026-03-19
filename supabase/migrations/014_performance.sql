-- ─── Performance Feedback Module ─────────────────────────────────────────────
-- Tracks post results to learn what works and weight future recommendations.

-- ── Enums ────────────────────────────────────────────────────────────────────

DO $$ BEGIN
  CREATE TYPE perf_platform AS ENUM (
    'instagram', 'tiktok', 'twitter', 'youtube',
    'facebook', 'threads', 'linkedin', 'reddit', 'other'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE perf_post_type AS ENUM (
    'reel', 'short', 'static', 'carousel', 'story',
    'tweet', 'thread', 'video', 'live', 'other'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE perf_hook_type AS ENUM (
    'question', 'shock', 'list', 'statement', 'cliffhanger',
    'relatable', 'controversial', 'challenge', 'none'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE perf_caption_style AS ENUM (
    'short', 'punchy', 'storytelling', 'educational',
    'humorous', 'emotional', 'minimalist', 'long_form'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ── Performance posts ─────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS performance_posts (
  id               uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id           uuid        NOT NULL REFERENCES orgs(id) ON DELETE CASCADE,
  pipeline_item_id uuid        REFERENCES content_pipeline_items(id) ON DELETE SET NULL,
  cluster_id       uuid        REFERENCES trend_clusters(id) ON DELETE SET NULL,

  -- Descriptive
  title            text        NOT NULL,
  platform         perf_platform NOT NULL,
  post_type        perf_post_type NOT NULL,
  topic            text,
  category         text,

  -- Hook & style
  hook_text        text,
  hook_type        perf_hook_type NOT NULL DEFAULT 'none',
  caption_style    perf_caption_style NOT NULL DEFAULT 'short',

  -- Timing
  posted_at        timestamptz NOT NULL DEFAULT now(),

  -- Raw metrics (all nullable — enter what you have)
  views            bigint,
  likes            bigint,
  shares           bigint,
  saves            bigint,
  comments         bigint,
  reach            bigint,
  follower_gain    integer,
  engagement_rate  numeric(6,3), -- percent, e.g. 4.25

  -- Computed
  performance_score integer     NOT NULL DEFAULT 0 CHECK (performance_score BETWEEN 0 AND 100),

  -- Meta
  post_url         text,
  notes            text,
  created_at       timestamptz NOT NULL DEFAULT now(),
  updated_at       timestamptz NOT NULL DEFAULT now()
);

-- ── Recommendation weights ────────────────────────────────────────────────────
-- Learned from performance data; one row per org; influences future scoring.

CREATE TABLE IF NOT EXISTS performance_weights (
  id                   uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id               uuid        NOT NULL REFERENCES orgs(id) ON DELETE CASCADE UNIQUE,
  topic_weights        jsonb       NOT NULL DEFAULT '{}',
  hook_type_weights    jsonb       NOT NULL DEFAULT '{}',
  post_type_weights    jsonb       NOT NULL DEFAULT '{}',
  caption_style_weights jsonb      NOT NULL DEFAULT '{}',
  hour_weights         jsonb       NOT NULL DEFAULT '{}',
  platform_weights     jsonb       NOT NULL DEFAULT '{}',
  category_weights     jsonb       NOT NULL DEFAULT '{}',
  recalculated_at      timestamptz,
  updated_at           timestamptz NOT NULL DEFAULT now()
);

-- ── Indexes ───────────────────────────────────────────────────────────────────

CREATE INDEX IF NOT EXISTS perf_posts_org_idx    ON performance_posts(org_id, posted_at DESC);
CREATE INDEX IF NOT EXISTS perf_posts_cluster    ON performance_posts(cluster_id) WHERE cluster_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS perf_posts_pipeline   ON performance_posts(pipeline_item_id) WHERE pipeline_item_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS perf_posts_platform   ON performance_posts(org_id, platform);
CREATE INDEX IF NOT EXISTS perf_posts_score      ON performance_posts(org_id, performance_score DESC);

-- ── Updated_at triggers ───────────────────────────────────────────────────────

DROP TRIGGER IF EXISTS perf_posts_updated_at ON performance_posts;
CREATE TRIGGER perf_posts_updated_at
  BEFORE UPDATE ON performance_posts
  FOR EACH ROW EXECUTE FUNCTION touch_updated_at();

DROP TRIGGER IF EXISTS perf_weights_updated_at ON performance_weights;
CREATE TRIGGER perf_weights_updated_at
  BEFORE UPDATE ON performance_weights
  FOR EACH ROW EXECUTE FUNCTION touch_updated_at();

-- ── RLS ───────────────────────────────────────────────────────────────────────

ALTER TABLE performance_posts   ENABLE ROW LEVEL SECURITY;
ALTER TABLE performance_weights ENABLE ROW LEVEL SECURITY;

CREATE POLICY "org members manage performance posts"
  ON performance_posts FOR ALL
  USING (org_id IN (SELECT org_id FROM org_members WHERE user_id = auth.uid()));

CREATE POLICY "org members manage performance weights"
  ON performance_weights FOR ALL
  USING (org_id IN (SELECT org_id FROM org_members WHERE user_id = auth.uid()));

-- ── Seed data (demo/testing) ──────────────────────────────────────────────────
-- 35 realistic posts spanning 90 days; encodes clear performance patterns.

DO $$
DECLARE
  v_org uuid;
BEGIN
  SELECT id INTO v_org FROM orgs LIMIT 1;
  IF v_org IS NULL THEN RETURN; END IF;

  -- Disable RLS for seed
  SET LOCAL row_security = off;

  INSERT INTO performance_posts (
    org_id, title, platform, post_type, topic, category,
    hook_type, hook_text, caption_style,
    posted_at, views, likes, shares, saves, comments,
    engagement_rate, follower_gain, performance_score, post_url
  ) VALUES

  -- ── HIGH PERFORMERS: Reels + Question hooks + Meme/Outrage + Evening ────────

  (v_org, 'POV: The main character energy is off the charts 🔥', 'instagram', 'reel', 'meme', 'entertainment',
   'question', 'Does anyone else feel this?', 'punchy',
   now() - interval '3 days' + interval '18 hours',
   284000, 22400, 8900, 12800, 1940, 9.70, 312, 94, 'https://instagram.com/p/demo1'),

  (v_org, 'Wait, they actually said WHAT?? 👀', 'tiktok', 'short', 'outrage', 'politics',
   'shock', 'You need to hear this.', 'punchy',
   now() - interval '5 days' + interval '19 hours',
   512000, 41200, 18700, 9300, 3420, 13.40, 820, 91, 'https://tiktok.com/@demo/video/1'),

  (v_org, 'The audacity level is at an all-time high [THREAD]', 'twitter', 'thread', 'outrage', 'politics',
   'shock', 'I cannot believe this is real. A thread:', 'long_form',
   now() - interval '8 days' + interval '17 hours',
   88200, 5640, 4120, 890, 2180, 3.80, 145, 87, 'https://twitter.com/i/web/status/demo3'),

  (v_org, 'Rating the most unhinged takes of the week 😂', 'instagram', 'reel', 'humor', 'entertainment',
   'list', '5 takes that broke my brain this week:', 'humorous',
   now() - interval '12 days' + interval '18 hours',
   196000, 18300, 6200, 9800, 1640, 10.20, 278, 90, 'https://instagram.com/p/demo4'),

  (v_org, 'This is the video they didn''t want you to see', 'tiktok', 'short', 'viral', 'news',
   'cliffhanger', 'Stay till the end, it gets worse.', 'short',
   now() - interval '15 days' + interval '7 hours',
   724000, 52100, 29800, 14200, 4810, 14.70, 1240, 96, 'https://tiktok.com/@demo/video/2'),

  (v_org, '5 things that are definitely illegal but somehow aren''t 😅', 'instagram', 'reel', 'humor', 'lifestyle',
   'list', '5 things that should be illegal:', 'humorous',
   now() - interval '18 days' + interval '20 hours',
   143000, 14800, 5300, 7900, 1280, 9.60, 198, 89, 'https://instagram.com/p/demo5'),

  (v_org, 'The debate that broke the internet — we weigh in', 'youtube', 'video', 'viral', 'entertainment',
   'question', 'Which side are YOU on?', 'storytelling',
   now() - interval '20 days' + interval '18 hours',
   89400, 7200, 2100, 3800, 890, 7.80, 156, 82, 'https://youtube.com/watch?v=demo6'),

  (v_org, 'Telling my followers what actually happened (unfiltered)', 'instagram', 'reel', 'personal', 'lifestyle',
   'cliffhanger', 'I wasn''t going to talk about this but—', 'emotional',
   now() - interval '22 days' + interval '21 hours',
   168000, 15900, 4800, 11200, 2340, 9.90, 267, 88, 'https://instagram.com/p/demo7'),

  (v_org, 'Controversial opinion: most people are wrong about this', 'tiktok', 'short', 'opinion', 'politics',
   'controversial', 'Everyone is getting this wrong and here''s why:', 'punchy',
   now() - interval '25 days' + interval '19 hours',
   398000, 28700, 12400, 6800, 5120, 8.90, 534, 86, 'https://tiktok.com/@demo/video/3'),

  (v_org, 'The thing nobody is talking about in this story 🧵', 'twitter', 'thread', 'news', 'politics',
   'question', 'Why is everyone missing the real story here?', 'long_form',
   now() - interval '28 days' + interval '12 hours',
   52400, 3280, 2940, 420, 1640, 3.50, 89, 83, 'https://twitter.com/i/web/status/demo9'),

  -- ── GOOD PERFORMERS: Mix of types, decent hooks ───────────────────────────────

  (v_org, 'How they got away with this for so long 👀', 'instagram', 'carousel', 'news', 'politics',
   'question', 'You''ve been lied to about this for years.', 'storytelling',
   now() - interval '6 days' + interval '12 hours',
   94000, 7800, 2400, 4900, 840, 8.00, 112, 76, 'https://instagram.com/p/demo10'),

  (v_org, 'Quick takes: this week in chaos ☕', 'instagram', 'reel', 'news', 'entertainment',
   'relatable', 'Me trying to keep up with the news:', 'humorous',
   now() - interval '10 days' + interval '8 hours',
   87000, 7200, 2100, 3800, 760, 7.80, 98, 75, 'https://instagram.com/p/demo11'),

  (v_org, 'Meme review: did they nail it or embarrass themselves?', 'tiktok', 'short', 'meme', 'entertainment',
   'question', 'You tell me if this slaps:', 'humorous',
   now() - interval '13 days' + interval '19 hours',
   213000, 16400, 5800, 4200, 1980, 7.70, 287, 78, 'https://tiktok.com/@demo/video/4'),

  (v_org, 'The format they want you to forget about', 'instagram', 'reel', 'meme', 'entertainment',
   'shock', 'This format hits different in 2024.', 'punchy',
   now() - interval '16 days' + interval '18 hours',
   124000, 10900, 3600, 5800, 1040, 8.80, 164, 79, 'https://instagram.com/p/demo12'),

  (v_org, 'Testing: which version performs better? [Poll]', 'twitter', 'tweet', 'experiment', 'social',
   'question', 'Help me settle this:', 'short',
   now() - interval '19 days' + interval '14 hours',
   38400, 2940, 1840, 210, 980, 2.60, 44, 68, 'https://twitter.com/i/web/status/demo13'),

  (v_org, '3 things brands are doing wrong on social right now', 'linkedin', 'other', 'marketing', 'business',
   'list', 'I''ve audited 50 brand accounts. Here''s what fails:', 'educational',
   now() - interval '21 days' + interval '9 hours',
   28400, 1840, 980, 420, 640, 5.10, 67, 71, 'https://linkedin.com/posts/demo14'),

  (v_org, 'Dropping the most unhinged take of the month', 'tiktok', 'short', 'opinion', 'entertainment',
   'controversial', 'This will upset exactly the right people.', 'punchy',
   now() - interval '24 days' + interval '20 hours',
   284000, 19800, 7400, 5200, 2840, 6.80, 389, 77, 'https://tiktok.com/@demo/video/5'),

  (v_org, 'What the algorithm wants vs what people actually want', 'instagram', 'carousel', 'marketing', 'business',
   'question', 'Why are creators exhausted?', 'storytelling',
   now() - interval '27 days' + interval '12 hours',
   68400, 5820, 1940, 3640, 620, 6.20, 87, 70, 'https://instagram.com/p/demo15'),

  (v_org, 'Unhinged situation of the week: a recap', 'reddit', 'other', 'humor', 'entertainment',
   'list', 'Week''s top unhinged moments, ranked:', 'humorous',
   now() - interval '30 days' + interval '17 hours',
   42800, 3840, 1240, 980, 1420, 7.40, 34, 72, 'https://reddit.com/r/demo/post1'),

  (v_org, 'Story time: the email that changed everything', 'instagram', 'reel', 'personal', 'lifestyle',
   'cliffhanger', 'I screenshotted this so you could see it yourself.', 'storytelling',
   now() - interval '33 days' + interval '21 hours',
   112000, 9800, 2900, 6400, 1140, 8.20, 148, 78, 'https://instagram.com/p/demo16'),

  -- ── AVERAGE PERFORMERS: Static posts, statement hooks, off-peak times ─────────

  (v_org, 'Our take on the current situation [graphic]', 'instagram', 'static', 'opinion', 'politics',
   'statement', 'Here''s where we stand on this.', 'short',
   now() - interval '7 days' + interval '14 hours',
   32000, 2400, 680, 1200, 320, 4.10, 28, 54, 'https://instagram.com/p/demo17'),

  (v_org, 'Thoughts on the latest update 💬', 'twitter', 'tweet', 'opinion', 'tech',
   'statement', 'A few thoughts on this:', 'short',
   now() - interval '11 days' + interval '15 hours',
   14200, 840, 420, 98, 380, 1.20, 12, 49, 'https://twitter.com/i/web/status/demo18'),

  (v_org, 'The statistics behind the trend [infographic]', 'instagram', 'carousel', 'data', 'news',
   'list', 'By the numbers:', 'educational',
   now() - interval '14 days' + interval '10 hours',
   28400, 2100, 580, 1640, 240, 4.90, 19, 58, 'https://instagram.com/p/demo19'),

  (v_org, 'Monthly recap: what we learned', 'linkedin', 'other', 'marketing', 'business',
   'statement', 'A look back at this month:', 'long_form',
   now() - interval '35 days' + interval '9 hours',
   12400, 780, 240, 180, 280, 3.40, 14, 48, 'https://linkedin.com/posts/demo20'),

  (v_org, 'Deep dive: understanding the nuance here', 'youtube', 'video', 'news', 'politics',
   'statement', 'Let''s break this down properly.', 'educational',
   now() - interval '40 days' + interval '13 hours',
   28400, 2240, 480, 1420, 380, 5.20, 42, 61, 'https://youtube.com/watch?v=demo21'),

  (v_org, 'Educational carousel about platform changes', 'instagram', 'carousel', 'marketing', 'business',
   'none', '', 'educational',
   now() - interval '42 days' + interval '11 hours',
   18400, 1420, 380, 980, 180, 4.10, 11, 52, 'https://instagram.com/p/demo22'),

  (v_org, 'Facts and figures about the issue', 'twitter', 'thread', 'data', 'news',
   'list', 'The numbers:', 'educational',
   now() - interval '45 days' + interval '10 hours',
   22800, 1240, 580, 240, 480, 1.10, 18, 44, 'https://twitter.com/i/web/status/demo23'),

  (v_org, 'Our brand values and why they matter', 'facebook', 'static', 'brand', 'lifestyle',
   'statement', 'What we stand for:', 'long_form',
   now() - interval '50 days' + interval '11 hours',
   8200, 420, 98, 180, 84, 2.10, 4, 38, 'https://facebook.com/posts/demo24'),

  -- ── LOW PERFORMERS: Bad timing, generic content, wrong platform ────────────────

  (v_org, 'Good morning! Here''s a motivational quote ☀️', 'instagram', 'static', 'lifestyle', 'wellness',
   'none', '', 'minimalist',
   now() - interval '9 days' + interval '3 hours',
   8400, 580, 84, 320, 62, 2.40, 2, 26, 'https://instagram.com/p/demo25'),

  (v_org, 'Sharing our weekly content plan (nobody asked)', 'facebook', 'other', 'marketing', 'business',
   'statement', 'Here''s what we have planned:', 'long_form',
   now() - interval '17 days' + interval '2 hours',
   2800, 98, 28, 42, 24, 1.40, 1, 18, 'https://facebook.com/posts/demo26'),

  (v_org, 'A thought I had this morning... 💭', 'twitter', 'tweet', 'personal', 'lifestyle',
   'none', '', 'minimalist',
   now() - interval '23 days' + interval '4 hours',
   4200, 180, 42, 24, 84, 0.80, 3, 22, 'https://twitter.com/i/web/status/demo27'),

  (v_org, 'Long form breakdown: the history of this issue (part 1)', 'tiktok', 'short', 'data', 'news',
   'statement', 'Let me give you some context:', 'educational',
   now() - interval '31 days' + interval '3 hours',
   24800, 1240, 280, 480, 420, 2.80, 8, 31, 'https://tiktok.com/@demo/video/6'),

  (v_org, 'Just a reminder that we exist 👋', 'instagram', 'static', 'brand', 'lifestyle',
   'none', '', 'short',
   now() - interval '38 days' + interval '2 hours',
   6200, 380, 42, 180, 48, 2.00, 0, 21, 'https://instagram.com/p/demo28'),

  (v_org, 'Reposting content from 3 years ago (still relevant!)', 'facebook', 'static', 'lifestyle', 'wellness',
   'statement', 'Throwback:', 'short',
   now() - interval '55 days' + interval '3 hours',
   3400, 148, 24, 84, 28, 1.30, 0, 16, 'https://facebook.com/posts/demo29'),

  (v_org, 'A very detailed and nuanced breakdown nobody will read', 'linkedin', 'other', 'data', 'business',
   'none', '', 'long_form',
   now() - interval '60 days' + interval '14 hours',
   6800, 380, 98, 120, 142, 2.90, 5, 37, 'https://linkedin.com/posts/demo30')

  ON CONFLICT DO NOTHING;

  -- Seed a default weights row
  INSERT INTO performance_weights (org_id) VALUES (v_org) ON CONFLICT DO NOTHING;

END $$;
