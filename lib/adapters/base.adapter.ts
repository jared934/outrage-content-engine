// ─── Base Adapter Interface ─────────────────────────────────────────────────
// Every source adapter produces AdapterItem[] via AdapterResult.
// This shape maps directly to source_items in the DB after normalization.
//
// ADDING A NEW ADAPTER:
//   1. Extend BaseAdapter (or BaseRSSAdapter for RSS-based sources)
//   2. Set type + name
//   3. Implement fetch(config)
//   4. Register in lib/adapters/index.ts

export interface AdapterItem {
  /** Deterministic ID for dedup — hash of URL or GUID. Required. */
  external_id: string
  /** Primary headline / title */
  title: string
  /** Body copy, description, or snippet */
  body?: string
  /** Canonical URL of the source item */
  url?: string
  /** Author name, username, or channel */
  author?: string
  /** Primary thumbnail/image URL */
  thumbnail_url?: string
  /** All media URLs found in the item */
  media_urls?: string[]
  /** ISO-8601 publish timestamp */
  published_at?: string
  /** Pre-extracted keywords if adapter can provide them */
  keywords?: string[]
  /** Named entities — { people: [], brands: [], places: [], hashtags: [] } */
  entities?: Record<string, unknown>
  /** Platform engagement signals — upvotes, views, likes, etc. */
  engagement_data?: Record<string, unknown>
  /** Sentiment score -1 (negative) to 1 (positive), null if not computed */
  sentiment_score?: number
  /** Full raw payload from source for debugging */
  raw_data?: Record<string, unknown>
}

export interface AdapterResult {
  source_type: string
  source_name: string
  items: AdapterItem[]
  fetched_at: string
  /** Non-fatal warning or fatal error message */
  error?: string
}

export interface AdapterConfig {
  /** URL for RSS/endpoint-based sources */
  url?: string
  /** Query string for search-based sources (Google News, Reddit search) */
  query?: string
  /** Channel ID for YouTube RSS */
  channel_id?: string
  /** Subreddit name (without r/) for Reddit */
  subreddit?: string
  /** Max items to return */
  limit?: number
  /** Geo/region code (US, GB, etc.) */
  geo?: string
  /** Language code */
  lang?: string
  /** Any additional adapter-specific config */
  [key: string]: unknown
}

export abstract class BaseAdapter {
  abstract readonly type: string
  abstract readonly name: string

  abstract fetch(config: AdapterConfig): Promise<AdapterResult>

  /** Is this adapter live (real API) or mock? Checked by registry for fallback logic. */
  get isMock(): boolean { return false }

  protected buildResult(items: AdapterItem[], error?: string): AdapterResult {
    return {
      source_type: this.type,
      source_name: this.name,
      items,
      fetched_at: new Date().toISOString(),
      error,
    }
  }

  /**
   * Generate a deterministic 32-char external_id from a URL or string.
   * Consistent across runs — safe to use for dedup.
   */
  protected generateId(input: string): string {
    // Simple but deterministic hash (djb2-variant) — no crypto dep needed client-side
    // For server-side, normalize.ts uses Node crypto for stronger hashing
    let hash = 5381
    for (let i = 0; i < input.length; i++) {
      hash = (hash * 33) ^ input.charCodeAt(i)
    }
    return Math.abs(hash).toString(16).padStart(8, '0') +
      Math.abs(hash ^ 0xdeadbeef).toString(16).padStart(8, '0') +
      Math.abs(hash ^ 0xcafebabe).toString(16).padStart(8, '0') +
      Math.abs(hash ^ 0xfeedface).toString(16).padStart(8, '0')
  }
}

/**
 * Convenience base for RSS-based adapters (Google News, YouTube RSS, etc.)
 * Uses rss-parser under the hood with consistent config.
 */
export abstract class BaseRSSAdapter extends BaseAdapter {
  protected getRSSParserOptions() {
    return {
      timeout: 12_000,
      headers: {
        'User-Agent': 'OutrageContentEngine/1.0 (RSS Reader; +https://outrage.media)',
        Accept: 'application/rss+xml, application/atom+xml, application/xml, text/xml, */*',
      },
      customFields: {
        item: [
          ['media:content', 'mediaContent'],
          ['media:thumbnail', 'mediaThumbnail'],
          ['media:group', 'mediaGroup'],
          ['enclosure', 'enclosure'],
          ['ht:approx_traffic', 'approxTraffic'],
          ['ht:picture', 'picture'],
          ['ht:news_item', 'newsItem'],
        ],
      },
    }
  }
}
