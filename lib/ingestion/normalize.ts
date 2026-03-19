// ─── Normalization Layer ─────────────────────────────────────────────────────
// Converts raw AdapterItem[] → source_items DB rows.
//
// This is the single place where adapter output is transformed into the
// canonical shape the rest of the system expects. Run this before any DB write.

import type { AdapterItem } from '@/lib/adapters/base.adapter'
import { itemExternalId } from './dedup'
import { extractKeywords, extractEntities } from './extract'

export interface SourceItemRow {
  source_id: string
  external_id: string
  title: string
  body: string | null
  url: string | null
  author: string | null
  thumbnail_url: string | null
  media_urls: string[]
  published_at: string | null
  fetched_at: string
  status: 'new'
  keywords: string[]
  entities: Record<string, unknown>
  sentiment_score: number | null
  engagement_data: Record<string, unknown>
  raw_data: Record<string, unknown>
}

/**
 * Normalize a single AdapterItem into a source_items DB row.
 *
 * - Generates stable external_id for dedup
 * - Extracts keywords from title+body if adapter didn't provide them
 * - Extracts entities from title+body
 * - Coerces all nullable fields
 */
export function normalizeItem(item: AdapterItem, sourceId: string): SourceItemRow {
  const now = new Date().toISOString()

  // Stable dedup key — prefer URL, fall back to guid/title
  const external_id = item.external_id.length === 32
    ? item.external_id  // already a stable ID from adapter
    : itemExternalId({ url: item.url, title: item.title })

  // Combined text for NLP
  const fullText = [item.title, item.body].filter(Boolean).join(' ')

  // Keywords — use adapter-provided if available, otherwise extract
  const keywords = (item.keywords && item.keywords.length > 0)
    ? item.keywords
    : extractKeywords(fullText, 12)

  // Entities — use adapter-provided if available, otherwise extract
  const entities = (item.entities && Object.keys(item.entities).length > 0)
    ? item.entities
    : extractEntities(fullText) as Record<string, unknown>

  // Coerce published_at to valid ISO string or null
  const published_at = parseDate(item.published_at)

  return {
    source_id: sourceId,
    external_id,
    title: (item.title ?? 'Untitled').slice(0, 500), // guard against very long titles
    body: item.body?.slice(0, 5000) ?? null,
    url: item.url ?? null,
    author: item.author ?? null,
    thumbnail_url: item.thumbnail_url ?? null,
    media_urls: item.media_urls ?? [],
    published_at,
    fetched_at: now,
    status: 'new',
    keywords,
    entities,
    sentiment_score: item.sentiment_score ?? null,
    engagement_data: item.engagement_data ?? {},
    raw_data: item.raw_data ?? {},
  }
}

/**
 * Normalize an array of items, filtering out any that fail validation.
 */
export function normalizeItems(items: AdapterItem[], sourceId: string): SourceItemRow[] {
  return items
    .filter(validateItem)
    .map((item) => normalizeItem(item, sourceId))
}

/**
 * Basic validation — reject items that would be useless to store.
 */
export function validateItem(item: AdapterItem): boolean {
  if (!item) return false
  if (!item.title?.trim()) return false
  if (item.title.trim().length < 3) return false
  return true
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function parseDate(input?: string | null): string | null {
  if (!input) return null
  try {
    const d = new Date(input)
    if (isNaN(d.getTime())) return null
    return d.toISOString()
  } catch {
    return null
  }
}
