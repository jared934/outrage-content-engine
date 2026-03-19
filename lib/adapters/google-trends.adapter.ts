// ─── Google Trends RSS Adapter (REAL) ────────────────────────────────────────
// Uses Google Trends daily trending searches RSS feed.
// Free, no API key required. Updates ~hourly with current US trending topics.
//
// REAL ADAPTER — works immediately.
//
// Feed: https://trends.google.com/trends/trendingsearches/daily/rss?geo=US
//
// Each item represents a trending search term with:
//   - title: the trending search term
//   - approx_traffic: estimated daily searches (e.g. "500K+")
//   - related news articles for context
//
// The "body" of each trend item contains related news headlines,
// which we use for context extraction.
//
// LIMITATION: Only shows top ~20 daily trends. For real-time trending,
// the unofficial Google Trends API (pytrends) gives more control.
// SWAP-IN: Replace with pytrends HTTP call from n8n for more granularity.

import Parser from 'rss-parser'
import { BaseRSSAdapter, AdapterConfig, AdapterResult, AdapterItem } from './base.adapter'
import { extractKeywords, extractEntities, engagementScore } from '@/lib/ingestion/extract'

const TRENDS_RSS_BASE = 'https://trends.google.com/trends/trendingsearches/daily/rss'

export class GoogleTrendsAdapter extends BaseRSSAdapter {
  readonly type = 'google_trends'
  readonly name = 'Google Trends'

  private parser = new Parser({
    ...this.getRSSParserOptions(),
    customFields: {
      item: [
        ['ht:approx_traffic', 'approxTraffic'],
        ['ht:picture', 'picture'],
        ['ht:picture_source', 'pictureSource'],
        ['ht:news_item', 'newsItems'],
      ],
    },
  })

  async fetch(config: AdapterConfig): Promise<AdapterResult> {
    const geo  = (config.geo  as string | undefined) ?? 'US'
    const limit = config.limit ?? 25

    const feedUrl = `${TRENDS_RSS_BASE}?geo=${geo}`

    try {
      const feed = await this.parser.parseURL(feedUrl)
      const items: AdapterItem[] = []

      for (const entry of (feed.items ?? []).slice(0, limit)) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const e = entry as any

        const title = entry.title ?? ''
        if (!title.trim()) continue

        // approxTraffic is like "500K+" — keep it as a string in raw_data
        const approxTraffic = e.approxTraffic ?? e['ht:approx_traffic'] ?? null

        // Extract related news items for context (Google Trends includes these)
        const newsItems = normalizeNewsItems(e.newsItems)
        const context = newsItems
          .map((n: { title?: string }) => n.title)
          .filter(Boolean)
          .join('. ')

        const fullText = [title, context].join(' ')
        const keywords = extractKeywords(fullText, 8)
        const entities = extractEntities(title) as Record<string, unknown>

        const thumbnail = e.picture ?? e['ht:picture'] ?? undefined

        const engData = { approx_traffic: approxTraffic, source: 'google_trends', geo }

        items.push({
          external_id: this.generateId(`gt_${geo}_${title}_${entry.pubDate ?? ''}`),
          title,
          body: context || undefined,
          url: entry.link ?? `https://trends.google.com/trends/explore?q=${encodeURIComponent(title)}&geo=${geo}`,
          author: `Google Trends ${geo}`,
          thumbnail_url: thumbnail,
          media_urls: thumbnail ? [thumbnail] : [],
          published_at: entry.pubDate ?? entry.isoDate ?? new Date().toISOString(),
          keywords: [title.toLowerCase(), ...keywords],
          entities,
          engagement_data: engData,
          sentiment_score: undefined,
          raw_data: {
            geo,
            approx_traffic: approxTraffic,
            news_items: newsItems,
            feed_url: feedUrl,
          },
        })
      }

      return this.buildResult(items)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Google Trends fetch failed'
      return this.buildResult([], message)
    }
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function normalizeNewsItems(raw: any): Array<{ title?: string; url?: string; source?: string }> {
  if (!raw) return []
  // rss-parser sometimes returns array, sometimes single object
  const arr = Array.isArray(raw) ? raw : [raw]
  return arr.map((item) => ({
    title: item?.['ht:news_item_title'] ?? item?.title ?? item?.['_'],
    url:   item?.['ht:news_item_url'] ?? item?.url,
    source: item?.['ht:news_item_source'] ?? item?.source,
  }))
}

export const googleTrendsAdapter = new GoogleTrendsAdapter()
