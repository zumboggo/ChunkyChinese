import type { AudioClip, LessonPlan, RenderedLesson } from './types'

const SAMPLE_RATE = 44100

export async function renderLessonToWav(
  lesson: LessonPlan,
  getClip: (id: string) => Promise<AudioClip | undefined>,
): Promise<RenderedLesson> {
  const audioContext = new AudioContext({ sampleRate: SAMPLE_RATE })
  const buffers: AudioBuffer[] = []
  const warnings: string[] = []

  for (const step of lesson.steps) {
    if (step.kind === 'audio') {
      const clip = await getClip(step.audioId)
      if (!clip) {
        warnings.push(`Missing clip: ${step.label}`)
        continue
      }
      try {
        const data = await clip.blob.arrayBuffer()
        buffers.push(await audioContext.decodeAudioData(data.slice(0)))
      } catch {
        warnings.push(`Could not decode clip: ${step.label}`)
      }
    } else if (step.kind === 'pause') {
      buffers.push(makeSilence(audioContext, step.seconds))
    } else if (step.kind === 'ding') {
      buffers.push(makeDing(audioContext))
    }
  }

  const merged = mergeBuffers(audioContext, buffers)
  const blob = audioBufferToWav(merged)
  void audioContext.close()

  return {
    id: `rendered:${crypto.randomUUID()}`,
    title: lesson.title,
    createdAt: new Date().toISOString(),
    targetWordIds: lesson.targetWords.map((word) => word.id),
    durationSeconds: merged.duration,
    blob,
    warnings,
  }
}

function makeSilence(audioContext: AudioContext, seconds: number): AudioBuffer {
  return audioContext.createBuffer(1, Math.ceil(seconds * SAMPLE_RATE), SAMPLE_RATE)
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

function mergeBuffers(audioContext: AudioContext, buffers: AudioBuffer[]): AudioBuffer {
  const length = buffers.reduce((sum, buffer) => sum + buffer.length, 0)
  const output = audioContext.createBuffer(1, Math.max(1, length), SAMPLE_RATE)
  const outputData = output.getChannelData(0)
  let offset = 0

  for (const buffer of buffers) {
    const inputData = buffer.getChannelData(0)
    outputData.set(inputData, offset)
    offset += inputData.length
  }

  return output
}

function audioBufferToWav(buffer: AudioBuffer): Blob {
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
  view.setUint32(24, SAMPLE_RATE, true)
  view.setUint32(28, SAMPLE_RATE * 2, true)
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
