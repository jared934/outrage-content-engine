// ─── Dedup Utilities ────────────────────────────────────────────────────────
// Generates deterministic, stable IDs for deduplication.
// These IDs are stored as external_id in source_items and matched
// against the partial UNIQUE INDEX on (source_id, external_id).
//
// All IDs are hex strings — URL-safe, DB-safe, 32 chars long.

import { createHash } from 'crypto'

/**
 * Create a stable 32-char hex ID from any string input.
 * SHA-256 truncated — collision risk is negligible for our scale.
 */
export function stableId(input: string): string {
  return createHash('sha256').update(input.trim()).digest('hex').slice(0, 32)
}

/**
 * Preferred dedup key for a source item.
 * Priority: canonical URL > GUID/external_id > title fallback
 *
 * NOTE: We hash the URL so the key is always fixed-length and
 * safe to store as a VARCHAR(32) column with a unique index.
 */
export function itemExternalId(opts: {
  url?: string | null
  guid?: string | null
  title?: string | null
}): string {
  const seed = opts.url ?? opts.guid ?? opts.title
  if (!seed) {
    // Last resort — timestamp-based (will NOT dedup, but won't crash)
    return stableId(String(Date.now()) + Math.random())
  }
  return stableId(seed)
}

/**
 * Compound key for a source + item combination.
 * Used when you need a globally unique ID across all sources.
 */
export function compoundId(sourceId: string, externalId: string): string {
  return stableId(`${sourceId}::${externalId}`)
}
