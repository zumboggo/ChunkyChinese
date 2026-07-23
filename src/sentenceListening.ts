import type { AudioClip } from './types'
import type { SessionAudioStep } from './renderAudio'

export const LMS_SENTENCE_AUDIO_PACK_ID = 'lms-sentence-audio'

/** Rendering at 22050 Hz halves session WAV size with no audible loss for speech. */
export const SENTENCE_SESSION_SAMPLE_RATE = 22050

export interface SentenceListeningSettings {
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

export function sentenceClipId(word: string, lang: 'zh' | 'en'): string {
  return lang === 'zh' ? `lms-sentence-${word}` : `lms-sentence-${word}-en`
}

export function sentenceSeedAudioUrl(word: string, lang: 'zh' | 'en'): string {
  const filename = lang === 'zh' ? `${word}.mp3` : `${word}-en.mp3`
  return `seed/sentence-audio/${encodeURIComponent(filename)}`
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
): Promise<AudioClip | undefined> {
  const id = sentenceClipId(word, lang)
  const cached = await deps.getAudioClip(id)
  if (cached) return cached

  const fetchFn = deps.fetchFn ?? fetch
  let blob: Blob
  try {
    const response = await fetchFn(sentenceSeedAudioUrl(word, lang))
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
    packId: LMS_SENTENCE_AUDIO_PACK_ID,
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
          clipId: sentenceClipId(sentence.word, 'en'),
          label: sentence.english,
        })
        steps.push({ ...base, kind: 'pause', seconds: 1.0, label: 'Recall pause' })
      }

      for (let repeat = 0; repeat < repeats; repeat += 1) {
        steps.push({
          ...base,
          kind: 'clip',
          clipId: sentenceClipId(sentence.word, 'zh'),
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
