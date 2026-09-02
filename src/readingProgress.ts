import type { ReaderSession, ReadingProgressPoint, ReadingProgressSummary, ReaderWordToken } from './types'
import { readerComprehensionCategory } from './adaptiveText'
import { shouldCountReaderActiveSecond } from './readerActivity'

export const READING_MEASUREMENT_VERSION = 1 as const
export const READING_MIN_FOCUSED_SECONDS = 180
export const READING_MIN_FOCUSED_WORDS = 75
export const READING_BASELINE_SIZE = 12

export type ReadingDifficultyCounts = { known: number; learning: number; fresh: number; total: number }

export function countReadingDifficulty(tokens: ReaderWordToken[]): ReadingDifficultyCounts {
  const counts = { known: 0, learning: 0, fresh: 0, total: 0 }
  for (const token of tokens) {
    if (!token.isChinese) continue
    counts.total += 1
    const category = readerComprehensionCategory(token.word)
    if (category === 'known') counts.known += 1
    else if (category === 'learning') counts.learning += 1
    else counts.fresh += 1
  }
  return counts
}

export function readingChallengePercent(counts: ReadingDifficultyCounts): number {
  return counts.total > 0 ? round(((counts.learning + counts.fresh) / counts.total) * 100) : 0
}

export function qualifyReadingSession(session: ReaderSession): boolean {
  return session.measurementVersion === READING_MEASUREMENT_VERSION &&
    (session.focusedActiveSeconds ?? 0) >= READING_MIN_FOCUSED_SECONDS &&
    (session.focusedWordsRead ?? 0) >= READING_MIN_FOCUSED_WORDS
}

export function shouldCountFocusedReadingSecond(options: {
  lastInteractionAt: number
  now: number
  documentHidden: boolean
  listening: boolean
  overlayOpen: boolean
}): boolean {
  return !options.documentHidden && !options.listening && !options.overlayOpen &&
    shouldCountReaderActiveSecond(options.lastInteractionAt, options.now)
}

export function mergeReaderSessionRecords(local: ReaderSession[], remote: ReaderSession[]): { pulled: ReaderSession[]; toPush: ReaderSession[] } {
  const localById = new Map(local.map(session => [session.id, session]))
  const remoteById = new Map(remote.map(session => [session.id, session]))
  return {
    pulled: remote.filter(session => {
      const match = localById.get(session.id)
      return !match || Date.parse(session.updatedAt) > Date.parse(match.updatedAt)
    }),
    toPush: local.filter(session => {
      const match = remoteById.get(session.id)
      return !match || Date.parse(session.updatedAt) > Date.parse(match.updatedAt)
    }),
  }
}

type Model = { intercept: number; slope: number }

function fitExpectedPace(sessions: ReaderSession[]): Model {
  const values = sessions.map(session => ({
    x: (session.challengePercent ?? 0) / 100,
    y: Math.log(Math.max(1, focusedWpm(session))),
  }))
  const meanX = mean(values.map(value => value.x))
  const meanY = mean(values.map(value => value.y))
  const denominator = values.reduce((sum, value) => sum + (value.x - meanX) ** 2, 0)
  const slope = denominator > 0
    ? values.reduce((sum, value) => sum + (value.x - meanX) * (value.y - meanY), 0) / denominator
    : 0
  return { intercept: meanY - slope * meanX, slope }
}

export function focusedWpm(session: ReaderSession): number {
  const seconds = session.focusedActiveSeconds ?? 0
  return seconds > 0 ? round(((session.focusedWordsRead ?? 0) / seconds) * 60) : 0
}

export function buildReadingProgress(sessions: ReaderSession[]): ReadingProgressSummary {
  const qualified = sessions
    .filter(qualifyReadingSession)
    .sort((a, b) => Date.parse(a.startedAt) - Date.parse(b.startedAt))
  const phases = new Map<number, ReaderSession[]>()
  for (const session of qualified) {
    const phase = session.baselinePhase ?? 1
    phases.set(phase, [...(phases.get(phase) ?? []), session])
  }
  const points = [...phases.entries()]
    .flatMap(([phase, phaseSessions]) => buildPhasePoints(phase, phaseSessions))
    .sort((a, b) => Date.parse(a.date) - Date.parse(b.date))
  const latestPhase = Math.max(1, ...qualified.map(session => session.baselinePhase ?? 1))
  const latestPhaseCount = phases.get(latestPhase)?.length ?? 0
  const latest = points.at(-1)
  const status = statusFor(latest?.signal, latestPhaseCount)
  const previous = points.at(-2)
  return {
    points,
    qualifiedSessions: qualified.length,
    focusedWordsRead: qualified.reduce((sum, session) => sum + (session.focusedWordsRead ?? 0), 0),
    medianChallenge: median(qualified.map(session => session.challengePercent ?? 0)),
    bestSustainedPace: bestSustained(points),
    baselineCount: Math.min(READING_BASELINE_SIZE, latestPhaseCount),
    status,
    message: progressMessage(latest, previous, status, latestPhaseCount),
  }
}

function buildPhasePoints(phase: number, sessions: ReaderSession[]): ReadingProgressPoint[] {
  const baseline = sessions.slice(0, READING_BASELINE_SIZE)
  const model = baseline.length >= READING_BASELINE_SIZE ? fitExpectedPace(baseline) : null
  const raw = sessions.map(session => {
    const wpm = focusedWpm(session)
    const expected = model ? Math.exp(model.intercept + model.slope * ((session.challengePercent ?? 0) / 100)) : 0
    return { session, wpm, paceIndex: model && expected > 0 ? round((wpm / expected) * 100) : null }
  })
  const baselineIndexes = raw.slice(0, READING_BASELINE_SIZE).map(point => point.paceIndex).filter((value): value is number => value !== null)
  const center = baselineIndexes.length >= READING_BASELINE_SIZE ? round(mean(baselineIndexes)) : null
  const movingRanges = baselineIndexes.slice(1).map((value, index) => Math.abs(value - baselineIndexes[index]))
  const averageMovingRange = movingRanges.length ? mean(movingRanges) : 0
  const upperLimit = center === null ? null : round(center + 2.66 * averageMovingRange)
  const lowerLimit = center === null ? null : round(Math.max(0, center - 2.66 * averageMovingRange))
  const values = raw.map(item => item.paceIndex)
  return raw.map(({ session, wpm, paceIndex }, index) => ({
    sessionId: session.id, date: session.startedAt, bookId: session.bookId, wpm,
    challengePercent: session.challengePercent ?? 0, wordsRead: session.focusedWordsRead ?? 0,
    paceIndex, center, upperLimit, lowerLimit, phase,
    signal: detectSignal(values, index, center, upperLimit, lowerLimit),
  }))
}

function detectSignal(values: Array<number | null>, index: number, center: number | null, upper: number | null, lower: number | null): ReadingProgressPoint['signal'] {
  const value = values[index]
  if (value === null || center === null || upper === null || lower === null) return undefined
  if (value > upper) return 'high'
  if (value < lower) return 'low'
  const last8 = values.slice(Math.max(0, index - 7), index + 1)
  if (last8.length === 8 && last8.every(item => item !== null && item > center)) return 'upshift'
  if (last8.length === 8 && last8.every(item => item !== null && item < center)) return 'downshift'
  const last6 = values.slice(Math.max(0, index - 5), index + 1)
  if (last6.length === 6 && last6.every(item => item !== null)) {
    const numeric = last6 as number[]
    if (numeric.slice(1).every((item, i) => item > numeric[i])) return 'rising'
    if (numeric.slice(1).every((item, i) => item < numeric[i])) return 'falling'
  }
  return undefined
}

function statusFor(signal: ReadingProgressPoint['signal'], baselineCount: number): ReadingProgressSummary['status'] {
  if (baselineCount < READING_BASELINE_SIZE) return 'building'
  if (signal === 'upshift' || signal === 'rising' || signal === 'high') return 'positive'
  if (signal === 'downshift' || signal === 'falling') return 'watch'
  if (signal === 'low') return 'unusual'
  return 'stable'
}

function progressMessage(latest: ReadingProgressPoint | undefined, previous: ReadingProgressPoint | undefined, status: ReadingProgressSummary['status'], baselineCount: number): string {
  if (!latest) return 'Complete a focused reading session to begin your progress map.'
  if (status === 'building') return `Building your baseline: ${Math.min(READING_BASELINE_SIZE, baselineCount)} of ${READING_BASELINE_SIZE} sessions.`
  if (status === 'positive') return 'Your recent pace is showing a positive shift.'
  if (status === 'watch') return 'Your recent pace may be shifting downward; keep observing the process.'
  if (status === 'unusual') return 'This session was unusually slow for its difficulty.'
  if (previous && latest.challengePercent > previous.challengePercent + 3 && latest.wpm >= previous.wpm * 0.95) return 'You maintained your pace on a harder text.'
  if (previous && latest.wpm > previous.wpm * 1.05 && latest.challengePercent <= previous.challengePercent + 3) return 'You read faster at a similar difficulty.'
  return 'Your reading process is inside its normal range.'
}

function bestSustained(points: ReadingProgressPoint[]): number {
  if (points.length < 3) return points.length ? Math.max(...points.map(point => point.wpm)) : 0
  let best = 0
  for (let i = 2; i < points.length; i += 1) best = Math.max(best, mean(points.slice(i - 2, i + 1).map(point => point.wpm)))
  return round(best)
}

function mean(values: number[]): number { return values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : 0 }
function median(values: number[]): number {
  if (!values.length) return 0
  const sorted = [...values].sort((a, b) => a - b)
  const middle = Math.floor(sorted.length / 2)
  return round(sorted.length % 2 ? sorted[middle] : (sorted[middle - 1] + sorted[middle]) / 2)
}
function round(value: number): number { return Math.round(value * 10) / 10 }
