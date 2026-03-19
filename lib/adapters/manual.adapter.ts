// ─── Manual URL / Topic Adapter ───────────────────────────────────────────────
// Ingests a single URL or free-text topic submitted manually by an editor.
// Attempts to fetch Open Graph / meta tags from the URL for enrichment.
//
// REAL ADAPTER — works immediately.
//
// Use cases:
//   - Editor pastes a link they spotted and wants it in the pipeline
//   - Editor enters a topic keyword to create a trend cluster seed
//   - Quick "add this viral post" action from the UI
//
// Config:
//   url:     Direct URL to fetch (scrapes OG tags)
//   query:   Free-text topic/keyword (stored as-is, no scraping)
//   title:   Optional manual title override
//   author:  Optional manual author/source override
//   note:    Optional editorial note (stored in raw_data)

import { BaseAdapter, AdapterConfig, AdapterResult, AdapterItem } from './base.adapter'
import { extractKeywords, extractEntities } from '@/lib/ingestion/extract'

export class ManualAdapter extends BaseAdapter {
  readonly type = 'manual'
  readonly name = 'Manual Submission'

  async fetch(config: AdapterConfig): Promise<AdapterResult> {
    const url    = config.url    as string | undefined
    const query  = config.query  as string | undefined
    const title  = config.title  as string | undefined
    const author = config.author as string | undefined
    const note   = config.note   as string | undefined

    // Free-text topic (no URL) — wrap as a keyword seed
    if (!url && query) {
      return this.buildResult([this.topicItem(query, title, author, note)])
    }

    if (!url) {
      return this.buildResult([], 'Manual adapter requires config.url or config.query')
    }

    try {
      const item = await this.scrapeUrl(url, title, author, note)
      return this.buildResult([item])
    } catch (err) {
      // If scrape fails, still ingest the URL with minimal metadata
      const fallbackTitle = title ?? url
      const keywords = extractKeywords(fallbackTitle, 10)
      const entities = extractEntities(fallbackTitle) as Record<string, unknown>

      const fallback: AdapterItem = {
        external_id: this.generateId(`manual_${url}`),
        title: fallbackTitle,
        url,
        author: author ?? 'Manual',
        keywords,
        entities,
        published_at: new Date().toISOString(),
        raw_data: {
          submitted_url: url,
          note,
          scrape_error: err instanceof Error ? err.message : 'scrape failed',
        },
      }

      return this.buildResult([fallback])
    }
  }

  private async scrapeUrl(
    url: string,
    titleOverride?: string,
    authorOverride?: string,
    note?: string
  ): Promise<AdapterItem> {
    const res = await fetch(url, {
      headers: {
        'User-Agent': 'OutrageContentEngine/1.0 (+https://outrage.media)',
        Accept: 'text/html,application/xhtml+xml',
      },
      signal: AbortSignal.timeout(10_000),
    })

    if (!res.ok) {
      throw new Error(`HTTP ${res.status} when fetching ${url}`)
    }

    const html = await res.text()

    const og = parseOGTags(html)

    const title  = titleOverride ?? og.title ?? url
    const body   = og.description
    const thumbnail = og.image
    const author = authorOverride ?? og.siteName ?? og.author ?? extractDomain(url)

    const fullText = [title, body ?? ''].join(' ')
    const keywords = extractKeywords(fullText, 10)
    const entities = extractEntities(title) as Record<string, unknown>

    return {
      external_id: this.generateId(`manual_${url}`),
      title,
      body,
      url,
      author,
      thumbnail_url: thumbnail,
      media_urls: thumbnail ? [thumbnail] : [],
      published_at: og.publishedTime ?? new Date().toISOString(),
      keywords,
      entities,
      raw_data: {
        submitted_url: url,
        og_tags: og,
        note,
      },
    }
  }

  private topicItem(
    query: string,
    titleOverride?: string,
    author?: string,
    note?: string
  ): AdapterItem {
    const title = titleOverride ?? query
    const keywords = extractKeywords(title, 10)
    const entities = extractEntities(title) as Record<string, unknown>

    return {
      external_id: this.generateId(`manual_topic_${query}_${Date.now()}`),
      title,
      author: author ?? 'Manual',
      published_at: new Date().toISOString(),
      keywords: [query.toLowerCase(), ...keywords],
      entities,
      raw_data: {
        query,
        note,
        type: 'topic_seed',
      },
    }
  }
}

// ─── Open Graph parser ────────────────────────────────────────────────────────

interface OGTags {
  title?: string
  description?: string
  image?: string
  siteName?: string
  author?: string
  publishedTime?: string
  type?: string
}

function parseOGTags(html: string): OGTags {
  const og: OGTags = {}

  const metaRegex = /<meta\s[^>]+>/gi
  const metas = html.match(metaRegex) ?? []

  for (const tag of metas) {
    const prop    = (tag.match(/property=["']([^"']+)["']/i)?.[1] ?? '').toLowerCase()
    const name    = (tag.match(/name=["']([^"']+)["']/i)?.[1] ?? '').toLowerCase()
    const content =  tag.match(/content=["']([^"']+)["']/i)?.[1]

    if (!content) continue

    switch (prop || name) {
      case 'og:title':         og.title         = decode(content); break
      case 'og:description':   og.description   = decode(content); break
      case 'og:image':         og.image         = content;         break
      case 'og:site_name':     og.siteName      = decode(content); break
      case 'og:type':          og.type          = content;         break
      case 'article:published_time':
      case 'og:published_time': og.publishedTime = content;        break
      case 'author':           og.author        = decode(content); break
      case 'twitter:title':    og.title         = og.title ?? decode(content); break
      case 'twitter:description': og.description = og.description ?? decode(content); break
      case 'twitter:image':    og.image         = og.image ?? content; break
    }
  }

  // Fall back to <title> tag
  if (!og.title) {
    const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i)
    if (titleMatch) og.title = decode(titleMatch[1].trim())
  }

  return og
}

function decode(str: string): string {
  return str
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#039;/g, "'")
    .trim()
}

function extractDomain(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, '')
  } catch {
    return 'Unknown'
  }
}

export const manualAdapter = new ManualAdapter()
