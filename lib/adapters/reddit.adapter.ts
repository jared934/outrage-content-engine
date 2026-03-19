// ─── Reddit JSON API Adapter (REAL) ──────────────────────────────────────────
// Uses Reddit's public JSON endpoint — no API key required for basic usage.
// Rate limit: ~60 req/min unauthenticated, 100/min with OAuth.
//
// REAL ADAPTER — works immediately.
//
// Endpoints used:
//   Hot posts: https://www.reddit.com/r/{sub}/hot.json?limit=25
//   Rising:    https://www.reddit.com/r/{sub}/rising.json?limit=25
//   New:       https://www.reddit.com/r/{sub}/new.json?limit=25
//
// SWAP-IN: When REDDIT_CLIENT_ID + REDDIT_CLIENT_SECRET are configured,
//   switch to OAuth2 flow for higher rate limits and access to user data.
//   See: lib/adapters/reddit.oauth.adapter.ts (future)
//
// Best subreddits for OUTRAGE brand:
//   r/PublicFreakout, r/entertainment, r/popculturechat, r/celebrity,
//   r/BeautyGuruChatter, r/Fauxmoi, r/KUWTK, r/Sports, r/nba, r/soccer,
//   r/hiphopheads, r/popheads, r/boxoffice, r/movies, r/television

import { BaseAdapter, AdapterConfig, AdapterResult, AdapterItem } from './base.adapter'
import { extractKeywords, extractEntities, engagementScore } from '@/lib/ingestion/extract'

interface RedditPost {
  id: string
  title: string
  selftext: string
  url: string
  permalink: string
  author: string
  thumbnail: string
  preview?: { images?: Array<{ source?: { url?: string } }> }
  subreddit: string
  subreddit_name_prefixed: string
  score: number
  upvote_ratio: number
  num_comments: number
  created_utc: number
  is_video: boolean
  is_self: boolean
  link_flair_text: string | null
  post_hint?: string
  media?: { reddit_video?: { fallback_url?: string } }
}

export class RedditAdapter extends BaseAdapter {
  readonly type = 'reddit'
  readonly name = 'Reddit'

  private readonly USER_AGENT = 'OutrageContentEngine/1.0 (by /u/outrage_bot; +https://outrage.media)'

  async fetch(config: AdapterConfig): Promise<AdapterResult> {
    const subreddit = (config.subreddit as string | undefined) ??
                      this.extractSubreddit(config.url as string | undefined)

    if (!subreddit) {
      return this.buildResult([], 'No subreddit configured. Set config.subreddit or config.url')
    }

    const sort  = (config.sort as string | undefined) ?? 'hot'
    const limit = Math.min(config.limit as number ?? 25, 100)
    const time  = (config.time  as string | undefined) ?? 'day'  // for top/controversial

    const endpoint = sort === 'top' || sort === 'controversial'
      ? `https://www.reddit.com/r/${subreddit}/${sort}.json?limit=${limit}&t=${time}`
      : `https://www.reddit.com/r/${subreddit}/${sort}.json?limit=${limit}`

    try {
      const res = await fetch(endpoint, {
        headers: { 'User-Agent': this.USER_AGENT },
        signal: AbortSignal.timeout(12_000),
      })

      if (!res.ok) {
        if (res.status === 429) return this.buildResult([], 'Reddit rate limit hit — try again in 60s')
        if (res.status === 403) return this.buildResult([], `r/${subreddit} is private or quarantined`)
        if (res.status === 404) return this.buildResult([], `r/${subreddit} does not exist`)
        return this.buildResult([], `Reddit API error: ${res.status}`)
      }

      const json = await res.json()
      const posts: RedditPost[] = json?.data?.children?.map((c: { data: RedditPost }) => c.data) ?? []

      const items: AdapterItem[] = []

      for (const post of posts) {
        // Skip removed/deleted posts
        if (post.selftext === '[removed]' || post.selftext === '[deleted]') continue
        // Skip posts that are just links to external sites (unless it's news)
        // We want self posts and image/video posts

        // Engagement data
        const engagement_data = {
          upvotes:      post.score,
          upvote_ratio: post.upvote_ratio,
          num_comments: post.num_comments,
          subreddit:    post.subreddit,
          sort,
        }

        // Thumbnail — prefer preview image (higher quality)
        let thumbnail: string | undefined
        if (post.preview?.images?.[0]?.source?.url) {
          // Reddit HTML-encodes the URL
          thumbnail = post.preview.images[0].source.url.replace(/&amp;/g, '&')
        } else if (post.thumbnail && !['self', 'nsfw', 'default', 'image', 'spoiler'].includes(post.thumbnail)) {
          thumbnail = post.thumbnail
        }

        const media_urls: string[] = thumbnail ? [thumbnail] : []
        if (post.media?.reddit_video?.fallback_url) {
          media_urls.push(post.media.reddit_video.fallback_url)
        }

        const fullText = [post.title, post.selftext].join(' ')
        const keywords = extractKeywords(fullText, 10)
        const entities = extractEntities(post.title) as Record<string, unknown>

        items.push({
          external_id: this.generateId(`reddit_${post.id}`),
          title: post.title,
          body: post.selftext || undefined,
          url: post.url !== post.permalink
            ? post.url   // external link post
            : `https://reddit.com${post.permalink}`,
          author: `u/${post.author}`,
          thumbnail_url: thumbnail,
          media_urls,
          published_at: new Date(post.created_utc * 1000).toISOString(),
          keywords,
          entities,
          engagement_data,
          sentiment_score: undefined,
          raw_data: {
            post_id:           post.id,
            subreddit:         post.subreddit_name_prefixed,
            flair:             post.link_flair_text,
            permalink:         `https://reddit.com${post.permalink}`,
            is_video:          post.is_video,
            is_self:           post.is_self,
            post_hint:         post.post_hint ?? null,
          },
        })
      }

      return this.buildResult(items)
    } catch (err) {
      if (err instanceof Error && err.name === 'TimeoutError') {
        return this.buildResult([], 'Reddit fetch timed out')
      }
      const message = err instanceof Error ? err.message : 'Reddit fetch failed'
      return this.buildResult([], message)
    }
  }

  private extractSubreddit(url?: string): string | null {
    if (!url) return null
    const match = url.match(/reddit\.com\/r\/([^/?#]+)/i)
    return match?.[1] ?? null
  }
}

export const redditAdapter = new RedditAdapter()
