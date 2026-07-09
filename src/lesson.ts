import type { AudioClip, LessonPlan, LessonStep, Sentence, SentenceSrsRecord, VocabWord, ListeningEvent } from './types'
import { fsrsDueTime, isFsrsCardDue, isSentenceSrsDue, isNewFsrsCard, isNewSentenceSrs } from './scheduler'

export type PauseProfile = 'gentle' | 'normal' | 'fast' | 'challenge'

interface TargetSelectionOptions {
  randomize?: boolean
  pauseProfile?: PauseProfile
  activeRecall?: boolean
  newWordsLimit?: number
  allowExtraNew?: boolean
  keptWordIds?: string[]
  activeRecallEvents?: ListeningEvent[]
}

interface PauseTimings {
  recall: number
  speaking: number
  quick: number
  contrast: number
}

export function createLesson(
  words: VocabWord[],
  sentences: Sentence[],
  manualIds: string[] = [],
  options: TargetSelectionOptions = {},
): LessonPlan {
  const targetWords = selectTargetWords(words, manualIds, options)
  const steps: LessonStep[] = []
  const markerPause = options.activeRecall ? 0.05 : undefined

  targetWords.forEach((word, index) => {
    const sentence = chooseSentenceForWord(word, sentences, targetWords)
    const prefix = `${index + 1}-${word.id}`

    steps.push({
      id: `${prefix}-intro`,
      kind: 'speech',
      text: `Listen and remember. ${word.word}.`,
      label: `Prompt: ${word.word}`,
      wordId: word.id,
    })
    steps.push({
      id: `${prefix}-display-word`,
      kind: 'display',
      text: `${word.word}\n${word.meaning}`,
      label: `${word.word} means ${word.meaning}`,
      wordId: word.id,
    })
    if (word.audioWordId) {
      steps.push({
        id: `${prefix}-word-audio`,
        kind: 'audio',
        audioId: word.audioWordId,
        label: `Word audio: ${word.word}`,
        wordId: word.id,
      })
    } else {
      steps.push({
        id: `${prefix}-word-speech`,
        kind: 'speech',
        text: word.word,
        label: `Speak word: ${word.word}`,
        wordId: word.id,
      })
    }
    if (word.audioMeaningId) {
      steps.push({
        id: `${prefix}-meaning-audio`,
        kind: 'audio',
        audioId: word.audioMeaningId,
        label: `Meaning audio: ${word.meaning}`,
        wordId: word.id,
      })
    } else {
      steps.push({
        id: `${prefix}-meaning-speech`,
        kind: 'speech',
        text: word.meaning,
        label: `Speak meaning: ${word.meaning}`,
        wordId: word.id,
      })
    }

    steps.push({
      id: `${prefix}-recall-prompt`,
      kind: 'speech',
      text: `What does ${word.word} mean?`,
      label: `Recall: ${word.word}`,
      wordId: word.id,
    })
    steps.push({
      id: `${prefix}-recall-pause`,
      kind: 'pause',
      seconds: markerPause ?? 2,
      label: 'Think',
      wordId: word.id,
    })
    steps.push({
      id: `${prefix}-answer`,
      kind: 'speech',
      text: `${word.word} means ${word.meaning}.`,
      label: `Answer: ${word.meaning}`,
      wordId: word.id,
    })
    steps.push({
      id: `${prefix}-contrast`,
      kind: 'speech',
      text: contrastPrompt(word, targetWords),
      label: 'Contrast question',
      wordId: word.id,
    })
    steps.push({
      id: `${prefix}-contrast-pause`,
      kind: 'pause',
      seconds: markerPause ?? 2,
      label: 'Think',
      wordId: word.id,
    })
    steps.push({
      id: `${prefix}-contrast-answer`,
      kind: 'speech',
      text: `The answer is ${word.word}.`,
      label: 'Contrast answer',
      wordId: word.id,
    })

    if (sentence) {
      steps.push({
        id: `${prefix}-sentence-prompt`,
        kind: 'speech',
        text: 'Sentence listening.',
        label: 'Sentence prompt',
        wordId: word.id,
        sentenceId: sentence.id,
      })
      if (sentence.audioSentenceId) {
        steps.push({
          id: `${prefix}-sentence-audio`,
          kind: 'audio',
          audioId: sentence.audioSentenceId,
          label: `Sentence audio: ${sentence.chinese}`,
          wordId: word.id,
          sentenceId: sentence.id,
        })
      } else {
        steps.push({
          id: `${prefix}-sentence-speech`,
          kind: 'speech',
          text: sentence.chinese,
          label: sentence.chinese,
          wordId: word.id,
          sentenceId: sentence.id,
        })
      }
      steps.push({
        id: `${prefix}-sentence-pause`,
        kind: 'pause',
        seconds: markerPause ?? 3,
        label: 'Think',
        wordId: word.id,
        sentenceId: sentence.id,
      })
      steps.push({
        id: `${prefix}-sentence-answer`,
        kind: 'speech',
        text: sentence.english,
        label: `Sentence meaning: ${sentence.english}`,
        wordId: word.id,
        sentenceId: sentence.id,
      })
    }

    steps.push({
      id: `${prefix}-ding`,
      kind: 'ding',
      label: 'Done',
      wordId: word.id,
    })
  })

  return {
    id: `lesson:${Date.now()}`,
    title: `${targetWords.length}-word listening lesson`,
    targetWords,
    steps,
  }
}

export function createPocketLesson(
  words: VocabWord[],
  sentences: Sentence[],
  audioClips: AudioClip[],
  manualIds: string[] = [],
  options: TargetSelectionOptions = { randomize: true },
): LessonPlan {
  const targetWords = selectTargetWords(words, manualIds, options)
  const steps: LessonStep[] = []
  const pauses = options.activeRecall
    ? getActiveRecallPauseTimings()
    : getPauseTimings(options.pauseProfile)
  const targetEntries = targetWords.map((word, index) => ({
    word,
    sentence: chooseSentenceForWord(word, sentences, targetWords, index),
  }))
  const targetSentences = uniqueSentences(
    targetEntries
      .map((entry) => entry.sentence)
      .filter((sentence): sentence is Sentence => Boolean(sentence)),
  )
  const warnings = [
    ...targetWords
      .filter((word) => !word.audioMeaningId)
      .map((word) => `Missing English meaning audio for ${word.word}: ${word.meaning}`),
    ...targetSentences
      .filter((sentence) => !sentence.audioEnglishId)
      .map(
        (sentence) =>
          `Missing sentence English audio for ${sentence.chinese}: ${sentence.english}`,
      ),
  ]

  addPrompt(steps, audioClips, 'listen', 'Listen')
  targetWords.forEach((word, index) => {
    addWordLearningBlock(steps, word, audioClips, `word-block-${index + 1}-${word.id}`, pauses)
  })
  addMixedWordRecall(steps, targetWords, audioClips, pauses)
  addSentenceSupport(
    steps,
    targetSentences.slice(0, 4),
    audioClips,
    options.activeRecall ? pauses.recall : 3,
  )
  addQuickFinalPass(steps, targetWords, audioClips, pauses)

  return {
    id: `pocket:${Date.now()}`,
    title: `${targetWords.length} word lesson`,
    targetWords,
    steps,
    warnings,
  }
}

export function selectTargetWords(
  words: VocabWord[],
  manualIds: string[] = [],
  options: TargetSelectionOptions = {},
): VocabWord[] {
  if (manualIds.length > 0) {
    const selected = manualIds
      .map((id) => words.find((word) => word.id === id))
      .filter((word): word is VocabWord => Boolean(word))
    return options.randomize ? weightedSampleWords(selected, 5) : selected.slice(0, 5)
  }

  if (options.activeRecall && !options.keptWordIds) {
    return selectActiveRecallTargetWords(words, options.activeRecallEvents ?? [])
  }

  const keptWords = options.keptWordIds
    ? options.keptWordIds
        .map((id) => words.find((word) => word.id === id))
        .filter((word): word is VocabWord => Boolean(word))
    : []
  const selected = [...keptWords]
  const filteredWords = options.keptWordIds
    ? words.filter((word) => !options.keptWordIds!.includes(word.id))
    : words

  if (options.activeRecall && options.keptWordIds) {
    const fillWords = selectActiveRecallTargetWords(filteredWords, options.activeRecallEvents ?? [])
      .filter((word) => selected.length === 0 || !isNewFsrsCard(word))
    for (const word of fillWords) {
      if (selected.length >= 5) break
      if (!selected.some((candidate) => candidate.id === word.id)) selected.push(word)
    }
    return selected.slice(0, 5)
  }

  const candidates = dueCandidates(filteredWords)
  const newWordLimit = options.allowExtraNew ? 5 : Math.max(0, (options.newWordsLimit ?? 5) - selected.filter(isNewFsrsCard).length)
  const newCandidates = filteredWords
    .filter(isNewFsrsCard)
    .sort((a, b) => scoreWord(a) - scoreWord(b))
    .slice(0, Math.max(0, newWordLimit))
  const supportCandidates = filteredWords
    .filter((word) => !candidates.some((candidate) => candidate.id === word.id))
    .filter((word) => !newCandidates.some((candidate) => candidate.id === word.id))
    .filter((word) => !isNewFsrsCard(word))
    .sort((a, b) => futureDueSort(a) - futureDueSort(b))
  const pick = options.randomize ? weightedSampleWords : sortedSampleWords

  if (!options.keptWordIds) {
    selected.push(...pick(newCandidates, 3))
    selected.push(
      ...pick(
        candidates.filter((word) => !selected.some((candidate) => candidate.id === word.id)),
        2,
      ),
    )
  }

  if (selected.length < 5) {
    const fillCandidates = [
      ...newCandidates,
      ...candidates,
      ...supportCandidates,
    ].filter((word) => !selected.some((candidate) => candidate.id === word.id))
    selected.push(...pick(fillCandidates, 5 - selected.length))
  }
  return selected.slice(0, 5)
}

function scoreWord(word: VocabWord): number {
  const stateWeight = isNewFsrsCard(word)
    ? 0
    : word.fsrsState === 'Learning' || word.fsrsState === 'Relearning'
      ? 4
      : isFsrsDue(word)
        ? 8
        : 24
  const dueWeight = isFsrsDue(word) ? -12 - overdueDays(word) : futureDueSort(word) / 1000
  return stateWeight + word.seenCount * 2 + (word.lessonNumber ?? 999) / 100 + dueWeight
}

function weightedSampleWords(words: VocabWord[], count: number): VocabWord[] {
  const remaining = [...words]
  const selected: VocabWord[] = []

  while (remaining.length > 0 && selected.length < count) {
    const weights = remaining.map(selectionWeight)
    const total = weights.reduce((sum, weight) => sum + weight, 0)
    let cursor = Math.random() * total
    let selectedIndex = 0

    for (let index = 0; index < remaining.length; index += 1) {
      cursor -= weights[index]
      if (cursor <= 0) {
        selectedIndex = index
        break
      }
    }

    selected.push(remaining[selectedIndex])
    remaining.splice(selectedIndex, 1)
  }

  return selected
}

function sortedSampleWords(words: VocabWord[], count: number): VocabWord[] {
  return [...words].sort((a, b) => scoreWord(a) - scoreWord(b)).slice(0, count)
}

export function selectActiveRecallTargetWords(
  words: VocabWord[],
  events: ListeningEvent[] = [],
): VocabWord[] {
  const reviewed = words.filter((word) => !isNewFsrsCard(word))
  const selected: VocabWord[] = []
  const pick = (candidates: VocabWord[]) => {
    for (const word of candidates) {
      if (selected.length >= 5) return
      if (!selected.some((candidate) => candidate.id === word.id)) selected.push(word)
    }
  }
  const strongestStruggles = reviewed
    .filter((word) => hasActiveRecallStruggleSignal(word, events))
    .sort((a, b) => activeRecallStruggleScore(b, events) - activeRecallStruggleScore(a, events))

  pick(recentFlashcardAgainWords(reviewed, events))
  pick(strongestStruggles)

  const weakDueFill = reviewed
    .filter((word) => isWeakActiveRecallFill(word))
    .sort((a, b) => activeRecallStruggleScore(b, events) - activeRecallStruggleScore(a, events))
  pick(weakDueFill)

  if (selected.length === 0) {
    pick(
      words
        .filter(isNewFsrsCard)
        .sort((a, b) => (a.lessonNumber ?? 9999) - (b.lessonNumber ?? 9999)),
    )
  }

  return selected
}

function recentFlashcardAgainWords(words: VocabWord[], events: ListeningEvent[]): VocabWord[] {
  const latestBySession = new Map<string, number>()
  for (const event of events) {
    if (event.type !== 'fsrs_rating' || event.source !== 'flashcards' || !event.sessionId) continue
    const time = Date.parse(event.timestamp)
    if (!Number.isFinite(time)) continue
    latestBySession.set(event.sessionId, Math.max(latestBySession.get(event.sessionId) ?? 0, time))
  }

  const recentSessionIds = new Set(
    [...latestBySession.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([sessionId]) => sessionId),
  )
  if (recentSessionIds.size === 0) return []

  const scoreByWord = new Map<string, number>()
  for (const event of events) {
    if (
      event.type !== 'fsrs_rating' ||
      event.rating !== 'again' ||
      event.source !== 'flashcards' ||
      !event.sessionId ||
      !recentSessionIds.has(event.sessionId)
    ) {
      continue
    }
    const time = Date.parse(event.timestamp)
    const recency = Number.isFinite(time) ? time / 86_400_000 : 0
    scoreByWord.set(event.itemId, (scoreByWord.get(event.itemId) ?? 0) + 1000 + recency)
  }

  return words
    .filter((word) => (scoreByWord.get(word.id) ?? 0) > 0)
    .sort((a, b) => (scoreByWord.get(b.id) ?? 0) - (scoreByWord.get(a.id) ?? 0))
}

function selectionWeight(word: VocabWord): number {
  const statusWeight = isNewFsrsCard(word)
    ? 100
    : word.fsrsState === 'Learning' || word.fsrsState === 'Relearning'
      ? 78
      : isFsrsDue(word)
        ? 54
        : 12
  if (word.fsrsDueAt && !isFsrsDue(word)) return 1
  const dueBonus = isFsrsDue(word) ? Math.min(overdueDays(word) * 8, 48) : 0
  const seenPenalty = Math.min(word.seenCount * 6, statusWeight * 0.72)
  return Math.max(1, statusWeight + dueBonus - seenPenalty)
}

function dueCandidates(words: VocabWord[]): VocabWord[] {
  return words.filter((word) => {
    if (isNewFsrsCard(word)) return false
    return isFsrsDue(word)
  })
}

function hasActiveRecallStruggleSignal(word: VocabWord, events: ListeningEvent[]): boolean {
  return (
    countAgainEvents(word.id, events).total > 0 ||
    (word.fsrsLapses ?? 0) > 0 ||
    (word.wrongCount ?? 0) > 0 ||
    word.fsrsState === 'Learning' ||
    word.fsrsState === 'Relearning'
  )
}

function isWeakActiveRecallFill(word: VocabWord): boolean {
  if (isNewFsrsCard(word)) return false
  return (
    isFsrsDue(word) ||
    word.fsrsState === 'Learning' ||
    word.fsrsState === 'Relearning' ||
    (word.fsrsLapses ?? 0) > 0 ||
    (word.fsrsIntervalDays ?? Number.POSITIVE_INFINITY) <= 2
  )
}

function activeRecallStruggleScore(word: VocabWord, events: ListeningEvent[]): number {
  const again = countAgainEvents(word.id, events)
  const dueBonus = isFsrsDue(word) ? 24 + Math.min(overdueDays(word) * 10, 50) : 0
  const learningBonus =
    word.fsrsState === 'Relearning' ? 45 : word.fsrsState === 'Learning' ? 36 : 0
  const lowIntervalBonus =
    !isFsrsDue(word) && (word.fsrsIntervalDays ?? Number.POSITIVE_INFINITY) <= 2 ? 12 : 0
  return (
    again.recentScore +
    again.total * 14 +
    (word.fsrsLapses ?? 0) * 22 +
    learningBonus +
    dueBonus +
    lowIntervalBonus +
    (word.wrongCount ?? 0) * 4 -
    (word.correctCount ?? 0) * 0.8
  )
}

function countAgainEvents(wordId: string, events: ListeningEvent[]): { total: number; recentScore: number } {
  const now = Date.now()
  const sevenDays = 7 * 86_400_000
  let total = 0
  let recentScore = 0

  for (const event of events) {
    if (event.itemId !== wordId || event.type !== 'fsrs_rating' || event.rating !== 'again') continue
    total += 1
    const time = Date.parse(event.timestamp)
    if (!Number.isFinite(time)) continue
    const age = now - time
    if (age >= 0 && age <= sevenDays) {
      recentScore += 42 * (1 - age / sevenDays)
    }
  }

  return { total, recentScore }
}

function isFsrsDue(word: VocabWord): boolean {
  return isFsrsCardDue(word)
}

function futureDueSort(word: VocabWord): number {
  if (!word.fsrsDueAt) return isNewFsrsCard(word) ? 0 : Number.MAX_SAFE_INTEGER
  return fsrsDueTime(word)
}

function overdueDays(word: VocabWord): number {
  if (!word.fsrsDueAt) return 0
  const dueTime = Date.parse(word.fsrsDueAt)
  if (!Number.isFinite(dueTime)) return 0
  return Math.max(0, (Date.now() - dueTime) / 86_400_000)
}

function shuffle<T>(items: T[]): T[] {
  const output = [...items]
  for (let index = output.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1))
    const item = output[index]
    output[index] = output[swapIndex]
    output[swapIndex] = item
  }
  return output
}

function chooseSentenceForWord(
  word: VocabWord,
  sentences: Sentence[],
  targetWords: VocabWord[],
  offset = 0,
): Sentence | undefined {
  const knownIds = new Set(targetWords.map((target) => target.word))
  return sentences
    .filter((sentence) => sentence.targetWords.includes(word.word))
    .sort((a, b) => sentenceScore(a, knownIds, offset) - sentenceScore(b, knownIds, offset))[0]
}

function sentenceScore(sentence: Sentence, targetWords: Set<string>, offset = 0): number {
  const overlap = sentence.targetWords.filter((word) => targetWords.has(word)).length
  const lengthPenalty = sentence.chinese.length / 18
  const multiTargetPenalty = overlap > 2 ? 12 : overlap > 1 ? 2 : 0
  return (sentence.difficulty ?? 5) + lengthPenalty + multiTargetPenalty - overlap + offset / 100
}

function contrastPrompt(word: VocabWord, words: VocabWord[]): string {
  const distractor =
    words.find(
      (candidate) =>
        candidate.id !== word.id &&
        candidate.meaning.toLocaleLowerCase() !== word.meaning.toLocaleLowerCase(),
    ) ?? words.find((candidate) => candidate.id !== word.id)
  if (!distractor) return `Which Chinese word means ${word.meaning}? ${word.word}.`
  return `Which means ${word.meaning}? ${word.word} or ${distractor.word}?`
}

function addWordLearningBlock(
  steps: LessonStep[],
  word: VocabWord,
  audioClips: AudioClip[],
  prefix: string,
  pauses: PauseTimings,
) {
  addWordAudio(steps, word, `${prefix}-word-1`)
  addMeaningAudio(steps, word, `${prefix}-meaning-1`)
  addWordAudio(steps, word, `${prefix}-word-2`)
  addMeaningAudio(steps, word, `${prefix}-meaning-2`)
  addChineseToEnglishRecall(steps, word, audioClips, `${prefix}-zh-en`, pauses.recall)
  addEnglishToChineseWordRecall(steps, word, audioClips, `${prefix}-en-zh`, pauses.recall)
  steps.push({ id: `${prefix}-ding`, kind: 'ding', label: 'Ding', wordId: word.id })
}

function addMixedWordRecall(
  steps: LessonStep[],
  words: VocabWord[],
  audioClips: AudioClip[],
  pauses: PauseTimings,
) {
  shuffle(words).forEach((word, index) => {
    addChineseToEnglishRecall(
      steps,
      word,
      audioClips,
      `mixed-1-zh-en-${index}-${word.id}`,
      pauses.recall,
    )
  })
  shuffle(words).forEach((word, index) => {
    addEnglishToChineseWordRecall(
      steps,
      word,
      audioClips,
      `mixed-1-en-zh-${index}-${word.id}`,
      Math.max(pauses.recall - 0.3, pauses.quick),
    )
  })
  shuffle(words)
    .slice(0, Math.min(3, words.length))
    .forEach((word, index) => {
      addAudioToChineseWordRecall(
        steps,
        word,
        audioClips,
        `mixed-audio-zh-${index}-${word.id}`,
        Math.max(pauses.recall - 0.2, pauses.quick + 0.5),
      )
  })
  buildContrastPairs(words).forEach(([word, other], index) => {
    addContrastQuestion(steps, word, other, audioClips, `contrast-${index}-${word.id}`, pauses)
  })
}

function addSentenceSupport(
  steps: LessonStep[],
  sentences: Sentence[],
  audioClips: AudioClip[],
  pauseSeconds = 3,
) {
  if (sentences.length === 0) return
  addPrompt(steps, audioClips, 'listen', 'Sentence listening')
  sentences.forEach((sentence, index) => {
    const prefix = `sentence-support-${index}-${sentence.id}`
    addSentenceAudio(steps, sentence, `${prefix}-sentence-1`)
    addSentenceMeaningAudio(steps, sentence, `${prefix}-meaning-1`)
    addSentenceAudio(steps, sentence, `${prefix}-sentence-2`)
    addSentenceMeaningAudio(steps, sentence, `${prefix}-meaning-2`)
    addPrompt(steps, audioClips, 'meaning', 'What does it mean?', undefined, sentence.id)
    addSentenceAudio(steps, sentence, `${prefix}-recall-sentence`)
    steps.push({
      id: `${prefix}-pause`,
      kind: 'pause',
      seconds: pauseSeconds,
      label: 'Think',
      sentenceId: sentence.id,
      quiz: { kind: 'sentence-zh-en' },
    })
    addSentenceMeaningAudio(steps, sentence, `${prefix}-answer`)
    steps.push({ id: `${prefix}-ding`, kind: 'ding', label: 'Ding', sentenceId: sentence.id })
  })
}

function addQuickFinalPass(
  steps: LessonStep[],
  words: VocabWord[],
  audioClips: AudioClip[],
  pauses: PauseTimings,
) {
  addPrompt(steps, audioClips, 'quick-meaning', 'Quick meaning')
  shuffle(words).forEach((word, index) => {
    const prefix = `quick-zh-en-${index}-${word.id}`
    addWordAudio(steps, word, `${prefix}-word`)
    steps.push({
      id: `${prefix}-pause`,
      kind: 'pause',
      seconds: pauses.quick,
      label: 'Think',
      wordId: word.id,
    })
    addMeaningAudio(steps, word, `${prefix}-meaning`)
  })
  steps.push({ id: 'quick-final-ding', kind: 'ding', label: 'Ding' })
}

function addChineseToEnglishRecall(
  steps: LessonStep[],
  word: VocabWord,
  audioClips: AudioClip[],
  prefix: string,
  pauseSeconds: number,
) {
  addWhatDoesPrompt(steps, word, audioClips, `${prefix}-prompt`)
  addWordAudio(steps, word, `${prefix}-word`)
  steps.push({
    id: `${prefix}-pause`,
    kind: 'pause',
    seconds: pauseSeconds,
    label: 'Think',
    wordId: word.id,
    quiz: { kind: 'zh-en' },
  })
  addMeaningAudio(steps, word, `${prefix}-meaning`)
}

function addEnglishToChineseWordRecall(
  steps: LessonStep[],
  word: VocabWord,
  audioClips: AudioClip[],
  prefix: string,
  pauseSeconds: number,
) {
  addPrompt(steps, audioClips, 'which-chinese-means', 'Which word means this?', word.id)
  addMeaningAudio(steps, word, `${prefix}-meaning`)
  steps.push({
    id: `${prefix}-pause`,
    kind: 'pause',
    seconds: pauseSeconds,
    label: 'Think',
    wordId: word.id,
    quiz: { kind: 'en-zh' },
  })
  addWordAudio(steps, word, `${prefix}-word`)
}

function addAudioToChineseWordRecall(
  steps: LessonStep[],
  word: VocabWord,
  audioClips: AudioClip[],
  prefix: string,
  pauseSeconds: number,
) {
  if (!word.audioWordId) return
  addPrompt(steps, audioClips, 'listen', 'Listen', word.id)
  addWordAudio(steps, word, `${prefix}-word`)
  steps.push({
    id: `${prefix}-pause`,
    kind: 'pause',
    seconds: pauseSeconds,
    label: 'Which word?',
    wordId: word.id,
    quiz: { kind: 'audio-zh' },
  })
  addWordAudio(steps, word, `${prefix}-answer`)
}

function addContrastQuestion(
  steps: LessonStep[],
  word: VocabWord,
  other: VocabWord,
  audioClips: AudioClip[],
  prefix: string,
  pauses: PauseTimings,
) {
  addPrompt(steps, audioClips, 'which-chinese-means', 'Which means?', word.id)
  addMeaningAudio(steps, word, `${prefix}-meaning`)
  addWordAudio(steps, word, `${prefix}-option-a`)
  addPrompt(steps, audioClips, 'or', 'Or', word.id)
  addWordAudio(steps, other, `${prefix}-option-b`)
  steps.push({
    id: `${prefix}-pause`,
    kind: 'pause',
    seconds: pauses.contrast,
    label: 'Think',
    wordId: word.id,
    quiz: { kind: 'contrast', otherWordId: other.id },
  })
  addWordAudio(steps, word, `${prefix}-answer`)
  steps.push({ id: `${prefix}-ding`, kind: 'ding', label: 'Ding', wordId: word.id })
}

function getPauseTimings(profile: PauseProfile = 'normal'): PauseTimings {
  return {
    gentle: { recall: 3.5, speaking: 2.6, quick: 1.3, contrast: 3.2 },
    normal: { recall: 2.5, speaking: 1.8, quick: 0.8, contrast: 2 },
    fast: { recall: 1.5, speaking: 1.1, quick: 0.6, contrast: 1.3 },
    challenge: { recall: 0.8, speaking: 0.7, quick: 0.4, contrast: 0.8 },
  }[profile]
}

function getActiveRecallPauseTimings(): PauseTimings {
  // Active Recall pauses the player for questions, so these are only tiny
  // marker segments that let the rendered audio timeline expose a quiz point.
  return { recall: 0.05, speaking: 0.05, quick: 0.01, contrast: 0.05 }
}

function addWhatDoesPrompt(
  steps: LessonStep[],
  word: VocabWord,
  audioClips: AudioClip[],
  id: string,
) {
  const clip = findWhatDoesPrompt(audioClips, word)
  if (clip) {
    steps.push({
      id,
      kind: 'audio',
      audioId: clip.id,
      label: `What does ${word.word} mean?`,
      wordId: word.id,
    })
    return
  }
  addPrompt(steps, audioClips, 'meaning', 'What does this mean?', word.id)
}

function buildContrastPairs(words: VocabWord[]): Array<[VocabWord, VocabWord]> {
  if (words.length < 2) return []
  return shuffle(words)
    .map((word, index): [VocabWord, VocabWord] => [
      word,
      words[(index + 2) % words.length] ?? words[0] ?? word,
    ])
    .filter(([word, other]) => word.id !== other.id)
    .slice(0, 2)
}

function uniqueSentences(sentences: Sentence[]): Sentence[] {
  const seen = new Set<string>()
  return sentences.filter((sentence) => {
    if (seen.has(sentence.id)) return false
    seen.add(sentence.id)
    return true
  })
}

function addPrompt(
  steps: LessonStep[],
  audioClips: AudioClip[],
  promptId: string,
  label: string,
  wordId?: string,
  sentenceId?: string,
) {
  const clip = findPrompt(audioClips, promptId)
  if (!clip) return
  steps.push({
    id: `prompt-${promptId}-${steps.length}`,
    kind: 'audio',
    audioId: clip.id,
    label,
    wordId,
    sentenceId,
  })
}

function addWordAudio(steps: LessonStep[], word: VocabWord, id: string) {
  if (!word.audioWordId) return
  steps.push({
    id,
    kind: 'audio',
    audioId: word.audioWordId,
    label: word.word,
    wordId: word.id,
  })
}

function addMeaningAudio(steps: LessonStep[], word: VocabWord, id: string) {
  if (!word.audioMeaningId) return
  steps.push({
    id,
    kind: 'audio',
    audioId: word.audioMeaningId,
    label: word.meaning,
    wordId: word.id,
  })
}

function addSentenceAudio(steps: LessonStep[], sentence: Sentence, id: string) {
  if (!sentence.audioSentenceId) return
  steps.push({
    id,
    kind: 'audio',
    audioId: sentence.audioSentenceId,
    label: sentence.chinese,
    sentenceId: sentence.id,
  })
}

function addSentenceMeaningAudio(steps: LessonStep[], sentence: Sentence, id: string) {
  if (!sentence.audioEnglishId) return
  steps.push({
    id,
    kind: 'audio',
    audioId: sentence.audioEnglishId,
    label: sentence.english,
    sentenceId: sentence.id,
  })
}

function findPrompt(audioClips: AudioClip[], promptId: string): AudioClip | undefined {
  return audioClips.find((clip) => {
    if (clip.type !== 'prompt') return false
    const candidates = [clip.id, clip.manifestId, clip.label, clip.path, clip.text].filter(Boolean)
    return candidates.some((candidate) => normalizePrompt(String(candidate)) === promptId)
  })
}

function findWhatDoesPrompt(audioClips: AudioClip[], word: VocabWord): AudioClip | undefined {
  return audioClips.find((clip) => {
    if (clip.type !== 'prompt') return false
    const linkedIds = clip.linkedWordIds ?? []
    const linkedToWord = linkedIds.includes(word.id) || linkedIds.includes(word.word)
    if (!linkedToWord) return false
    const label = normalizePrompt(`${clip.id} ${clip.manifestId ?? ''} ${clip.label} ${clip.path}`)
    return label.includes('what-does')
  })
}

function normalizePrompt(value: string): string {
  return value
    .trim()
    .toLocaleLowerCase()
    .replace(/\.[a-z0-9]+$/i, '')
    .replace(/^.*\//, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

export interface SentenceLessonItem {
  word: string
  chinese: string
  english: string
}

export function selectSentenceLessonSet(
  sentences: SentenceLessonItem[],
  sentenceSrsMap: Map<string, SentenceSrsRecord>,
  count = 5,
  queueOffset = 0,
): SentenceLessonItem[] {
  const selected: SentenceLessonItem[] = []
  const selectedWords = new Set<string>()

  const pick = (candidates: SentenceLessonItem[]) => {
    for (const sent of candidates) {
      if (selected.length >= count) return
      if (selectedWords.has(sent.word)) continue
      selected.push(sent)
      selectedWords.add(sent.word)
    }
  }

  // Priority 1: Due sentences (overdue by most)
  const due = sentences
    .filter((s) => {
      const record = sentenceSrsMap.get(s.word)
      return record && isSentenceSrsDue(record) && !isNewSentenceSrs(record)
    })
    .sort((a, b) => {
      const ra = sentenceSrsMap.get(a.word)
      const rb = sentenceSrsMap.get(b.word)
      const da = ra?.fsrsDueAt ? Date.parse(ra.fsrsDueAt) : 0
      const db = rb?.fsrsDueAt ? Date.parse(rb.fsrsDueAt) : 0
      return da - db
    })
  pick(due)

  // Priority 2: New sentences — advance through pool in order from queue offset
  const newSentences = sentences.filter((s) => {
    const record = sentenceSrsMap.get(s.word)
    return !record || isNewSentenceSrs(record)
  })
  const offset = queueOffset % Math.max(1, newSentences.length)
  pick([...newSentences.slice(offset), ...newSentences.slice(0, offset)])

  // Priority 3: Lapsed sentences (lapses > 0)
  const lapsed = sentences
    .filter((s) => {
      const record = sentenceSrsMap.get(s.word)
      return record && (record.fsrsLapses ?? 0) > 0
    })
    .sort((a, b) => {
      const ra = sentenceSrsMap.get(a.word)
      const rb = sentenceSrsMap.get(b.word)
      return (rb?.fsrsLapses ?? 0) - (ra?.fsrsLapses ?? 0)
    })
  pick(lapsed)

  // Priority 4: Random fill from remaining
  const remaining = sentences.filter((s) => !selectedWords.has(s.word))
  const shuffled = [...remaining].sort(() => Math.random() - 0.5)
  pick(shuffled)

  return selected.slice(0, count)
}

export function buildSentenceRoundOrder(setSize = 5, rounds = 25): number[] {
  const order: number[] = []
  for (let r = 0; r < rounds; r++) {
    const indices = Array.from({ length: setSize }, (_, i) => i)
    for (let i = indices.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [indices[i], indices[j]] = [indices[j], indices[i]]
    }
    order.push(...indices)
  }
  return order
}

export function createSentenceLesson(
  englishText: string,
  chineseText: string,
): LessonPlan {
  const steps: LessonStep[] = [
    { id: 'sentence-english', kind: 'speech', text: englishText, label: 'English prompt' },
    { id: 'sentence-pause-after-english', kind: 'pause', seconds: 1.2, label: 'Recall pause' },
    { id: 'sentence-chinese-first', kind: 'speech', text: chineseText, label: 'Chinese sentence' },
    { id: 'sentence-recall-pause', kind: 'pause', seconds: 2.5, label: 'Try saying it' },
    { id: 'sentence-chinese-repeat', kind: 'speech', text: chineseText, label: 'Chinese repeat' },
    { id: 'sentence-gap', kind: 'pause', seconds: 0.8, label: 'Next sentence gap' },
  ]

  return {
    id: `sentence-${Date.now()}`,
    title: chineseText,
    targetWords: [],
    steps,
  }
}
