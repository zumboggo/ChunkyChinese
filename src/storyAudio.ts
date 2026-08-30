import type { ReaderStory } from './types'
import { saveAudioClip, saveWordMeaningAudio } from './db'
import type { VocabWord } from './types'
import { GENERATED_STORIES_PACK_ID } from './generatedStories'

export const AZURE_VOICES = [
  { id: 'zh-CN-XiaoxiaoNeural', label: 'Xiaoxiao (female, warm)' },
  { id: 'zh-CN-YunxiNeural', label: 'Yunxi (male, lively)' },
  { id: 'zh-CN-XiaoyiNeural', label: 'Xiaoyi (female, gentle)' },
  { id: 'zh-CN-YunyangNeural', label: 'Yunyang (male, narrator)' },
]

export interface StoryAudioSettings {
  azureSpeechKey: string
  azureSpeechRegion: string
  azureVoice: string
}

export interface StoryAudioResult {
  succeeded: number
  failed: number
  firstError?: string
}

function escapeSsml(text: string): string {
  return text
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&apos;')
}

export function buildMeditationSsml(phrases: string[], voice: string): string {
  const body = phrases
    .map((phrase) => `<prosody rate="-18%">${escapeSsml(phrase)}</prosody>`)
    .join('<break time="420ms"/>')
  return `<speak version="1.0" xml:lang="zh-CN"><voice name="${escapeSsml(voice)}">${body}</voice></speak>`
}

export async function synthesizeMeditationAudio(
  phrases: string[],
  settings: StoryAudioSettings,
): Promise<Blob> {
  const sdk = await import('microsoft-cognitiveservices-speech-sdk')
  const config = sdk.SpeechConfig.fromSubscription(settings.azureSpeechKey, settings.azureSpeechRegion)
  config.speechSynthesisOutputFormat = sdk.SpeechSynthesisOutputFormat.Audio16Khz32KBitRateMonoMp3
  const synthesizer = new sdk.SpeechSynthesizer(config, null as never)
  try {
    const result = await new Promise<import('microsoft-cognitiveservices-speech-sdk').SpeechSynthesisResult>(
      (resolve, reject) => synthesizer.speakSsmlAsync(
        buildMeditationSsml(phrases, settings.azureVoice),
        resolve,
        reject,
      ),
    )
    if (result.reason !== sdk.ResultReason.SynthesizingAudioCompleted || !result.audioData?.byteLength) {
      const details = result.reason === sdk.ResultReason.Canceled
        ? sdk.CancellationDetails.fromResult(result).errorDetails
        : `Synthesis returned reason ${result.reason}`
      throw new Error(details || 'Azure did not return meditation audio.')
    }
    return new Blob([result.audioData], { type: 'audio/mpeg' })
  } finally {
    synthesizer.close()
  }
}

export async function ensureEnglishMeaningAudio(
  words: VocabWord[],
  settings: StoryAudioSettings,
): Promise<VocabWord[]> {
  if (!settings.azureSpeechKey || !settings.azureSpeechRegion) return words
  const missing = words.filter((word) => !word.audioMeaningId)
  if (missing.length === 0) return words
  const sdk = await import('microsoft-cognitiveservices-speech-sdk')
  const config = sdk.SpeechConfig.fromSubscription(settings.azureSpeechKey, settings.azureSpeechRegion)
  config.speechSynthesisVoiceName = 'en-US-JennyNeural'
  config.speechSynthesisOutputFormat = sdk.SpeechSynthesisOutputFormat.Audio16Khz32KBitRateMonoMp3
  const synthesizer = new sdk.SpeechSynthesizer(config, null as never)
  const generated = new Map<string, string>()
  try {
    for (const word of missing) {
      try {
        const stablePart = await stableTextId(`${word.id}:${word.meaning}`)
        const clipId = `meaning-azure:${stablePart}`
        const result = await new Promise<import('microsoft-cognitiveservices-speech-sdk').SpeechSynthesisResult>(
          (resolve, reject) => synthesizer.speakTextAsync(word.meaning, resolve, reject),
        )
        if (result.reason !== sdk.ResultReason.SynthesizingAudioCompleted || !result.audioData?.byteLength) continue
        await saveWordMeaningAudio(word.id, {
          id: clipId,
          type: 'meaning',
          label: word.meaning,
          filename: `generated/${stablePart}.mp3`,
          blob: new Blob([result.audioData], { type: 'audio/mpeg' }),
          linkedWordIds: [word.id],
          text: word.meaning,
          language: 'en-US',
          provider: 'azure-speech',
          voice: 'en-US-JennyNeural',
          createdAt: new Date().toISOString(),
        })
        generated.set(word.id, clipId)
      } catch {
        // Keep the lesson usable; the UI can fall back to device speech.
      }
    }
  } finally {
    synthesizer.close()
  }
  return words.map((word) => generated.has(word.id) ? { ...word, audioMeaningId: generated.get(word.id) } : word)
}

async function stableTextId(value: string): Promise<string> {
  const bytes = new TextEncoder().encode(value)
  const digest = await crypto.subtle.digest('SHA-256', bytes)
  return Array.from(new Uint8Array(digest)).slice(0, 12).map((byte) => byte.toString(16).padStart(2, '0')).join('')
}

/**
 * Synthesizes MP3 narration for every sentence of a generated story via Azure
 * Speech and stores each clip under the sentence's audioClipId, which the
 * reader's listening controller already looks up (replacing browser TTS).
 * Best-effort: per-sentence failures are counted, never thrown.
 */
export async function synthesizeStoryAudio(
  story: ReaderStory,
  settings: StoryAudioSettings,
  onProgress?: (done: number, total: number) => void,
): Promise<StoryAudioResult> {
  // The SDK is ~1 MB; dynamic import keeps it out of the main bundle.
  const sdk = await import('microsoft-cognitiveservices-speech-sdk')
  const config = sdk.SpeechConfig.fromSubscription(
    settings.azureSpeechKey,
    settings.azureSpeechRegion,
  )
  config.speechSynthesisVoiceName = settings.azureVoice
  config.speechSynthesisOutputFormat = sdk.SpeechSynthesisOutputFormat.Audio16Khz32KBitRateMonoMp3

  // null audio config: results arrive as ArrayBuffers without speaker playback
  const synthesizer = new sdk.SpeechSynthesizer(config, null as never)
  const total = story.sentences.length
  let succeeded = 0
  let failed = 0
  let firstError: string | undefined

  try {
    for (const [index, sentence] of story.sentences.entries()) {
      try {
        const result = await new Promise<import('microsoft-cognitiveservices-speech-sdk').SpeechSynthesisResult>(
          (resolve, reject) => synthesizer.speakTextAsync(sentence.chinese, resolve, reject),
        )
        if (result.reason === sdk.ResultReason.SynthesizingAudioCompleted && result.audioData?.byteLength) {
          await saveAudioClip({
            id: sentence.audioClipId,
            type: 'sentence',
            label: sentence.chinese,
            filename: '',
            blob: new Blob([result.audioData], { type: 'audio/mpeg' }),
            text: sentence.chinese,
            language: 'zh-CN',
            provider: 'azure-speech',
            voice: settings.azureVoice,
            packId: GENERATED_STORIES_PACK_ID,
            createdAt: new Date().toISOString(),
          })
          succeeded += 1
        } else {
          failed += 1
          const details = result.reason === sdk.ResultReason.Canceled
            ? sdk.CancellationDetails.fromResult(result).errorDetails
            : `Synthesis returned reason ${result.reason}`
          if (!firstError) firstError = details
          // Bad key/region fails on every sentence identically — stop early.
          if (/401|403|denied|authentication|subscription/i.test(details ?? '')) {
            firstError = 'Azure rejected the Speech key or region. Check Settings > AI Story Generation.'
            failed += total - index - 1
            break
          }
        }
      } catch (error) {
        failed += 1
        if (!firstError) firstError = error instanceof Error ? error.message : String(error)
      }
      onProgress?.(index + 1, total)
    }
  } finally {
    synthesizer.close()
  }

  return { succeeded, failed, firstError }
}
