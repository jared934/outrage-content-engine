// =============================================================================
// OUTRAGE Trend Scoring Engine — Test Data & Examples
//
// Run manually:
//   npx ts-node -r tsconfig-paths/register lib/scoring/scoring.test-data.ts
//
// Or import in a test file:
//   import { runScoringExamples } from '@/lib/scoring/scoring.test-data'
// =============================================================================

import type { TrendCluster, SourceItem, TrendEntity } from '@/types'
import type { ScoringInput } from './scoring.types'
import { scoreCluster } from './scoring.service'
import { DEFAULT_SCORING_CONFIG, CONSERVATIVE_SCORING_CONFIG, VIRAL_MAXIMISER_CONFIG } from './scoring.config'

// ---------------------------------------------------------------------------
// Shared helpers
// ---------------------------------------------------------------------------

function makeCluster(overrides: Partial<TrendCluster>): TrendCluster {
  const now = new Date()
  return {
    id: 'test-cluster-id',
    org_id: 'test-org-id',
    title: 'Test Trend',
    summary: null,
    category: 'entertainment',
    status: 'active',
    overall_score: 0,
    source_count: 3,
    keywords: [],
    thumbnail_url: null,
    first_seen_at: new Date(now.getTime() - 2 * 3_600_000).toISOString(), // 2h ago
    last_seen_at: now.toISOString(),
    peaked_at: null,
    acted_on: false,
    acted_on_at: null,
    acted_on_by: null,
    is_manual: false,
    created_by: null,
    created_at: now.toISOString(),
    updated_at: now.toISOString(),
    ...overrides,
  }
}

function makeItem(overrides: Partial<SourceItem>): SourceItem {
  const now = new Date()
  return {
    id: 'test-item-id',
    source_id: 'test-source-id',
    external_id: null,
    title: 'Test item title',
    body: null,
    url: null,
    author: null,
    thumbnail_url: null,
    media_urls: [],
    published_at: now.toISOString(),
    fetched_at: now.toISOString(),
    status: 'processed',
    keywords: [],
    entities: {},
    sentiment_score: null,
    engagement_data: {},
    raw_data: {},
    created_at: now.toISOString(),
    updated_at: now.toISOString(),
    ...overrides,
  }
}

function makeEntity(name: string, type: TrendEntity['type']): TrendEntity {
  return {
    id: `entity-${name.replace(/\s/g, '-').toLowerCase()}`,
    name,
    type,
    aliases: [],
    metadata: {},
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }
}

// ---------------------------------------------------------------------------
// EXAMPLE 1: Massive celebrity scandal — post_now candidate
// ---------------------------------------------------------------------------

const CELEBRITY_SCANDAL: ScoringInput = {
  cluster: makeCluster({
    id: 'ex1',
    title: 'Major pop star exposed for cheating scandal — fans furious',
    summary: 'Leaked texts and photos have gone viral showing a major pop star in a cheating scandal. Twitter is melting down.',
    category: 'celebrity',
    status: 'hot',
    source_count: 18,
    keywords: ['scandal', 'exposed', 'cheating', 'leaked', 'drama', 'backlash', 'canceled'],
    first_seen_at: new Date(Date.now() - 3 * 3_600_000).toISOString(), // 3h ago
    last_seen_at: new Date().toISOString(),
  }),
  items: [
    makeItem({
      title: 'BREAKING: Pop star cheating texts leaked — fans demand answers',
      thumbnail_url: 'https://example.com/thumb.jpg',
      media_urls: ['https://example.com/photo1.jpg'],
      sentiment_score: 15, // very negative
      engagement_data: { likes: 48000, shares: 22000, comments: 8500 },
      keywords: ['breaking', 'leaked', 'scandal'],
    }),
    makeItem({
      title: 'Pop star management issues statement denying all claims',
      sentiment_score: 30,
      engagement_data: { likes: 12000, shares: 4000, comments: 3200 },
    }),
    makeItem({
      title: 'Fans react: "We\'re not surprised" — Twitter thread goes viral',
      sentiment_score: 20,
      engagement_data: { likes: 35000, shares: 18000, comments: 12000 },
    }),
  ],
  entities: [
    makeEntity('Taylor Swift', 'person'),
    makeEntity('Capitol Records', 'brand'),
  ],
}

// ---------------------------------------------------------------------------
// EXAMPLE 2: Divisive political hot take — debate magnet
// ---------------------------------------------------------------------------

const POLITICAL_DEBATE: ScoringInput = {
  cluster: makeCluster({
    id: 'ex2',
    title: 'Unpopular opinion: Gen Z vs Millennials debate reignited by viral TikTok',
    summary: 'A TikTok video making fun of millennial "lazy" culture has sparked a massive generational debate with 200k+ comments.',
    category: 'politics',
    status: 'active',
    source_count: 9,
    keywords: ['debate', 'controversial', 'vs', 'unpopular opinion', 'generational', 'hot take'],
    first_seen_at: new Date(Date.now() - 8 * 3_600_000).toISOString(), // 8h ago
    last_seen_at: new Date().toISOString(),
  }),
  items: [
    makeItem({
      title: 'Gen Z vs Millennials — who is actually lazy?',
      engagement_data: { likes: 89000, comments: 45000, shares: 22000 },
      sentiment_score: 40,
    }),
    makeItem({
      title: 'Millennials clap back: "At least we could afford houses"',
      engagement_data: { likes: 54000, comments: 28000 },
      sentiment_score: 28,
    }),
  ],
  entities: [],
}

// ---------------------------------------------------------------------------
// EXAMPLE 3: Fashion viral moment — Instagram gold
// ---------------------------------------------------------------------------

const FASHION_VIRAL: ScoringInput = {
  cluster: makeCluster({
    id: 'ex3',
    title: 'Rihanna stuns Met Gala in custom Valentino — outfit of the century',
    summary: 'Rihanna arrived at the Met Gala wearing a show-stopping custom Valentino gown that has already been declared the best look in Met Gala history.',
    category: 'fashion',
    status: 'active',
    source_count: 14,
    keywords: ['iconic', 'legendary', 'outfit', 'fashion', 'goals', 'look', 'serving', 'slay'],
    first_seen_at: new Date(Date.now() - 5 * 3_600_000).toISOString(), // 5h ago
    last_seen_at: new Date().toISOString(),
  }),
  items: [
    makeItem({
      title: 'Rihanna at the Met — every photo from tonight',
      thumbnail_url: 'https://example.com/rihanna-met.jpg',
      media_urls: ['https://example.com/ph1.jpg', 'https://example.com/ph2.jpg', 'https://example.com/ph3.jpg'],
      sentiment_score: 90, // very positive
      engagement_data: { likes: 280000, shares: 95000, saves: 62000 },
      keywords: ['iconic', 'photo', 'look', 'outfit', 'wearing'],
    }),
    makeItem({
      title: 'Valentino reveals the story behind the Rihanna Met Gala gown',
      thumbnail_url: 'https://example.com/design.jpg',
      media_urls: ['https://example.com/design1.jpg'],
      sentiment_score: 88,
      engagement_data: { likes: 42000, shares: 12000 },
    }),
  ],
  entities: [
    makeEntity('Rihanna', 'person'),
    makeEntity('Valentino', 'brand'),
    makeEntity('Met Gala', 'event'),
  ],
}

// ---------------------------------------------------------------------------
// EXAMPLE 4: Crime story — risky but engaging
// ---------------------------------------------------------------------------

const CRIME_STORY: ScoringInput = {
  cluster: makeCluster({
    id: 'ex4',
    title: 'Influencer arrested for fraud after scamming fans out of $2M',
    summary: 'A popular lifestyle influencer has been arrested after allegedly defrauding followers through a fake investment scheme.',
    category: 'crime',
    status: 'new',
    source_count: 6,
    keywords: ['arrested', 'fraud', 'scam', 'influencer', 'shocking'],
    first_seen_at: new Date(Date.now() - 1 * 3_600_000).toISOString(), // 1h ago
    last_seen_at: new Date().toISOString(),
  }),
  items: [
    makeItem({
      title: 'BREAKING: Lifestyle influencer arrested on federal fraud charges',
      sentiment_score: 10,
      engagement_data: { likes: 8000, shares: 4500 },
      keywords: ['breaking', 'arrested'],
    }),
  ],
  entities: [],
}

// ---------------------------------------------------------------------------
// EXAMPLE 5: Evergreen culture piece — save for later
// ---------------------------------------------------------------------------

const EVERGREEN_CULTURE: ScoringInput = {
  cluster: makeCluster({
    id: 'ex5',
    title: 'The history of "cancel culture" — how we got here and where it\'s going',
    summary: 'A deep dive into the origins, evolution, and future of cancel culture across social media platforms over the last decade.',
    category: 'culture',
    status: 'active',
    source_count: 5,
    keywords: ['history', 'cancel culture', 'culture', 'debate', 'generational', 'always', 'forever', 'iconic'],
    first_seen_at: new Date(Date.now() - 36 * 3_600_000).toISOString(), // 36h ago
    last_seen_at: new Date(Date.now() - 2 * 3_600_000).toISOString(),
  }),
  items: [
    makeItem({
      title: 'Cancel culture — a comprehensive history from 2010 to today',
      sentiment_score: 50,
      engagement_data: { likes: 3200, shares: 1800 },
    }),
  ],
  entities: [],
}

// ---------------------------------------------------------------------------
// EXAMPLE 6: Low-effort irrelevant news — should be ignored
// ---------------------------------------------------------------------------

const LOW_PRIORITY: ScoringInput = {
  cluster: makeCluster({
    id: 'ex6',
    title: 'Local council approves new parking regulations for residential areas',
    summary: null,
    category: 'other',
    status: 'new',
    source_count: 1,
    keywords: ['council', 'parking', 'regulations', 'residential'],
    first_seen_at: new Date(Date.now() - 48 * 3_600_000).toISOString(), // 48h ago
    last_seen_at: new Date(Date.now() - 40 * 3_600_000).toISOString(),
  }),
  items: [
    makeItem({
      title: 'Council votes on parking changes',
      sentiment_score: 50,
      engagement_data: { likes: 12 },
    }),
  ],
  entities: [],
}

// ---------------------------------------------------------------------------
// Run all examples
// ---------------------------------------------------------------------------

export interface ExampleResult {
  name: string
  title: string
  action: string
  priority: number
  virality: number
  outrage_fit: number
  meme_potential: number
  debate_potential: number
  urgency: number
  shelf_life: number
  visual_potential: number
  reel_potential: number
  instagram_shareability: number
  brand_safety: number
  top_formats: string[]
  summary: string
}

export function runScoringExamples(): ExampleResult[] {
  const examples: Array<{ name: string; input: ScoringInput }> = [
    { name: '🔥 Celebrity scandal', input: CELEBRITY_SCANDAL },
    { name: '⚡ Political debate', input: POLITICAL_DEBATE },
    { name: '✨ Fashion viral moment', input: FASHION_VIRAL },
    { name: '🚨 Crime story (risky)', input: CRIME_STORY },
    { name: '📚 Evergreen culture', input: EVERGREEN_CULTURE },
    { name: '💤 Low priority news', input: LOW_PRIORITY },
  ]

  return examples.map(({ name, input }) => {
    const result = scoreCluster(input, DEFAULT_SCORING_CONFIG)
    return {
      name,
      title: input.cluster.title,
      action: result.recommended_action,
      priority: result.total_priority_score,
      virality: result.virality_score,
      outrage_fit: result.outrage_fit_score,
      meme_potential: result.meme_potential_score,
      debate_potential: result.debate_potential_score,
      urgency: result.urgency_score,
      shelf_life: result.shelf_life_score,
      visual_potential: result.visual_potential_score,
      reel_potential: result.reel_potential_score,
      instagram_shareability: result.instagram_shareability_score,
      brand_safety: result.brand_safety_score,
      top_formats: result.recommended_formats,
      summary: result.score_explanations.summary,
    }
  })
}

// ---------------------------------------------------------------------------
// Preset comparison — same cluster, different configs
// ---------------------------------------------------------------------------

export function runPresetComparison() {
  const input = CELEBRITY_SCANDAL
  return {
    cluster: input.cluster.title,
    default: scoreCluster(input, DEFAULT_SCORING_CONFIG),
    conservative: scoreCluster(input, CONSERVATIVE_SCORING_CONFIG),
    viral_maximiser: scoreCluster(input, VIRAL_MAXIMISER_CONFIG),
  }
}

// ---------------------------------------------------------------------------
// CLI runner (only executes when run directly with ts-node)
// ---------------------------------------------------------------------------

if (require.main === module) {
  console.log('\n=== OUTRAGE Trend Scoring Engine — Test Run ===\n')

  const results = runScoringExamples()

  for (const r of results) {
    console.log(`\n${r.name}`)
    console.log(`  Title:    ${r.title}`)
    console.log(`  Action:   ${r.action.toUpperCase()}`)
    console.log(`  Priority: ${r.priority}/100`)
    console.log(`  Scores:`)
    console.log(`    Virality:          ${r.virality}`)
    console.log(`    Outrage Fit:       ${r.outrage_fit}`)
    console.log(`    Meme Potential:    ${r.meme_potential}`)
    console.log(`    Debate Potential:  ${r.debate_potential}`)
    console.log(`    Urgency:           ${r.urgency}`)
    console.log(`    Shelf Life:        ${r.shelf_life}`)
    console.log(`    Visual Potential:  ${r.visual_potential}`)
    console.log(`    Reel Potential:    ${r.reel_potential}`)
    console.log(`    IG Shareability:   ${r.instagram_shareability}`)
    console.log(`    Brand Safety:      ${r.brand_safety}`)
    console.log(`  Top formats: ${r.top_formats.join(', ')}`)
    console.log(`  Summary: ${r.summary}`)
  }

  console.log('\n=== Preset Comparison (Celebrity Scandal) ===\n')
  const comparison = runPresetComparison()
  console.log(`  Default:         priority=${comparison.default.total_priority_score}  action=${comparison.default.recommended_action}`)
  console.log(`  Conservative:    priority=${comparison.conservative.total_priority_score}  action=${comparison.conservative.recommended_action}`)
  console.log(`  Viral Maximiser: priority=${comparison.viral_maximiser.total_priority_score}  action=${comparison.viral_maximiser.recommended_action}`)
}
