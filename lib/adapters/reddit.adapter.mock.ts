// ─── Reddit Adapter (MOCK) ────────────────────────────────────────────────────
// Returns realistic seed data until real Reddit API credentials are configured.
// Replace with reddit.adapter.ts once REDDIT_CLIENT_ID + REDDIT_CLIENT_SECRET are set.
//
// Real implementation will use: https://www.reddit.com/dev/api/
// Subreddits to watch: r/PublicFreakout, r/entertainment, r/popculturechat,
//   r/celebrity, r/BeautyGuruChatter, r/KUWTK, r/sports, r/nba, r/soccer

import { BaseAdapter, AdapterConfig, AdapterResult } from './base.adapter'

const MOCK_POSTS = [
  {
    external_id: 'reddit_mock_001',
    title: 'This celebrity just did something absolutely unhinged at an award show',
    body: 'The crowd was shocked. The internet immediately exploded. Clips going viral everywhere.',
    url: 'https://reddit.com/r/PublicFreakout/mock001',
    author: 'u/viralposter',
    thumbnail_url: undefined,
    published_at: new Date(Date.now() - 1000 * 60 * 45).toISOString(),
    raw_data: { subreddit: 'PublicFreakout', upvotes: 45200, num_comments: 2341 },
  },
  {
    external_id: 'reddit_mock_002',
    title: 'Major drama unfolding between two A-listers right now',
    body: 'Both have gone silent on social. Their teams are in crisis mode.',
    url: 'https://reddit.com/r/entertainment/mock002',
    author: 'u/dramawatch',
    thumbnail_url: undefined,
    published_at: new Date(Date.now() - 1000 * 60 * 90).toISOString(),
    raw_data: { subreddit: 'entertainment', upvotes: 28900, num_comments: 1876 },
  },
  {
    external_id: 'reddit_mock_003',
    title: 'This tweet aged TERRIBLY - the receipts are out',
    body: 'Old tweet resurfaced. The ratio is historic.',
    url: 'https://reddit.com/r/popculturechat/mock003',
    author: 'u/receiptsplease',
    thumbnail_url: undefined,
    published_at: new Date(Date.now() - 1000 * 60 * 120).toISOString(),
    raw_data: { subreddit: 'popculturechat', upvotes: 67400, num_comments: 4201 },
  },
]

export class RedditAdapterMock extends BaseAdapter {
  readonly type = 'reddit'
  readonly name = 'Reddit (Mock)'

  async fetch(_config: AdapterConfig): Promise<AdapterResult> {
    // Simulate network delay
    await new Promise((r) => setTimeout(r, 50))
    return this.buildResult(MOCK_POSTS)
  }
}

export const redditAdapter = new RedditAdapterMock()
