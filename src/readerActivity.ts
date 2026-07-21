import { shouldCountActiveStudySecond, STUDY_INACTIVITY_PAUSE_MS } from './studyTime'

export const READER_INACTIVITY_PAUSE_MS = STUDY_INACTIVITY_PAUSE_MS

export function shouldCountReaderActiveSecond(lastActivityMs: number, nowMs: number): boolean {
  return shouldCountActiveStudySecond(lastActivityMs, nowMs)
}
