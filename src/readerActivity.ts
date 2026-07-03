export const READER_INACTIVITY_PAUSE_MS = 60_000

export function shouldCountReaderActiveSecond(lastActivityMs: number, nowMs: number): boolean {
  return nowMs - lastActivityMs <= READER_INACTIVITY_PAUSE_MS
}
