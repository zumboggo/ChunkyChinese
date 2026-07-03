import type { ReaderStory } from './types'
import { saveAudioClip } from './db'
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
