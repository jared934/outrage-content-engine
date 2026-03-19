// ─── YouTube Adapter (MOCK) ───────────────────────────────────────────────────
// Returns realistic seed data until YOUTUBE_API_KEY is configured.
// Replace with youtube.adapter.ts once key is available.
//
// Real implementation uses YouTube Data API v3:
//   - videos.list (chart=mostPopular, regionCode=US)
//   - search.list (type=video, order=viewCount, publishedAfter=24h ago)

import { BaseAdapter, AdapterConfig, AdapterResult } from './base.adapter'

const MOCK_VIDEOS = [
  {
    external_id: 'yt_mock_001',
    title: 'I Finally Responded to Everything [Full Statement]',
    body: 'After weeks of silence, the full tea has spilled. Watch until the end.',
    url: 'https://youtube.com/watch?v=mock001',
    author: 'PopCultureDaily',
    thumbnail_url: 'https://i.ytimg.com/vi/mock001/maxresdefault.jpg',
    published_at: new Date(Date.now() - 1000 * 60 * 30).toISOString(),
    raw_data: { views: 2_400_000, likes: 89000, channel_subscribers: 4_200_000 },
  },
  {
    external_id: 'yt_mock_002',
    title: 'The TRUTH About What Really Happened (RECEIPTS)',
    body: 'Nobody expected this. The whole situation is insane.',
    url: 'https://youtube.com/watch?v=mock002',
    author: 'DramaAlert',
    thumbnail_url: 'https://i.ytimg.com/vi/mock002/maxresdefault.jpg',
    published_at: new Date(Date.now() - 1000 * 60 * 120).toISOString(),
    raw_data: { views: 890_000, likes: 45000, channel_subscribers: 2_100_000 },
  },
]

export class YouTubeAdapterMock extends BaseAdapter {
  readonly type = 'youtube'
  readonly name = 'YouTube (Mock)'

  async fetch(_config: AdapterConfig): Promise<AdapterResult> {
    await new Promise((r) => setTimeout(r, 50))
    return this.buildResult(MOCK_VIDEOS)
  }
}

export const youtubeAdapter = new YouTubeAdapterMock()
