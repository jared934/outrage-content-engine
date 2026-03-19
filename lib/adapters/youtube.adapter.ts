// ─── YouTube Data API v3 Adapter (REAL — requires API key) ───────────────────
// Uses YouTube Data API v3 for trending videos, search, and engagement data.
//
// MOCK ADAPTER until YOUTUBE_API_KEY is configured.
// Falls back to YouTubeRSSAdapter automatically when no key is present.
//
// SWAP-IN: Set YOUTUBE_API_KEY in .env.local to activate real API calls.
//
// Free tier: 10,000 quota units/day
//   videos.list:  1 unit/call → 10,000 calls/day
//   search.list:  100 units/call → only 100 calls/day
//
// Strategy: Use search.list sparingly, rely on videos.list + RSS for most data.
//
// Setup:
//   1. Go to https://console.cloud.google.com/
//   2. Create project → Enable "YouTube Data API v3"
//   3. Create API key → restrict to YouTube Data API
//   4. Add to .env.local: YOUTUBE_API_KEY=AIza...

import { BaseAdapter, AdapterConfig, AdapterResult, AdapterItem } from './base.adapter'
import { YouTubeRSSAdapter } from './youtube-rss.adapter'
import { extractKeywords, extractEntities } from '@/lib/ingestion/extract'

const YT_API_BASE = 'https://www.googleapis.com/youtube/v3'

interface YouTubeVideo {
  id: string | { videoId: string }
  snippet: {
    title: string
    description: string
    channelTitle: string
    channelId: string
    publishedAt: string
    thumbnails: {
      maxres?: { url: string }
      high?:   { url: string }
      medium?: { url: string }
    }
    tags?: string[]
  }
  statistics?: {
    viewCount?: string
    likeCount?: string
    commentCount?: string
  }
}

export class YouTubeAdapter extends BaseAdapter {
  readonly type = 'youtube'
  readonly name = 'YouTube Data API'

  private rssAdapter = new YouTubeRSSAdapter()

  get isMock(): boolean {
    return !process.env.YOUTUBE_API_KEY
  }

  async fetch(config: AdapterConfig): Promise<AdapterResult> {
    const apiKey = process.env.YOUTUBE_API_KEY

    // No API key → fall back to free RSS adapter
    if (!apiKey) {
      console.warn('[youtube-adapter] No YOUTUBE_API_KEY — using RSS fallback')
      const rssResult = await this.rssAdapter.fetch(config)
      return {
        ...rssResult,
        source_type: this.type,
        source_name: `${this.name} (RSS fallback — no API key)`,
      }
    }

    const limit = Math.min(config.limit as number ?? 25, 50)

    try {
      // Trending / most popular videos
      if (config.mode === 'trending' || (!config.channel_id && !config.query)) {
        return await this.fetchTrending(apiKey, limit, config)
      }

      // Search-based
      if (config.query) {
        return await this.fetchSearch(apiKey, limit, config)
      }

      // Channel uploads
      if (config.channel_id) {
        // Prefer RSS for channel feeds (cheaper, no quota cost)
        return await this.rssAdapter.fetch(config)
      }

      return this.buildResult([], 'No valid YouTube fetch mode configured')
    } catch (err) {
      const message = err instanceof Error ? err.message : 'YouTube API fetch failed'
      return this.buildResult([], message)
    }
  }

  private async fetchTrending(
    apiKey: string,
    limit: number,
    config: AdapterConfig
  ): Promise<AdapterResult> {
    const regionCode = (config.geo as string | undefined) ?? 'US'
    // Category 10 = Music, 24 = Entertainment, 17 = Sports
    const videoCategoryId = (config.category_id as string | undefined) ?? '0'

    const url = new URL(`${YT_API_BASE}/videos`)
    url.searchParams.set('part', 'snippet,statistics')
    url.searchParams.set('chart', 'mostPopular')
    url.searchParams.set('regionCode', regionCode)
    url.searchParams.set('videoCategoryId', videoCategoryId)
    url.searchParams.set('maxResults', String(limit))
    url.searchParams.set('key', apiKey)

    const res = await fetch(url.toString(), { signal: AbortSignal.timeout(12_000) })
    if (!res.ok) throw new Error(`YouTube API error: ${res.status} ${await res.text()}`)

    const json = await res.json()
    return this.buildResult(this.normalizeVideos(json.items ?? []))
  }

  private async fetchSearch(
    apiKey: string,
    limit: number,
    config: AdapterConfig
  ): Promise<AdapterResult> {
    const query = config.query as string
    const publishedAfter = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString() // last 24h

    const searchUrl = new URL(`${YT_API_BASE}/search`)
    searchUrl.searchParams.set('part', 'snippet')
    searchUrl.searchParams.set('q', query)
    searchUrl.searchParams.set('type', 'video')
    searchUrl.searchParams.set('order', 'viewCount')
    searchUrl.searchParams.set('publishedAfter', publishedAfter)
    searchUrl.searchParams.set('maxResults', String(limit))
    searchUrl.searchParams.set('key', apiKey)

    const res = await fetch(searchUrl.toString(), { signal: AbortSignal.timeout(12_000) })
    if (!res.ok) throw new Error(`YouTube search API error: ${res.status}`)

    const json = await res.json()
    return this.buildResult(this.normalizeVideos(json.items ?? []))
  }

  private normalizeVideos(videos: YouTubeVideo[]): AdapterItem[] {
    return videos.map((video) => {
      const videoId = typeof video.id === 'string' ? video.id : video.id?.videoId
      const { snippet, statistics } = video

      const thumbnail =
        snippet.thumbnails?.maxres?.url ??
        snippet.thumbnails?.high?.url ??
        snippet.thumbnails?.medium?.url ??
        (videoId ? `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg` : undefined)

      const keywords = snippet.tags?.slice(0, 10) ??
        extractKeywords([snippet.title, snippet.description].join(' '), 10)

      const entities = extractEntities(snippet.title) as Record<string, unknown>

      const engagement_data = statistics ? {
        views:    parseInt(statistics.viewCount   ?? '0', 10),
        likes:    parseInt(statistics.likeCount   ?? '0', 10),
        comments: parseInt(statistics.commentCount ?? '0', 10),
      } : {}

      return {
        external_id: this.generateId(`yt_${videoId ?? snippet.title}`),
        title: snippet.title,
        body: snippet.description?.slice(0, 500) || undefined,
        url: videoId ? `https://www.youtube.com/watch?v=${videoId}` : undefined,
        author: snippet.channelTitle,
        thumbnail_url: thumbnail,
        media_urls: thumbnail ? [thumbnail] : [],
        published_at: snippet.publishedAt,
        keywords,
        entities,
        engagement_data,
        raw_data: {
          video_id:    videoId,
          channel_id:  snippet.channelId,
          channel:     snippet.channelTitle,
          statistics,
        },
      }
    })
  }
}

export const youtubeAdapter = new YouTubeAdapter()
