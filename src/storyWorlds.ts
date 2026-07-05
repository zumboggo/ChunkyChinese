/**
 * Story World / Story Source system for AI-generated bilingual stories.
 *
 * Each world supplies background context that makes generated stories feel
 * consistent and personal instead of generic. World context is injected into
 * the story prompt as *context only* — it must never override the learner-level
 * or output-format constraints built by aiStories.ts.
 */

export interface CharacterProfile {
  name: string
  role?: string
  traits: string[]
}

export interface StoryWorld {
  id: string
  title: string
  subtitle: string
  icon: string
  description: string
  systemContext: string
  characters?: CharacterProfile[]
  rules?: string[]
  suggestedThemes?: string[]
  spoilerPolicy?: string
}

export type GospelMode = 'retelling' | 'companion'

export interface StoryWorldSelection {
  worldId: string
  gospelMode: GospelMode
  lmsAllowSpoilers: boolean
}

export const DEFAULT_STORY_WORLD_SELECTION: StoryWorldSelection = {
  worldId: 'original',
  gospelMode: 'retelling',
  lmsAllowSpoilers: false,
}

// ── Editable family profile ──────────────────────────────────────────────────
// The family world data is user-editable; overrides live in localStorage so
// the profile is not permanently buried in code.

export interface FamilyProfile {
  setting: string
  characters: CharacterProfile[]
  rules: string[]
}

export const DEFAULT_FAMILY_PROFILE: FamilyProfile = {
  setting:
    'A warm, humorous family world involving everyday life, travel, moving between countries, learning Chinese, school, parks, camping, food, faith, friendship, and small adventures.',
  characters: [
    {
      name: 'David',
      role: 'Dad',
      traits: [
        'curious',
        'warm',
        'likes humour and imaginative stories',
        'English teacher',
        'learning Chinese',
        'enjoys helping people grow',
      ],
    },
    {
      name: 'Jetaime',
      role: 'Mom',
      traits: ['warm', 'practical', 'caring', 'resourceful', 'connected to Malaysian and Chinese culture'],
    },
    {
      name: 'Anna',
      role: 'Older daughter',
      traits: ['imaginative', 'likes stories and adventures', 'curious', 'often notices surprising details'],
    },
    {
      name: 'Sarah',
      role: 'Younger daughter',
      traits: ['energetic', 'playful', 'likes familiar characters and funny moments', 'young and expressive'],
    },
    {
      name: 'Leah',
      role: 'Youngest daughter',
      traits: ['very young', 'beloved little sister', 'often part of gentle family moments'],
    },
  ],
  rules: [
    'Keep stories affectionate, playful, and age-appropriate.',
    'Do not portray family members cruelly or mean-spiritedly.',
    'Allow gentle conflict, mistakes, surprises, and humorous misunderstandings.',
    'Use small, concrete details: snacks, parks, books, travel, Chinese learning, camping, school, neighbourhood adventures, and family teamwork.',
    'Give each family member agency rather than making everyone passive.',
  ],
}

const FAMILY_PROFILE_KEY = 'chunky-chinese:family-profile'
const WORLD_SELECTION_KEY = 'chunky-chinese:story-world'

export function loadFamilyProfile(): FamilyProfile {
  try {
    const raw = localStorage.getItem(FAMILY_PROFILE_KEY)
    if (!raw) return DEFAULT_FAMILY_PROFILE
    const parsed = JSON.parse(raw) as Partial<FamilyProfile>
    if (typeof parsed.setting !== 'string' || !Array.isArray(parsed.characters) || !Array.isArray(parsed.rules)) {
      return DEFAULT_FAMILY_PROFILE
    }
    return parsed as FamilyProfile
  } catch {
    return DEFAULT_FAMILY_PROFILE
  }
}

export function saveFamilyProfile(profile: FamilyProfile): void {
  localStorage.setItem(FAMILY_PROFILE_KEY, JSON.stringify(profile))
}

export function loadStoryWorldSelection(): StoryWorldSelection {
  try {
    const raw = localStorage.getItem(WORLD_SELECTION_KEY)
    if (!raw) return DEFAULT_STORY_WORLD_SELECTION
    const parsed = JSON.parse(raw) as Partial<StoryWorldSelection>
    return {
      worldId: STORY_WORLDS.some((w) => w.id === parsed.worldId)
        ? (parsed.worldId as string)
        : DEFAULT_STORY_WORLD_SELECTION.worldId,
      gospelMode: parsed.gospelMode === 'companion' ? 'companion' : 'retelling',
      lmsAllowSpoilers: parsed.lmsAllowSpoilers === true,
    }
  } catch {
    return DEFAULT_STORY_WORLD_SELECTION
  }
}

export function saveStoryWorldSelection(selection: StoryWorldSelection): void {
  localStorage.setItem(WORLD_SELECTION_KEY, JSON.stringify(selection))
}

// ── World definitions ─────────────────────────────────────────────────────────

export const STORY_WORLDS: StoryWorld[] = [
  {
    id: 'family',
    title: 'My Family',
    subtitle: 'Warm, funny, everyday adventures with our family',
    icon: '👨‍👩‍👧‍👧',
    description:
      'Stories about David, Jetaime, Anna, Sarah, and Leah: everyday life, travel, learning Chinese, parks, camping, food, faith, and small adventures. Edit the family details any time with "Edit World Details".',
    systemContext: '', // built dynamically from the editable family profile
  },
  {
    id: 'lms',
    title: 'Legendary Moonlight Sculptor',
    subtitle: 'Clever quests, grinding, sculpting, and unexpected victories',
    icon: '🗿',
    description:
      'Original side adventures in the virtual-reality MMORPG Royal Road, following the frugal and endlessly hardworking Weed. Spoiler-light by default: expect plausible side quests, crafting challenges, strange NPCs, and effort paying off.',
    systemContext: [
      'STORY WORLD: Legendary Moonlight Sculptor (inspired setting).',
      'Setting: a near-future world where people enter the immersive virtual-reality MMORPG Royal Road. The game contains quests, towns, kingdoms, monsters, classes, crafting, hidden skills, reputations, guilds, exploration, and opportunities for clever players to become legendary.',
      'Main character: Lee Hyun, game name "Weed" — resourceful, extremely hardworking, frugal, clever, often underestimated, cares deeply about family, willing to do tedious work others avoid, finds unusual solutions to difficult problems.',
      'Tone: funny, underdog progression, creative problem-solving, occasional absurdity, hard work paying off, unexpected kindness.',
      'Rules: Do not invent major canon events as though they are official. Prefer side quests, plausible game situations, training arcs, crafting challenges, village problems, strange NPCs, and humorous misunderstandings. Highlight cleverness, persistence, and unconventional effort over raw power. Avoid copying passages, dialogue, or prose from the original work.',
    ].join('\n'),
    spoilerPolicy:
      'Keep the story spoiler-light: generate original side adventures that fit the early atmosphere of the series. Do not reference late-series events, reveals, or character fates.',
  },
  {
    id: 'gospel-john',
    title: 'Gospel of John',
    subtitle: 'Faithful retellings and respectful imaginative companion stories',
    icon: '📖',
    description:
      'First-century Judea, Galilee, Samaria, and Jerusalem. Choose between faithful biblical retellings (with Scripture references) or clearly-labelled imaginative companion stories seen through the eyes of ordinary people nearby.',
    systemContext: [
      'STORY WORLD: The Gospel of John.',
      'Setting: first-century Judea, Galilee, Samaria, Jerusalem, villages, fishing communities, synagogues, homes, feast days, and journeys with Jesus and his disciples.',
      'Central focus: Jesus reveals the Father, brings life and light, performs signs, calls people to believe, serves his disciples, goes to the cross, rises again, and restores hope.',
      'Key characters: Jesus (compassionate, truthful, courageous, patient, reveals the Father, serves others, calls people to faith); Simon Peter (bold, impulsive, deeply devoted, sometimes confused, restored by Jesus); Andrew (curious, brings others to Jesus, observant); Philip (practical, asks sincere questions); Nathanael (honest, initially skeptical, open to recognizing Jesus); Thomas (honest about doubt, devoted, eventually makes a strong confession of faith); Mary of Bethany (devoted, reflective); Martha (practical, grieving yet faithful, speaks honestly with Jesus); Lazarus (friend of Jesus, central to a major sign); John the Baptist (witness to Jesus, humble).',
      'Major narrative moments include: the Word becomes flesh; John the Baptist points to Jesus; the first disciples; water turned into wine at Cana; Nicodemus; the Samaritan woman; healing and signs; feeding the five thousand; walking on water; healing the man born blind; raising Lazarus; entering Jerusalem; washing the disciples\' feet; the farewell teaching and prayer; the arrest, crucifixion, burial, and resurrection; Jesus restores Peter.',
      'Rules: Jesus must never be treated as a comic side character or distorted for a joke. Do not invent direct quotations from Jesus. Do not contradict the Gospel narrative. Use respectful, concrete storytelling rather than vague religious language.',
    ].join('\n'),
  },
  {
    id: 'original',
    title: 'New Original Story',
    subtitle: 'Generate a fresh world, characters, and premise',
    icon: '✨',
    description:
      'A completely fresh story. Give a prompt like "a cozy story about a tiny robot" — or leave it blank and the AI invents an age-appropriate, engaging premise built around a small conflict, reversal, or discovery.',
    systemContext: [
      'STORY WORLD: a brand-new original story.',
      'Create a fresh, self-contained premise with its own characters and small world.',
      'The story must be age-appropriate, humorous or emotionally engaging, clear enough for Chinese learners, and not derivative of a specific copyrighted franchise.',
      'Build it around a small conflict, reversal, or discovery, with a satisfying ending.',
    ].join('\n'),
  },
]

export function getStoryWorld(worldId: string): StoryWorld {
  return STORY_WORLDS.find((w) => w.id === worldId) ?? STORY_WORLDS[STORY_WORLDS.length - 1]
}

// ── Prompt construction ───────────────────────────────────────────────────────

const SAFETY_RULES = [
  'Use the selected story world only as context. Follow the learner-level and output-format constraints exactly.',
  'Do not claim that invented details are canon, historical fact, or Scripture.',
]

function buildFamilyContext(profile: FamilyProfile): string {
  const characterLines = profile.characters.map(
    (c) => `- ${c.name}${c.role ? ` (${c.role})` : ''}: ${c.traits.join(', ')}`,
  )
  return [
    'STORY WORLD: My Family.',
    `Setting: ${profile.setting}`,
    'Family members:',
    ...characterLines,
    'Rules: ' + profile.rules.join(' '),
    'Portray all family members respectfully and warmly. Avoid sensitive personal details that are not included in this family profile.',
  ].join('\n')
}

function buildGospelModeContext(mode: GospelMode): string {
  if (mode === 'retelling') {
    return [
      'MODE: Biblical retelling.',
      'Stay faithful to the Gospel of John. Do not invent events, teachings, miracles, or quotes for Jesus.',
      'Include a clear Scripture reference (for example "John 2:1-11") in the story title or first sentence.',
      'Use paraphrase rather than reproducing long Bible passages.',
      'Keep the tone reverent, clear, vivid, and suitable for language learning.',
    ].join('\n')
  }
  return [
    'MODE: Imaginative companion story.',
    'Clearly label the story as an imaginative companion story (in the title or opening sentence).',
    'It may explore plausible background perspectives: a child in Cana, a servant at a feast, a fisherman near Galilee, or someone hearing Jesus teach.',
    'Do not present invented material as Scripture. Do not contradict the Gospel\'s events or portray Jesus in a way that conflicts with the Gospel\'s character.',
  ].join('\n')
}

/**
 * Builds the world-context block that is appended to the story-generation
 * user message. Returns an empty string only if the world adds no context.
 * Never includes learner-level or format constraints — those stay in aiStories.
 */
export function buildStoryWorldContext(selection: StoryWorldSelection): string {
  const world = getStoryWorld(selection.worldId)
  const parts: string[] = []

  if (world.id === 'family') {
    parts.push(buildFamilyContext(loadFamilyProfile()))
  } else {
    parts.push(world.systemContext)
  }

  if (world.id === 'gospel-john') {
    parts.push(buildGospelModeContext(selection.gospelMode))
    parts.push('When retelling Scripture, include a reference. When inventing a companion story, visibly label it as imaginative.')
  }

  if (world.id === 'lms') {
    parts.push(
      selection.lmsAllowSpoilers
        ? 'The reader has enabled later-story references: you may reference later events from the series when useful, but still avoid inventing fake canon.'
        : world.spoilerPolicy ?? '',
    )
  }

  parts.push(SAFETY_RULES.join(' '))
  return parts.filter(Boolean).join('\n\n')
}
