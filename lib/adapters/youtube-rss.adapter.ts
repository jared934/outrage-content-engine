// ─── YouTube RSS Adapter (REAL) ───────────────────────────────────────────────
// Uses YouTube's public Atom feed — free, no API key required.
// Works for any public YouTube channel or playlist.
//
// REAL ADAPTER — works immediately.
//
// Feed patterns:
//   Channel by ID:  https://www.youtube.com/feeds/videos.xml?channel_id={ID}
//   Playlist:       https://www.youtube.com/feeds/videos.xml?playlist_id={ID}
//   User (legacy):  https://www.youtube.com/feeds/videos.xml?user={username}
//
// Returns ~15 most recent videos per channel.
// For view counts and engagement, use youtube.adapter.ts (requires API key).
//
// GOOD FOR: Monitoring competitor channels, pop culture commentary channels.
// LIMITATION: No view counts, no trending sort. Just chronological feed.
// SWAP-IN: Use youtube.adapter.ts (real API) for engagement data.

import Parser from 'rss-parser'
import { BaseRSSAdapter, AdapterConfig, AdapterResult, AdapterItem } from './base.adapter'
import { extractKeywords, extractEntities } from '@/lib/ingestion/extract'

// Curated pop culture / entertainment YouTube channels worth monitoring
export const POP_CULTURE_CHANNELS = {
  drama_alert:   'UCDGpoaHAHMndksQOeieHMpg',
  tmz:           'UCK7IIV6Q2junGSdYK3BmZMg',
  complex:       'UCjmJDI5bnBSbKNrbRwFZMiQ',
  hot_97:        'UC4LAkWNHfGZzspTJWdNp9fA',
  nicki_minaj:   'UCLiF0ooT0YnkKVWCh_S0Hcg',
  power105:      'UCnxQ8o9RpqxGF2oLHcCn9VQ',
}

export class YouTubeRSSAdapter extends BaseRSSAdapter {
  readonly type = 'youtube_rss'
  readonly name = 'YouTube RSS'

  private parser = new Parser({
    ...this.getRSSParserOptions(),
    customFields: {
      item: [
        ['media:group', 'mediaGroup'],
        ['media:content', 'mediaContent'],
        ['yt:videoId', 'videoId'],
        ['yt:channelId', 'channelId'],
      ],
    },
  })

  async fetch(config: AdapterConfig): Promise<AdapterResult> {
    let feedUrl = config.url as string | undefined

    // Build feed URL from channel_id, playlist_id, or username
    if (!feedUrl) {
      if (config.channel_id) {
        feedUrl = `https://www.youtube.com/feeds/videos.xml?channel_id=${config.channel_id}`
      } else if (config.playlist_id) {
        feedUrl = `https://www.youtube.com/feeds/videos.xml?playlist_id=${config.playlist_id}`
      } else if (config.youtube_user) {
        feedUrl = `https://www.youtube.com/feeds/videos.xml?user=${config.youtube_user}`
      }
    }

    if (!feedUrl) {
      return this.buildResult([], 'No channel_id, playlist_id, or URL provided for YouTube RSS adapter')
    }

    const limit = config.limit ?? 15

    try {
      const feed = await this.parser.parseURL(feedUrl)
      const items: AdapterItem[] = []

      for (const entry of (feed.items ?? []).slice(0, limit)) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const e = entry as any

        const videoId = e.videoId ?? e['yt:videoId'] ?? null
        if (!videoId && !entry.link) continue

        // Thumbnail — YouTube always has a maxresdefault
        const thumbnail = videoId
          ? `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`
          : e.mediaGroup?.['media:thumbnail']?.[0]?.$?.url ?? undefined

        const highResThumbnail = videoId
          ? `https://i.ytimg.com/vi/${videoId}/maxresdefault.jpg`
          : thumbnail

        const description =
          e.mediaGroup?.['media:description']?.[0] ??
          entry.contentSnippet ??
          entry.content ??
          undefined

        const channelName = feed.title ?? e['yt:channelId'] ?? undefined

        const fullText = [entry.title ?? '', description ?? ''].join(' ')
        const keywords = extractKeywords(fullText, 10)
        const entities = extractEntities(entry.title ?? '') as Record<string, unknown>

        items.push({
          external_id: this.generateId(videoId ?? entry.link ?? entry.title ?? ''),
          title: entry.title ?? 'Untitled Video',
          body: description,
          url: entry.link ?? (videoId ? `https://www.youtube.com/watch?v=${videoId}` : undefined),
          author: channelName,
          thumbnail_url: thumbnail,
          media_urls: [thumbnail, highResThumbnail].filter(Boolean) as string[],
          published_at: entry.pubDate ?? entry.isoDate ?? undefined,
          keywords,
          entities,
          raw_data: {
            video_id: videoId,
            channel_id: e.channelId ?? e['yt:channelId'] ?? null,
            channel_name: channelName,
            feed_url: feedUrl,
          },
        })
      }

      return this.buildResult(items)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'YouTube RSS fetch failed'
      return this.buildResult([], message)
    }
  }
}

export const youtubeRSSAdapter = new YouTubeRSSAdapter()
