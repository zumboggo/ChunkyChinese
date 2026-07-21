import type { ListeningEvent, StudyTimeAdjustment } from './types'

export const STUDY_INACTIVITY_PAUSE_MS = 60_000
export const FLASHCARD_PRESENTATION_LIMIT_SECONDS = 60

export function shouldCountActiveStudySecond(lastActivityMs: number, nowMs: number): boolean {
  return nowMs - lastActivityMs <= STUDY_INACTIVITY_PAUSE_MS
}

export function cappedFlashcardStudySeconds(startedAtMs: number, endedAtMs: number): number {
  if (!Number.isFinite(startedAtMs) || !Number.isFinite(endedAtMs) || endedAtMs < startedAtMs) return 0
  return Math.min(
    FLASHCARD_PRESENTATION_LIMIT_SECONDS,
    Math.max(1, Math.ceil((endedAtMs - startedAtMs) / 1000)),
  )
}

export function studySecondsForEvent(event: ListeningEvent): number {
  // A flashcard set completion stores the sum for set-duration reporting. Its
  // individual rating events already carry the capped study time.
  if (event.type === 'complete' && event.source === 'flashcards') return 0

  const seconds = event.seconds ?? inferredStudySeconds(event)
  if (event.type === 'fsrs_rating' && event.source === 'flashcards') {
    return Math.min(FLASHCARD_PRESENTATION_LIMIT_SECONDS, Math.max(0, seconds))
  }
  return Math.max(0, seconds)
}

export function adjustedHistoricalStudySeconds(
  seconds: number,
  timestamp: string,
  adjustment?: StudyTimeAdjustment,
): number {
  if (!adjustment) return Math.max(0, seconds)
  const time = Date.parse(timestamp)
  const cutoff = Date.parse(adjustment.cutoffAt)
  if (!Number.isFinite(time) || !Number.isFinite(cutoff) || time > cutoff) return Math.max(0, seconds)
  return Math.max(0, seconds * adjustment.scale)
}

function inferredStudySeconds(event: ListeningEvent): number {
  if (event.type === 'complete') return 3
  if (event.type === 'quiz_answer' || event.type === 'fsrs_rating') return 8
  if (event.type === 'play' || event.type === 'quiz_prompt') return 2
  return 1
}
