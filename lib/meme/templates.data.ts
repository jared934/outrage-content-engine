import type { MemeTemplate, PartialTextLayer } from './meme.types'

// ---------------------------------------------------------------------------
// Default layer presets
// ---------------------------------------------------------------------------

const TOP_BOTTOM: PartialTextLayer[] = [
  {
    type: 'top', x: 50, y: 6,
    fontSize: 36, fontStyle: 'impact', color: '#FFFFFF',
    stroke: true, align: 'center', bold: false, uppercase: true, maxWidthPct: 90,
  },
  {
    type: 'bottom', x: 50, y: 88,
    fontSize: 36, fontStyle: 'impact', color: '#FFFFFF',
    stroke: true, align: 'center', bold: false, uppercase: true, maxWidthPct: 90,
  },
]

const HEADLINE_LAYER: PartialTextLayer[] = [
  {
    type: 'headline', x: 50, y: 82,
    fontSize: 42, fontStyle: 'bold', color: '#FFFFFF',
    stroke: false, align: 'center', bold: true, uppercase: false, maxWidthPct: 85,
  },
]

const QUOTE_LAYERS: PartialTextLayer[] = [
  {
    type: 'quote', x: 50, y: 38,
    fontSize: 38, fontStyle: 'normal', color: '#FFFFFF',
    stroke: false, align: 'center', bold: false, uppercase: false, maxWidthPct: 80,
  },
  {
    type: 'bottom', x: 50, y: 72,
    fontSize: 20, fontStyle: 'normal', color: '#AAAAAA',
    stroke: false, align: 'center', bold: false, uppercase: false, maxWidthPct: 60,
  },
]

// ---------------------------------------------------------------------------
// Template catalog
// ---------------------------------------------------------------------------

export const MEME_TEMPLATES: MemeTemplate[] = [
  {
    id: 'classic_impact',
    name: 'Classic Impact',
    previewStyle: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)',
    previewEmoji: '📢',
    aspectRatio: 1,
    layouts: ['standard'],
    defaultLayers: TOP_BOTTOM,
    tags: ['classic', 'universal', 'viral'],
  },
  {
    id: 'breaking_news',
    name: 'Breaking News',
    previewStyle: 'linear-gradient(135deg, #7f0000 0%, #cc0000 50%, #ff1a1a 100%)',
    previewEmoji: '🔴',
    aspectRatio: 16 / 9,
    layouts: ['headline'],
    defaultLayers: HEADLINE_LAYER,
    tags: ['news', 'urgent', 'headline'],
  },
  {
    id: 'quote_card',
    name: 'Quote Card',
    previewStyle: 'linear-gradient(135deg, #0a0a0a 0%, #1a1a1a 100%)',
    previewEmoji: '💬',
    aspectRatio: 1,
    layouts: ['quote_card'],
    defaultLayers: QUOTE_LAYERS,
    tags: ['quote', 'text', 'minimal'],
  },
  {
    id: 'reaction',
    name: 'Reaction',
    previewStyle: 'linear-gradient(135deg, #2d1b69 0%, #4a1d96 50%, #7c3aed 100%)',
    previewEmoji: '😂',
    aspectRatio: 1,
    layouts: ['reaction'],
    defaultLayers: TOP_BOTTOM,
    tags: ['reaction', 'funny', 'commentary'],
  },
  {
    id: 'side_by_side',
    name: 'Side by Side',
    previewStyle: 'linear-gradient(90deg, #1a1a2e 0%, #1a1a2e 50%, #0f3460 50%, #0f3460 100%)',
    previewEmoji: '⚔️',
    aspectRatio: 2,
    layouts: ['side_by_side'],
    defaultLayers: [
      {
        type: 'top', x: 50, y: 6,
        fontSize: 32, fontStyle: 'impact', color: '#FFFFFF',
        stroke: true, align: 'center', bold: false, uppercase: true, maxWidthPct: 90,
      },
    ],
    tags: ['comparison', 'versus', 'debate'],
  },
  {
    id: 'hot_take',
    name: 'Hot Take',
    previewStyle: 'linear-gradient(135deg, #7c2d12 0%, #c2410c 50%, #ea580c 100%)',
    previewEmoji: '🔥',
    aspectRatio: 1,
    layouts: ['standard'],
    defaultLayers: TOP_BOTTOM,
    tags: ['hot take', 'opinion', 'spicy'],
  },
  {
    id: 'galaxy_brain',
    name: 'Galaxy Brain',
    previewStyle: 'linear-gradient(135deg, #0c0032 0%, #190061 35%, #240090 60%, #3500d3 100%)',
    previewEmoji: '🧠',
    aspectRatio: 1,
    layouts: ['standard'],
    defaultLayers: TOP_BOTTOM,
    tags: ['galaxy brain', 'big think', 'irony'],
  },
  {
    id: 'stonks',
    name: 'Stonks',
    previewStyle: 'linear-gradient(135deg, #052e16 0%, #14532d 50%, #166534 100%)',
    previewEmoji: '📈',
    aspectRatio: 1,
    layouts: ['standard', 'headline'],
    defaultLayers: TOP_BOTTOM,
    tags: ['finance', 'trending', 'irony'],
  },
  {
    id: 'crying',
    name: 'Crying',
    previewStyle: 'linear-gradient(135deg, #172554 0%, #1e3a8a 50%, #1d4ed8 100%)',
    previewEmoji: '😭',
    aspectRatio: 1,
    layouts: ['standard'],
    defaultLayers: TOP_BOTTOM,
    tags: ['sad', 'relatable', 'crying'],
  },
  {
    id: 'this_is_fine',
    name: 'This is Fine',
    previewStyle: 'linear-gradient(135deg, #431407 0%, #7c2d12 50%, #ea580c 100%)',
    previewEmoji: '☕',
    aspectRatio: 1,
    layouts: ['standard'],
    defaultLayers: TOP_BOTTOM,
    tags: ['this is fine', 'chaos', 'relatable'],
  },
  {
    id: 'viral_text',
    name: 'Viral Text',
    previewStyle: 'linear-gradient(135deg, #450a0a 0%, #7f1d1d 50%, #dc2626 100%)',
    previewEmoji: '⚡',
    aspectRatio: 9 / 16,
    layouts: ['quote_card', 'headline'],
    defaultLayers: QUOTE_LAYERS,
    tags: ['story', 'viral', 'text-first'],
  },
  {
    id: 'announcement',
    name: 'Announcement',
    previewStyle: 'linear-gradient(135deg, #0c111d 0%, #1c1917 50%, #292524 100%)',
    previewEmoji: '📣',
    aspectRatio: 16 / 9,
    layouts: ['headline'],
    defaultLayers: HEADLINE_LAYER,
    tags: ['announcement', 'news', 'wide'],
  },
]

export const TEMPLATE_MAP: Record<string, MemeTemplate> = Object.fromEntries(
  MEME_TEMPLATES.map((t) => [t.id, t])
)

export function getDefaultTemplate(): MemeTemplate {
  return MEME_TEMPLATES[0]
}
