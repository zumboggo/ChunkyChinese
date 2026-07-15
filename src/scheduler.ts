import { createEmptyCard, fsrs, Rating, State, type Card, type Grade } from 'ts-fsrs'
import type { FsrsRating, SentenceSrsRecord, VocabWord } from './types'

export type FsrsStateName = 'New' | 'Learning' | 'Review' | 'Relearning'

export type FsrsQueueBucket = 'new' | 'learning' | 'due' | 'scheduled'

export type FsrsDuePreview = Record<
  FsrsRating,
  {
    dueAt: string
    intervalDays: number
    state: FsrsStateName
  }
>

const scheduler = fsrs({
  request_retention: 0.9,
  enable_short_term: true,
  learning_steps: ['1m', '5m'],
  relearning_steps: ['1m', '5m'],
})

const ratingMap: Record<FsrsRating, Grade> = {
  again: Rating.Again,
  hard: Rating.Hard,
  good: Rating.Good,
  easy: Rating.Easy,
}

const stateNameToEnum: Record<FsrsStateName, State> = {
  New: State.New,
  Learning: State.Learning,
  Review: State.Review,
  Relearning: State.Relearning,
}

export function previewFsrsRatings(word: VocabWord, now = new Date()): FsrsDuePreview {
  const card = wordToCard(word, now)
  const preview = scheduler.repeat(card, now)
  return {
    again: cardPreview(preview[Rating.Again].card),
    hard: cardPreview(preview[Rating.Hard].card),
    good: cardPreview(preview[Rating.Good].card),
    easy: cardPreview(preview[Rating.Easy].card),
  }
}

export function applyFsrsRating(
  word: VocabWord,
  rating: FsrsRating,
  now = new Date(),
): Pick<
  VocabWord,
  | 'fsrsDueAt'
  | 'fsrsIntervalDays'
  | 'fsrsStability'
  | 'fsrsDifficulty'
  | 'fsrsLearningSteps'
  | 'fsrsRepetitions'
  | 'fsrsLapses'
  | 'fsrsState'
  | 'lastReviewedAt'
> {
  const card = wordToCard(word, now)
  const next = scheduler.next(card, now, ratingMap[rating]).card
  return {
    ...wordFieldsFromCard(next),
    lastReviewedAt: now.toISOString(),
  }
}

export function isNewFsrsCard(word: VocabWord): boolean {
  return !word.fsrsDueAt && !word.lastReviewedAt && (word.fsrsRepetitions ?? 0) === 0
}

export function hasFsrsSchedule(word: VocabWord): boolean {
  return Boolean(word.fsrsDueAt)
}

export function fsrsDueTime(word: VocabWord): number {
  if (!word.fsrsDueAt) return Number.POSITIVE_INFINITY
  const due = Date.parse(word.fsrsDueAt)
  return Number.isFinite(due) ? due : 0
}

export function isFsrsCardDue(word: VocabWord, now = Date.now()): boolean {
  if (!word.fsrsDueAt) return false
  return fsrsDueTime(word) <= now
}

// How many spaced reading encounters carry a word to "known" (Strong). The
// FSRS ladder graduates an actively-recalled card in ~4 reviews, which is too
// fast to feel like reading; passive reading is counted separately and reaches
// "known" after this many distinct-day encounters.
export const READING_MASTERY_TARGET = 6

// A read is credited at most once per calendar day per word (spacing matters
// more than raw repetition, and it stops re-reading one text from farming).
export function isEligibleForReadingCredit(word: VocabWord, now = new Date()): boolean {
  if (word.archivedAt) return false
  if (!word.lastReadingCreditAt) return true
  const startOfDay = new Date(now)
  startOfDay.setHours(0, 0, 0, 0)
  const lastCredit = Date.parse(word.lastReadingCreditAt)
  return !Number.isFinite(lastCredit) || lastCredit < startOfDay.getTime()
}

export type MasteryInfo = { level: 0 | 1 | 2 | 3 | 4; label: string }

const MASTERY_LABELS = ['New', 'Seedling', 'Growing', 'Strong', 'Mastered'] as const

// Mastery from active recall: the FSRS interval mapped to the 5-step scale.
function fsrsMasteryLevel(word: VocabWord): 0 | 1 | 2 | 3 | 4 {
  if ((word.fsrsRepetitions ?? 0) === 0 && !word.lastReviewedAt) return 0
  const interval = word.fsrsIntervalDays ?? 0
  if (interval >= 60) return 4
  if (interval >= 14) return 3
  if (interval >= 3) return 2
  return 1
}

// Mastery from reading exposure: tops out at Strong ("known"). Reaching
// Mastered (level 4) still requires active recall via flashcards.
function readingMasteryLevel(word: VocabWord): 0 | 1 | 2 | 3 {
  const exposures = word.readingExposures ?? 0
  if (exposures >= READING_MASTERY_TARGET) return 3
  if (exposures >= Math.ceil(READING_MASTERY_TARGET * 0.55)) return 2
  if (exposures >= 1) return 1
  return 0
}

export function isReadingKnown(word: VocabWord): boolean {
  return (word.readingExposures ?? 0) >= READING_MASTERY_TARGET
}

// Mastery answers "how well do I know this word?" the same way on every screen,
// taking whichever is further along: flashcard recall or reading exposure.
export function masteryForWord(word: VocabWord): MasteryInfo {
  const level = Math.max(fsrsMasteryLevel(word), readingMasteryLevel(word)) as MasteryInfo['level']
  return { level, label: MASTERY_LABELS[level] }
}

export function isFsrsCardDueSoon(
  word: VocabWord,
  now = Date.now(),
  soon = now + 24 * 60 * 60 * 1000,
): boolean {
  if (!word.fsrsDueAt) return false
  const due = fsrsDueTime(word)
  return due > now && due <= soon
}

export function fsrsQueueBucket(word: VocabWord, now = Date.now()): FsrsQueueBucket {
  if (isNewFsrsCard(word)) return 'new'
  if (isFsrsCardDue(word, now)) return 'due'
  if (word.fsrsState === 'Learning' || word.fsrsState === 'Relearning') return 'learning'
  return 'scheduled'
}

export function fsrsQueueLabel(word: VocabWord, now = Date.now()): string {
  const bucket = fsrsQueueBucket(word, now)
  if (bucket === 'new') return 'New'
  if (bucket === 'due') return 'Due'
  if (bucket === 'learning') return word.fsrsState === 'Relearning' ? 'Relearning' : 'Learning'
  return 'Scheduled'
}

export function downgradeRating(rating: FsrsRating): FsrsRating {
  if (rating === 'easy') return 'good'
  if (rating === 'good') return 'hard'
  return 'again'
}

function cardPreview(card: Card): FsrsDuePreview[FsrsRating] {
  return {
    dueAt: card.due.toISOString(),
    intervalDays: Math.max(0, Math.round(card.scheduled_days)),
    state: stateName(card.state),
  }
}

function wordFieldsFromCard(
  card: Card,
): Pick<
  VocabWord,
  | 'fsrsDueAt'
  | 'fsrsIntervalDays'
  | 'fsrsStability'
  | 'fsrsDifficulty'
  | 'fsrsLearningSteps'
  | 'fsrsRepetitions'
  | 'fsrsLapses'
  | 'fsrsState'
> {
  return {
    fsrsDueAt: card.due.toISOString(),
    fsrsIntervalDays: Math.max(0, Math.round(card.scheduled_days)),
    fsrsStability: round(card.stability),
    fsrsDifficulty: round(card.difficulty),
    fsrsLearningSteps: Math.max(0, Math.round(card.learning_steps)),
    fsrsRepetitions: card.reps,
    fsrsLapses: card.lapses,
    fsrsState: stateName(card.state),
  }
}

function wordToCard(word: VocabWord, now: Date): Card {
  const empty = createEmptyCard(now)
  const due = parseDate(word.fsrsDueAt) ?? empty.due
  const lastReview = parseDate(word.lastReviewedAt)
  return {
    due,
    stability: finiteNumber(word.fsrsStability) ?? empty.stability,
    difficulty: finiteNumber(word.fsrsDifficulty) ?? empty.difficulty,
    elapsed_days: 0,
    scheduled_days: Math.max(0, Math.round(finiteNumber(word.fsrsIntervalDays) ?? empty.scheduled_days)),
    learning_steps: Math.max(0, Math.round(finiteNumber(word.fsrsLearningSteps) ?? empty.learning_steps)),
    reps: Math.max(0, Math.round(finiteNumber(word.fsrsRepetitions) ?? empty.reps)),
    lapses: Math.max(0, Math.round(finiteNumber(word.fsrsLapses) ?? empty.lapses)),
    state: stateFromWord(word),
    ...(lastReview ? { last_review: lastReview } : {}),
  }
}

function stateFromWord(word: VocabWord): State {
  if (word.fsrsState && word.fsrsState in stateNameToEnum) {
    return stateNameToEnum[word.fsrsState]
  }
  if (isNewFsrsCard(word)) return State.New
  return State.Review
}

function stateName(state: State): FsrsStateName {
  return State[state] as FsrsStateName
}

function parseDate(value?: string): Date | undefined {
  if (!value) return undefined
  const date = new Date(value)
  return Number.isFinite(date.getTime()) ? date : undefined
}

function finiteNumber(value?: number): number | undefined {
  return Number.isFinite(value) ? value : undefined
}

function round(value: number): number {
  return Number.isFinite(value) ? Number(value.toFixed(4)) : 0
}

export function applySentenceSrsRating(
  record: SentenceSrsRecord,
  rating: 'again' | 'hard' | 'good' | 'easy',
  now = new Date(),
): SentenceSrsRecord {
  const card = sentenceSrsToCard(record, now)
  const grade: Grade =
    rating === 'again' ? Rating.Again :
    rating === 'hard'  ? Rating.Hard  :
    rating === 'easy'  ? Rating.Easy  : Rating.Good
  const next = scheduler.next(card, now, grade).card
  return {
    ...sentenceSrsFieldsFromCard(next),
    id: record.id,
    seenCount: (record.seenCount ?? 0) + 1,
    lastReviewedAt: now.toISOString(),
  }
}

export function isNewSentenceSrs(record: SentenceSrsRecord): boolean {
  return !record.fsrsDueAt && !record.lastReviewedAt && (record.fsrsRepetitions ?? 0) === 0
}

export function isSentenceSrsDue(record: SentenceSrsRecord, now = Date.now()): boolean {
  if (!record.fsrsDueAt) return true
  return Date.parse(record.fsrsDueAt) <= now
}

function sentenceSrsToCard(record: SentenceSrsRecord, now: Date): Card {
  const empty = createEmptyCard(now)
  const due = parseDate(record.fsrsDueAt) ?? empty.due
  const lastReview = parseDate(record.lastReviewedAt)
  return {
    due,
    stability: finiteNumber(record.fsrsStability) ?? empty.stability,
    difficulty: finiteNumber(record.fsrsDifficulty) ?? empty.difficulty,
    elapsed_days: 0,
    scheduled_days: Math.max(0, Math.round(finiteNumber(record.fsrsIntervalDays) ?? empty.scheduled_days)),
    learning_steps: 0,
    reps: Math.max(0, Math.round(finiteNumber(record.fsrsRepetitions) ?? empty.reps)),
    lapses: Math.max(0, Math.round(finiteNumber(record.fsrsLapses) ?? empty.lapses)),
    state: sentenceSrsStateFromRecord(record),
    ...(lastReview ? { last_review: lastReview } : {}),
  }
}

function sentenceSrsFieldsFromCard(
  card: Card,
): Omit<SentenceSrsRecord, 'id' | 'seenCount' | 'lastReviewedAt'> {
  return {
    fsrsDueAt: card.due.toISOString(),
    fsrsIntervalDays: Math.max(0, Math.round(card.scheduled_days)),
    fsrsStability: round(card.stability),
    fsrsDifficulty: round(card.difficulty),
    fsrsRepetitions: card.reps,
    fsrsLapses: card.lapses,
    fsrsState: stateName(card.state),
  }
}

function sentenceSrsStateFromRecord(record: SentenceSrsRecord): State {
  if (record.fsrsState && record.fsrsState in stateNameToEnum) {
    return stateNameToEnum[record.fsrsState]
  }
  if (isNewSentenceSrs(record)) return State.New
  return State.Review
}
