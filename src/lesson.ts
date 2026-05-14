import type { AudioClip, LessonPlan, LessonStep, Sentence, VocabWord } from './types'

export function createLesson(
  words: VocabWord[],
  sentences: Sentence[],
  manualIds: string[] = [],
): LessonPlan {
  const targetWords = selectTargetWords(words, manualIds)
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
): LessonPlan {
  const targetWords = selectTargetWords(words, manualIds)
  const steps: LessonStep[] = []
  const targetEntries = targetWords.map((word) => ({
    word,
    sentence: chooseSentenceForWord(word, sentences, targetWords),
  }))
  const targetSentences = uniqueSentences(
    targetEntries
      .map((entry) => entry.sentence)
      .filter((sentence): sentence is Sentence => Boolean(sentence)),
  )

  addPrompt(steps, audioClips, 'listen', 'Listen')
  addOpeningSentence(steps, sentences, audioClips, targetWords)

  targetEntries.forEach(({ word, sentence }, index) => {
    const prefix = `pocket-${index + 1}-${word.id}`

    addPrompt(steps, audioClips, 'listen', 'Listen', word.id)
    addWordAudio(steps, word, `${prefix}-word`)
    addMeaningAudio(steps, word, `${prefix}-meaning`)
    addPrompt(steps, audioClips, 'meaning', 'Meaning?', word.id)
    addWordAudio(steps, word, `${prefix}-meaning-word`)
    steps.push({ id: `${prefix}-pause`, kind: 'pause', seconds: 3, label: 'Think', wordId: word.id })
    addMeaningAudio(steps, word, `${prefix}-meaning-answer`)
    steps.push({ id: `${prefix}-ding`, kind: 'ding', label: 'Ding', wordId: word.id })

    if (sentence) {
      addPrompt(steps, audioClips, 'listen', 'Listen', word.id, sentence.id)
      addSentenceAudio(steps, sentence, `${prefix}-sentence`)
      addSentenceMeaningAudio(steps, sentence, `${prefix}-sentence-en`)
      addPrompt(steps, audioClips, 'again', 'Again', word.id, sentence.id)
      addSentenceAudio(steps, sentence, `${prefix}-sentence-again`)
      addSentenceMeaningAudio(steps, sentence, `${prefix}-sentence-en-again`)
      addPrompt(
        steps,
        audioClips,
        ['understand', 'english', 'meaning', 'translate'][index % 4],
        'Recall sentence',
        word.id,
        sentence.id,
      )
      addSentenceAudio(steps, sentence, `${prefix}-sentence-question`)
      steps.push({
        id: `${prefix}-sentence-pause`,
        kind: 'pause',
        seconds: 3,
        label: 'Think',
        wordId: word.id,
        sentenceId: sentence.id,
      })
      addSentenceMeaningAudio(steps, sentence, `${prefix}-sentence-answer`)
      steps.push({ id: `${prefix}-sentence-ding`, kind: 'ding', label: 'Ding', wordId: word.id })
    }
  })

  addRecognitionPass(steps, targetWords, audioClips)
  addMeaningChoicePass(steps, targetWords, audioClips)
  addSentenceChoicePass(steps, targetSentences, audioClips)
  addStoryReviewPass(steps, targetSentences, audioClips)
  addQuickMeaningPass(steps, targetWords, audioClips)

  return {
    id: `pocket:${Date.now()}`,
    title: `${targetWords.length}-word pocket lesson`,
    targetWords,
    steps,
  }
}

export function selectTargetWords(words: VocabWord[], manualIds: string[] = []): VocabWord[] {
  if (manualIds.length > 0) {
    return manualIds
      .map((id) => words.find((word) => word.id === id))
      .filter((word): word is VocabWord => Boolean(word))
      .filter((word) => word.status !== 'known')
      .slice(0, 5)
  }

  return [...words]
    .filter((word) => word.status !== 'known')
    .sort((a, b) => scoreWord(a) - scoreWord(b))
    .slice(0, 5)
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

function chooseSentenceForWord(
  word: VocabWord,
  sentences: Sentence[],
  targetWords: VocabWord[],
): Sentence | undefined {
  const knownIds = new Set(targetWords.map((target) => target.word))
  return sentences
    .filter((sentence) => sentence.targetWords.includes(word.word))
    .sort((a, b) => sentenceScore(a, knownIds) - sentenceScore(b, knownIds))[0]
}

function sentenceScore(sentence: Sentence, targetWords: Set<string>): number {
  const overlap = sentence.targetWords.filter((word) => targetWords.has(word)).length
  return (sentence.difficulty ?? 5) - overlap
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

function addOpeningSentence(
  steps: LessonStep[],
  sentences: Sentence[],
  audioClips: AudioClip[],
  targetWords: VocabWord[],
) {
  const opener =
    sentences.find((sentence) => sentence.audioSentenceId && sentence.audioEnglishId) ??
    sentences.find((sentence) =>
      sentence.targetWords.some((target) =>
        targetWords.some((word) => word.word === target && word.status !== 'known'),
      ),
    )
  if (!opener) return
  addPrompt(steps, audioClips, 'listen', 'Listen', undefined, opener.id)
  addSentenceAudio(steps, opener, 'opening-sentence')
  addSentenceMeaningAudio(steps, opener, 'opening-english')
  addPrompt(steps, audioClips, 'again', 'Again', undefined, opener.id)
  addSentenceAudio(steps, opener, 'opening-sentence-again')
  addSentenceMeaningAudio(steps, opener, 'opening-english-again')
}

function addRecognitionPass(
  steps: LessonStep[],
  words: VocabWord[],
  audioClips: AudioClip[],
) {
  words.forEach((word, index) => {
    const other = words[(index + 2) % words.length]
    const prefix = `recognition-${index}-${word.id}`
    addPrompt(steps, audioClips, 'which-chinese-means', 'Which Chinese means?', word.id)
    addMeaningAudio(steps, word, `${prefix}-meaning`)
    addWordAudio(steps, word, `${prefix}-option-a`)
    if (other && other.id !== word.id) {
      addPrompt(steps, audioClips, 'or', 'Or', word.id)
      addWordAudio(steps, other, `${prefix}-option-b`)
    }
    steps.push({ id: `${prefix}-pause`, kind: 'pause', seconds: 3, label: 'Think', wordId: word.id })
    addWordAudio(steps, word, `${prefix}-answer`)
    steps.push({ id: `${prefix}-ding`, kind: 'ding', label: 'Ding', wordId: word.id })
  })
}

function addMeaningChoicePass(
  steps: LessonStep[],
  words: VocabWord[],
  audioClips: AudioClip[],
) {
  words.forEach((word, index) => {
    const other =
      words.find((candidate) => candidate.id !== word.id && candidate.meaning !== word.meaning) ??
      words[(index + 1) % words.length]
    if (!other || other.id === word.id) return
    const prefix = `meaning-choice-${index}-${word.id}`
    addPrompt(steps, audioClips, 'choose-the-meaning', 'Choose the meaning', word.id)
    addWordAudio(steps, word, `${prefix}-word`)
    addMeaningAudio(steps, other, `${prefix}-a`)
    addMeaningAudio(steps, word, `${prefix}-b`)
    steps.push({ id: `${prefix}-pause`, kind: 'pause', seconds: 3, label: 'Think', wordId: word.id })
    addMeaningAudio(steps, word, `${prefix}-answer`)
    steps.push({ id: `${prefix}-ding`, kind: 'ding', label: 'Ding', wordId: word.id })
  })
}

function addSentenceChoicePass(
  steps: LessonStep[],
  sentences: Sentence[],
  audioClips: AudioClip[],
) {
  sentences.slice(0, 3).forEach((sentence, index) => {
    const other =
      sentences.find((candidate) => candidate.id !== sentence.id) ?? sentences[(index + 1) % sentences.length]
    if (!other || other.id === sentence.id) return
    const prefix = `sentence-choice-${index}-${sentence.id}`
    addPrompt(steps, audioClips, 'choose-the-meaning', 'Which sentence means?', undefined, sentence.id)
    addSentenceMeaningAudio(steps, sentence, `${prefix}-meaning`)
    addSentenceAudio(steps, sentence, `${prefix}-option-a`)
    addSentenceAudio(steps, other, `${prefix}-option-b`)
    steps.push({
      id: `${prefix}-pause`,
      kind: 'pause',
      seconds: 3,
      label: 'Think',
      sentenceId: sentence.id,
    })
    addSentenceAudio(steps, sentence, `${prefix}-answer`)
    steps.push({ id: `${prefix}-ding`, kind: 'ding', label: 'Ding', sentenceId: sentence.id })
  })
}

function uniqueSentences(sentences: Sentence[]): Sentence[] {
  const seen = new Set<string>()
  return sentences.filter((sentence) => {
    if (seen.has(sentence.id)) return false
    seen.add(sentence.id)
    return true
  })
}

function addStoryReviewPass(
  steps: LessonStep[],
  sentences: Sentence[],
  audioClips: AudioClip[],
) {
  if (sentences.length === 0) return
  addPrompt(steps, audioClips, 'listen', 'Listen')
  sentences.forEach((sentence, index) => {
    const prefix = `story-review-${index}-${sentence.id}`
    addSentenceAudio(steps, sentence, `${prefix}-sentence`)
    if (index % 2 === 0) {
      steps.push({
        id: `${prefix}-pause`,
        kind: 'pause',
        seconds: 3,
        label: 'Think',
        sentenceId: sentence.id,
      })
    }
    addSentenceMeaningAudio(steps, sentence, `${prefix}-meaning`)
    steps.push({ id: `${prefix}-ding`, kind: 'ding', label: 'Ding', sentenceId: sentence.id })
    if (index % 2 === 1) {
      addPrompt(steps, audioClips, 'again', 'Again', undefined, sentence.id)
      addSentenceAudio(steps, sentence, `${prefix}-again`)
      addSentenceMeaningAudio(steps, sentence, `${prefix}-again-meaning`)
    }
  })
}

function addQuickMeaningPass(
  steps: LessonStep[],
  words: VocabWord[],
  audioClips: AudioClip[],
) {
  addPrompt(steps, audioClips, 'quick-meaning', 'Quick meaning')
  words.forEach((word, index) => {
    const prefix = `quick-${index}-${word.id}`
    addWordAudio(steps, word, `${prefix}-word`)
    steps.push({ id: `${prefix}-pause`, kind: 'pause', seconds: 3, label: 'Think', wordId: word.id })
    addMeaningAudio(steps, word, `${prefix}-meaning`)
    steps.push({ id: `${prefix}-ding`, kind: 'ding', label: 'Ding', wordId: word.id })
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
