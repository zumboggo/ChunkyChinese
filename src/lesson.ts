import type { AudioClip, LessonPlan, LessonStep, Sentence, VocabWord } from './types'

interface TargetSelectionOptions {
  randomize?: boolean
}

export function createLesson(
  words: VocabWord[],
  sentences: Sentence[],
  manualIds: string[] = [],
  options: TargetSelectionOptions = {},
): LessonPlan {
  const targetWords = selectTargetWords(words, manualIds, options)
  const steps: LessonStep[] = []

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
      seconds: 2,
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
      seconds: 2,
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
        seconds: 3,
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
  const targetEntries = targetWords.map((word, index) => ({
    word,
    sentence: chooseSentenceForWord(word, sentences, targetWords, index),
  }))
  const targetSentences = uniqueSentences(
    targetEntries
      .map((entry) => entry.sentence)
      .filter((sentence): sentence is Sentence => Boolean(sentence)),
  )

  addPrompt(steps, audioClips, 'listen', 'Listen')
  targetWords.forEach((word, index) => {
    addWordLearningBlock(steps, word, audioClips, `word-block-${index + 1}-${word.id}`)
  })
  addMixedWordRecall(steps, targetWords, audioClips)
  addSentenceSupport(steps, targetSentences.slice(0, 5), audioClips)
  addQuickFinalPass(steps, targetWords, audioClips)

  return {
    id: `pocket:${Date.now()}`,
    title: `${targetWords.length} word lesson`,
    targetWords,
    steps,
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
      .filter((word) => word.status !== 'known')
    return options.randomize ? weightedSampleWords(selected, 5) : selected.slice(0, 5)
  }

  const candidates = words.filter((word) => word.status !== 'known')
  return options.randomize
    ? weightedSampleWords(candidates, 5)
    : [...candidates].sort((a, b) => scoreWord(a) - scoreWord(b)).slice(0, 5)
}

function scoreWord(word: VocabWord): number {
  const statusWeight = {
    new: 0,
    learning: 4,
    review: 12,
    familiar: 20,
    known: 999,
  }[word.status]
  return statusWeight + word.seenCount * 2 + (word.lessonNumber ?? 999) / 100
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

function selectionWeight(word: VocabWord): number {
  const statusWeight = {
    new: 100,
    learning: 78,
    review: 34,
    familiar: 12,
    known: 0,
  }[word.status]
  const seenPenalty = Math.min(word.seenCount * 6, statusWeight * 0.72)
  return Math.max(1, statusWeight - seenPenalty)
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
) {
  addWordAudio(steps, word, `${prefix}-word-1`)
  addMeaningAudio(steps, word, `${prefix}-meaning-1`)
  addWordAudio(steps, word, `${prefix}-word-2`)
  addMeaningAudio(steps, word, `${prefix}-meaning-2`)
  addChineseToEnglishRecall(steps, word, audioClips, `${prefix}-zh-en`, 2.6)
  addEnglishToChineseWordRecall(steps, word, audioClips, `${prefix}-en-zh`, 2.6)
  addWordSpeakingPractice(steps, word, audioClips, `${prefix}-speak`, 1.8)
  steps.push({ id: `${prefix}-ding`, kind: 'ding', label: 'Ding', wordId: word.id })
}

function addMixedWordRecall(
  steps: LessonStep[],
  words: VocabWord[],
  audioClips: AudioClip[],
) {
  for (let round = 1; round <= 2; round += 1) {
    shuffle(words).forEach((word, index) => {
      addChineseToEnglishRecall(
        steps,
        word,
        audioClips,
        `mixed-${round}-zh-en-${index}-${word.id}`,
        round === 1 ? 2.2 : 2,
      )
    })
    shuffle(words).forEach((word, index) => {
      addEnglishToChineseWordRecall(
        steps,
        word,
        audioClips,
        `mixed-${round}-en-zh-${index}-${word.id}`,
        round === 1 ? 2.2 : 2,
      )
    })
  }
  shuffle(words).forEach((word, index) => {
    addWordSpeakingPractice(steps, word, audioClips, `mixed-speak-${index}-${word.id}`, 1.6)
  })
  buildContrastPairs(words).forEach(([word, other], index) => {
    addContrastQuestion(steps, word, other, audioClips, `contrast-${index}-${word.id}`)
  })
}

function addSentenceSupport(
  steps: LessonStep[],
  sentences: Sentence[],
  audioClips: AudioClip[],
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
      seconds: 3,
      label: 'Think',
      sentenceId: sentence.id,
    })
    addSentenceMeaningAudio(steps, sentence, `${prefix}-answer`)
    steps.push({ id: `${prefix}-ding`, kind: 'ding', label: 'Ding', sentenceId: sentence.id })
  })
}

function addQuickFinalPass(
  steps: LessonStep[],
  words: VocabWord[],
  audioClips: AudioClip[],
) {
  addPrompt(steps, audioClips, 'quick-meaning', 'Quick meaning')
  for (let round = 1; round <= 2; round += 1) {
    words.forEach((word, index) => {
      const prefix = `quick-${round}-zh-en-${index}-${word.id}`
      addWordAudio(steps, word, `${prefix}-word`)
      steps.push({
        id: `${prefix}-pause`,
        kind: 'pause',
        seconds: 0.8,
        label: 'Think',
        wordId: word.id,
      })
      addMeaningAudio(steps, word, `${prefix}-meaning`)
    })
    shuffle(words).forEach((word, index) => {
      const prefix = `quick-${round}-en-zh-${index}-${word.id}`
      addMeaningAudio(steps, word, `${prefix}-meaning`)
      steps.push({
        id: `${prefix}-pause`,
        kind: 'pause',
        seconds: 0.8,
        label: 'Think',
        wordId: word.id,
      })
      addWordAudio(steps, word, `${prefix}-word`)
    })
  }
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
  steps.push({ id: `${prefix}-pause`, kind: 'pause', seconds: pauseSeconds, label: 'Think', wordId: word.id })
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
  steps.push({ id: `${prefix}-pause`, kind: 'pause', seconds: pauseSeconds, label: 'Think', wordId: word.id })
  addWordAudio(steps, word, `${prefix}-word`)
}

function addWordSpeakingPractice(
  steps: LessonStep[],
  word: VocabWord,
  audioClips: AudioClip[],
  prefix: string,
  pauseSeconds: number,
) {
  addPrompt(steps, audioClips, 'again', 'Say it', word.id)
  addWordAudio(steps, word, `${prefix}-word-1`)
  steps.push({ id: `${prefix}-pause`, kind: 'pause', seconds: pauseSeconds, label: 'Say it', wordId: word.id })
  addWordAudio(steps, word, `${prefix}-word-2`)
}

function addContrastQuestion(
  steps: LessonStep[],
  word: VocabWord,
  other: VocabWord,
  audioClips: AudioClip[],
  prefix: string,
) {
  addPrompt(steps, audioClips, 'which-chinese-means', 'Which means?', word.id)
  addMeaningAudio(steps, word, `${prefix}-meaning`)
  addWordAudio(steps, word, `${prefix}-option-a`)
  addPrompt(steps, audioClips, 'or', 'Or', word.id)
  addWordAudio(steps, other, `${prefix}-option-b`)
  steps.push({ id: `${prefix}-pause`, kind: 'pause', seconds: 2, label: 'Think', wordId: word.id })
  addWordAudio(steps, word, `${prefix}-answer`)
  steps.push({ id: `${prefix}-ding`, kind: 'ding', label: 'Ding', wordId: word.id })
}

function addWhatDoesPrompt(
  steps: LessonStep[],
  word: VocabWord,
  audioClips: AudioClip[],
  id: string,
) {
  const clip = findPrompt(audioClips, `what-does-${word.word}`)
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

function normalizePrompt(value: string): string {
  return value
    .trim()
    .toLocaleLowerCase()
    .replace(/\.[a-z0-9]+$/i, '')
    .replace(/^.*\//, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}
