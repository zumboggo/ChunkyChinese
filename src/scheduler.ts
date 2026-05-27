import { createEmptyCard, fsrs, Rating, State, type Card, type Grade } from 'ts-fsrs'
import type { FsrsRating, VocabWord } from './types'

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
