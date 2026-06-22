export type ReaderListeningStatus =
  | 'idle'
  | 'loading'
  | 'playing'
  | 'paused'
  | 'completed'

export type ReaderListeningMode = 'single' | 'continuous'
export type ReaderListeningSource = 'audio' | 'tts' | null

export interface ReaderListeningSnapshot {
  status: ReaderListeningStatus
  mode: ReaderListeningMode
  repeatNumber: number
  source: ReaderListeningSource
}

export interface ReaderListeningCompletion {
  kind: 'repeat' | 'advance' | 'complete'
  repeatNumber: number
}

export const IDLE_READER_LISTENING_SNAPSHOT: ReaderListeningSnapshot = {
  status: 'idle',
  mode: 'continuous',
  repeatNumber: 1,
  source: null,
}

export function nextReaderListeningCompletion({
  mode,
  repeatNumber,
  repeatCount,
  autoAdvance,
  hasNextSentence,
}: {
  mode: ReaderListeningMode
  repeatNumber: number
  repeatCount: number
  autoAdvance: boolean
  hasNextSentence: boolean
}): ReaderListeningCompletion {
  const effectiveRepeatCount = mode === 'single' ? 1 : repeatCount
  if (repeatNumber < effectiveRepeatCount) {
    return { kind: 'repeat', repeatNumber: repeatNumber + 1 }
  }
  if (mode === 'continuous' && autoAdvance && hasNextSentence) {
    return { kind: 'advance', repeatNumber: 1 }
  }
  return { kind: 'complete', repeatNumber }
}

export function isCredibleSpeechCompletion(startedAt: number, endedAt: number): boolean {
  return startedAt > 0 && endedAt - startedAt >= 250
}
