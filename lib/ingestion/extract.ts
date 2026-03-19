// ─── Keyword & Entity Extraction ────────────────────────────────────────────
// Zero-dependency NLP utilities for signal extraction.
// No external API required — runs entirely in-process.
//
// Accuracy: ~70-80% for pop culture / entertainment content.
// For production-scale accuracy, swap extractKeywords with a TF-IDF library
// or call OpenAI during the clustering step (which already happens in n8n).

// ── Stop Words ───────────────────────────────────────────────────────────────

const STOP_WORDS = new Set([
  'a', 'an', 'the', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for',
  'of', 'with', 'by', 'from', 'is', 'it', 'its', 'was', 'are', 'were',
  'be', 'been', 'being', 'have', 'has', 'had', 'do', 'does', 'did',
  'will', 'would', 'could', 'should', 'may', 'might', 'can', 'this',
  'that', 'these', 'those', 'i', 'we', 'you', 'he', 'she', 'they', 'my',
  'our', 'your', 'his', 'her', 'their', 'what', 'which', 'who', 'how',
  'when', 'where', 'why', 'all', 'as', 'if', 'then', 'than', 'up', 'out',
  'so', 'just', 'more', 'about', 'now', 'after', 'before', 'new', 'get',
  'also', 'not', 'no', 'vs', 'via', 'into', 'over', 'said', 'says', 'say',
  'according', 'after', 'during', 'since', 'while', 'within', 'between',
  'here', 'there', 'where', 'me', 'him', 'us', 'them', 'who', 'whom',
  'first', 'last', 'next', 'back', 'still', 'well', 'even', 'like', 'just',
  'too', 'very', 'only', 'much', 'such', 'both', 'each', 'any', 'own',
  'same', 'other', 'another', 'every', 'few', 'many', 'most', 'some',
])

// ── Keyword Extraction ────────────────────────────────────────────────────────

/**
 * Extract top keywords from a block of text.
 * Returns lowercase, deduped, sorted by frequency.
 *
 * @param text  Title + body combined for better signal
 * @param limit Max keywords to return (default 12)
 */
export function extractKeywords(text: string, limit = 12): string[] {
  if (!text?.trim()) return []

  const words = text
    .toLowerCase()
    // Remove URLs
    .replace(/https?:\/\/\S+/g, ' ')
    // Remove HTML tags
    .replace(/<[^>]+>/g, ' ')
    // Keep apostrophes for contractions, remove other punctuation
    .replace(/[^\w\s']/g, ' ')
    .split(/\s+/)
    .filter((w) => w.length > 2 && !STOP_WORDS.has(w) && !/^\d+$/.test(w))

  // Count frequency
  const freq = new Map<string, number>()
  for (const w of words) {
    freq.set(w, (freq.get(w) ?? 0) + 1)
  }

  return Array.from(freq.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([word]) => word)
}

// ── Entity Extraction ─────────────────────────────────────────────────────────

export interface ExtractedEntities {
  [key: string]: string[]
  people: string[]
  brands: string[]
  hashtags: string[]
  mentions: string[]
  places: string[]
}

// Known brand/media entities relevant to OUTRAGE brand
const KNOWN_BRANDS = new Set([
  'netflix', 'hulu', 'disney', 'hbo', 'amazon', 'spotify', 'apple', 'google',
  'instagram', 'tiktok', 'twitter', 'youtube', 'snapchat', 'twitch', 'reddit',
  'tmz', 'complex', 'billboard', 'rolling stone', 'variety', 'deadline',
  'nba', 'nfl', 'mlb', 'nhl', 'ufc', 'grammy', 'oscars', 'emmys', 'bets',
  'vmas', 'met gala', 'coachella', 'super bowl', 'world cup',
])

// Heuristic: title-case sequences of 2-3 words are likely person names
const TITLE_CASE_ENTITY = /\b([A-Z][a-z]+(?:\s+[A-Z][a-z]+){1,2})\b/g

/**
 * Extract named entities from text.
 * Returns structured entity buckets.
 */
export function extractEntities(text: string): ExtractedEntities {
  if (!text?.trim()) {
    return { people: [], brands: [], hashtags: [], mentions: [], places: [] }
  }

  // Hashtags — #topic
  const hashtags = Array.from(new Set(
    (text.match(/#[a-zA-Z][a-zA-Z0-9_]*/g) ?? []).map(h => h.toLowerCase())
  ))

  // @mentions
  const mentions = Array.from(new Set(
    (text.match(/@[a-zA-Z][a-zA-Z0-9_.]*/g) ?? []).map(m => m.toLowerCase())
  ))

  // Title-case name candidates (likely people/places)
  const titleCaseMatches = Array.from(new Set(
    (text.match(TITLE_CASE_ENTITY) ?? [])
      .filter(m => !STOP_WORDS.has(m.split(' ')[0].toLowerCase()))
  ))

  // Brand detection — check lowercase text for known brands
  const lowerText = text.toLowerCase()
  const brands = Array.from(KNOWN_BRANDS).filter(b => lowerText.includes(b))

  // Heuristic: single title-case → could be person or place
  // Two+ words title-case → likely person name
  const people = titleCaseMatches.filter(m => m.includes(' '))
  const places = titleCaseMatches.filter(m => !m.includes(' ') && m.length > 3)

  return {
    people: people.slice(0, 10),
    brands: brands.slice(0, 5),
    hashtags: hashtags.slice(0, 10),
    mentions: mentions.slice(0, 10),
    places: places.slice(0, 5),
  }
}

// ── Engagement Score ──────────────────────────────────────────────────────────

/**
 * Compute a normalized virality proxy (0-100) from engagement signals.
 * Used to pre-score items before OpenAI scoring runs.
 */
export function engagementScore(data: Record<string, unknown>): number {
  const get = (key: string) => Number(data[key] ?? 0)

  // Reddit
  if (data.upvotes !== undefined) {
    const upvotes = get('upvotes')
    const comments = get('num_comments')
    return Math.min(100, Math.log10(upvotes + 1) * 20 + Math.log10(comments + 1) * 10)
  }

  // YouTube
  if (data.views !== undefined) {
    const views = get('views')
    const likes = get('likes')
    return Math.min(100, Math.log10(views + 1) * 15 + Math.log10(likes + 1) * 10)
  }

  // Google Trends (approx_traffic)
  if (data.approx_traffic !== undefined) {
    const traffic = Number(String(data.approx_traffic).replace(/[^0-9]/g, '')) || 0
    return Math.min(100, Math.log10(traffic + 1) * 12)
  }

  return 0
}
