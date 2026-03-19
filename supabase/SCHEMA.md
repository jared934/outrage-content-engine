# OUTRAGE Content Engine — Schema Documentation

Version: 1.0.0
Last Updated: 2026-03-18

---

## Overview

OUTRAGE is an AI-powered viral content management system built on Supabase PostgreSQL. The schema is multi-tenant by design, with every org-scoped table carrying an `org_id` foreign key. All automation is handled by n8n (external); the Next.js app only reads/writes via Supabase client or webhook endpoints.

---

## ERD Description (Domain Groups)

### Auth / Org Domain

```
auth.users (Supabase managed)
    |
    +-- profiles (1:1, extends auth.users)
    |
    +-- org_members (M:M join to organizations)
            |
            +-- organizations (1:N to all org-scoped tables)
```

### Ingestion Domain

```
organizations
    |
    +-- sources (1:N)
            |
            +-- source_items (1:N, partial unique index for dedup)
            |       |
            |       +-- trend_cluster_items (M:M bridge to trend_clusters)
            |
            +-- source_sync_logs (1:N, audit of each sync run)
```

### Trend Domain

```
organizations
    |
    +-- trend_clusters (1:N)
            |
            +-- trend_cluster_items (M:M to source_items)
            |
            +-- trend_cluster_entities (M:M to trend_entities)
            |
            +-- trend_scores (1:N, AI scoring snapshots)
            |
            +-- content_ideas (1:N)
            |
            +-- cluster_tags (M:M to tags)
            |
            +-- notifications (1:N, alert triggers)
            |
            +-- canva_exports (1:N)

trend_entities (global, not org-scoped)
    |
    +-- trend_cluster_entities (M:M bridge to trend_clusters)
```

### Content Domain

```
trend_clusters
    |
    +-- content_ideas (1:N)
            |
            +-- content_variants (1:N, versioned drafts)
            |       |
            |       +-- content_variants (self-ref, parent_variant_id for history)
            |       |
            |       +-- memes (1:N)
            |       |
            |       +-- content_pipeline_items (1:N)
            |       |
            |       +-- content_calendar_items (1:N)
            |       |
            |       +-- post_results (1:N)
            |               |
            |               +-- performance_metrics (1:N)
            |
            +-- content_idea_tags (M:M to tags)

prompt_templates
    |
    +-- content_ideas (1:N via prompt_template_id)
```

### Meme Domain

```
meme_templates (global, not org-scoped)
    |
    +-- memes (1:N)

trend_clusters --> memes
content_variants --> memes
assets --> memes (via asset_id)
```

### Asset Domain

```
organizations
    |
    +-- assets (1:N)
            |
            +-- asset_tags (M:M to tags)
            |
            +-- memes (1:N via asset_id)
```

### Pipeline / Calendar Domain

```
organizations
    |
    +-- pipeline_stages_config (1:N, customizable stage names/colors)
    |
    +-- content_pipeline_items (1:N, kanban board state)
    |       |
    |       +-- content_calendar_items (1:N via pipeline_item_id)
    |
    +-- content_calendar_items (1:N, scheduled publishing)
            |
            +-- post_results (1:N)
```

### Publishing Domain

```
content_variants --> post_results --> performance_metrics
content_calendar_items --> post_results
```

### Brand / AI Domain

```
organizations
    |
    +-- brand_settings (1:1, unique per org)
    |
    +-- prompt_templates (1:N, versioned AI prompts)
```

### Notifications Domain

```
organizations
    |
    +-- alert_rules (1:N)
    |       |
    |       +-- notifications (1:N via rule_id)
    |
    +-- notifications (1:N, per user)
```

### Integration Domain

```
organizations
    |
    +-- workflows (1:N, n8n workflow registry)
    |
    +-- canva_exports (1:N)
```

### Competitor Domain

```
organizations
    |
    +-- competitor_watchlist (1:N, unique on org+platform+handle)
```

### Tags Domain

```
organizations
    |
    +-- tags (1:N)
            |
            +-- cluster_tags (M:M to trend_clusters)
            +-- content_idea_tags (M:M to content_ideas)
            +-- asset_tags (M:M to assets)
```

### Audit Domain

```
audit_logs (soft references to org and user, never cascade-deleted)
```

---

## Table-by-Table Descriptions

### `organizations`
Top-level tenant. Every piece of data belongs to an org. The default seed org is `00000000-0000-0000-0000-000000000001` (OUTRAGE). Settings JSONB stores feature flags and limits.

Key columns:
- `slug` — unique URL-safe identifier
- `plan` — `free | pro | enterprise`
- `settings` — feature flags, limits, timezone

### `profiles`
Extends `auth.users` 1:1. Created automatically on user signup via trigger or edge function. Stores display preferences, timezone, and global role.

Key columns:
- `id` — matches `auth.users.id`
- `role` — global member_role (also scoped per org in org_members)
- `preferences` — JSONB for UI preferences (theme, notification settings, etc.)

### `org_members`
Join table for users and organizations. A user can belong to multiple orgs. Role here controls what they can do within that specific org.

Key columns:
- `role` — `owner | admin | editor | viewer`
- `invited_by` — who sent the invite
- Unique constraint: `(org_id, user_id)`

### `sources`
Configured content ingestion sources. Each source has a type (rss, reddit, twitter, etc.) and a fetch interval. n8n handles the actual fetching and calls back with results.

Key columns:
- `type` — determines which n8n node handles fetching
- `status` — `active | paused | error | pending`
- `fetch_interval_minutes` — polling frequency
- `error_count` / `last_error` — for health monitoring

### `source_items`
Raw content items fetched from sources. The dedup key is `(source_id, external_id)` via a partial unique index (only when `external_id IS NOT NULL`). Items start as `new` and progress through `processed -> clustered`.

Key columns:
- `external_id` — platform-native ID for deduplication
- `status` — `new | processed | clustered | ignored | error`
- `keywords` — extracted by AI during processing
- `entities` — JSONB of named entities
- `sentiment_score` — -1.0 to 1.0

Dedup strategy: `CREATE UNIQUE INDEX source_items_dedup_idx ON source_items(source_id, external_id) WHERE external_id IS NOT NULL`

### `source_sync_logs`
Audit log for every sync run. Created by n8n at the start of each fetch cycle and updated on completion. Used for monitoring source health.

### `trend_clusters`
The core intelligence unit. A cluster groups related source items around a single trending topic. The AI assigns scores; the editorial team decides whether to act on it.

Key columns:
- `status` — `new | active | hot | declining | archived | acted_on`
- `overall_score` — 0-100, computed from trend_scores
- `source_count` — number of items in cluster
- `keywords` — GIN-indexed for fast filtering
- `acted_on` — boolean flag when content was created from this cluster
- `is_manual` — true if manually created by a user (not AI-clustered)

### `trend_cluster_items`
Bridge table. Each source item can belong to at most one cluster (by convention, enforced by workflow logic). `relevance_score` is set by the clustering AI.

### `trend_entities`
Global (not org-scoped) named entity registry. Entities are people, brands, places, events, etc. extracted across all clusters. Unique on `name`.

### `trend_cluster_entities`
Many-to-many between clusters and entities. `mention_count` tracks how many source items in the cluster mention this entity.

### `trend_scores`
Point-in-time AI scoring record for a cluster. Multiple scores can exist per cluster (rescoring over time). The workflow updates `trend_clusters.overall_score` after each scoring run.

Key columns:
- `viral_potential` — shareability and meme potential (0-100)
- `brand_fit` — alignment with OUTRAGE brand (0-100)
- `urgency` — time sensitivity (0-100)
- `controversy_level` — discourse and debate potential (0-100)
- `audience_relevance` — how much the target audience cares (0-100)
- `overall_score` — weighted composite (0-100)
- `scored_by` — NULL means scored by AI

### `prompt_templates`
Versioned AI prompt library. Each template has a `system_prompt`, `user_prompt`, and a list of `variables` (Handlebars-style: `{{variable_name}}`). Templates can be versioned by incrementing `version`.

### `content_ideas`
AI-generated content ideas linked to a trend cluster. One cluster typically generates 8 ideas across multiple formats and platforms. Ideas can be saved (`is_saved`) or marked used (`is_used`).

Key columns:
- `type` — `headline | hook | caption | meme_idea | reel_idea | tweet | poll | post_copy | thread | short_form_video | long_form | newsletter`
- `angle` — `outrage | humor | informational | reaction | hot_take | educational | inspirational | controversial | nostalgic`
- `platform` — target platform

### `content_variants`
The publishable draft unit. Ideas become variants when the editor starts writing. Variants are versioned via self-reference (`parent_variant_id`). Status flows: `draft -> review -> approved -> published`.

Key columns:
- `status` — `draft | review | approved | rejected | published | archived`
- `version` — integer version number within a variant chain
- `parent_variant_id` — self-reference for version history
- `scheduled_for` — when to publish
- `assigned_to` / `approved_by` — team workflow fields

### `meme_templates`
Global (not org-scoped) meme image template library. Sourced from Imgflip API or custom uploads. `box_count` defines how many caption boxes the template has (2-4 typically).

### `assets`
Org-scoped media asset library backed by Supabase Storage. `storage_path` is the internal path; `url` is the public CDN URL.

### `memes`
A generated meme, linking a template to captions, a trend cluster, and optionally a content variant. `generated_url` is the final rendered image URL (from Imgflip API or server-side rendering). `asset_id` links to the stored asset.

### `pipeline_stages_config`
Per-org customizable Kanban stage configuration. The 6 default stages map to the `pipeline_stage` enum, but orgs can rename them and change colors.

### `content_pipeline_items`
Tracks content variants through the editorial pipeline. One item per variant in the kanban board. `position` is the card's vertical sort order within a stage column.

### `content_calendar_items`
Scheduled publishing entries. A variant can appear on the calendar multiple times (for multiple platforms or recurring posts). `recurring_rule` stores RRULE strings for repeating posts.

### `post_results`
Immutable record created when content is successfully published to a platform. Stores the external post ID and URL for later metric collection.

### `performance_metrics`
Point-in-time metric snapshots for published posts. Multiple rows per `post_result_id` (collected at 1h, 24h, 7d, 30d intervals by n8n workflows).

### `brand_settings`
One row per org (enforced by UNIQUE constraint on `org_id`). Contains the full OUTRAGE brand voice, system prompt, tone keywords, content pillars, hashtag sets, and visual identity references.

### `alert_rules`
Configurable trigger rules evaluated by the alert-evaluator n8n workflow after each scoring run. When conditions match, notifications are created for org users.

Trigger types:
- `score_threshold` — fires when cluster score exceeds threshold
- `trend_spike` — fires when source_count exceeds threshold (rapid news accumulation)
- `keyword_match` — fires when cluster keywords match configured keywords
- `competitor_mention` — fires when a watched competitor is mentioned
- `source_error` — fires when a source hits error_count threshold
- `new_trend` — fires on any new cluster creation

### `notifications`
Per-user in-app notifications. Created by the alert-evaluator workflow or by system events (content_approved, etc.). Users can mark as read or dismiss.

### `workflows`
n8n workflow registry. Stores the n8n workflow ID, current status, schedule (cron), and run metadata. The Next.js app reads this to display workflow health on the dashboard.

### `canva_exports`
Records of designs exported to Canva. Stores the design URL, edit URL, and preview URL returned by the Canva API. Linked to a cluster or variant for context.

### `competitor_watchlist`
Accounts to monitor for competitive intelligence. Unique on `(org_id, platform, handle)`. The competitor-monitor n8n workflow checks these accounts periodically.

### `tags`
Org-scoped taxonomy tags with colors. Used to organize clusters, ideas, and assets. Unique on `(org_id, name)`.

### `cluster_tags`, `content_idea_tags`, `asset_tags`
Simple many-to-many bridge tables. Composite primary keys prevent duplicates. Cascade delete on both sides.

### `audit_logs`
Immutable audit trail. Uses `ON DELETE SET NULL` (not CASCADE) so logs are never lost when users or orgs are deleted. Only service_role can insert; admins can read.

---

## Key Relationships Summary

| Table | Relates To | Type | Note |
|-------|-----------|------|------|
| profiles | auth.users | 1:1 | Extends Supabase auth |
| org_members | organizations + auth.users | M:M | Role-per-org |
| sources | organizations | N:1 | Org-scoped |
| source_items | sources | N:1 | Dedup via partial index |
| source_sync_logs | sources | N:1 | Fetch audit |
| trend_clusters | organizations | N:1 | Core intelligence unit |
| trend_cluster_items | trend_clusters + source_items | M:M | Relevance scored |
| trend_cluster_entities | trend_clusters + trend_entities | M:M | With mention count |
| trend_scores | trend_clusters | N:1 | Multiple over time |
| content_ideas | trend_clusters + organizations | N:1 | AI-generated |
| content_variants | content_ideas (optional) + organizations | N:1 | Versioned via self-ref |
| memes | meme_templates + assets + clusters + variants | N:many | Generated memes |
| pipeline_stages_config | organizations | N:1 | Customizable stages |
| content_pipeline_items | content_variants + organizations | N:1 | Kanban state |
| content_calendar_items | content_variants + organizations | N:1 | Scheduled publishing |
| post_results | content_variants + calendar_items | N:1 | Publish record |
| performance_metrics | post_results | N:1 | Time-series metrics |
| brand_settings | organizations | 1:1 | Unique per org |
| prompt_templates | organizations | N:1 | Versioned prompts |
| notifications | auth.users + organizations | N:1 | Per-user alerts |
| alert_rules | organizations | N:1 | Configurable triggers |
| workflows | organizations | N:1 | n8n registry |
| canva_exports | organizations + clusters + variants | N:1 | Design exports |
| competitor_watchlist | organizations | N:1 | Unique per platform+handle |
| tags | organizations | N:1 | Unique per org+name |
| cluster_tags | trend_clusters + tags | M:M | — |
| content_idea_tags | content_ideas + tags | M:M | — |
| asset_tags | assets + tags | M:M | — |

---

## RLS Strategy

### Helper Function

```sql
CREATE OR REPLACE FUNCTION auth.user_org_ids()
RETURNS uuid[] LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT ARRAY(SELECT org_id FROM org_members WHERE user_id = auth.uid())
$$;
```

This function is STABLE and SECURITY DEFINER — it runs with elevated privileges so it can read `org_members` even when RLS is active on that table. It is called in USING clauses across all org-scoped policies.

### Policy Patterns

**Pattern 1: Org-scoped read (most tables)**
```sql
USING (org_id = ANY(auth.user_org_ids()))
```

**Pattern 2: Role-gated write (editors)**
```sql
USING (
  org_id IN (
    SELECT org_id FROM org_members
    WHERE user_id = auth.uid() AND role IN ('owner','admin','editor')
  )
)
```

**Pattern 3: Role-gated write (admins only)**
```sql
USING (
  org_id IN (
    SELECT org_id FROM org_members
    WHERE user_id = auth.uid() AND role IN ('owner','admin')
  )
)
```

**Pattern 4: User-scoped (notifications, profiles)**
```sql
USING (user_id = auth.uid())
```

**Pattern 5: Global read (meme_templates, trend_entities)**
```sql
USING (true)  -- for authenticated role
```

**Pattern 6: Service role bypass**
All insert-heavy tables have a service_role policy with `USING (true) WITH CHECK (true)`. This allows n8n workflows to write via the Supabase service key without RLS interference.

### Role Hierarchy

| Role | Can Read | Can Write/Edit | Can Delete | Can Manage Org Settings |
|------|----------|---------------|------------|------------------------|
| viewer | All org data | No | No | No |
| editor | All org data | Yes | Own content | No |
| admin | All org data | Yes | Yes | Yes |
| owner | All org data | Yes | Yes | Yes |

---

## Migration Strategy

### File Layout

```
supabase/
  schema.sql              -- Master schema (idempotent, run on fresh DB)
  seed.sql                -- Seed data (run after schema.sql)
  SCHEMA.md               -- This document
  migrations/
    001_initial_schema.sql  -- DDL only (tables, types, indexes, functions)
    002_rls_policies.sql    -- RLS enable + policies
    003_seed_data.sql       -- INSERT statements (copy of seed.sql)
```

### Running in Order

```bash
# Fresh database setup
psql $DATABASE_URL -f supabase/schema.sql
psql $DATABASE_URL -f supabase/seed.sql

# Or via migrations (same result)
psql $DATABASE_URL -f supabase/migrations/001_initial_schema.sql
psql $DATABASE_URL -f supabase/migrations/002_rls_policies.sql
psql $DATABASE_URL -f supabase/migrations/003_seed_data.sql
```

### Supabase Dashboard

Run files in order via the SQL Editor. The schema is idempotent: `CREATE TABLE IF NOT EXISTS`, `CREATE INDEX IF NOT EXISTS`, `CREATE OR REPLACE FUNCTION`, and `DO $$ BEGIN CREATE TYPE ... EXCEPTION WHEN duplicate_object THEN NULL END $$` blocks mean re-running is safe.

### Adding Future Migrations

Name future migration files sequentially: `004_add_reactions_table.sql`. Each migration file should be self-contained and idempotent where possible.

---

## Index Strategy

### Primary Indexes (by purpose)

**Foreign Key Indexes** — Every FK column has an index to support efficient JOIN operations and CASCADE operations:
- All `org_id` columns
- All `source_id`, `cluster_id`, `idea_id`, `variant_id` FKs
- All `user_id`, `created_by`, `assigned_to` FKs

**Status Filtering** — Low-cardinality but heavily filtered:
- `trend_clusters(status)` — filtering by new/active/hot
- `source_items(status)` — pipeline processing queues
- `content_variants(status)` — editorial workflow
- `notifications(is_read)`, `notifications(is_dismissed)` — notification inbox

**Score-Based Sorting** — Used on trend dashboard:
- `trend_clusters(overall_score DESC)` — sort by virality
- `trend_scores(overall_score DESC)` — historical score queries
- `performance_metrics(engagement_rate DESC)` — best performing content

**Time-Based Sorting and Filtering** — High-volume tables:
- `source_items(created_at)`, `source_items(published_at)`
- `trend_clusters(last_seen_at DESC)`, `trend_clusters(first_seen_at)`
- `notifications(created_at)` — notification inbox pagination
- `content_calendar_items(scheduled_at)` — calendar view queries
- `post_results(published_at)` — analytics date ranges
- `audit_logs(created_at)` — audit log pagination

**Full-Text / Trigram Search** — For search UI:
- `trend_clusters.title` — `GIN(title gin_trgm_ops)` via pg_trgm
- `trend_entities.name` — `GIN(name gin_trgm_ops)` for entity search

**Array / JSONB (GIN)** — For contains queries:
- `source_items(keywords)`, `trend_clusters(keywords)` — keyword filtering
- `source_items(entities)` — entity JSONB search
- `sources(tags)`, `assets(tags)`, `meme_templates(tags)`, `content_ideas(tags)` — tag filtering

**Partial Index (Deduplication)**:
```sql
CREATE UNIQUE INDEX source_items_dedup_idx
  ON source_items(source_id, external_id)
  WHERE external_id IS NOT NULL;
```
This is the primary dedup mechanism for ingested items. The partial condition means rows with `external_id IS NULL` (manual entries) are never subject to the constraint.

---

## Mobile Compatibility Notes

The schema is mobile-ready without modification:

1. **Pagination support**: All high-volume tables have `created_at` indexes enabling efficient cursor-based pagination (no OFFSET required).

2. **Lightweight list queries**: The `trend_clusters` table has all fields needed for a mobile list view (`id`, `title`, `overall_score`, `status`, `thumbnail_url`, `last_seen_at`) without needing JOINs.

3. **Notification inbox**: `notifications` filtered by `user_id` and `is_read = false` with `created_at` ordering is efficient for a mobile badge count query.

4. **Image references**: All image fields (`thumbnail_url`, `image_url`, `avatar_url`) are nullable text URLs — safe for mobile consumption with null checks.

5. **Array fields**: `keywords[]`, `tags[]`, etc. return as JSON arrays in the Supabase client — compatible with all mobile SDKs.

6. **Timestamps**: All timestamps use `timestamptz` (UTC-stored). The client SDK handles local time conversion.

---

## Score Column Constraints

All score columns enforce `CHECK (column >= 0 AND column <= 100)`:
- `trend_clusters.overall_score`
- `trend_scores.viral_potential`
- `trend_scores.brand_fit`
- `trend_scores.urgency`
- `trend_scores.controversy_level`
- `trend_scores.audience_relevance`
- `trend_scores.overall_score`

`sentiment_score` uses `numeric(4,3)` allowing values from -1.000 to 1.000 (no check constraint needed beyond precision).

---

## Deduplication Keys

| Table | Dedup Key | Index Type |
|-------|-----------|------------|
| `source_items` | `(source_id, external_id) WHERE external_id IS NOT NULL` | Partial UNIQUE |
| `org_members` | `(org_id, user_id)` | UNIQUE |
| `trend_cluster_items` | `(cluster_id, source_item_id)` | UNIQUE |
| `trend_cluster_entities` | `(cluster_id, entity_id)` | PRIMARY KEY |
| `trend_entities` | `name` | UNIQUE |
| `cluster_tags` | `(cluster_id, tag_id)` | PRIMARY KEY |
| `content_idea_tags` | `(idea_id, tag_id)` | PRIMARY KEY |
| `asset_tags` | `(asset_id, tag_id)` | PRIMARY KEY |
| `competitor_watchlist` | `(org_id, platform, handle)` | UNIQUE |
| `tags` | `(org_id, name)` | UNIQUE |
| `brand_settings` | `org_id` | UNIQUE |
| `organizations` | `slug` | UNIQUE |
