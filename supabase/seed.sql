-- =============================================================================
-- OUTRAGE Content Engine — Seed Data
-- Version: 1.0.0
-- Run AFTER schema.sql on a fresh database.
-- Uses service_role or direct DB access (bypasses RLS).
-- =============================================================================

-- =============================================================================
-- DEFAULT ORGANIZATION
-- =============================================================================

INSERT INTO organizations (id, name, slug, plan, settings)
VALUES (
  '00000000-0000-0000-0000-000000000001',
  'OUTRAGE',
  'outrage',
  'pro',
  '{
    "features": {
      "meme_generation": true,
      "canva_integration": true,
      "competitor_tracking": true,
      "ai_scoring": true,
      "content_calendar": true
    },
    "limits": {
      "sources": 50,
      "users": 10,
      "monthly_ai_calls": 10000
    },
    "timezone": "America/New_York",
    "brand": "OUTRAGE"
  }'::jsonb
)
ON CONFLICT (id) DO NOTHING;

-- =============================================================================
-- PIPELINE STAGES CONFIG
-- =============================================================================

INSERT INTO pipeline_stages_config (id, org_id, name, stage, color, position, is_active)
VALUES
  (
    gen_random_uuid(),
    '00000000-0000-0000-0000-000000000001',
    'Idea',
    'idea',
    '#6366f1',
    0,
    true
  ),
  (
    gen_random_uuid(),
    '00000000-0000-0000-0000-000000000001',
    'Drafting',
    'drafting',
    '#f59e0b',
    1,
    true
  ),
  (
    gen_random_uuid(),
    '00000000-0000-0000-0000-000000000001',
    'In Review',
    'review',
    '#3b82f6',
    2,
    true
  ),
  (
    gen_random_uuid(),
    '00000000-0000-0000-0000-000000000001',
    'Approved',
    'approved',
    '#10b981',
    3,
    true
  ),
  (
    gen_random_uuid(),
    '00000000-0000-0000-0000-000000000001',
    'Scheduling',
    'scheduling',
    '#8b5cf6',
    4,
    true
  ),
  (
    gen_random_uuid(),
    '00000000-0000-0000-0000-000000000001',
    'Published',
    'published',
    '#ef4444',
    5,
    true
  );

-- =============================================================================
-- BRAND SETTINGS
-- =============================================================================

INSERT INTO brand_settings (
  id,
  org_id,
  name,
  voice_description,
  system_prompt,
  tone_keywords,
  avoid_keywords,
  target_audience,
  content_pillars,
  hashtag_sets,
  posting_guidelines,
  color_palette,
  font_preferences
)
VALUES (
  gen_random_uuid(),
  '00000000-0000-0000-0000-000000000001',
  'OUTRAGE Brand Voice',
  'Bold, unapologetic, and culturally sharp. OUTRAGE speaks directly to the Gen Z and Millennial audience that lives and breathes pop culture. We are the friend who tells you exactly what everyone else is thinking but won''t say out loud. We are funny, we are blunt, and we are always on time.',
  E'You are the content brain behind OUTRAGE — a viral pop culture and meme-news brand that dominates social media. Your voice is bold, unapologetic, and culturally sharp.\n\nCORE VOICE RULES:\n- Always write like a Gen Z / Millennial hybrid who grew up on Twitter and Instagram\n- Never hedge, soften, or both-sides a hot take. Pick a lane and commit.\n- Use sarcasm, dry humor, and punchy one-liners as your default mode\n- Keep captions under 150 characters when possible — every word must earn its place\n- Tweets must be under 280 characters. No exceptions.\n- Use common Gen Z slang naturally: "no cap", "slay", "it''s giving", "the audacity", "bestie", "rent free", "understood the assignment", "main character energy", "the way I—"\n- When covering celebrity drama: be specific, be petty (but not cruel), always have a hot take ready\n- When covering music/entertainment: use industry context but keep it accessible\n- Never write boring, corporate-sounding content. If it sounds like a press release, start over.\n- Humor is your weapon. Use it aggressively.\n- Outrage is your fuel, but it should always entertain first.\n- Always punch up, never punch down.\n- End hooks with a conversational question or statement that invites a reaction.\n- For meme captions: be absurdist, relatable, and punchy. The joke should land in the first line.\n- For reels: the first 3 words must stop the scroll. Use bold claims, unpopular opinions, or shocking statements.\n\nCONTENT PILLARS:\n1. Celebrity Drama — shade, gossip, feuds, breakups, comebacks\n2. Music & Drops — new releases, charts, beef, tours, controversies\n3. Viral Moments — social media chaos, unhinged takes, discourse\n4. Meme Culture — trending formats, relatable content, absurdist humor\n5. Hot Takes — unpopular opinions, contrarian takes, cultural criticism\n\nFORMAT RULES BY PLATFORM:\n- Instagram: hook + 1-3 sentences max + CTA or question. No hashtag dumps in caption.\n- TikTok: hook in first line, use line breaks, include a POV or story angle\n- Twitter/X: one punchy sentence or a 2-part thread opener. No fluff.\n- Threads: can be slightly longer (3-5 sentences), more conversational\n- Newsletter: can go long, but must open with a killer hook paragraph\n\nAVOID AT ALL COSTS:\n- Saying "it''s important to note"\n- Passive voice\n- Filler phrases like "in today''s world" or "in recent years"\n- Moralizing without entertainment value\n- Calling celebrities "talent" or any corporate-speak\n- Writing anything that sounds like a Wikipedia article',
  ARRAY['bold', 'unapologetic', 'sarcastic', 'punchy', 'culturally-aware', 'irreverent', 'witty', 'direct', 'entertaining', 'Gen-Z-coded'],
  ARRAY['important to note', 'it is worth mentioning', 'in recent years', 'at the end of the day', 'going forward', 'synergy', 'leverage', 'utilize', 'talent', 'content creator ecosystem'],
  'Gen Z (18-26) and elder Millennials (27-35) who are chronically online, follow celebrity culture, consume memes daily, and treat social media as both entertainment and news source. They have short attention spans, can smell inauthenticity from a mile away, and reward brands that are real, funny, and fast.',
  ARRAY['Celebrity Drama', 'Music & Drops', 'Viral Moments', 'Meme Culture', 'Hot Takes'],
  '{
    "celebrity": ["#CelebDrama", "#PopCulture", "#Tea", "#OUTRAGE", "#HollywoodTea"],
    "music": ["#MusicNews", "#NewMusic", "#ChartsDontLie", "#OUTRAGE", "#MusicTea"],
    "viral": ["#Viral", "#Twitter", "#ForYou", "#OUTRAGE", "#ChronicallyOnline"],
    "meme": ["#Meme", "#Relatable", "#OUTRAGE", "#Funny", "#ThisIsUs"],
    "hot_takes": ["#HotTake", "#UnpopularOpinion", "#OUTRAGE", "#SayItLouder", "#Facts"]
  }'::jsonb,
  E'POSTING GUIDELINES:\n\n1. TIMING: Post celebrity drama within 2 hours of breaking news. Post memes during lunch (12-1pm EST) and evening (7-10pm EST). Avoid posting during major live events unless directly reactive.\n\n2. FREQUENCY: Instagram: 1-2 feed posts/day, 5-8 stories/day. TikTok: 2-3/day minimum. Twitter: 8-15 tweets/day. Threads: 3-5/day.\n\n3. ENGAGEMENT: Always reply to the first 10 comments. Quote-tweet hot takes from followers. Never delete posts — own your content.\n\n4. CRISIS PROTOCOL: If a topic involves actual tragedy (death, abuse, violence), pause posting and reassess tone. The brand is provocative, not callous.\n\n5. LEGAL: Never post unverified claims as fact. Frame speculation as speculation. Screenshot everything before posting.\n\n6. BRAND CONSISTENCY: Every post must feel like it came from the same person — that opinionated, chronically online friend who knows everything about pop culture.',
  ARRAY['#FF2D55', '#1C1C1E', '#FFFFFF', '#FF6B6B', '#FFE66D'],
  ARRAY['Inter', 'Space Grotesk', 'Bebas Neue']
);

-- =============================================================================
-- RSS SOURCES (15)
-- =============================================================================

INSERT INTO sources (id, org_id, name, type, url, status, category, tags, fetch_interval_minutes, config)
VALUES
  (
    gen_random_uuid(),
    '00000000-0000-0000-0000-000000000001',
    'TMZ',
    'rss',
    'https://www.tmz.com/rss.xml',
    'active',
    'celebrity',
    ARRAY['celebrity', 'gossip', 'breaking', 'entertainment'],
    15,
    '{"priority": "high", "trust_score": 85, "notes": "Primary celebrity gossip source"}'::jsonb
  ),
  (
    gen_random_uuid(),
    '00000000-0000-0000-0000-000000000001',
    'E! Online',
    'rss',
    'https://www.eonline.com/syndication/feeds/rssfeeds/topstories.xml',
    'active',
    'celebrity',
    ARRAY['celebrity', 'entertainment', 'fashion', 'awards'],
    20,
    '{"priority": "high", "trust_score": 82, "notes": "Celebrity and entertainment news"}'::jsonb
  ),
  (
    gen_random_uuid(),
    '00000000-0000-0000-0000-000000000001',
    'People Magazine',
    'rss',
    'https://people.com/feed/',
    'active',
    'celebrity',
    ARRAY['celebrity', 'lifestyle', 'relationships', 'family'],
    20,
    '{"priority": "medium", "trust_score": 88, "notes": "Mainstream celebrity coverage"}'::jsonb
  ),
  (
    gen_random_uuid(),
    '00000000-0000-0000-0000-000000000001',
    'The Shade Room',
    'rss',
    'https://theshaderoom.com/feed/',
    'active',
    'celebrity',
    ARRAY['celebrity', 'drama', 'black-culture', 'viral'],
    10,
    '{"priority": "high", "trust_score": 78, "notes": "Fast-moving celebrity drama, Black culture focus"}'::jsonb
  ),
  (
    gen_random_uuid(),
    '00000000-0000-0000-0000-000000000001',
    'Complex',
    'rss',
    'https://www.complex.com/rss',
    'active',
    'culture',
    ARRAY['music', 'fashion', 'culture', 'sneakers', 'hip-hop'],
    20,
    '{"priority": "high", "trust_score": 83, "notes": "Hip-hop, streetwear, and youth culture"}'::jsonb
  ),
  (
    gen_random_uuid(),
    '00000000-0000-0000-0000-000000000001',
    'Pitchfork',
    'rss',
    'https://pitchfork.com/rss/news/feed.xml',
    'active',
    'music',
    ARRAY['music', 'indie', 'reviews', 'news'],
    30,
    '{"priority": "medium", "trust_score": 90, "notes": "Music criticism and news"}'::jsonb
  ),
  (
    gen_random_uuid(),
    '00000000-0000-0000-0000-000000000001',
    'Billboard',
    'rss',
    'https://www.billboard.com/feed/',
    'active',
    'music',
    ARRAY['music', 'charts', 'industry', 'pop', 'hip-hop'],
    20,
    '{"priority": "high", "trust_score": 92, "notes": "Charts and music industry news"}'::jsonb
  ),
  (
    gen_random_uuid(),
    '00000000-0000-0000-0000-000000000001',
    'Deadline Hollywood',
    'rss',
    'https://deadline.com/feed/',
    'active',
    'entertainment',
    ARRAY['hollywood', 'film', 'tv', 'industry', 'box-office'],
    20,
    '{"priority": "medium", "trust_score": 91, "notes": "Hollywood industry trade news"}'::jsonb
  ),
  (
    gen_random_uuid(),
    '00000000-0000-0000-0000-000000000001',
    'Variety',
    'rss',
    'https://variety.com/feed/',
    'active',
    'entertainment',
    ARRAY['hollywood', 'film', 'tv', 'awards', 'streaming'],
    20,
    '{"priority": "medium", "trust_score": 92, "notes": "Entertainment industry trade"}'::jsonb
  ),
  (
    gen_random_uuid(),
    '00000000-0000-0000-0000-000000000001',
    'The Hollywood Reporter',
    'rss',
    'https://www.hollywoodreporter.com/feed/',
    'active',
    'entertainment',
    ARRAY['hollywood', 'film', 'tv', 'celebrity', 'awards'],
    20,
    '{"priority": "medium", "trust_score": 91, "notes": "Premium Hollywood coverage"}'::jsonb
  ),
  (
    gen_random_uuid(),
    '00000000-0000-0000-0000-000000000001',
    'Page Six',
    'rss',
    'https://pagesix.com/feed/',
    'active',
    'celebrity',
    ARRAY['celebrity', 'gossip', 'nyc', 'fashion', 'drama'],
    15,
    '{"priority": "high", "trust_score": 80, "notes": "NYC celebrity gossip powerhouse"}'::jsonb
  ),
  (
    gen_random_uuid(),
    '00000000-0000-0000-0000-000000000001',
    'BuzzFeed Celebrity',
    'rss',
    'https://www.buzzfeed.com/celebrity.xml',
    'active',
    'celebrity',
    ARRAY['celebrity', 'viral', 'listicles', 'pop-culture'],
    20,
    '{"priority": "medium", "trust_score": 72, "notes": "Viral celebrity content and lists"}'::jsonb
  ),
  (
    gen_random_uuid(),
    '00000000-0000-0000-0000-000000000001',
    'PopSugar Celebrity',
    'rss',
    'https://www.popsugar.com/celebrity/feed',
    'active',
    'celebrity',
    ARRAY['celebrity', 'fashion', 'lifestyle', 'relationships'],
    20,
    '{"priority": "medium", "trust_score": 75, "notes": "Celebrity lifestyle and fashion"}'::jsonb
  ),
  (
    gen_random_uuid(),
    '00000000-0000-0000-0000-000000000001',
    'Just Jared',
    'rss',
    'https://www.justjared.com/feed/',
    'active',
    'celebrity',
    ARRAY['celebrity', 'paparazzi', 'events', 'photos'],
    15,
    '{"priority": "medium", "trust_score": 77, "notes": "Celebrity photo coverage and events"}'::jsonb
  ),
  (
    gen_random_uuid(),
    '00000000-0000-0000-0000-000000000001',
    'Bossip',
    'rss',
    'https://bossip.com/feed/',
    'active',
    'celebrity',
    ARRAY['celebrity', 'drama', 'black-celebrity', 'tea', 'gossip'],
    15,
    '{"priority": "high", "trust_score": 76, "notes": "Black celebrity gossip and drama"}'::jsonb
  );

-- =============================================================================
-- ALERT RULES (3)
-- =============================================================================

INSERT INTO alert_rules (id, org_id, name, trigger_type, threshold, keywords, categories, channels, cooldown_hours, enabled)
VALUES
  (
    gen_random_uuid(),
    '00000000-0000-0000-0000-000000000001',
    'Viral Threshold Alert',
    'score_threshold',
    80,
    ARRAY[]::text[],
    ARRAY['celebrity', 'viral', 'music', 'entertainment'],
    ARRAY['in_app', 'push', 'email'],
    2,
    true
  ),
  (
    gen_random_uuid(),
    '00000000-0000-0000-0000-000000000001',
    'High Interest Alert',
    'score_threshold',
    65,
    ARRAY[]::text[],
    ARRAY['celebrity', 'music', 'drama', 'culture'],
    ARRAY['in_app'],
    4,
    true
  ),
  (
    gen_random_uuid(),
    '00000000-0000-0000-0000-000000000001',
    'Trend Spike Alert',
    'trend_spike',
    3,
    ARRAY[]::text[],
    ARRAY[]::text[],
    ARRAY['in_app', 'push'],
    1,
    true
  );

-- =============================================================================
-- MEME TEMPLATES (10)
-- =============================================================================

INSERT INTO meme_templates (id, name, external_id, source, image_url, thumbnail_url, box_count, tags, is_active, metadata)
VALUES
  (
    gen_random_uuid(),
    'Drake Pointing',
    '181913649',
    'imgflip',
    'https://i.imgflip.com/4t0m5.jpg',
    'https://i.imgflip.com/4t0m5.jpg',
    2,
    ARRAY['reaction', 'approval', 'preference', 'classic'],
    true,
    '{"imgflip_id": "181913649", "description": "Drake from Hotline Bling approving/disapproving two things"}'::jsonb
  ),
  (
    gen_random_uuid(),
    'Distracted Boyfriend',
    '112126428',
    'imgflip',
    'https://i.imgflip.com/1ur9b0.jpg',
    'https://i.imgflip.com/1ur9b0.jpg',
    3,
    ARRAY['distraction', 'preference', 'relationships', 'classic'],
    true,
    '{"imgflip_id": "112126428", "description": "Man looking at another woman while girlfriend looks disapproving"}'::jsonb
  ),
  (
    gen_random_uuid(),
    'Two Buttons',
    '87743020',
    'imgflip',
    'https://i.imgflip.com/1g8my4.jpg',
    'https://i.imgflip.com/1g8my4.jpg',
    3,
    ARRAY['dilemma', 'sweating', 'decision', 'classic'],
    true,
    '{"imgflip_id": "87743020", "description": "Sweating man can''t decide which button to press"}'::jsonb
  ),
  (
    gen_random_uuid(),
    'Change My Mind',
    '129242436',
    'imgflip',
    'https://i.imgflip.com/24y43o.jpg',
    'https://i.imgflip.com/24y43o.jpg',
    2,
    ARRAY['hot-take', 'debate', 'opinion', 'challenge'],
    true,
    '{"imgflip_id": "129242436", "description": "Steven Crowder sitting at table with sign saying Change My Mind"}'::jsonb
  ),
  (
    gen_random_uuid(),
    'This Is Fine',
    '55311130',
    'imgflip',
    'https://i.imgflip.com/wxica.jpg',
    'https://i.imgflip.com/wxica.jpg',
    2,
    ARRAY['chaos', 'denial', 'disaster', 'relatable'],
    true,
    '{"imgflip_id": "55311130", "description": "Dog sitting in burning room saying this is fine"}'::jsonb
  ),
  (
    gen_random_uuid(),
    'Expanding Brain',
    '93895088',
    'imgflip',
    'https://i.imgflip.com/1jwhww.jpg',
    'https://i.imgflip.com/1jwhww.jpg',
    4,
    ARRAY['escalation', 'intelligence', 'levels', 'absurdist'],
    true,
    '{"imgflip_id": "93895088", "description": "Four-panel escalating brain size meme"}'::jsonb
  ),
  (
    gen_random_uuid(),
    'Mocking SpongeBob',
    '102156234',
    'imgflip',
    'https://i.imgflip.com/1otk96.jpg',
    'https://i.imgflip.com/1otk96.jpg',
    2,
    ARRAY['mocking', 'sarcasm', 'repetition', 'SpongeBob'],
    true,
    '{"imgflip_id": "102156234", "description": "SpongeBob in chicken pose used for mocking text"}'::jsonb
  ),
  (
    gen_random_uuid(),
    'Surprised Pikachu',
    '155067746',
    'imgflip',
    'https://i.imgflip.com/2kbn1e.jpg',
    'https://i.imgflip.com/2kbn1e.jpg',
    2,
    ARRAY['surprise', 'obvious', 'shocked', 'classic'],
    true,
    '{"imgflip_id": "155067746", "description": "Pikachu with shocked face for predictable outcomes"}'::jsonb
  ),
  (
    gen_random_uuid(),
    'One Does Not Simply',
    '61579',
    'imgflip',
    'https://i.imgflip.com/1bij.jpg',
    'https://i.imgflip.com/1bij.jpg',
    2,
    ARRAY['impossible', 'lord-of-the-rings', 'boromir', 'classic'],
    true,
    '{"imgflip_id": "61579", "description": "Boromir from LOTR - One does not simply walk into Mordor"}'::jsonb
  ),
  (
    gen_random_uuid(),
    'Is This A Pigeon',
    '100947',
    'imgflip',
    'https://i.imgflip.com/1o00in.jpg',
    'https://i.imgflip.com/1o00in.jpg',
    3,
    ARRAY['misidentification', 'confusion', 'labeling', 'anime'],
    true,
    '{"imgflip_id": "100947", "description": "Anime character pointing at butterfly asking if it is a pigeon"}'::jsonb
  );

-- =============================================================================
-- PROMPT TEMPLATES (5)
-- =============================================================================

-- Store prompt template IDs for reference
DO $$
DECLARE
  scoring_id uuid := gen_random_uuid();
  content_id uuid := gen_random_uuid();
  meme_id uuid := gen_random_uuid();
  clustering_id uuid := gen_random_uuid();
  brand_id uuid := gen_random_uuid();
BEGIN

INSERT INTO prompt_templates (id, org_id, name, description, prompt_type, system_prompt, user_prompt, variables, model, temperature, max_tokens, version, is_active, is_default)
VALUES
  (
    scoring_id,
    '00000000-0000-0000-0000-000000000001',
    'Viral Scoring v1',
    'Scores a trend cluster on 5 dimensions of viral potential for the OUTRAGE brand.',
    'scoring',
    E'You are a viral content analyst for OUTRAGE, a Gen Z pop culture brand. Your job is to score trending topics on their potential to generate viral content.\n\nScoring is objective and data-driven. You understand what makes content go viral on Instagram, TikTok, Twitter, and Threads in the pop culture space.',
    E'Score the following trending topic for OUTRAGE''s content strategy.\n\nTopic Title: {{title}}\nSummary: {{summary}}\nCategory: {{category}}\nKeywords: {{keywords}}\nSource Count: {{source_count}}\nFirst Seen: {{first_seen_at}}\n\nScore on a scale of 0-100 for each dimension:\n\n1. VIRAL_POTENTIAL: How likely is this to spread rapidly across social platforms? Consider shareability, shock value, emotional resonance, and meme potential.\n\n2. BRAND_FIT: How well does this align with OUTRAGE''s brand voice (bold, pop culture, Gen Z, celebrity/music/drama focus)? Is this something OUTRAGE can authentically cover?\n\n3. URGENCY: How time-sensitive is this? Will this story be irrelevant in 6 hours? Score higher for rapidly evolving situations.\n\n4. CONTROVERSY_LEVEL: How much debate, strong opinions, and discourse is this topic generating? Higher controversy = more comments and engagement.\n\n5. AUDIENCE_RELEVANCE: How much will OUTRAGE''s core audience (Gen Z, chronically online, pop culture obsessed) care about this?\n\nRespond in valid JSON only:\n{\n  "viral_potential": <0-100>,\n  "brand_fit": <0-100>,\n  "urgency": <0-100>,\n  "controversy_level": <0-100>,\n  "audience_relevance": <0-100>,\n  "overall_score": <0-100>,\n  "reasoning": "<2-3 sentence explanation of the overall score>",\n  "top_angle": "<the single best content angle: outrage|humor|hot_take|reaction|informational>",\n  "best_platform": "<best platform for this content: instagram|tiktok|twitter|threads>"\n}',
    ARRAY['title', 'summary', 'category', 'keywords', 'source_count', 'first_seen_at'],
    'gpt-4o',
    0.3,
    500,
    1,
    true,
    true
  ),
  (
    content_id,
    '00000000-0000-0000-0000-000000000001',
    'Content Suggestions v1',
    'Generates 8 content ideas across formats and platforms for a given trend cluster.',
    'content',
    E'You are the creative director for OUTRAGE, a viral Gen Z pop culture brand. You generate content ideas that are punchy, culturally sharp, and designed to stop the scroll.\n\nYour ideas must reflect OUTRAGE''s voice: bold, sarcastic, entertaining, unapologetic. Never suggest bland or safe content.',
    E'Generate 8 content ideas for the following trending topic.\n\nTopic: {{title}}\nSummary: {{summary}}\nCategory: {{category}}\nViral Score: {{overall_score}}\nTop Keywords: {{keywords}}\nBest Angle: {{top_angle}}\nBrand System Prompt Context: {{brand_voice}}\n\nGenerate exactly 8 ideas. Mix formats (tweet, caption, reel_idea, meme_idea, hook, headline, thread, poll). Mix platforms. Each idea should feel distinct.\n\nRespond in valid JSON only:\n{\n  "ideas": [\n    {\n      "type": "<content_type>",\n      "platform": "<platform>",\n      "angle": "<content_angle>",\n      "content": "<the actual content text — write it out fully, not a description>",\n      "hook": "<opening hook if applicable>",\n      "cta": "<call to action>"\n    }\n  ]\n}',
    ARRAY['title', 'summary', 'category', 'overall_score', 'keywords', 'top_angle', 'brand_voice'],
    'gpt-4o',
    0.85,
    2000,
    1,
    true,
    true
  ),
  (
    meme_id,
    '00000000-0000-0000-0000-000000000001',
    'Meme Caption Generator v1',
    'Generates 3 caption variants for a specific meme template applied to a trend topic.',
    'meme',
    E'You are a meme writer for OUTRAGE. You write punchy, culturally relevant meme captions that hit hard and get shared. You understand meme formats deeply and know how to apply trending topics to classic meme structures.',
    E'Write 3 meme caption variants for the following:\n\nMeme Template: {{template_name}}\nTemplate Description: {{template_description}}\nBox Count: {{box_count}}\nTrend Topic: {{title}}\nSummary: {{summary}}\nAngle: {{angle}}\n\nFor each variant, provide text for each box in the meme template. The captions should be punchy, culturally relevant, and shareable. Each variant should have a different comedic approach.\n\nRespond in valid JSON only:\n{\n  "captions": [\n    {\n      "variant": 1,\n      "approach": "<describe the comedic approach in 5 words>",\n      "boxes": ["<box 1 text>", "<box 2 text>", "<box 3 text (if applicable)>", "<box 4 text (if applicable)>"]\n    },\n    {\n      "variant": 2,\n      "approach": "<describe the comedic approach in 5 words>",\n      "boxes": ["<box 1 text>", "<box 2 text>"]\n    },\n    {\n      "variant": 3,\n      "approach": "<describe the comedic approach in 5 words>",\n      "boxes": ["<box 1 text>", "<box 2 text>"]\n    }\n  ]\n}',
    ARRAY['template_name', 'template_description', 'box_count', 'title', 'summary', 'angle'],
    'gpt-4o',
    0.9,
    800,
    1,
    true,
    true
  ),
  (
    clustering_id,
    '00000000-0000-0000-0000-000000000001',
    'Trend Clustering v1',
    'Extracts keywords and entities from source items and determines cluster similarity for deduplication.',
    'clustering',
    E'You are a data analyst for OUTRAGE''s content intelligence system. Your job is to analyze news articles and social media posts to extract keywords, entities, and determine if they are about the same trend.',
    E'Analyze the following content items and determine clustering.\n\n--- CANDIDATE ITEM ---\nTitle: {{new_title}}\nBody: {{new_body}}\nSource: {{new_source}}\n\n--- EXISTING CLUSTER ---\nCluster Title: {{cluster_title}}\nCluster Summary: {{cluster_summary}}\nCluster Keywords: {{cluster_keywords}}\n\nTasks:\n1. Extract keywords from the candidate item (5-10 most relevant)\n2. Extract named entities (people, brands, places, events)\n3. Determine similarity score (0.0 to 1.0) between candidate and existing cluster\n4. Suggest if this item should be added to the cluster (threshold: 0.65)\n\nRespond in valid JSON only:\n{\n  "keywords": ["keyword1", "keyword2"],\n  "entities": [\n    {"name": "entity name", "type": "person|brand|place|event|show|song|movie|topic|hashtag|other"}\n  ],\n  "similarity_score": <0.0-1.0>,\n  "should_cluster": <true|false>,\n  "reasoning": "<one sentence explanation>"\n}',
    ARRAY['new_title', 'new_body', 'new_source', 'cluster_title', 'cluster_summary', 'cluster_keywords'],
    'gpt-4o-mini',
    0.2,
    600,
    1,
    true,
    true
  ),
  (
    brand_id,
    '00000000-0000-0000-0000-000000000001',
    'Brand Voice Check v1',
    'Validates content against OUTRAGE brand guidelines and suggests improvements.',
    'brand',
    E'You are the brand guardian for OUTRAGE. You review content to ensure it matches the brand voice: bold, unapologetic, Gen Z-coded, punchy, culturally sharp, and entertaining. You identify when content sounds bland, corporate, or off-brand and provide specific rewrites.',
    E'Review the following content for OUTRAGE brand alignment.\n\nContent Type: {{content_type}}\nPlatform: {{platform}}\nContent:\n{{content}}\n\nBrand Voice Keywords: bold, unapologetic, sarcastic, punchy, Gen-Z-coded, irreverent, witty\nAvoid: passive voice, hedging language, corporate speak, Wikipedia tone\n\nEvaluate:\n1. BRAND_SCORE (0-100): How well does this match OUTRAGE''s voice?\n2. Identify specific issues (if any)\n3. Provide a rewritten version that is fully on-brand\n\nRespond in valid JSON only:\n{\n  "brand_score": <0-100>,\n  "is_approved": <true if score >= 70, false otherwise>,\n  "issues": ["issue 1", "issue 2"],\n  "rewrite": "<fully rewritten on-brand version>",\n  "rewrite_notes": "<brief explanation of what changed and why>"\n}',
    ARRAY['content_type', 'platform', 'content'],
    'gpt-4o',
    0.5,
    1000,
    1,
    true,
    true
  );

END $$;

-- =============================================================================
-- COMPETITOR WATCHLIST (5)
-- =============================================================================

INSERT INTO competitor_watchlist (id, org_id, name, platform, handle, profile_url, notes, is_active)
VALUES
  (
    gen_random_uuid(),
    '00000000-0000-0000-0000-000000000001',
    'TMZ',
    'twitter',
    'TMZ',
    'https://twitter.com/TMZ',
    'The godfather of celebrity gossip. They break stories first. Watch for exclusives and their engagement patterns.',
    true
  ),
  (
    gen_random_uuid(),
    '00000000-0000-0000-0000-000000000001',
    'TMZ',
    'instagram',
    'tmz',
    'https://www.instagram.com/tmz/',
    'High-volume celebrity content. Monitor for trending story formats and reel styles.',
    true
  ),
  (
    gen_random_uuid(),
    '00000000-0000-0000-0000-000000000001',
    'The Shade Room',
    'instagram',
    'theshaderoom',
    'https://www.instagram.com/theshaderoom/',
    'Dominant Black celebrity gossip brand. 27M+ followers. Study their caption format and comment engagement.',
    true
  ),
  (
    gen_random_uuid(),
    '00000000-0000-0000-0000-000000000001',
    'Complex',
    'twitter',
    'Complex',
    'https://twitter.com/Complex',
    'Youth culture authority. Music, sneakers, street culture. Monitor for content they are ahead on.',
    true
  ),
  (
    gen_random_uuid(),
    '00000000-0000-0000-0000-000000000001',
    'Pop Crave',
    'twitter',
    'PopCrave',
    'https://twitter.com/PopCrave',
    'Ultra-fast pop culture news aggregator. They surface things within minutes. Great benchmark for speed.',
    true
  ),
  (
    gen_random_uuid(),
    '00000000-0000-0000-0000-000000000001',
    'E! News',
    'instagram',
    'enews',
    'https://www.instagram.com/enews/',
    'Legacy entertainment news brand on Instagram. Study their story formats and celebrity access.',
    true
  );

-- =============================================================================
-- TAGS
-- =============================================================================

INSERT INTO tags (id, org_id, name, color)
VALUES
  (gen_random_uuid(), '00000000-0000-0000-0000-000000000001', 'Breaking', '#ef4444'),
  (gen_random_uuid(), '00000000-0000-0000-0000-000000000001', 'Viral', '#f97316'),
  (gen_random_uuid(), '00000000-0000-0000-0000-000000000001', 'Celebrity Drama', '#ec4899'),
  (gen_random_uuid(), '00000000-0000-0000-0000-000000000001', 'Music', '#8b5cf6'),
  (gen_random_uuid(), '00000000-0000-0000-0000-000000000001', 'Sports', '#3b82f6'),
  (gen_random_uuid(), '00000000-0000-0000-0000-000000000001', 'Film', '#06b6d4'),
  (gen_random_uuid(), '00000000-0000-0000-0000-000000000001', 'TV', '#14b8a6'),
  (gen_random_uuid(), '00000000-0000-0000-0000-000000000001', 'Fashion', '#f59e0b'),
  (gen_random_uuid(), '00000000-0000-0000-0000-000000000001', 'Meme', '#84cc16'),
  (gen_random_uuid(), '00000000-0000-0000-0000-000000000001', 'Political', '#6366f1'),
  (gen_random_uuid(), '00000000-0000-0000-0000-000000000001', 'LGBTQ+', '#a855f7'),
  (gen_random_uuid(), '00000000-0000-0000-0000-000000000001', 'True Crime', '#64748b');

-- =============================================================================
-- WORKFLOWS (5 n8n workflows)
-- =============================================================================

INSERT INTO workflows (id, org_id, name, n8n_workflow_id, status, description, trigger_type, schedule, config)
VALUES
  (
    gen_random_uuid(),
    '00000000-0000-0000-0000-000000000001',
    'RSS Ingestion',
    'outrage-rss-ingestion-v1',
    'active',
    'Fetches new items from all active RSS sources, deduplicates by external_id, and inserts into source_items. Runs every 15 minutes.',
    'schedule',
    '*/15 * * * *',
    '{
      "batch_size": 50,
      "timeout_seconds": 30,
      "retry_attempts": 3,
      "dedup_window_hours": 48,
      "webhook_path": "/webhook/rss-ingestion",
      "error_notification": true
    }'::jsonb
  ),
  (
    gen_random_uuid(),
    '00000000-0000-0000-0000-000000000001',
    'Dedup & Cluster',
    'outrage-dedup-cluster-v1',
    'active',
    'Processes new source_items, runs similarity scoring against existing clusters, creates new clusters or adds to existing ones. Triggers after RSS ingestion.',
    'webhook',
    NULL,
    '{
      "similarity_threshold": 0.65,
      "min_items_for_cluster": 2,
      "max_cluster_age_hours": 72,
      "webhook_path": "/webhook/dedup-cluster",
      "ai_model": "gpt-4o-mini",
      "batch_size": 20
    }'::jsonb
  ),
  (
    gen_random_uuid(),
    '00000000-0000-0000-0000-000000000001',
    'Trend Scorer',
    'outrage-trend-scorer-v1',
    'active',
    'Runs AI viral scoring on newly created or updated trend clusters. Scores 5 dimensions and updates overall_score on the cluster.',
    'webhook',
    NULL,
    '{
      "scoring_model": "gpt-4o",
      "batch_size": 10,
      "rescore_after_hours": 6,
      "webhook_path": "/webhook/trend-scorer",
      "min_source_count": 1,
      "update_cluster_score": true
    }'::jsonb
  ),
  (
    gen_random_uuid(),
    '00000000-0000-0000-0000-000000000001',
    'Content Suggester',
    'outrage-content-suggester-v1',
    'active',
    'Auto-generates content ideas for high-scoring trend clusters (score >= 70). Creates content_ideas records linked to the cluster.',
    'webhook',
    NULL,
    '{
      "min_score_threshold": 70,
      "ideas_per_cluster": 8,
      "generation_model": "gpt-4o",
      "webhook_path": "/webhook/content-suggester",
      "platforms": ["instagram", "tiktok", "twitter"],
      "auto_save_threshold": 80
    }'::jsonb
  ),
  (
    gen_random_uuid(),
    '00000000-0000-0000-0000-000000000001',
    'Alert Evaluator',
    'outrage-alert-evaluator-v1',
    'active',
    'Evaluates all active alert rules against newly scored clusters and fires notifications to configured channels when conditions are met.',
    'webhook',
    NULL,
    '{
      "evaluation_delay_seconds": 5,
      "webhook_path": "/webhook/alert-evaluator",
      "notification_channels": ["in_app", "push", "email"],
      "max_notifications_per_hour": 20,
      "respect_cooldown": true
    }'::jsonb
  );
