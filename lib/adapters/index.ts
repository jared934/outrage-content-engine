// ─── Adapter Registry & Factory ───────────────────────────────────────────────
// Central registry for all source adapters.
// Factory pattern: resolve adapter by source type string at runtime.

import { BaseAdapter } from './base.adapter'
import { RSSAdapter }           from './rss.adapter'
import { GoogleNewsAdapter }    from './google-news.adapter'
import { GoogleTrendsAdapter }  from './google-trends.adapter'
import { YouTubeRSSAdapter }    from './youtube-rss.adapter'
import { YouTubeAdapter }       from './youtube.adapter'
import { RedditAdapter }        from './reddit.adapter'
import { ManualAdapter }        from './manual.adapter'
import { CompetitorAdapter }    from './competitor.adapter'

// ─── Re-exports ───────────────────────────────────────────────────────────────
export { BaseAdapter }                          from './base.adapter'
export type { AdapterConfig, AdapterResult, AdapterItem } from './base.adapter'
export { RSSAdapter }                           from './rss.adapter'
export { GoogleNewsAdapter }                    from './google-news.adapter'
export { GOOGLE_NEWS_TOPICS }                   from './google-news.adapter'
export { GoogleTrendsAdapter }                  from './google-trends.adapter'
export { YouTubeRSSAdapter, POP_CULTURE_CHANNELS } from './youtube-rss.adapter'
export { YouTubeAdapter }                       from './youtube.adapter'
export { RedditAdapter }                        from './reddit.adapter'
export { ManualAdapter }                        from './manual.adapter'
export { CompetitorAdapter, COMPETITOR_FEEDS }  from './competitor.adapter'

// ─── Source type strings ──────────────────────────────────────────────────────
// These must match the `source_type` column in the source_configs table.

export type SourceType =
  | 'rss'
  | 'google_news'
  | 'google_trends'
  | 'youtube_rss'
  | 'youtube'
  | 'reddit'
  | 'manual'
  | 'competitor'
  | 'tiktok'        // n8n Apify — not implemented in this adapter layer
  | 'instagram'     // n8n Apify — not implemented in this adapter layer
  | 'twitter'       // n8n Apify — not implemented in this adapter layer

// ─── Registry ─────────────────────────────────────────────────────────────────

const ADAPTERS: Record<string, BaseAdapter> = {
  rss:            new RSSAdapter(),
  google_news:    new GoogleNewsAdapter(),
  google_trends:  new GoogleTrendsAdapter(),
  youtube_rss:    new YouTubeRSSAdapter(),
  youtube:        new YouTubeAdapter(),
  reddit:         new RedditAdapter(),
  manual:         new ManualAdapter(),
  competitor:     new CompetitorAdapter(),
}

/**
 * Get an adapter instance by source type.
 * Returns null for types handled by n8n (tiktok, instagram, twitter).
 */
export function getAdapter(sourceType: string): BaseAdapter | null {
  return ADAPTERS[sourceType] ?? null
}

/**
 * Returns all adapter types that can be handled locally (not n8n-only).
 */
export function getLocalAdapterTypes(): string[] {
  return Object.keys(ADAPTERS)
}

/**
 * Returns all registered adapters with their metadata.
 */
export function listAdapters(): Array<{ type: string; name: string; isMock: boolean }> {
  return Object.entries(ADAPTERS).map(([type, adapter]) => ({
    type,
    name: adapter.name,
    isMock: adapter.isMock,
  }))
}
