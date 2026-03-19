// =============================================================================
// OUTRAGE Content Engine — Sample Outputs
//
// Pre-written content packs for 3 seeded trend scenarios.
// Used for UI demos, testing, and onboarding.
//
// These show exactly what the engine produces — real quality bar examples
// that a content manager would actually use.
// =============================================================================

import type { ContentPackOutput, OutputStyle } from './content.types'

// ---------------------------------------------------------------------------
// SAMPLE 1: Celebrity Cheating Scandal (mainstream style)
// ---------------------------------------------------------------------------

export const CELEBRITY_SCANDAL_MAINSTREAM: ContentPackOutput = {
  breaking_alert: {
    headline: 'Receipts just dropped. And they are not kind.',
    subtext: 'A major pop star is at the centre of a cheating scandal after leaked texts went viral overnight. Their team has not responded. The internet has.',
    urgency_level: 'breaking',
    hashtags: ['#drama', '#exposed', '#trending', '#tea'],
  },
  meme_concept: {
    template_description: 'The "this is fine" dog sitting in a burning room meme format',
    top_text: 'The PR team right now:',
    bottom_text: 'This is fine.',
    visual_vibe: 'Chaos energy — cartoon calm in the middle of total disaster',
    why_it_works: 'Everyone has seen a celebrity crisis handled badly. This format makes it instantly relatable without saying anything directly.',
  },
  carousel_concept: {
    hook_slide: 'The internet found out before the PR team did 👀',
    slides: [
      'Here\'s everything that\'s happened in the last 12 hours 🧵',
      'The texts. The photos. The timeline. All of it.',
      'Their team\'s response so far: nothing. Radio silence.',
      'And Twitter? Twitter is not waiting.',
    ],
    final_slide_cta: 'Save this — it\'s only getting messier. 🍿',
  },
  reel_concept: {
    hook: 'POV: you open Twitter at 2am and see THIS',
    script_beats: [
      'Screen flashes to notification feed — chaos visible',
      'Quick-cut through the leaked content (blurred/screenshot style)',
      'Cut to: "their team\'s statement" — blank white screen, crickets sound',
      'End on your reaction face: slow turn to camera',
    ],
    cta: 'Comment "👀" if you already knew this was coming.',
    audio_vibe: 'Slow dramatic build — the kind of track used in documentary reveals',
    suggested_duration_seconds: 28,
  },
  story_poll: {
    question: 'Did you see this coming?',
    option_a: '100% saw it',
    option_b: 'Actually shocked',
    context_sticker: 'Be honest 👇',
  },
  hot_take: 'The silence from their team is doing more damage than the receipts.',
  controversial_take: {
    take: 'At this point, if you\'re still surprised by celebrity cheating scandals, that\'s on you. We built these people into untouchable icons and then act shocked when they\'re human.',
    risk_level: 'medium',
  },
  caption_options: {
    short: 'The internet does not miss. 🔍',
    medium: 'Receipts don\'t lie. The silence speaks volumes. And Twitter is not moving on. #drama #exposed',
    long: 'We\'ve seen a lot of celebrity scandals. But the silence on this one is deafening. No statement. No denial. No PR-crafted response. Just... nothing. And the longer they wait, the worse it gets. Drop your reaction below 👇 #drama #exposed #trending #celebrity',
  },
  comment_bait_cta: {
    primary: 'One word. That\'s all we need from you. Drop it below. 👇',
    alternative: 'Tag someone who needs to see this right now.',
  },
  visual_direction: {
    aesthetic: 'Dark, high-contrast editorial — leaked document / screenshot energy',
    color_mood: 'Black background, white text, red accent for key words',
    composition: 'Centre-weighted text block with small inset "evidence" visual blurred at edges',
    text_overlay_suggestion: '"The receipts don\'t lie."',
    reference_vibes: ['NYT breaking news format', 'True crime documentary title card'],
  },
  safer_version: {
    content: 'A reminder that the internet never forgets — and neither do we. Developing story below.',
    format_type: 'caption',
  },
  sharper_version: {
    content: 'They\'re not denying it. They\'re not even trying. That tells you everything.',
    format_type: 'hook',
  },
  savage_version: {
    content: 'The PR team really said "maybe if we say nothing it\'ll go away" in 2024. Adorable.',
    format_type: 'post_copy',
    content_warning: 'Mocking the crisis management strategy directly — some may read as punching at the team.',
  },
}

// ---------------------------------------------------------------------------
// SAMPLE 2: Gen Z vs Millennials Debate (deadpan style)
// ---------------------------------------------------------------------------

export const GENERATIONAL_DEBATE_DEADPAN: ContentPackOutput = {
  breaking_alert: {
    headline: 'Generational conflict enters its 47th recorded year.',
    subtext: 'A TikTok video this week has reignited the debate over which generation is more insufferable. Both sides claim victory. Neither has housing.',
    urgency_level: 'developing',
    hashtags: ['#genz', '#millennials', '#debatenight'],
  },
  meme_concept: {
    template_description: 'Two buttons meme — person sweating trying to decide which to press',
    top_text: 'Me trying to decide which generation to be mad at today:',
    bottom_text: '"Both" *sweating intensifies*',
    visual_vibe: 'Maximum indecision energy — classic two-buttons format, no variation',
    why_it_works: 'Positions OUTRAGE above the debate while still being in it — relatable to everyone.',
  },
  carousel_concept: {
    hook_slide: 'The debate nobody asked for. Again. 📊',
    slides: [
      'Gen Z: "Millennials ruined everything and are cringe about it."',
      'Millennials: "At least we didn\'t eat Tide Pods."',
      'Gen Z: "At least we\'re not still talking about Friends."',
      'The actual winner of this debate: no one. Housing is unaffordable for both.',
    ],
    final_slide_cta: 'Pick a side below. Or don\'t. Both outcomes are equally meaningless.',
  },
  reel_concept: {
    hook: 'Breaking: the generational war has entered its second decade. Experts are baffled.',
    script_beats: [
      'Serious news-anchor delivery: "Sources indicate neither side is winning."',
      'Cut to: statistics about rent prices for both generations (grim)',
      'Back to anchor: "Both parties are reportedly doing this on their phones while complaining about the other."',
      'End card: "Coverage continues until further notice or the heat death of the universe."',
    ],
    cta: 'Which side are you on. Comment below. We are not mediating.',
    audio_vibe: 'Serious news broadcast music — completely inappropriate for the content',
    suggested_duration_seconds: 35,
  },
  story_poll: {
    question: 'Which generation wins the argument?',
    option_a: 'Gen Z (correct)',
    option_b: 'Millennials (wrong)',
    context_sticker: 'Very scientific 📊',
  },
  hot_take: 'The generation war is just capitalism making sure we fight each other instead of it.',
  controversial_take: {
    take: 'Both generations are deeply annoying in completely different ways and the correct response is to log off and touch grass. This has been the take. Thank you.',
    risk_level: 'low',
  },
  caption_options: {
    short: 'Nobody wins. As usual.',
    medium: 'Gen Z vs Millennials, week 2,341. The discourse continues. Nobody is changing their mind.',
    long: 'Every six months a new video reignites the generational war and every time, both sides leave more convinced than before. The only thing both generations have in common: rent. 📊 Drop your allegiance below. This is a judgement-free zone. (It is not.)',
  },
  comment_bait_cta: {
    primary: 'Gen Z or Millennial. One word. No explanation. Go.',
    alternative: 'Tell us which generation has the worse takes. Be specific.',
  },
  visual_direction: {
    aesthetic: 'Sterile infographic energy — like a 2013 Buzzfeed article about generations, unironic',
    color_mood: 'Washed-out blues and pinks, slightly too saturated',
    composition: 'Split screen — two identical-looking people staring at their phones on each side',
    text_overlay_suggestion: '"Day 3,847 of the generational conflict"',
    reference_vibes: ['PBS NewsHour lower-third graphic', '2011 Tumblr text post aesthetic'],
  },
  safer_version: {
    content: 'Both generations are doing their best. That doesn\'t mean the debate isn\'t entertaining.',
    format_type: 'caption',
  },
  sharper_version: {
    content: 'Two generations arguing on the internet while housing gets more unaffordable by the hour. Very normal.',
    format_type: 'hook',
  },
  savage_version: {
    content: 'Reminder that the people financing this debate are the ones neither generation can afford to buy a house from. Anyway, which side are you on.',
    format_type: 'post_copy',
    content_warning: 'Structural critique that redirects the generational blame — some may find it too political.',
  },
}

// ---------------------------------------------------------------------------
// SAMPLE 3: Fashion Viral Moment (savage style)
// ---------------------------------------------------------------------------

export const FASHION_MOMENT_SAVAGE: ContentPackOutput = {
  breaking_alert: {
    headline: 'She wore it. Everyone else can go home.',
    subtext: 'Rihanna arrived at the Met Gala in a custom Valentino that has single-handedly rendered every other look irrelevant. We are not accepting debate on this.',
    urgency_level: 'just_in',
    hashtags: ['#MetGala', '#Rihanna', '#fashion', '#serving'],
  },
  meme_concept: {
    template_description: 'Kermit sipping tea — the "none of my business" format, but applied to every other celebrity at the event',
    top_text: 'Other celebrities seeing Rihanna arrive:',
    bottom_text: '*quietly walks back to the limo*',
    visual_vibe: 'Peak unbothered energy — the meme format implies polite erasure',
    why_it_works: 'Validates the audience\'s feeling that the look is untouchable without being mean to other attendees directly.',
  },
  carousel_concept: {
    hook_slide: 'The look that ended the evening before it started 📸',
    slides: [
      'Custom Valentino. Every single detail intentional.',
      'The construction alone took 6 months.',
      'She didn\'t just wear fashion. She made everyone else question why they came.',
      'This is what "dressing for the moment" actually means.',
    ],
    final_slide_cta: 'Save this for every time someone says fashion is shallow. 🔖',
  },
  reel_concept: {
    hook: 'The moment every other stylist\'s phone went on silent.',
    script_beats: [
      'Slow pan reveal of the full look — dramatic music builds',
      'Quick cut: reaction shots from the crowd',
      'Pull back: full carpet view, everyone else slightly out of focus',
      'Text appears: "She understood the assignment. She wrote the assignment."',
    ],
    cta: 'Drop a 🔥 if this is already your screensaver.',
    audio_vibe: 'Something cinematic and dramatic — orchestral swell or a slowed-down banger',
    suggested_duration_seconds: 22,
  },
  story_poll: {
    question: 'Best Met Gala look of all time?',
    option_a: 'This one, obviously',
    option_b: 'There\'s competition?',
    context_sticker: 'Not a close race 👑',
  },
  hot_take: 'Anyone arguing this isn\'t the best look of the night is wrong and they know it.',
  controversial_take: {
    take: 'Fashion week exists so that twice a year, one person reminds everyone else what it\'s actually supposed to look like. Tonight, that person was Rihanna. Go home.',
    risk_level: 'low',
  },
  caption_options: {
    short: 'The look. The moment. The legend. 👑',
    medium: 'Not every Met Gala look becomes a cultural moment. This one did before she even hit the carpet. 🔥 #MetGala #Rihanna',
    long: 'This is what they mean when they say "dressing for the moment." Not the trend. Not the safe choice. The MOMENT. Custom Valentino. Six months in construction. One night to cement it in the history books. 👑 Tell us your reaction when you first saw it. 🔥 #MetGala #Rihanna #fashion #iconic',
  },
  comment_bait_cta: {
    primary: 'Rate the look. One number. No explanation needed.',
    alternative: 'Name a look that comes close. We\'ll wait.',
  },
  visual_direction: {
    aesthetic: 'High-fashion editorial — clean, reverent, almost art-gallery presentation',
    color_mood: 'The palette of the look itself: let the garment own the frame',
    composition: 'Single full-length shot, minimal text, maximum breathing room',
    text_overlay_suggestion: '"The assignment was understood."',
    reference_vibes: ['Vogue cover framing', 'Museum exhibition photograph'],
  },
  safer_version: {
    content: 'This is what it looks like when fashion and a cultural moment align perfectly. Historic night.',
    format_type: 'caption',
  },
  sharper_version: {
    content: 'Everyone else should have called in sick. Respectfully.',
    format_type: 'hook',
  },
  savage_version: {
    content: 'Other stylists watching this happen: congratulations on making it this far in the competition.',
    format_type: 'post_copy',
    content_warning: null,
  },
}

// ---------------------------------------------------------------------------
// Export map — used by the seed script
// ---------------------------------------------------------------------------

export const SAMPLE_OUTPUTS: Record<string, { style: OutputStyle; pack: ContentPackOutput }> = {
  celebrity_scandal_mainstream: {
    style: 'mainstream',
    pack: CELEBRITY_SCANDAL_MAINSTREAM,
  },
  generational_debate_deadpan: {
    style: 'deadpan',
    pack: GENERATIONAL_DEBATE_DEADPAN,
  },
  fashion_moment_savage: {
    style: 'savage',
    pack: FASHION_MOMENT_SAVAGE,
  },
}
