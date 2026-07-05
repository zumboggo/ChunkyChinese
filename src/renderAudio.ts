import type { AudioClip, LessonPlan, RenderedLesson, RenderedLessonSegment } from './types'

const SAMPLE_RATE = 44100

export interface SessionAudioStep {
  kind: 'clip' | 'pause'
  clipId?: string
  seconds?: number
  /** Pause length as a multiple of the previous clip's duration (shadowing pause). */
  factorOfPrevious?: number
  sentenceIndex: number
  round: number
  label: string
}

export interface SessionAudioSegment {
  startSeconds: number
  endSeconds: number
  sentenceIndex: number
  round: number
  kind: 'clip' | 'pause'
  label: string
}

export interface RenderedSession {
  blob: Blob
  durationSeconds: number
  segments: SessionAudioSegment[]
  warnings: string[]
}

export async function renderSessionToWav(
  steps: SessionAudioStep[],
  getClip: (id: string) => Promise<AudioClip | undefined>,
  sampleRate = SAMPLE_RATE,
): Promise<RenderedSession> {
  const audioContext = new AudioContext({ sampleRate })
  const buffers: AudioBuffer[] = []
  const segments: SessionAudioSegment[] = []
  const warnings: string[] = []
  const decodedClips = new Map<string, AudioBuffer>()
  let currentSeconds = 0
  let previousClipSeconds = 0

  for (const step of steps) {
    let buffer: AudioBuffer | undefined
    if (step.kind === 'clip' && step.clipId) {
      const cached = decodedClips.get(step.clipId)
      if (cached) {
        buffer = cached
      } else {
        const clip = await getClip(step.clipId)
        if (!clip) {
          warnings.push(`Missing clip: ${step.label}`)
          continue
        }
        try {
          const data = await clip.blob.arrayBuffer()
          buffer = await audioContext.decodeAudioData(data.slice(0))
          decodedClips.set(step.clipId, buffer)
        } catch {
          warnings.push(`Could not decode clip: ${step.label}`)
          continue
        }
      }
      previousClipSeconds = buffer.duration
    } else if (step.kind === 'pause') {
      const seconds = step.factorOfPrevious !== undefined
        ? previousClipSeconds * step.factorOfPrevious
        : step.seconds ?? 0
      if (seconds <= 0) continue
      buffer = makeSilence(audioContext, seconds, sampleRate)
    }

    if (buffer) {
      buffers.push(buffer)
      const endSeconds = currentSeconds + buffer.duration
      segments.push({
        startSeconds: currentSeconds,
        endSeconds,
        sentenceIndex: step.sentenceIndex,
        round: step.round,
        kind: step.kind,
        label: step.label,
      })
      currentSeconds = endSeconds
    }
  }

  const merged = mergeBuffers(audioContext, buffers, sampleRate)
  const blob = audioBufferToWav(merged, sampleRate)
  void audioContext.close()

  return { blob, durationSeconds: merged.duration, segments, warnings }
}

export async function renderLessonToWav(
  lesson: LessonPlan,
  getClip: (id: string) => Promise<AudioClip | undefined>,
): Promise<RenderedLesson> {
  const audioContext = new AudioContext({ sampleRate: SAMPLE_RATE })
  const buffers: AudioBuffer[] = []
  const segments: RenderedLessonSegment[] = []
  const warnings: string[] = []
  let currentSeconds = 0

  for (const step of lesson.steps) {
    let buffer: AudioBuffer | undefined
    if (step.kind === 'audio') {
      const clip = await getClip(step.audioId)
      if (!clip) {
        warnings.push(`Missing clip: ${step.label}`)
        continue
      }
      try {
        const data = await clip.blob.arrayBuffer()
        buffer = await audioContext.decodeAudioData(data.slice(0))
      } catch {
        warnings.push(`Could not decode clip: ${step.label}`)
      }
    } else if (step.kind === 'pause') {
      buffer = makeSilence(audioContext, step.seconds, SAMPLE_RATE)
    } else if (step.kind === 'ding') {
      buffer = makeDing(audioContext)
    }

    if (buffer) {
      buffers.push(buffer)
      const endSeconds = currentSeconds + buffer.duration
      segments.push({
        stepId: step.id,
        startSeconds: currentSeconds,
        endSeconds,
        wordId: step.wordId,
        sentenceId: step.sentenceId,
        label: step.label,
        kind: step.kind,
        quiz: step.quiz,
      })
      currentSeconds = endSeconds
    }
  }

  const merged = mergeBuffers(audioContext, buffers, SAMPLE_RATE)
  const blob = audioBufferToWav(merged, SAMPLE_RATE)
  void audioContext.close()

  return {
    id: `rendered:${crypto.randomUUID()}`,
    title: lesson.title,
    createdAt: new Date().toISOString(),
    targetWordIds: lesson.targetWords.map((word) => word.id),
    durationSeconds: merged.duration,
    blob,
    warnings,
    segments,
  }
}

function makeSilence(audioContext: AudioContext, seconds: number, sampleRate: number): AudioBuffer {
  return audioContext.createBuffer(1, Math.max(1, Math.ceil(seconds * sampleRate)), sampleRate)
}

function makeDing(audioContext: AudioContext): AudioBuffer {
  const duration = 0.35
  const buffer = audioContext.createBuffer(1, Math.ceil(duration * SAMPLE_RATE), SAMPLE_RATE)
  const data = buffer.getChannelData(0)
  for (let index = 0; index < data.length; index += 1) {
    const time = index / SAMPLE_RATE
    const envelope = Math.max(0, 1 - time / duration)
    data[index] = Math.sin(2 * Math.PI * 880 * time) * envelope * 0.25
  }
  return buffer
}

function mergeBuffers(audioContext: AudioContext, buffers: AudioBuffer[], sampleRate: number): AudioBuffer {
  const length = buffers.reduce((sum, buffer) => sum + buffer.length, 0)
  const output = audioContext.createBuffer(1, Math.max(1, length), sampleRate)
  const outputData = output.getChannelData(0)
  let offset = 0

  for (const buffer of buffers) {
    const inputData = buffer.getChannelData(0)
    outputData.set(inputData, offset)
    offset += inputData.length
  }

  return output
}

function audioBufferToWav(buffer: AudioBuffer, sampleRate: number): Blob {
  const samples = buffer.getChannelData(0)
  const byteLength = 44 + samples.length * 2
  const arrayBuffer = new ArrayBuffer(byteLength)
  const view = new DataView(arrayBuffer)

  writeString(view, 0, 'RIFF')
  view.setUint32(4, 36 + samples.length * 2, true)
  writeString(view, 8, 'WAVE')
  writeString(view, 12, 'fmt ')
  view.setUint32(16, 16, true)
  view.setUint16(20, 1, true)
  view.setUint16(22, 1, true)
  view.setUint32(24, sampleRate, true)
  view.setUint32(28, sampleRate * 2, true)
  view.setUint16(32, 2, true)
  view.setUint16(34, 16, true)
  writeString(view, 36, 'data')
  view.setUint32(40, samples.length * 2, true)

  let offset = 44
  for (let index = 0; index < samples.length; index += 1) {
    const sample = Math.max(-1, Math.min(1, samples[index]))
    view.setInt16(offset, sample < 0 ? sample * 0x8000 : sample * 0x7fff, true)
    offset += 2
  }

  return new Blob([arrayBuffer], { type: 'audio/wav' })
}

function writeString(view: DataView, offset: number, value: string) {
  for (let index = 0; index < value.length; index += 1) {
    view.setUint8(offset + index, value.charCodeAt(index))
  }
}
