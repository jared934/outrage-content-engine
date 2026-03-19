// ─── RSS/Feed Fetching Service ────────────────────────────────────────────────
// Uses fast-xml-parser (already installed) for zero-cost RSS ingestion

import { XMLParser } from 'fast-xml-parser'

const parser = new XMLParser({
  ignoreAttributes:   false,
  attributeNamePrefix: '@_',
  textNodeName:        '#text',
  isArray: (name) => ['item', 'entry'].includes(name),
})

export interface ParsedFeedItem {
  title:        string
  link:         string
  description:  string
  pubDate:      string | null
  guid:         string
  thumbnail:    string | null
  tags:         string[]
}

export interface FetchFeedResult {
  items:      ParsedFeedItem[]
  feedTitle:  string
  error?:     string
}

// ── Main fetch ────────────────────────────────────────────────────────────────

export async function fetchFeed(url: string): Promise<FetchFeedResult> {
  let xml: string
  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': 'OUTRAGE/1.0 (+https://outrage.app; feed reader)' },
      signal: AbortSignal.timeout(12_000),
    })
    if (!res.ok) return { items: [], feedTitle: '', error: `HTTP ${res.status}` }
    xml = await res.text()
  } catch (err) {
    return { items: [], feedTitle: '', error: String(err) }
  }

  try {
    const parsed = parser.parse(xml)

    // RSS 2.0
    if (parsed?.rss?.channel) {
      const ch = parsed.rss.channel
      const feedTitle = extractText(ch.title) ?? url
      const raw = ch.item ?? []
      return { feedTitle, items: raw.map(parseRssItem) }
    }

    // Atom
    if (parsed?.feed) {
      const feed = parsed.feed
      const feedTitle = extractText(feed.title) ?? url
      const raw = feed.entry ?? []
      return { feedTitle, items: raw.map(parseAtomEntry) }
    }

    return { items: [], feedTitle: url, error: 'Unrecognised feed format' }
  } catch (err) {
    return { items: [], feedTitle: url, error: `Parse error: ${String(err)}` }
  }
}

// ── RSS 2.0 item parser ───────────────────────────────────────────────────────

function parseRssItem(item: Record<string, unknown>): ParsedFeedItem {
  const title       = extractText(item.title) ?? ''
  const link        = extractText(item.link) ?? extractText(item.guid) ?? ''
  const description = stripHtml(extractText(item.description) ?? extractText(item['content:encoded']) ?? '')
  const pubDate     = extractText(item.pubDate) ?? extractText(item['dc:date']) ?? null
  const guid        = extractText(item.guid) ?? link ?? String(Math.random())
  const thumbnail   = extractThumbnail(item)
  const tags        = extractTags(item)

  return { title, link, description, pubDate, guid, thumbnail, tags }
}

// ── Atom entry parser ─────────────────────────────────────────────────────────

function parseAtomEntry(entry: Record<string, unknown>): ParsedFeedItem {
  const title       = extractText(entry.title) ?? ''
  const link        = extractAtomLink(entry.link) ?? extractText(entry.id) ?? ''
  const description = stripHtml(extractText(entry.summary) ?? extractText(entry.content) ?? '')
  const pubDate     = extractText(entry.published) ?? extractText(entry.updated) ?? null
  const guid        = extractText(entry.id) ?? link
  const thumbnail   = extractThumbnail(entry)
  const tags        = extractTags(entry)

  return { title, link, description, pubDate, guid, thumbnail, tags }
}

// ── Topic tag extraction ──────────────────────────────────────────────────────

export function matchClusterKeywords(
  title: string,
  description: string,
  clusterKeywords: string[],
): string[] {
  const text = `${title} ${description}`.toLowerCase()
  const matched = clusterKeywords.filter((kw) =>
    kw.length > 2 && text.includes(kw.toLowerCase())
  )
  return Array.from(new Set(matched)).slice(0, 15)
}

export function extractTopicTagsFromText(title: string, description: string): string[] {
  const text = `${title} ${description}`
  // Extract capitalised phrases and hashtags as raw topic signals
  const hashtags = Array.from(text.matchAll(/#(\w+)/g)).map((m) => m[1].toLowerCase())
  const caps = Array.from(text.matchAll(/\b([A-Z][a-z]+(?:\s[A-Z][a-z]+)*)\b/g))
    .map((m) => m[1].toLowerCase())
    .filter((t) => t.length > 3)
  return Array.from(new Set([...hashtags, ...caps])).slice(0, 10)
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function extractText(val: unknown): string | null {
  if (typeof val === 'string') return val
  if (typeof val === 'number') return String(val)
  if (val && typeof val === 'object') {
    const obj = val as Record<string, unknown>
    if (typeof obj['#text'] === 'string') return obj['#text']
    if (typeof obj['@_href'] === 'string') return obj['@_href']
  }
  return null
}

function extractAtomLink(link: unknown): string | null {
  if (typeof link === 'string') return link
  if (Array.isArray(link)) {
    const alt = (link as Array<Record<string, unknown>>).find(
      (l) => l['@_rel'] === 'alternate' || !l['@_rel']
    )
    return alt ? extractText(alt['@_href']) : null
  }
  if (link && typeof link === 'object') {
    return extractText((link as Record<string, unknown>)['@_href'])
  }
  return null
}

function extractThumbnail(item: Record<string, unknown>): string | null {
  const mt = item['media:thumbnail']
  if (mt && typeof mt === 'object') {
    const url = (mt as Record<string, unknown>)['@_url']
    if (typeof url === 'string') return url
  }
  const mc = item['media:content']
  if (mc && typeof mc === 'object') {
    const url = (mc as Record<string, unknown>)['@_url']
    if (typeof url === 'string') return url
  }
  const enc = item.enclosure
  if (enc && typeof enc === 'object') {
    const url = extractText((enc as Record<string, unknown>)['@_url'])
    if (url?.match(/\.(jpg|jpeg|png|gif|webp)/i)) return url
  }
  // Try extracting from description HTML
  const desc = extractText(item.description) ?? ''
  const m = desc.match(/<img[^>]+src=["']([^"']+)["']/i)
  return m?.[1] ?? null
}

function extractTags(item: Record<string, unknown>): string[] {
  const tags: string[] = []
  const cats = item.category
  if (Array.isArray(cats)) {
    cats.forEach((c) => {
      const t = extractText(c)
      if (t) tags.push(t.toLowerCase())
    })
  } else if (cats) {
    const t = extractText(cats)
    if (t) tags.push(t.toLowerCase())
  }
  return tags.slice(0, 10)
}

function stripHtml(html: string): string {
  return html
    .replace(/<[^>]*>/g, ' ')
    .replace(/&amp;/g,  '&')
    .replace(/&lt;/g,   '<')
    .replace(/&gt;/g,   '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g,  "'")
    .replace(/&nbsp;/g, ' ')
    .replace(/\s{2,}/g, ' ')
    .trim()
    .slice(0, 500)
}
