import { describe, it, expect } from 'vitest'
import { parseQueryIntent, matchStaticCommands } from '@/lib/commands/command.router'

// ─── parseQueryIntent ─────────────────────────────────────────────────────────

describe('parseQueryIntent', () => {

  // ── post_now ──────────────────────────────────────────────────────────────────
  it('matches "what should I post now"', () => {
    expect(parseQueryIntent('what should I post now').intent).toBe('post_now')
  })
  it('matches "what can I post"', () => {
    expect(parseQueryIntent('what can I post').intent).toBe('post_now')
  })
  it('matches "post now"', () => {
    expect(parseQueryIntent('post now').intent).toBe('post_now')
  })
  it('matches "best post today"', () => {
    expect(parseQueryIntent('best post today').intent).toBe('post_now')
  })

  // ── meme_ready ────────────────────────────────────────────────────────────────
  it('matches "meme ready trends"', () => {
    expect(parseQueryIntent('meme ready trends').intent).toBe('meme_ready')
  })
  it('matches "meme worthy"', () => {
    expect(parseQueryIntent('meme worthy').intent).toBe('meme_ready')
  })
  it('matches "best meme format"', () => {
    expect(parseQueryIntent('best meme format').intent).toBe('meme_ready')
  })

  // ── urgent ────────────────────────────────────────────────────────────────────
  it('matches "urgent opportunities"', () => {
    expect(parseQueryIntent('urgent opportunities').intent).toBe('urgent')
  })
  it('matches "time sensitive"', () => {
    expect(parseQueryIntent('time sensitive').intent).toBe('urgent')
  })
  it('matches "act now"', () => {
    expect(parseQueryIntent('act now').intent).toBe('urgent')
  })

  // ── hottest ───────────────────────────────────────────────────────────────────
  it('matches "hottest trends"', () => {
    expect(parseQueryIntent('hottest trends').intent).toBe('hottest')
  })
  it('matches "top trending content"', () => {
    expect(parseQueryIntent('top trending content').intent).toBe('hottest')
  })
  it('matches "most viral"', () => {
    expect(parseQueryIntent('most viral').intent).toBe('hottest')
  })

  // ── competitor_gaps ───────────────────────────────────────────────────────────
  it('matches "stories competitors missed"', () => {
    expect(parseQueryIntent('stories competitors missed').intent).toBe('competitor_gaps')
  })
  it('matches "what did competitors miss"', () => {
    expect(parseQueryIntent('what did competitors miss').intent).toBe('competitor_gaps')
  })
  it('matches "whitespace"', () => {
    expect(parseQueryIntent('whitespace').intent).toBe('competitor_gaps')
  })
  it('matches "gap analysis"', () => {
    expect(parseQueryIntent('gap analysis competitors').intent).toBe('competitor_gaps')
  })

  // ── risky ─────────────────────────────────────────────────────────────────────
  it('matches "risky trends to avoid"', () => {
    expect(parseQueryIntent('risky trends to avoid').intent).toBe('risky')
  })
  it('matches "brand safety"', () => {
    expect(parseQueryIntent('brand safety').intent).toBe('risky')
  })

  // ── search (keyword intents) ──────────────────────────────────────────────────
  it('matches celebrity → search:celebrity', () => {
    const result = parseQueryIntent('show me celebrity stories')
    expect(result.intent).toBe('search')
    expect(result.keyword).toBe('celebrity')
  })
  it('matches reality tv → search:reality tv', () => {
    const result = parseQueryIntent('reality tv trends')
    expect(result.intent).toBe('search')
    expect(result.keyword).toBe('reality tv')
  })
  it('matches politics → search:politics', () => {
    const result = parseQueryIntent('political trends')
    expect(result.intent).toBe('search')
    expect(result.keyword).toBe('politics')
  })
  it('matches sports → search:sports', () => {
    const result = parseQueryIntent('NFL highlights')
    expect(result.intent).toBe('search')
    expect(result.keyword).toBe('sports')
  })
  it('matches music → search:music', () => {
    const result = parseQueryIntent('top music albums')
    expect(result.intent).toBe('search')
    expect(result.keyword).toBe('music')
  })

  // ── fallback ──────────────────────────────────────────────────────────────────
  it('falls back to search with extracted keyword for unrecognised input', () => {
    const result = parseQueryIntent('Taylor Swift drama')
    expect(result.intent).toBe('search')
    expect(result.keyword).toBeTruthy()
  })

  it('handles empty string gracefully', () => {
    const result = parseQueryIntent('')
    expect(result.intent).toBe('search')
  })

  it('is case-insensitive', () => {
    expect(parseQueryIntent('WHAT SHOULD I POST NOW').intent).toBe('post_now')
    expect(parseQueryIntent('HOTTEST TRENDS').intent).toBe('hottest')
  })
})

// ─── matchStaticCommands ──────────────────────────────────────────────────────

describe('matchStaticCommands', () => {
  it('returns all commands for empty input', () => {
    const results = matchStaticCommands('')
    expect(results.length).toBeGreaterThan(0)
  })

  it('returns dashboard command for "dashboard"', () => {
    const results = matchStaticCommands('dashboard')
    const ids = results.map((r) => r.id)
    expect(ids).toContain('nav-dashboard')
  })

  it('returns meme-related commands for "meme"', () => {
    const results = matchStaticCommands('meme')
    expect(results.length).toBeGreaterThan(0)
    expect(results.every((r) =>
      r.label.toLowerCase().includes('meme') ||
      r.description.toLowerCase().includes('meme') ||
      r.keywords.some((k) => k.toLowerCase().includes('meme'))
    )).toBe(true)
  })

  it('returns no results for a nonsense query', () => {
    const results = matchStaticCommands('zzzzzzznomatch99999')
    expect(results).toHaveLength(0)
  })

  it('is case-insensitive', () => {
    const lower = matchStaticCommands('dashboard')
    const upper = matchStaticCommands('DASHBOARD')
    expect(lower.length).toBe(upper.length)
  })
})
