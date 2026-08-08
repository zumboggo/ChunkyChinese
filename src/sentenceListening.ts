import type { AudioClip } from './types'
import type { SessionAudioStep } from './renderAudio'

export const LMS_SENTENCE_AUDIO_PACK_ID = 'lms-sentence-audio'

/** Rendering at 22050 Hz halves session WAV size with no audible loss for speech. */
export const SENTENCE_SESSION_SAMPLE_RATE = 22050

/**
 * A selectable set of sentences. Pools that share a `seedPath` also share their
 * audio files and clip ids — a topic pool is just a filtered view of the same
 * seed, so switching between "everything" and one situation reuses the clips.
 */
export interface SentencePool {
  id: string
  name: string
  description: string
  /** Seed JSON to fetch, relative to the app base URL. */
  seedPath: string
  /** Public directory holding `<key>.mp3` and `<key>-en.mp3`. */
  audioDir: string
  /** Prefix for the IndexedDB clip ids of this pool's audio. */
  clipPrefix: string
  /** Audio pack id recorded on saved clips. */
  packId: string
  /** When set, only seed entries with this `topic` belong to the pool. */
  topic?: string
}

export const LMS_SENTENCE_POOL: SentencePool = {
  id: 'lms-1000',
  name: 'LMS 1000',
  description: 'The original 1,300-sentence vocabulary course.',
  seedPath: 'seed/lms-sentences.json',
  audioDir: 'seed/sentence-audio',
  clipPrefix: 'lms-sentence',
  packId: LMS_SENTENCE_AUDIO_PACK_ID,
}

export const CHINA_LIFE_SENTENCE_AUDIO_PACK_ID = 'china-life-sentence-audio'

const CHINA_LIFE_BASE = {
  seedPath: 'seed/china-life-sentences.json',
  audioDir: 'seed/china-life-audio',
  clipPrefix: 'china-life-sentence',
  packId: CHINA_LIFE_SENTENCE_AUDIO_PACK_ID,
} as const

/** Order matters: this is the order the collection picker renders. */
export const SENTENCE_POOLS: SentencePool[] = [
  {
    ...CHINA_LIFE_BASE,
    id: 'china-life',
    name: 'Life in China — everything',
    description: 'All 201 situational sentences, in topic order.',
  },
  {
    ...CHINA_LIFE_BASE,
    id: 'china-delivery-call',
    name: 'Package delivery calls',
    description: "What the courier says when they phone you — and how to answer.",
    topic: 'delivery-call',
  },
  {
    ...CHINA_LIFE_BASE,
    id: 'china-delivery-pickup',
    name: 'Picking up & sending parcels',
    description: 'Pickup stations, lockers, codes, returns.',
    topic: 'delivery-pickup',
  },
  {
    ...CHINA_LIFE_BASE,
    id: 'china-taxi',
    name: 'Taxis & getting around',
    description: 'Ride-hailing, directions, the subway, missed stops.',
    topic: 'taxi',
  },
  {
    ...CHINA_LIFE_BASE,
    id: 'china-school',
    name: 'School & teaching',
    description: 'Running a classroom, the staff room, parents, exams.',
    topic: 'school',
  },
  {
    ...CHINA_LIFE_BASE,
    id: 'china-shopping',
    name: 'Taobao, JD & Meituan',
    description: 'The words on the checkout, tracking and food-delivery screens.',
    topic: 'shopping-app',
  },
  {
    ...CHINA_LIFE_BASE,
    id: 'china-essentials',
    name: 'Everyday essentials',
    description: 'Phrasebook core: asking, apologising, paying, getting help.',
    topic: 'essentials',
  },
  LMS_SENTENCE_POOL,
]

export function getSentencePool(poolId: string | undefined): SentencePool {
  return SENTENCE_POOLS.find((pool) => pool.id === poolId) ?? LMS_SENTENCE_POOL
}

/** Narrows a loaded seed file to the entries that belong to a topic pool. */
export function filterPoolSentences<T extends { topic?: string }>(
  seed: T[],
  pool: SentencePool,
): T[] {
  if (!pool.topic) return seed
  return seed.filter((sentence) => sentence.topic === pool.topic)
}

export interface SentenceListeningSettings {
  /** Which collection the set is drawn from. Defaults to the LMS 1000 pool. */
  sentencePoolId?: string
  /** How many times the Chinese sentence plays per rep (1-5). */
  sentenceRepeats: number
  /** Play the English translation before the Chinese. */
  sentenceIncludeEnglish: boolean
  /** Shadowing pause after each Chinese play, as a multiple of the clip duration. 0 disables. */
  sentencePauseFactor: number
  /** Sentences per set. */
  sentenceSessionSize: number
  /** How many rounds each set is repeated. */
  sentenceRounds: number
  /** Shuffle sentence order within each round (Glossika default is fixed order). */
  sentenceShuffle: boolean
}

export function sentenceClipId(
  word: string,
  lang: 'zh' | 'en',
  pool: SentencePool = LMS_SENTENCE_POOL,
): string {
  return lang === 'zh'
    ? `${pool.clipPrefix}-${word}`
    : `${pool.clipPrefix}-${word}-en`
}

export function sentenceSeedAudioUrl(
  word: string,
  lang: 'zh' | 'en',
  pool: SentencePool = LMS_SENTENCE_POOL,
): string {
  const filename = lang === 'zh' ? `${word}.mp3` : `${word}-en.mp3`
  return `${pool.audioDir}/${encodeURIComponent(filename)}`
}

export interface SentenceClipDeps {
  getAudioClip: (id: string) => Promise<AudioClip | undefined>
  saveAudioClip: (clip: AudioClip) => Promise<unknown>
  fetchFn?: typeof fetch
}

/**
 * Returns the cached IndexedDB clip for a sentence, fetching the pre-generated
 * seed MP3 on first use so later sessions work offline. No TTS fallback:
 * returns undefined when no real audio exists.
 */
export async function ensureSentenceClip(
  word: string,
  lang: 'zh' | 'en',
  text: string,
  deps: SentenceClipDeps,
  pool: SentencePool = LMS_SENTENCE_POOL,
): Promise<AudioClip | undefined> {
  const id = sentenceClipId(word, lang, pool)
  const cached = await deps.getAudioClip(id)
  if (cached) return cached

  const fetchFn = deps.fetchFn ?? fetch
  let blob: Blob
  try {
    const response = await fetchFn(sentenceSeedAudioUrl(word, lang, pool))
    if (!response.ok) return undefined
    blob = await response.blob()
  } catch {
    return undefined
  }
  if (blob.size === 0) return undefined

  const clip: AudioClip = {
    id,
    type: lang === 'zh' ? 'sentence' : 'sentenceMeaning',
    label: text,
    filename: lang === 'zh' ? `${word}.mp3` : `${word}-en.mp3`,
    blob,
    text,
    language: lang === 'zh' ? 'zh-CN' : 'en-US',
    provider: 'google-tts-seed',
    packId: pool.packId,
    createdAt: new Date().toISOString(),
  }
  await deps.saveAudioClip(clip)
  return clip
}

export interface SessionSentence {
  word: string
  chinese: string
  english: string
}

/**
 * Builds the Glossika-style step list for a whole session:
 * for each round, for each sentence — [English] → pause → Chinese →
 * shadowing pause → Chinese ×(repeats-1) → gap.
 * Pure function so ordering/pause structure is unit-testable.
 */
export function buildSentenceSessionSteps(
  sentences: SessionSentence[],
  settings: SentenceListeningSettings,
  random: () => number = Math.random,
): SessionAudioStep[] {
  const steps: SessionAudioStep[] = []
  const pool = getSentencePool(settings.sentencePoolId)
  const repeats = Math.max(1, Math.round(settings.sentenceRepeats))
  const rounds = Math.max(1, Math.round(settings.sentenceRounds))
  const pauseFactor = Math.max(0, settings.sentencePauseFactor)

  for (let round = 0; round < rounds; round += 1) {
    const order = sentences.map((_, index) => index)
    if (settings.sentenceShuffle) {
      for (let i = order.length - 1; i > 0; i -= 1) {
        const j = Math.floor(random() * (i + 1));
        [order[i], order[j]] = [order[j], order[i]]
      }
    }

    for (const sentenceIndex of order) {
      const sentence = sentences[sentenceIndex]
      const base = { sentenceIndex, round }

      if (settings.sentenceIncludeEnglish) {
        steps.push({
          ...base,
          kind: 'clip',
          clipId: sentenceClipId(sentence.word, 'en', pool),
          label: sentence.english,
        })
        steps.push({ ...base, kind: 'pause', seconds: 1.0, label: 'Recall pause' })
      }

      for (let repeat = 0; repeat < repeats; repeat += 1) {
        steps.push({
          ...base,
          kind: 'clip',
          clipId: sentenceClipId(sentence.word, 'zh', pool),
          label: sentence.chinese,
        })
        if (pauseFactor > 0) {
          steps.push({
            ...base,
            kind: 'pause',
            factorOfPrevious: pauseFactor,
            label: 'Shadowing pause',
          })
        }
      }

      steps.push({ ...base, kind: 'pause', seconds: 0.8, label: 'Sentence gap' })
    }
  }

  return steps
}

/** Picks the next set of sentences sequentially from the pool, wrapping around. */
export function selectSequentialSentences(
  pool: SessionSentence[],
  count: number,
  offset: number,
): SessionSentence[] {
  if (pool.length === 0) return []
  const size = Math.min(Math.max(1, count), pool.length)
  const start = ((offset % pool.length) + pool.length) % pool.length
  const selected: SessionSentence[] = []
  for (let i = 0; i < size; i += 1) {
    selected.push(pool[(start + i) % pool.length])
  }
  return selected
}
