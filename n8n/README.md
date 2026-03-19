# n8n Workflow Architecture

OUTRAGE Content Engine uses n8n for all automation. Next.js only exposes webhook endpoints — it does not run cron jobs or background tasks itself.

---

## Webhook Endpoints

All endpoints require the `x-webhook-secret` header matching `N8N_WEBHOOK_SECRET` in `.env.local`.

| Endpoint | Method | Purpose |
|---|---|---|
| `/api/webhooks/ingest` | POST | Receive ingested items from n8n |
| `/api/webhooks/scoring` | POST | Receive AI scores for trend clusters |
| `/api/webhooks/suggestions` | POST | Receive AI-generated content ideas |
| `/api/webhooks/alert` | POST | Receive alert notifications |
| `/api/ingestion/run` | POST | Direct trigger (dev only) |

---

## Database Tables (Current Schema)

> ⚠️ Schema was updated. Old names are shown for migration reference.

| Old Name | New Name | Notes |
|---|---|---|
| `raw_items` | `source_items` | All ingested content |
| `sources` | `source_configs` | Source configuration |
| `trends` | `trend_clusters` | Trend cluster records |
| `content_suggestions` | `content_ideas` | AI content suggestions |
| `content_pieces` | `content_variants` | Pipeline content items |
| `pipeline_stages` | `pipeline_stages_config` | Kanban stage definitions |
| `alerts` | `notifications` | Alert/notification log |

### Field Renames

| Table | Old Field | New Field |
|---|---|---|
| `trend_clusters` | `last_updated_at` | `updated_at` |
| `trend_clusters` | `trend_id` (FK) | `cluster_id` (FK) |
| `trend_scores` | `scoring_reasoning` | `reasoning` |
| `trend_scores` | `trend_id` | `cluster_id` |
| `content_ideas` | `trend_id` | `cluster_id` |
| `content_variants` | `suggestion_id` | `idea_id` |
| `content_variants` | `stage_id` | `stage_config_id` |
| `notifications` | `body` | `message` |
| `source_configs` | `is_active` (bool) | `status` ('active'\|'paused'\|'error') |

---

## Workflow 1 — RSS Ingestion (Every 30 minutes)

**Trigger:** Schedule (*/30 * * * *)

**Steps:**
1. Load active sources from `source_configs` WHERE `status = 'active'`
2. For each source, run the appropriate n8n node:
   - RSS/Google News/Google Trends: HTTP Request → parse RSS
   - YouTube API: YouTube node (if `config.youtube_api_key` is set)
   - Reddit: HTTP Request to `reddit.com/r/{sub}/hot.json`
   - TikTok/Instagram: Apify actor (requires paid Apify account)
3. Normalize each item (dedup by URL/external_id)
4. POST to `/api/webhooks/ingest` with `source_id` + `items[]`

**Payload shape:**
```json
{
  "source_id": "uuid",
  "items": [
    {
      "external_id": "sha256-hash",
      "title": "...",
      "body": "...",
      "url": "https://...",
      "author": "...",
      "thumbnail_url": "https://...",
      "media_urls": ["https://..."],
      "published_at": "2024-01-01T00:00:00Z",
      "keywords": ["word1", "word2"],
      "entities": { "people": [], "brands": [] },
      "engagement_data": { "views": 0, "likes": 0 },
      "raw_data": {}
    }
  ]
}
```

---

## Workflow 2 — Trend Clustering (Every hour)

**Trigger:** Schedule (0 * * * *)

**Steps:**
1. Fetch recent `source_items` from last 2 hours (unprocessed)
2. Group items by keyword/entity similarity (cosine similarity or BM25)
3. For each cluster:
   - Create or update `trend_clusters` record
   - Link `source_items` to cluster via `cluster_id`
4. (Optional) Trigger Workflow 3 immediately for high-velocity clusters

**Key fields on `trend_clusters`:**
- `title` — cluster summary title
- `keywords[]` — top keywords across all items
- `entities{}` — merged entity map
- `item_count` — number of source_items
- `velocity` — items added per hour
- `status` — 'new' | 'active' | 'hot' | 'declining' | 'archived' | 'acted_on'

---

## Workflow 3 — AI Scoring (Triggered or Every 2 hours)

**Trigger:** Webhook (from Workflow 2) or Schedule (0 */2 * * *)

**Steps:**
1. Fetch `trend_clusters` WHERE `status IN ('new', 'active')` AND `overall_score IS NULL`
2. For each cluster, build prompt with title + keywords + top 3 item snippets
3. Call OpenAI (GPT-4o) to score on:
   - `virality_score` (0-100)
   - `relevance_score` (0-100, brand fit for OUTRAGE)
   - `longevity_score` (0-100, how long will this trend last?)
   - `brand_fit_score` (0-100, does this fit the OUTRAGE voice?)
   - `overall_score` (0-100, weighted average)
   - `reasoning` (2-3 sentence explanation)
4. POST to `/api/webhooks/scoring`:
   ```json
   {
     "cluster_id": "uuid",
     "scores": {
       "virality_score": 82,
       "relevance_score": 75,
       "longevity_score": 60,
       "brand_fit_score": 88,
       "overall_score": 78,
       "reasoning": "High social velocity..."
     }
   }
   ```
5. If `overall_score >= 75`, trigger Workflow 4

---

## Workflow 4 — Content Generation (Triggered)

**Trigger:** Webhook (from Workflow 3 or manual)

**Steps:**
1. Receive `cluster_id` + `overall_score`
2. Fetch cluster details + top source items
3. Call OpenAI to generate 3-5 content ideas:
   - `type`: 'caption' | 'thread' | 'short_video' | 'meme' | 'carousel' | 'blog'
   - `content`: the actual content text
   - `angle`: editorial angle (e.g. "hot take", "breakdown", "comparison")
   - `hook`: opening hook line
   - `cta`: call to action
   - `platform`: 'instagram' | 'tiktok' | 'twitter' | 'all'
   - `confidence`: 0-1 confidence score
4. POST to `/api/webhooks/suggestions`:
   ```json
   {
     "cluster_id": "uuid",
     "suggestions": [
       {
         "type": "caption",
         "content": "...",
         "angle": "hot take",
         "hook": "Nobody is talking about this...",
         "cta": "Drop your take 👇",
         "platform": "instagram",
         "ai_model": "gpt-4o",
         "confidence": 0.85
       }
     ]
   }
   ```

---

## Workflow 5 — Alert Engine (Every 15 minutes)

**Trigger:** Schedule (*/15 * * * *)

**Steps:**
1. Fetch active `alert_rules` WHERE `enabled = true`
2. For each rule, evaluate against recent `trend_clusters`:
   - `score_threshold`: fire if `overall_score >= rule.threshold`
   - `keyword_match`: fire if cluster keywords match rule patterns
   - `velocity_spike`: fire if cluster velocity > rule.velocity_threshold
3. For matches not already notified (check `notifications` table):
   ```json
   {
     "title": "Alert: [rule name]",
     "message": "Trend 'X' matched rule 'Y' with score 85",
     "severity": "high",
     "cluster_id": "uuid",
     "rule_id": "uuid"
   }
   ```
4. POST to `/api/webhooks/alert`

---

## Social Platform Scrapers (n8n Apify)

For TikTok, Instagram, and Twitter, n8n uses Apify actors because these platforms have no public APIs. Items are normalized and pushed to `/api/webhooks/ingest` exactly like other sources.

| Platform | Apify Actor | Notes |
|---|---|---|
| TikTok | `clockworks/tiktok-scraper` | Trending hashtags + competitor profiles |
| Instagram | `apify/instagram-scraper` | Competitor posts + hashtag feed |
| Twitter/X | `quacker/twitter-scraper` | Trending topics + keyword search |

Apify is paid. Free tier: 5 USD/month credit.

---

## Environment Variables

```bash
# Required
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...
N8N_WEBHOOK_SECRET=your-secret-here

# Optional — enables YouTube Data API (falls back to RSS if absent)
YOUTUBE_API_KEY=AIza...

# Optional — for ingestion cron via Vercel
CRON_SECRET=your-cron-secret

# Optional — if running OpenAI calls server-side
OPENAI_API_KEY=sk-...
```

---

## Dev Testing

You can trigger any adapter directly without n8n:

```bash
# Google Trends
curl http://localhost:3000/api/ingestion/run?type=google_trends

# Reddit
curl "http://localhost:3000/api/ingestion/run?type=reddit&subreddit=PublicFreakout&limit=5"

# Google News with search
curl "http://localhost:3000/api/ingestion/run?type=google_news&q=celebrity+drama"

# Run all active sources (POST)
curl -X POST http://localhost:3000/api/ingestion/run \
  -H "Content-Type: application/json" \
  -d '{"run_all": true}'
```

In development, the `/api/ingestion/run` endpoint skips auth checks automatically.
