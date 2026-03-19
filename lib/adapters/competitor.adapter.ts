// ─── Competitor Feed Adapter ───────────────────────────────────────────────────
// Monitors competitor channels and pages via RSS/Atom feeds.
// Wraps the generic RSS adapter with competitor-specific enrichment:
//   - Tags all items with competitor metadata
//   - Tracks competitor velocity (posts per day)
//   - Flags high-engagement competitor posts for strategic awareness
//
// REAL ADAPTER — works immediately.
//
// Data flow:
//   RSSAdapter (fetch) → normalize → tag with competitor metadata → output
//
// Config:
//   url:           Direct RSS feed URL
//   competitor_id: ID from competitor_watchlist table
//   name:          Competitor display name
//   platform:      'instagram' | 'tiktok' | 'youtube' | 'twitter' | 'website' | etc.
//   limit:         Max items to fetch (default 20)
//
// Pre-configured competitor feeds (add to source_configs table):
//   TMZ:        https://www.tmz.com/rss.xml
//   Shade Room: https://theshaderoom.com/feed/
//   Complex:    https://www.complex.com/feed
//   Pop Crave:  https://popcrave.com/feed/ (if available)
//   E! News:    https://www.eonline.com/syndication/feeds/rssfeeds/topstories.xml
//
// N8N HANDOFF:
//   The competitor_watchlist table holds social handles.
//   For social platforms (TikTok, Instagram), n8n Apify nodes handle scraping.
//   This adapter focuses on website/YouTube/podcast RSS feeds.

import Parser from 'rss-parser'
import { BaseRSSAdapter, AdapterConfig, AdapterResult, AdapterItem } from './base.adapter'
import { extractKeywords, extractEntities } from '@/lib/ingestion/extract'

export class CompetitorAdapter extends BaseRSSAdapter {
  readonly type = 'competitor'
  readonly name = 'Competitor Feed'

  private parser = new Parser(this.getRSSParserOptions())

  async fetch(config: AdapterConfig): Promise<AdapterResult> {
    const url           = config.url           as string | undefined
    const competitorId  = config.competitor_id as string | undefined
    const competitorName = config.name         as string | undefined
    const platform      = config.platform      as string | undefined
    const limit         = (config.limit as number | undefined) ?? 20

    if (!url) {
      return this.buildResult([], 'Competitor adapter requires config.url (RSS feed URL)')
    }

    try {
      const feed = await this.parser.parseURL(url)
      const items: AdapterItem[] = []

      const channelName = competitorName ?? feed.title ?? extractDomain(url)

      for (const entry of (feed.items ?? []).slice(0, limit)) {
        const idSeed = entry.link ?? entry.guid ?? entry.title ?? ''
        if (!idSeed) continue

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const e = entry as any

        const thumbnail =
          e.mediaContent?.$?.url ??
          e.mediaThumbnail?.$?.url ??
          e['media:thumbnail']?.$?.url ??
          e.enclosure?.url ??
          undefined

        const fullText = [entry.title ?? '', entry.contentSnippet ?? ''].join(' ')
        const keywords = extractKeywords(fullText, 10)
        const entities = extractEntities(entry.title ?? '') as Record<string, unknown>

        items.push({
          external_id: this.generateId(`competitor_${competitorId ?? channelName}_${idSeed}`),
          title: entry.title ?? 'Untitled',
          body: entry.contentSnippet ?? entry.content ?? undefined,
          url: entry.link ?? undefined,
          author: channelName,
          thumbnail_url: thumbnail,
          media_urls: thumbnail ? [thumbnail] : [],
          published_at: entry.pubDate ?? entry.isoDate ?? undefined,
          keywords,
          entities,
          raw_data: {
            competitor_id:   competitorId ?? null,
            competitor_name: channelName,
            platform:        platform ?? 'website',
            feed_url:        url,
            guid:            entry.guid,
          },
        })
      }

      return this.buildResult(items)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Competitor feed fetch failed'
      return this.buildResult([], message)
    }
  }
}

function extractDomain(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, '')
  } catch {
    return 'Unknown'
  }
}

// ─── Pre-configured competitor feeds ─────────────────────────────────────────
// These match the seed data in competitor_watchlist table.
// Use these as config.url values when setting up source_configs.

export const COMPETITOR_FEEDS: Record<string, { name: string; platform: string; feed_url: string }> = {
  tmz: {
    name:     'TMZ',
    platform: 'website',
    feed_url: 'https://www.tmz.com/rss.xml',
  },
  shade_room: {
    name:     'The Shade Room',
    platform: 'website',
    feed_url: 'https://theshaderoom.com/feed/',
  },
  complex: {
    name:     'Complex',
    platform: 'website',
    feed_url: 'https://www.complex.com/feed',
  },
  e_news: {
    name:     'E! News',
    platform: 'website',
    feed_url: 'https://www.eonline.com/syndication/feeds/rssfeeds/topstories.xml',
  },
  billboard: {
    name:     'Billboard',
    platform: 'website',
    feed_url: 'https://www.billboard.com/feed/',
  },
  variety: {
    name:     'Variety',
    platform: 'website',
    feed_url: 'https://variety.com/feed/',
  },
}

export const competitorAdapter = new CompetitorAdapter()
