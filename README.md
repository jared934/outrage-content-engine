# OUTRAGE Content Engine

An AI-powered content operations platform for outrage-driven media brands. Tracks trending topics, scores them for virality and meme potential, generates content ideas, and helps teams act on the highest-opportunity moments.

---

## What's Built

| Feature | Status | Notes |
|---|---|---|
| Trend Radar | ✅ Real | Live trend cluster feed with scores |
| Trend Scoring | ✅ Real | 10-dimension AI scoring via n8n |
| Content Ideas | ✅ Real | OpenAI GPT-4o-mini generation |
| Meme Studio | ✅ Real | Canvas editor + Imgflip templates |
| Pipeline (Kanban) | ✅ Real | Drag-and-drop with @hello-pangea/dnd |
| Content Calendar | ✅ Real | Visual post scheduler |
| Asset Library | ✅ Real | File upload and tagging |
| Alerts | ✅ Real | Rule engine + in-app notifications |
| Competitor Watchlist | ✅ Real | RSS/Atom feed ingestion, gap analysis |
| Performance Feedback | ✅ Real | Post tracking with 0-100 score formula |
| Command Bar (⌘K) | ✅ Real | NLP intent routing, trend results |
| Brand Voice | ✅ Real | "Make it more savage" rewriter |
| Dashboard | ✅ Real | Stats, manager alerts, top opportunities |

**What's mocked / not yet wired:**
- Social platform OAuth (Instagram, TikTok, Twitter publish flows)
- Canva Connect export (API calls stubbed, UI flow ready)
- n8n workflow triggers from Next.js (webhook endpoints exist, workflows need importing)
- Email delivery for alert digests (n8n SMTP node required)

---

## Stack

- **Next.js 14** — App Router, server components, API routes
- **TypeScript** — Strict mode, 0 `tsc --noEmit` errors
- **Supabase** — PostgreSQL, RLS, service role auth
- **n8n** — All automation (ingestion, scoring, alerts, digests)
- **OpenAI** — Content generation, punchline suggestions
- **Tailwind CSS** — Dark theme UI
- **@tanstack/react-query** — Data fetching and cache
- **Zustand** — UI state (command bar, etc.)
- **cmdk** — Accessible command palette

---

## Local Development

### 1. Clone and install

```bash
git clone <repo>
cd outrage-content-engine
npm install
```

### 2. Configure environment

```bash
cp .env.example .env.local
```

Fill in at minimum:
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `NEXT_PUBLIC_APP_URL=http://localhost:3000`
- `OPENAI_API_KEY`

### 3. Set up Supabase

```bash
# Apply all migrations in order
supabase db push

# Or run manually via Supabase SQL editor:
# supabase/migrations/001_base_schema.sql
# supabase/migrations/002_refined_schema.sql
# ... through 014_performance.sql
```

### 4. Seed demo data

```bash
# Run seed.sql in the Supabase SQL editor
# Includes: orgs, trends, scores, alerts, pipeline items,
#           performance posts (35 entries with clear patterns)
```

### 5. Start the dev server

```bash
npm run dev
# → http://localhost:3000
```

---

## Supabase Setup

### Migrations (run in order)

All migration files live in `supabase/migrations/`. Apply with Supabase CLI or paste into the SQL editor:

| File | What it adds |
|---|---|
| `001_base_schema.sql` | Core tables: orgs, sources, items, clusters, scores |
| `002_refined_schema.sql` | Full schema refinement with RLS |
| `003_content_ideas.sql` | content_ideas table |
| `004_pipeline.sql` | pipeline_items (kanban) |
| `005_calendar.sql` | calendar_posts |
| `006_assets.sql` | asset_library |
| `007_notifications.sql` | notifications, alert_rules |
| `008_digest.sql` | digests |
| `009_alert_rules_v2.sql` | Extended alert rule schema |
| `010_meme_drafts.sql` | meme_drafts |
| `011_brand_voice.sql` | brand_voice, rewrite_log |
| `012_performance_weights.sql` | performance_weights |
| `013_competitors.sql` | competitors, competitor_sources, competitor_posts |
| `014_performance.sql` | performance_posts + seeded demo data |

### Row Level Security

All tables enforce RLS. Every user must belong to an `org_members` row. The service role client (`SUPABASE_SERVICE_ROLE_KEY`) bypasses RLS and is used only in API routes.

---

## n8n Setup

OUTRAGE uses n8n for all automation. The Next.js app exposes webhook endpoints — n8n calls them, not the other way around (except for a few trigger endpoints).

### Required workflows

| Workflow | Trigger | What it does |
|---|---|---|
| Trend Ingest | Cron (hourly) | Fetches RSS/Reddit/YouTube, creates `trend_items` |
| Trend Cluster | After ingest | Groups items into `trend_clusters` |
| Trend Score | After cluster | Calls OpenAI, writes `trend_scores` |
| Alert Fire | Cron / webhook | Calls `/api/alerts/fire` with `ALERT_FIRE_API_KEY` |
| Morning Digest | Cron 7am | Calls `/api/alerts/digest?type=morning` |
| Evening Digest | Cron 6pm | Calls `/api/alerts/digest?type=evening` |
| Competitor Ingest | Cron (4x/day) | Posts scraped content to `/api/competitors/ingest` |

### Connecting n8n to Next.js

Set these in n8n credentials:
- HTTP Request node header: `X-Api-Key: <ALERT_FIRE_API_KEY>`
- Webhook Secret: `N8N_WEBHOOK_SECRET` (shared, verified in each route)

Set in `.env.local`:
- `N8N_BASE_URL=https://your-n8n.example.com`
- `N8N_WEBHOOK_SECRET=<same value>`
- `N8N_API_KEY=<n8n API key>` (for execution polling)

---

## Deployment (Vercel + Supabase)

### 1. Push to GitHub

### 2. Create Vercel project

- Framework preset: **Next.js**
- Root directory: `/` (default)
- Node.js: 20.x

### 3. Add environment variables in Vercel

Copy all values from `.env.example`. The minimum required set for production:

```
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY
NEXT_PUBLIC_APP_URL          ← your Vercel URL
CRON_SECRET
ALERT_FIRE_API_KEY
N8N_WEBHOOK_SECRET
OPENAI_API_KEY
OPENAI_MODEL=gpt-4o-mini
```

### 4. Update n8n webhooks

After deploy, update all n8n HTTP Request nodes to point to your Vercel URL instead of localhost.

### 5. Update Supabase Auth

In Supabase Dashboard → Authentication → URL Configuration:
- Site URL: `https://your-app.vercel.app`
- Redirect URLs: `https://your-app.vercel.app/auth/callback`

---

## API Routes

### Trends
- `GET /api/trends` — list active clusters with scores
- `GET /api/trends/[id]` — single cluster detail
- `GET /api/trends/[id]/sources` — source articles
- `POST /api/trends/score` — trigger scoring for a cluster

### Content
- `GET /api/ideas` — list content ideas
- `POST /api/ideas/generate` — generate ideas via OpenAI
- `PATCH /api/ideas/[id]` — save/mark used

### Alerts
- `POST /api/alerts/fire` — evaluate rules against current trends (n8n calls this)
- `POST /api/alerts/digest` — generate morning/evening digest
- `GET/POST /api/alert-rules` — manage alert rules

### Competitors
- `GET/POST /api/competitors` — list/create competitors
- `POST /api/competitors/[id]/refresh` — fetch RSS feeds
- `GET /api/competitors/gaps` — on-demand gap analysis
- `POST /api/competitors/ingest` — n8n bulk post ingest

### Performance
- `GET/POST /api/performance/posts` — list/create performance posts
- `GET /api/performance/analytics` — aggregated analytics
- `PUT /api/performance/weights` — recalculate learned weights

### Command Bar
- `GET /api/commands/query?intent=post_now` — smart query endpoint

---

## Testing

```bash
npm test           # run all tests once
npm run test:watch # watch mode
```

Tests use [Vitest](https://vitest.dev) and cover:
- `lib/performance/performance.analytics.ts` — score aggregation, weight derivation
- `lib/alerts/alert-engine.ts` — rule evaluation, dedup, all trigger types
- `lib/commands/command.router.ts` — NLP intent parsing, static command matching

---

## V2 Roadmap

### P0 — Wire live data
- [ ] n8n workflow import bundle (pre-built templates)
- [ ] Supabase Realtime for live trend score updates
- [ ] Cron setup via Vercel Cron or n8n scheduler

### P1 — Distribution
- [ ] Instagram/TikTok publish via API (OAuth flow ready)
- [ ] Twitter/X thread poster
- [ ] Canva Connect full integration

### P2 — Intelligence
- [ ] GPT-4o scoring explanation panel
- [ ] Recommendation engine: suggest content based on performance weights
- [ ] A/B headline testing with auto-winner selection

### P3 — Scale
- [ ] Multi-org support (franchise / agency mode)
- [ ] Mobile app (React Native — API is already mobile-ready)
- [ ] Webhook outbound for Slack/Discord alerts
- [ ] White-label mode

---

## Project Structure

```
outrage-content-engine/
├── app/
│   ├── (app)/              # Authenticated app pages
│   │   ├── page.tsx        # Dashboard
│   │   ├── trends/         # Trend browser
│   │   ├── content/        # Content ideas
│   │   ├── memes/studio/   # Meme Studio
│   │   ├── pipeline/       # Kanban board
│   │   ├── calendar/       # Content calendar
│   │   ├── assets/         # Asset library
│   │   ├── alerts/         # Alert rules + inbox
│   │   ├── competitors/    # Watchlist + gap analysis
│   │   ├── performance/    # Analytics + learned weights
│   │   └── brand/          # Brand voice + rewrite
│   ├── api/                # 47 API route handlers
│   └── (auth)/             # Login / signup
├── components/
│   ├── layout/             # Sidebar, CommandBar, Header
│   ├── ui/                 # Shared UI components
│   ├── trends/             # Trend cards, score displays
│   ├── competitors/        # Competitor cards, gap analysis
│   ├── performance/        # Score bars, timing grid, weights
│   └── [feature]/          # Feature-specific components
├── hooks/                  # React Query hooks per feature
├── lib/
│   ├── alerts/             # Alert engine (pure, no DB)
│   ├── commands/           # Command registry + NLP router
│   ├── competitors/        # RSS service + types
│   ├── performance/        # Score formula + analytics
│   ├── scoring/            # Trend scoring types
│   └── supabase/           # Client + server Supabase clients
├── stores/                 # Zustand stores
├── supabase/migrations/    # 14 migration files
├── __tests__/              # Vitest unit tests
└── types/                  # Global TypeScript types
```
