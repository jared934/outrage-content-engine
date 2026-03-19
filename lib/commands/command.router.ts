// ─── Command Router — Natural Language Intent Parser ──────────────────────────
// Maps free-text input to a QueryIntent + optional keyword.
// No AI needed — keyword rules cover all example commands and common variants.

import type { ParsedQuery, QueryIntent } from './command.types'
import { COMMAND_REGISTRY } from './command.registry'

interface IntentRule {
  intent:  QueryIntent
  keyword?: string
  label:   string
  patterns: RegExp[]
}

const INTENT_RULES: IntentRule[] = [
  {
    intent: 'post_now',
    label: 'What to post now',
    patterns: [
      /post.?now/i,
      /what.*(?:should|can|do).*(?:i\s+)?post/i,
      /should.*post/i,
      /best.*post.*(?:now|today)/i,
      /what.*post/i,
    ],
  },
  {
    intent: 'meme_ready',
    label: 'Best meme-ready trends',
    patterns: [
      /meme.?ready/i,
      /meme.?worthy/i,
      /best.*meme/i,
      /meme.*potential/i,
      /meme.*trend/i,
      /meme.*format/i,
      /good.*meme/i,
    ],
  },
  {
    intent: 'urgent',
    label: 'Urgent opportunities',
    patterns: [
      /urgent.*opport/i,
      /time.?sensitive/i,
      /window.*clos/i,
      /opport.*now/i,
      /must.*post.*now/i,
      /act.*now/i,
      /urgent.*trend/i,
    ],
  },
  {
    intent: 'hottest',
    label: 'Hottest trends right now',
    patterns: [
      /hottes[t]?/i,
      /(?:top|best|viral|trending).*(trend|stori|content)/i,
      /most.*viral/i,
      /highest.*score/i,
      /top.*priorit/i,
    ],
  },
  {
    intent: 'competitor_gaps',
    label: 'Stories competitors missed',
    patterns: [
      /competi.*miss/i,
      /(?:stories|trends|content).*miss/i,
      /missed.*(?:stories|trends)/i,
      /whitespace/i,
      /gap.*competi/i,
      /competi.*gap/i,
      /uncovered.*stories/i,
      /what.*competi.*miss/i,
    ],
  },
  {
    intent: 'risky',
    label: 'Risky trends to avoid',
    patterns: [
      /risky/i,
      /brand.?safe/i,
      /unsafe/i,
      /avoid.*trend/i,
      /dangerous.*trend/i,
    ],
  },
  // Keyword-based searches (these extract the topic from the query)
  {
    intent: 'search',
    keyword: 'celebrity',
    label: 'Celebrity stories',
    patterns: [
      /celebrity|celeb\b/i,
    ],
  },
  {
    intent: 'search',
    keyword: 'reality tv',
    label: 'Reality TV trends',
    patterns: [
      /reality.?tv|reality.?show/i,
    ],
  },
  {
    intent: 'search',
    keyword: 'politics',
    label: 'Political trends',
    patterns: [
      /politic|government|congress|senate|election/i,
    ],
  },
  {
    intent: 'search',
    keyword: 'sports',
    label: 'Sports trends',
    patterns: [
      /\bsport|nfl|nba|soccer|football|baseball\b/i,
    ],
  },
  {
    intent: 'search',
    keyword: 'music',
    label: 'Music trends',
    patterns: [
      /\bmusic|album|song|artist|rapper|singer\b/i,
    ],
  },
]

/**
 * Parse a free-text input into a QueryIntent.
 * Returns null if no intent matches (caller should fall back to keyword search).
 */
export function parseQueryIntent(input: string): ParsedQuery {
  const trimmed = input.trim()

  // Check against all intent rules
  for (const rule of INTENT_RULES) {
    if (rule.patterns.some((p) => p.test(trimmed))) {
      return {
        intent:  rule.intent,
        keyword: rule.keyword ?? extractKeyword(trimmed),
        label:   rule.label,
      }
    }
  }

  // No rule matched — extract keyword and do a general search
  const keyword = extractKeyword(trimmed)
  return {
    intent:  'search',
    keyword: keyword || trimmed,
    label:   `Search: "${keyword || trimmed}"`,
  }
}

/**
 * Strip common query words to extract the core topic keyword.
 */
function extractKeyword(input: string): string {
  return input
    .toLowerCase()
    .replace(/^(show\s+me|show|find|search\s+for|search|get|list|what\s+are)\s+/i, '')
    .replace(/\b(the|all|some|any|latest|recent|top|best|hottest|biggest)\b\s*/gi, '')
    .replace(/\b(stories|trends|content|posts?|topics?|news)\b\s*/gi, '')
    .replace(/\b(about|for|related to|on|around)\b\s*/gi, '')
    .trim()
}

/**
 * Find the best matching static command for a query.
 * Used to suggest commands when user is typing.
 */
export function matchStaticCommands(input: string) {
  if (!input.trim()) return COMMAND_REGISTRY

  const lower = input.toLowerCase()

  return COMMAND_REGISTRY.filter((cmd) => {
    return (
      cmd.label.toLowerCase().includes(lower) ||
      cmd.description.toLowerCase().includes(lower) ||
      cmd.keywords.some((k) => k.toLowerCase().includes(lower))
    )
  })
}
