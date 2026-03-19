// ─── Google News RSS Adapter (REAL) ──────────────────────────────────────────
// Uses Google News RSS — completely free, no API key required.
// Google News provides topic-based and search-based RSS feeds.
//
// REAL ADAPTER — works immediately.
//
// Feed patterns:
//   Search:  https://news.google.com/rss/search?q=celebrity+drama&hl=en-US&gl=US&ceid=US:en
//   Topic:   https://news.google.com/rss/topics/{TOPIC_ID}?hl=en-US&gl=US&ceid=US:en
//
// Useful Google News topic IDs (Entertainment):
//   Entertainment: CAAqJggKIiBDQkFTRWdvSUwyMHZNREpxYW5RU0FtVnVHZ0pWVXlnQVAB
//   Sports:        CAAqJggKIiBDQkFTRWdvSUwyMHZNRFp1ZEdvU0FtVnVHZ0pWVXlnQVAB
//   Technology:    CAAqJggKIiBDQkFTRWdvSUwyMHZNRGRqTVhZU0FtVnVHZ0pWVXlnQVAB
//
// SWAP-IN: No swap needed — this is already real.

import Parser from 'rss-parser'
import { BaseRSSAdapter, AdapterConfig, AdapterResult, AdapterItem } from './base.adapter'
import { extractKeywords, extractEntities } from '@/lib/ingestion/extract'

const GOOGLE_NEWS_BASE = 'https://news.google.com/rss'

// Pre-configured topic URLs for OUTRAGE brand categories
export const GOOGLE_NEWS_TOPICS = {
  entertainment: `${GOOGLE_NEWS_BASE}/topics/CAAqJggKIiBDQkFTRWdvSUwyMHZNREpxYW5RU0FtVnVHZ0pWVXlnQVAB?hl=en-US&gl=US&ceid=US:en`,
  sports:        `${GOOGLE_NEWS_BASE}/topics/CAAqJggKIiBDQkFTRWdvSUwyMHZNRFp1ZEdvU0FtVnVHZ0pWVXlnQVAB?hl=en-US&gl=US&ceid=US:en`,
  technology:    `${GOOGLE_NEWS_BASE}/topics/CAAqJggKIiBDQkFTRWdvSUwyMHZNRGRqTVhZU0FtVnVHZ0pWVXlnQVAB?hl=en-US&gl=US&ceid=US:en`,
  top_stories:   `${GOOGLE_NEWS_BASE}?hl=en-US&gl=US&ceid=US:en`,
}

export class GoogleNewsAdapter extends BaseRSSAdapter {
  readonly type = 'google_news'
  readonly name = 'Google News'

  private parser = new Parser({
    ...this.getRSSParserOptions(),
    customFields: {
      item: [
        ['media:content', 'mediaContent'],
        ['media:thumbnail', 'mediaThumbnail'],
        ['source', 'source'],
      ],
    },
  })

  async fetch(config: AdapterConfig): Promise<AdapterResult> {
    // Config can provide:
    //   url:   direct RSS URL (topic URL or search URL)
    //   query: search term (builds search URL)
    //   topic: key from GOOGLE_NEWS_TOPICS

    let feedUrl = config.url as string | undefined

    if (!feedUrl && config.query) {
      const q = encodeURIComponent(config.query as string)
      const lang = config.lang ?? 'en-US'
      const geo  = config.geo  ?? 'US'
      feedUrl = `${GOOGLE_NEWS_BASE}/search?q=${q}&hl=${lang}&gl=${geo}&ceid=${geo}:en`
    }

    if (!feedUrl && config.topic) {
      feedUrl = GOOGLE_NEWS_TOPICS[config.topic as keyof typeof GOOGLE_NEWS_TOPICS]
    }

    if (!feedUrl) {
      feedUrl = GOOGLE_NEWS_TOPICS.entertainment
    }

    const limit = config.limit ?? 30

    try {
      const feed = await this.parser.parseURL(feedUrl)
      const items: AdapterItem[] = []

      for (const entry of (feed.items ?? []).slice(0, limit)) {
        const idSeed = entry.link ?? entry.guid ?? entry.title ?? ''
        if (!idSeed) continue

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const e = entry as any

        // Google News titles often include " - Publication Name" suffix
        const rawTitle = entry.title ?? 'Untitled'
        const [cleanTitle, publication] = splitGoogleNewsTitle(rawTitle)

        const thumbnail =
          e.mediaContent?.$?.url ??
          e.mediaThumbnail?.$?.url ??
          undefined

        const fullText = [cleanTitle, entry.contentSnippet ?? ''].join(' ')
        const keywords = extractKeywords(fullText, 10)
        const entities = extractEntities(cleanTitle) as Record<string, unknown>

        items.push({
          external_id: this.generateId(idSeed),
          title: cleanTitle,
          body: entry.contentSnippet ?? entry.content ?? undefined,
          url: entry.link ?? undefined,
          author: publication ?? e.source?._ ?? undefined,
          thumbnail_url: thumbnail,
          media_urls: thumbnail ? [thumbnail] : [],
          published_at: entry.pubDate ?? entry.isoDate ?? undefined,
          keywords,
          entities,
          raw_data: {
            feed_url: feedUrl,
            original_title: rawTitle,
            publication,
            source: e.source,
            guid: entry.guid,
          },
        })
      }

      return this.buildResult(items)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Google News fetch failed'
      return this.buildResult([], message)
    }
  }
}

/**
 * Google News titles are often formatted as "Headline - Publication Name".
 * Split them cleanly.
 */
function splitGoogleNewsTitle(title: string): [string, string | undefined] {
  const separators = [' - ', ' — ', ' | ']
  for (const sep of separators) {
    const idx = title.lastIndexOf(sep)
    if (idx > 0 && idx < title.length - sep.length) {
      const headline = title.slice(0, idx).trim()
      const pub = title.slice(idx + sep.length).trim()
      // Guard: publication name shouldn't be too long
      if (pub.length < 50) return [headline, pub]
    }
  }
  return [title, undefined]
}

export const googleNewsAdapter = new GoogleNewsAdapter()
