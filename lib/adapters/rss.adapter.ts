// ─── RSS Feed Adapter (REAL) ─────────────────────────────────────────────────
// Works with any standard RSS 2.0 / Atom feed.
// No API key required. Primary free ingestion source.
//
// Tested with: TMZ, Complex, Billboard, Rolling Stone, E! News,
//              Deadline, Variety, People, Bleacher Report, SB Nation

import Parser from 'rss-parser'
import { BaseRSSAdapter, AdapterConfig, AdapterResult, AdapterItem } from './base.adapter'
import { extractKeywords } from '@/lib/ingestion/extract'

export class RSSAdapter extends BaseRSSAdapter {
  readonly type = 'rss'
  readonly name = 'RSS Feed'

  private parser = new Parser(this.getRSSParserOptions())

  async fetch(config: AdapterConfig): Promise<AdapterResult> {
    const url = config.url as string
    if (!url) return this.buildResult([], 'No URL configured for RSS adapter')

    const limit = config.limit ?? 50

    try {
      const feed = await this.parser.parseURL(url)
      const items: AdapterItem[] = []

      for (const entry of (feed.items ?? []).slice(0, limit)) {
        const idSeed = entry.link ?? entry.guid ?? entry.title ?? ''
        if (!idSeed) continue

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const e = entry as any

        // Collect all media URLs
        const media_urls: string[] = []
        const thumbnail =
          e.mediaThumbnail?.$?.url ??
          e.mediaGroup?.['media:thumbnail']?.[0]?.$?.url ??
          e.mediaContent?.$?.url ??
          e.enclosure?.url ??
          undefined

        if (thumbnail) media_urls.push(thumbnail)

        // Additional media from mediaGroup
        const mediaContents = e.mediaGroup?.['media:content'] ?? []
        for (const mc of Array.isArray(mediaContents) ? mediaContents : [mediaContents]) {
          const murl = mc?.$?.url
          if (murl && !media_urls.includes(murl)) media_urls.push(murl)
        }

        const fullText = [entry.title ?? '', entry.contentSnippet ?? ''].join(' ')
        const keywords = extractKeywords(fullText, 10)

        items.push({
          external_id: this.generateId(idSeed),
          title: entry.title ?? 'Untitled',
          body: entry.contentSnippet ?? entry.content ?? entry.summary ?? undefined,
          url: entry.link ?? undefined,
          author: e.creator ?? e['dc:creator'] ?? e.author ?? undefined,
          thumbnail_url: thumbnail,
          media_urls,
          published_at: entry.pubDate ?? entry.isoDate ?? undefined,
          keywords,
          raw_data: {
            feed_title: feed.title,
            feed_url: url,
            guid: entry.guid,
            categories: entry.categories ?? [],
          },
        })
      }

      return this.buildResult(items)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown RSS fetch error'
      return this.buildResult([], message)
    }
  }
}

export const rssAdapter = new RSSAdapter()
