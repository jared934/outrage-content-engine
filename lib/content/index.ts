// =============================================================================
// OUTRAGE AI Content Suggestion Engine — Public API
// =============================================================================

// Orchestrator (main entry points)
export { generatePack, regenFormat, getPacksForCluster, getIdeasForPack, MIN_SCORE_TO_GENERATE } from './content-pack.service'

// Generator (direct OpenAI calls — use via orchestrator in most cases)
export { generateContentPack, regenerateFormat, checkDailyLimit, estimateCost, CONTENT_MODELS } from './content-generator.service'

// Validator
export { parseContentPack, parseFormatRegen, extractPrimaryContent, extractHook, extractCta, ContentPackSchema } from './output-validator'

// Prompts
export { getSystemPrompt, SYSTEM_PROMPTS } from './prompts/outrage-system.prompt'
export { buildContentPackPrompt, CONTENT_PACK_PROMPT_VERSION } from './prompts/content-pack.prompt'
export { buildVariantRegenPrompt, VARIANT_REGEN_PROMPT_VERSION } from './prompts/variant-regen.prompt'

// Sample outputs
export { SAMPLE_OUTPUTS, CELEBRITY_SCANDAL_MAINSTREAM, GENERATIONAL_DEBATE_DEADPAN, FASHION_MOMENT_SAVAGE } from './sample-outputs'

// Types
export type {
  OutputStyle,
  ContentFormatSlug,
  ContentPackOutput,
  GenerateContentPackRequest,
  RegenerateFormatRequest,
  ContentPackResult,
  GeneratedIdea,
  ClusterContext,
  TokenUsage,
  BreakingAlert,
  MemeConcept,
  CarouselConcept,
  ReelConcept,
  StoryPoll,
  CaptionOptions,
  ControversialTake,
  CommentBaitCta,
  VisualDirection,
  StyledVariant,
  SavageVariant,
} from './content.types'

export { FORMAT_META } from './content.types'
