export type ReaderListeningStatus =
  | 'idle'
  | 'loading'
  | 'playing'
  | 'shadowing'
  | 'paused'
  | 'completed'

export type ReaderListeningMode = 'single' | 'continuous'
export type ReaderListeningSource = 'audio' | 'tts' | null

export interface ReaderListeningSnapshot {
  status: ReaderListeningStatus
  mode: ReaderListeningMode
  repeatNumber: number
  source: ReaderListeningSource
  phase: 'audio' | 'shadowing'
  shadowRemainingMs: number
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
  phase: 'audio',
  shadowRemainingMs: 0,
}

export function readerShadowPauseMs(spokenDurationMs: number, pauseFactor: number): number {
  if (!Number.isFinite(spokenDurationMs) || !Number.isFinite(pauseFactor)) return 0
  return Math.max(0, Math.round(spokenDurationMs * Math.max(0, pauseFactor)))
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
