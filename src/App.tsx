import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import {
  completeWordExposure,
  DEFAULT_HOTKEYS,
  downloadText,
  exportBackup,
  getAllAudioClips,
  getAllClipPacks,
  getAllSentences,
  getAllWords,
  getAudioClip,
  getActivePackId,
  getDashboardStats,
  getHostedClipPackIndex,
  getHotkeys,
  importAudioFiles,
  importBackup,
  importClipPackFiles,
  importCsvTtsPack,
  importHostedClipPack,
  importSentencesCsv,
  importVocabCsv,
  rateWordFsrs,
  recordEvent,
  recordQuizAnswer,
  saveRenderedLesson,
  seedLmsWordsIfEmpty,
  saveHotkeys,
  setActivePackId as persistActivePackId,
  updateWordStatus,
} from './db'
import { createLesson, createPocketLesson, createRescueLesson, type PauseProfile } from './lesson'
import { renderLessonToWav } from './renderAudio'
import type {
  AudioClip,
  ClipPack,
  DashboardStats,
  FsrsRating,
  HostedClipPack,
  HotkeySettings,
  ImportSummary,
  LessonPlan,
  LessonStep,
  RenderedLesson,
  RenderedLessonSegment,
  Sentence,
  StudyMode,
  VocabWord,
  WordStatus,
} from './types'

type Screen = 'dashboard' | 'words' | 'import' | 'lesson'
type LessonStartOptions = {
  randomize?: boolean
  playAfterRender?: boolean
  pauseProfile?: PauseProfile
}
type LessonKind = 'main' | 'rescue'
type QuizKind = 'zh-en' | 'en-zh' | 'audio-zh' | 'contrast' | 'sentence-zh-en'
type RecallStage = 'easy' | 'audio-first' | 'try-before-choices' | 'quick' | 'rescue'

interface ActiveQuiz {
  id: string
  kind: QuizKind
  stage: RecallStage
  prompt: string
  wordId: string
  sentenceId?: string
  correctValue: string
  options: Array<{ value: string; label: string }>
}

interface QuizResponse {
  selected?: string
  correct: boolean
  skipped?: boolean
  revealed?: boolean
  hintCount?: number
}

const emptyStats: DashboardStats = {
  counts: { new: 0, learning: 0, familiar: 0, known: 0, review: 0 },
  dueNow: 0,
  dueSoon: 0,
  newAvailable: 0,
  scheduled: 0,
  minutesToday: 0,
  clipsCompletedToday: 0,
  knownToday: 0,
}

function App() {
  const [screen, setScreen] = useState<Screen>('dashboard')
  const [words, setWords] = useState<VocabWord[]>([])
  const [sentences, setSentences] = useState<Sentence[]>([])
  const [audioClips, setAudioClips] = useState<AudioClip[]>([])
  const [clipPacks, setClipPacks] = useState<ClipPack[]>([])
  const [hostedPacks, setHostedPacks] = useState<HostedClipPack[]>([])
  const [activePackId, setActivePackId] = useState<string | undefined>()
  const [stats, setStats] = useState<DashboardStats>(emptyStats)
  const [statusFilter, setStatusFilter] = useState<WordStatus | 'all'>('all')
  const [search, setSearch] = useState('')
  const [lessonFilter, setLessonFilter] = useState('')
  const [tagFilter, setTagFilter] = useState('')
  const [selectedWordIds, setSelectedWordIds] = useState<string[]>([])
  const [lesson, setLesson] = useState<LessonPlan | null>(null)
  const [lessonKind, setLessonKind] = useState<LessonKind>('main')
  const [ratingWordIds, setRatingWordIds] = useState<string[]>([])
  const [currentStepIndex, setCurrentStepIndex] = useState(0)
  const [lessonMode, setLessonMode] = useState<'pocket' | 'live'>('pocket')
  const [renderedLesson, setRenderedLesson] = useState<RenderedLesson | null>(null)
  const [renderedUrl, setRenderedUrl] = useState('')
  const [rendering, setRendering] = useState(false)
  const [pocketProgress, setPocketProgress] = useState({ current: 0, duration: 0 })
  const [showPinyin, setShowPinyin] = useState(true)
  const [showEnglish, setShowEnglish] = useState(true)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [isPlaying, setIsPlaying] = useState(false)
  const [studyMode, setStudyMode] = useState<StudyMode>('audioHandsFree')
  const [minimalVisualMode, setMinimalVisualMode] = useState(false)
  const [pauseProfile, setPauseProfile] = useState<PauseProfile>('normal')
  const [quizResponses, setQuizResponses] = useState<Record<string, QuizResponse>>({})
  const [quizHints, setQuizHints] = useState<Record<string, number>>({})
  const [missedWordIds, setMissedWordIds] = useState<string[]>([])
  const [showMissedRescue, setShowMissedRescue] = useState(false)
  const [fsrsRatings, setFsrsRatings] = useState<Record<string, FsrsRating>>({})
  const [showReviewPrompt, setShowReviewPrompt] = useState(false)
  const [savedResumeTime, setSavedResumeTime] = useState<number | null>(null)
  const [autoNextLesson, setAutoNextLesson] = useState(true)
  const [autoAdvance, setAutoAdvance] = useState(true)
  const [hotkeys, setHotkeys] = useState<HotkeySettings>(DEFAULT_HOTKEYS)
  const [csvPackName, setCsvPackName] = useState('My CSV Pack')
  const [csvPackLanguage, setCsvPackLanguage] = useState('zh-CN')
  const [eyesFreeRatingIndex, setEyesFreeRatingIndex] = useState<number | null>(null)
  const [playbackRate, setPlaybackRate] = useState(1)
  const [lastSummary, setLastSummary] = useState<string>('Ready.')
  const [seedMessage, setSeedMessage] = useState('Loading LMS vocabulary...')
  const [hostedImporting, setHostedImporting] = useState(false)
  const [hostedProgress, setHostedProgress] = useState('')
  const runToken = useRef(0)
  const activeAnswerLockRef = useRef<string | null>(null)
  const autoContinueTimeoutRef = useRef<number | null>(null)
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const pocketAudioRef = useRef<HTMLAudioElement | null>(null)
  const playModeRef = useRef<HTMLElement | null>(null)

  const refresh = useCallback(async () => {
    const [nextWords, nextSentences, nextAudio, nextPacks, nextActivePackId, nextStats] = await Promise.all([
      getAllWords(),
      getAllSentences(),
      getAllAudioClips(),
      getAllClipPacks(),
      getActivePackId(),
      getDashboardStats(),
    ])
    setWords(nextWords)
    setSentences(nextSentences)
    setAudioClips(nextAudio)
    setClipPacks(nextPacks)
    setActivePackId(nextActivePackId)
    setStats(nextStats)
  }, [])

  useEffect(() => {
    async function start() {
      const seeded = await seedLmsWordsIfEmpty()
      setSeedMessage(
        seeded > 0 ? `Seeded ${seeded} LMS target words.` : 'LMS vocabulary loaded.',
      )
      const [nextHotkeys, nextHostedPacks] = await Promise.all([
        getHotkeys(),
        getHostedClipPackIndex(),
      ])
      setHotkeys(nextHotkeys)
      setHostedPacks(nextHostedPacks)
      await refresh()
    }
    void start()
  }, [refresh])

  useEffect(() => {
    return () => {
      if (renderedUrl) URL.revokeObjectURL(renderedUrl)
    }
  }, [renderedUrl])

  useEffect(() => {
    function syncFullscreen() {
      setIsFullscreen(document.fullscreenElement === playModeRef.current)
    }
    document.addEventListener('fullscreenchange', syncFullscreen)
    return () => document.removeEventListener('fullscreenchange', syncFullscreen)
  }, [])

  useEffect(() => {
    if (!renderedLesson || !('mediaSession' in navigator)) return
    navigator.mediaSession.metadata = new MediaMetadata({
      title: renderedLesson.title,
      artist: 'Chunky Chinese Vocab',
      album: '5 Word Lesson',
      artwork: [
        {
          src: `${import.meta.env.BASE_URL}pwa-192.svg`,
          sizes: '192x192',
          type: 'image/svg+xml',
        },
        {
          src: `${import.meta.env.BASE_URL}pwa-512.svg`,
          sizes: '512x512',
          type: 'image/svg+xml',
        },
      ],
    })
    navigator.mediaSession.setActionHandler('play', () => {
      void pocketAudioRef.current?.play()
    })
    navigator.mediaSession.setActionHandler('pause', () => {
      pocketAudioRef.current?.pause()
    })
  }, [renderedLesson])

  const filteredWords = useMemo(() => {
    const query = search.trim().toLocaleLowerCase()
    const lessonNumber = Number(lessonFilter)
    return words.filter((word) => {
      if (statusFilter !== 'all' && word.status !== statusFilter) return false
      if (lessonFilter && word.lessonNumber !== lessonNumber) return false
      if (tagFilter && !(word.tags ?? []).includes(tagFilter)) return false
      if (!query) return true
      return [word.word, word.meaning, word.pinyin, word.source]
        .filter(Boolean)
        .some((value) => value!.toLocaleLowerCase().includes(query))
    })
  }, [lessonFilter, search, statusFilter, tagFilter, words])

  const allTags = useMemo(
    () => Array.from(new Set(words.flatMap((word) => word.tags ?? []))).sort(),
    [words],
  )

  const currentStep = lesson?.steps[currentStepIndex]
  const currentSegment = renderedLesson?.segments?.find(
    (segment) =>
      pocketProgress.current >= segment.startSeconds &&
      pocketProgress.current < segment.endSeconds,
  )
  const targetWord = currentStep?.wordId
    ? words.find((word) => word.id === currentStep.wordId)
    : undefined
  const studyWord = currentSegment?.wordId
    ? words.find((word) => word.id === currentSegment.wordId)
    : targetWord
  const studySentence = currentSegment?.sentenceId
    ? sentences.find((sentence) => sentence.id === currentSegment.sentenceId)
    : undefined
  const studyDisplay = getStudyDisplay(studyWord, studySentence)
  const activePack = clipPacks.find((pack) => pack.id === activePackId)
  const scopedWords = useMemo(
    () => (activePackId ? words.filter((word) => word.packIds?.includes(activePackId)) : words),
    [activePackId, words],
  )
  const scopedSentences = useMemo(
    () =>
      activePackId
        ? sentences.filter((sentence) => sentence.packIds?.includes(activePackId))
        : sentences,
    [activePackId, sentences],
  )
  const coverage = useMemo(() => getAudioCoverage(scopedWords, scopedSentences, audioClips), [
    audioClips,
    scopedSentences,
    scopedWords,
  ])
  const lessonWords = useMemo(
    () =>
      lesson?.targetWords
        .map((target) => words.find((word) => word.id === target.id) ?? target) ?? [],
    [lesson, words],
  )
  const ratingWords = useMemo(
    () =>
      (ratingWordIds.length > 0 ? ratingWordIds : lesson?.targetWords.map((word) => word.id) ?? [])
        .map((id) => words.find((word) => word.id === id))
        .filter((word): word is VocabWord => Boolean(word)),
    [lesson, ratingWordIds, words],
  )
  const currentQuiz = useMemo(
    () => buildActiveQuiz(currentSegment, renderedLesson, lessonWords, scopedWords, scopedSentences),
    [currentSegment, lessonWords, renderedLesson, scopedSentences, scopedWords],
  )
  const currentQuizResponse = currentQuiz ? quizResponses[currentQuiz.id] : undefined
  const currentQuizHintLevel = currentQuiz ? quizHints[currentQuiz.id] ?? 0 : 0
  const answeredQuizStats = useMemo(() => getAnsweredQuizStats(quizResponses), [quizResponses])
  const isActiveLearningMode = studyMode === 'activeRecall' || studyMode === 'audioEyesFree'
  const isHandsFreeMode = studyMode === 'audioHandsFree'
  const isEyesFreeMode = studyMode === 'audioEyesFree'
  const activeRecallSupportHidden =
    isActiveLearningMode && hasPassedInitialVocabSection(currentSegment)
  const focusedActiveQuiz = studyMode === 'activeRecall' && Boolean(currentQuiz)
  const eyesFreeQuizActive = isEyesFreeMode && Boolean(currentQuiz)
  const eyesFreeRatingWord =
    eyesFreeRatingIndex !== null ? ratingWords[eyesFreeRatingIndex] : undefined
  const effectiveShowPinyin = showPinyin && !activeRecallSupportHidden
  const effectiveShowEnglish = showEnglish && !activeRecallSupportHidden
  const allLessonWordsRated =
    ratingWords.length > 0 && ratingWords.every((word) => fsrsRatings[word.id])
  const hideTargetStrip = true
  const hideTargetMeanings = isActiveLearningMode && hasPassedInitialVocabSection(currentSegment)
  const missedWords = useMemo(
    () =>
      missedWordIds
        .map((id) => words.find((word) => word.id === id))
        .filter((word): word is VocabWord => Boolean(word)),
    [missedWordIds, words],
  )

  const handleStatus = useCallback(async (ids: string[], status: WordStatus) => {
    if (ids.length === 0) return
    await updateWordStatus(ids, status)
    setLastSummary(`Marked ${ids.length} word${ids.length === 1 ? '' : 's'} ${status}.`)
    await refresh()
  }, [refresh])

  const clearAutoContinueTimeout = useCallback(() => {
    if (autoContinueTimeoutRef.current !== null) {
      window.clearTimeout(autoContinueTimeoutRef.current)
      autoContinueTimeoutRef.current = null
    }
  }, [])

  useEffect(() => {
    if (!isActiveLearningMode || !currentQuiz || currentQuizResponse) return
    if (!pocketAudioRef.current || pocketAudioRef.current.paused) return
    pocketAudioRef.current.pause()
  }, [currentQuiz, currentQuizResponse, isActiveLearningMode])

  useEffect(() => {
    activeAnswerLockRef.current = null
    clearAutoContinueTimeout()
  }, [clearAutoContinueTimeout, currentQuiz?.id, renderedLesson?.id])

  useEffect(() => clearAutoContinueTimeout, [clearAutoContinueTimeout])

  const rememberMissedWord = useCallback((wordId: string) => {
    setMissedWordIds((ids) => (ids.includes(wordId) ? ids : [...ids, wordId]))
  }, [])

  const handleQuizAnswer = useCallback(async (value: string) => {
    if (
      !currentQuiz ||
      quizResponses[currentQuiz.id] ||
      activeAnswerLockRef.current === currentQuiz.id
    ) {
      return
    }
    activeAnswerLockRef.current = currentQuiz.id
    const correct = value === currentQuiz.correctValue
    const hintCount = quizHints[currentQuiz.id] ?? 0
    setQuizResponses((responses) => ({
      ...responses,
      [currentQuiz.id]: { selected: value, correct, hintCount },
    }))
    if (!correct) rememberMissedWord(currentQuiz.wordId)
    // TODO: Persist richer recall analytics: correctWithoutHint, correctWithHint, wrong, revealed.
    await recordQuizAnswer(currentQuiz.wordId, correct)
    setLastSummary(correct ? 'Correct.' : 'Not quite.')
    await refresh()
    if (!isActiveLearningMode) {
      window.setTimeout(() => {
        void pocketAudioRef.current?.play()
      }, 350)
    }
  }, [currentQuiz, isActiveLearningMode, quizHints, quizResponses, refresh, rememberMissedWord])

  const revealCurrentQuiz = useCallback(async () => {
    if (
      !currentQuiz ||
      quizResponses[currentQuiz.id] ||
      activeAnswerLockRef.current === currentQuiz.id
    ) {
      return
    }
    activeAnswerLockRef.current = currentQuiz.id
    const hintCount = quizHints[currentQuiz.id] ?? 0
    setQuizResponses((responses) => ({
      ...responses,
      [currentQuiz.id]: { correct: false, revealed: true, hintCount },
    }))
    rememberMissedWord(currentQuiz.wordId)
    // TODO: Store revealed/skipped separately from wrong answers when quiz analytics grow.
    await recordQuizAnswer(currentQuiz.wordId, false)
    setLastSummary('Revealed. It will come back gently.')
    await refresh()
  }, [currentQuiz, quizHints, quizResponses, refresh, rememberMissedWord])

  const continueCurrentQuiz = useCallback(() => {
    clearAutoContinueTimeout()
    const audio = pocketAudioRef.current
    if (!audio) return
    if (currentSegment?.kind === 'pause') {
      audio.currentTime = Math.min(
        audio.duration || currentSegment.endSeconds,
        currentSegment.endSeconds + 0.01,
      )
    }
    void audio.play()
  }, [clearAutoContinueTimeout, currentSegment])

  const skipCurrentQuiz = useCallback(async () => {
    if (!currentQuiz || quizResponses[currentQuiz.id]) return
    setQuizResponses((responses) => ({
      ...responses,
      [currentQuiz.id]: { correct: false, skipped: true },
    }))
    await recordEvent({
      type: 'skip',
      itemType: 'quiz',
      itemId: currentQuiz.id,
    })
    setLastSummary('Skipped.')
    continueCurrentQuiz()
  }, [continueCurrentQuiz, currentQuiz, quizResponses])

  useEffect(() => {
    if (!isActiveLearningMode || !currentQuiz || !currentQuizResponse) return
    clearAutoContinueTimeout()
    autoContinueTimeoutRef.current = window.setTimeout(() => {
      autoContinueTimeoutRef.current = null
      continueCurrentQuiz()
    }, 1000)
    return clearAutoContinueTimeout
  }, [
    clearAutoContinueTimeout,
    continueCurrentQuiz,
    currentQuiz,
    currentQuizResponse,
    isActiveLearningMode,
  ])

  const replayCurrentQuiz = useCallback(() => {
    if (!pocketAudioRef.current || !currentSegment) return
    pocketAudioRef.current.currentTime = Math.max(0, currentSegment.startSeconds - 5)
    void pocketAudioRef.current.play()
  }, [currentSegment])

  const handleQuizHint = useCallback(() => {
    if (!currentQuiz || currentQuizResponse) return
    const level = quizHints[currentQuiz.id] ?? 0
    if (level === 0) replayCurrentQuiz()
    if (level >= 2) {
      void revealCurrentQuiz()
      return
    }
    setQuizHints((hints) => ({ ...hints, [currentQuiz.id]: level + 1 }))
  }, [currentQuiz, currentQuizResponse, quizHints, replayCurrentQuiz, revealCurrentQuiz])

  const replayCurrentSegment = useCallback(() => {
    const audio = pocketAudioRef.current
    if (!audio || !currentSegment) return
    audio.currentTime = Math.max(0, currentSegment.startSeconds)
    void audio.play()
  }, [currentSegment])

  async function handleFsrsRating(wordId: string, rating: FsrsRating) {
    await rateWordFsrs(wordId, rating)
    const nextRatings = { ...fsrsRatings, [wordId]: rating }
    setFsrsRatings(nextRatings)
    setLastSummary(`Rated ${fsrsLabel(rating)}.`)
    await refresh()
    const ratingIds =
      ratingWordIds.length > 0 ? ratingWordIds : lessonWords.map((word) => word.id)
    const completeSet = ratingIds.length > 0 && ratingIds.every((id) => nextRatings[id])
    if (autoNextLesson && completeSet) {
      window.setTimeout(() => {
        setShowReviewPrompt(false)
        void startPocketLesson([], { randomize: true, playAfterRender: true })
      }, 600)
    }
  }

  const speakRatingPrompt = useCallback(async (word: VocabWord, keys: HotkeySettings) => {
    const text = `${word.word}. ${word.meaning}. Rate it now. Again ${keys.ratingAgain}. Hard ${keys.ratingHard}. Good ${keys.ratingGood}. Easy ${keys.ratingEasy}.`
    if (!('speechSynthesis' in window)) return
    await new Promise<void>((resolve) => {
      window.speechSynthesis.cancel()
      const utterance = new SpeechSynthesisUtterance(text)
      utterance.rate = playbackRate
      utterance.lang = /[\u3400-\u9fff]/.test(word.word) ? 'zh-CN' : 'en-US'
      utterance.onend = () => resolve()
      utterance.onerror = () => resolve()
      window.speechSynthesis.speak(utterance)
    })
  }, [playbackRate])

  const handleEyesFreeRating = useCallback(async (rating: FsrsRating) => {
    if (eyesFreeRatingIndex === null || !eyesFreeRatingWord) return
    await rateWordFsrs(eyesFreeRatingWord.id, rating)
    setFsrsRatings((ratings) => ({ ...ratings, [eyesFreeRatingWord.id]: rating }))
    setLastSummary(`Rated ${fsrsLabel(rating)}.`)
    await refresh()
    const nextIndex = eyesFreeRatingIndex + 1
    if (nextIndex < ratingWords.length) {
      setEyesFreeRatingIndex(nextIndex)
      void speakRatingPrompt(ratingWords[nextIndex], hotkeys)
    } else {
      setEyesFreeRatingIndex(null)
      setShowReviewPrompt(false)
      setLastSummary('Eyes-free ratings saved.')
    }
  }, [eyesFreeRatingIndex, eyesFreeRatingWord, hotkeys, ratingWords, refresh, speakRatingPrompt])

  const skipEyesFreeRating = useCallback(() => {
    if (eyesFreeRatingIndex === null) return
    const nextIndex = eyesFreeRatingIndex + 1
    if (nextIndex < ratingWords.length) {
      setEyesFreeRatingIndex(nextIndex)
      void speakRatingPrompt(ratingWords[nextIndex], hotkeys)
    } else {
      setEyesFreeRatingIndex(null)
      setLastSummary('Eyes-free ratings finished.')
    }
  }, [eyesFreeRatingIndex, hotkeys, ratingWords, speakRatingPrompt])

  function finishLessonAndReturnHome() {
    pocketAudioRef.current?.pause()
    setShowReviewPrompt(false)
    setShowMissedRescue(false)
    setMinimalVisualMode(false)
    setSavedResumeTime(null)
    setScreen('dashboard')
    setLastSummary('Lesson finished. Your selected ratings were saved.')
  }

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      const target = event.target
      const isTyping =
        target instanceof HTMLInputElement ||
        target instanceof HTMLSelectElement ||
        target instanceof HTMLTextAreaElement
      if (isTyping || screen !== 'lesson' || !studyWord) return
      const optionIndex = Number(event.key) - 1
      const pressed = event.key.toLocaleLowerCase()
      if (
        currentQuiz &&
        currentQuiz.options.length > 1 &&
        (pressed === hotkeys.answerA || pressed === hotkeys.answerB || (optionIndex >= 0 && optionIndex < currentQuiz.options.length)) &&
        !currentQuizResponse
      ) {
        event.preventDefault()
        const mappedIndex =
          pressed === hotkeys.answerA ? 0 : pressed === hotkeys.answerB ? 1 : optionIndex
        const option = currentQuiz.options[mappedIndex]
        if (option) void handleQuizAnswer(option.value)
      } else if (currentQuiz && currentQuizResponse && event.key === 'Enter') {
        event.preventDefault()
        continueCurrentQuiz()
      } else if (currentQuiz && !currentQuizResponse && pressed === hotkeys.replay) {
        event.preventDefault()
        replayCurrentQuiz()
      } else if (currentQuiz && !currentQuizResponse && pressed === hotkeys.skip) {
        event.preventDefault()
        void skipCurrentQuiz()
      } else if (currentQuiz && !currentQuizResponse && pressed === 'h') {
        event.preventDefault()
        handleQuizHint()
      } else if (eyesFreeRatingWord) {
        const rating = hotkeyToRating(pressed, hotkeys)
        if (rating) {
          event.preventDefault()
          void handleEyesFreeRating(rating)
        } else if (pressed === hotkeys.skip) {
          event.preventDefault()
          skipEyesFreeRating()
        }
      } else if (pressed === 'k') {
        event.preventDefault()
        void handleStatus([studyWord.id], 'known')
      } else if (pressed === 'f') {
        event.preventDefault()
        void handleStatus([studyWord.id], 'familiar')
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [
    continueCurrentQuiz,
    currentQuiz,
    currentQuizResponse,
    eyesFreeRatingWord,
    handleEyesFreeRating,
    handleQuizAnswer,
    handleQuizHint,
    handleStatus,
    hotkeys,
    replayCurrentQuiz,
    screen,
    skipCurrentQuiz,
    skipEyesFreeRating,
    studyWord,
  ])

  async function toggleFullscreen() {
    if (document.fullscreenElement) {
      await document.exitFullscreen()
    } else {
      await playModeRef.current?.requestFullscreen()
    }
  }

  async function cycleWordStatus(word: VocabWord) {
    const nextStatus: WordStatus =
      word.status === 'known' ? 'learning' : word.status === 'familiar' ? 'known' : 'familiar'
    await handleStatus([word.id], nextStatus)
  }

  async function renderAndLoadLesson(
    nextLesson: LessonPlan,
    playAfterRender: boolean,
    readyMessage: string,
  ) {
    setLesson(nextLesson)
    setCurrentStepIndex(0)
    setQuizResponses({})
    setQuizHints({})
    setShowReviewPrompt(false)
    setShowMissedRescue(false)
    setEyesFreeRatingIndex(null)
    if (nextLesson.steps.filter((step) => step.kind === 'audio').length === 0) {
      setLessonMode('live')
      setLastSummary('No local clips are linked yet. Using browser TTS while the app stays open.')
      if (playAfterRender) window.setTimeout(() => void runFrom(0, nextLesson), 120)
      return
    }
    const rendered = await renderLessonToWav(nextLesson, getAudioClip)
    await saveRenderedLesson(rendered)
    if (renderedUrl) URL.revokeObjectURL(renderedUrl)
    const url = URL.createObjectURL(rendered.blob)
    setRenderedLesson(rendered)
    setRenderedUrl(url)
    setPocketProgress({ current: 0, duration: rendered.durationSeconds })
    setSavedResumeTime(null)
    if (playAfterRender) {
      window.setTimeout(() => {
        void pocketAudioRef.current?.play()
      }, 120)
    }
    setLastSummary(
      rendered.warnings.length > 0
        ? `${readyMessage} with ${rendered.warnings.length} warning(s).`
        : readyMessage,
    )
  }

  async function startPocketLesson(
    manualIds: string[] = [],
    options: LessonStartOptions = { randomize: true },
  ) {
    setLessonMode('pocket')
    setLessonKind('main')
    setRendering(true)
    setScreen('lesson')
    try {
      const { playAfterRender = false, ...selectionOptions } = options
      const lessonWords = scopedWords.length > 0 ? scopedWords : words
      const lessonSentences = scopedSentences.length > 0 ? scopedSentences : sentences
      const useBrowserTts = activePack?.browserTts
      const nextLesson = useBrowserTts
        ? createLesson(lessonWords, lessonSentences, manualIds, selectionOptions)
        : createPocketLesson(lessonWords, lessonSentences, audioClips, manualIds, {
            pauseProfile,
            ...selectionOptions,
          })
      setRatingWordIds(nextLesson.targetWords.map((word) => word.id))
      setMissedWordIds([])
      setFsrsRatings({})
      await renderAndLoadLesson(
        nextLesson,
        playAfterRender,
        '5 word lesson rendered and ready for background-style playback.',
      )
    } catch (error) {
      setLastSummary(error instanceof Error ? error.message : 'Could not render 5 word lesson.')
    } finally {
      setRendering(false)
    }
  }

  async function startModeLesson(mode: StudyMode) {
    setStudyMode(mode)
    setShowEnglish(true)
    setShowPinyin(true)
    setMinimalVisualMode(mode === 'audioHandsFree')
    setAutoNextLesson(mode === 'audioHandsFree')
    await startPocketLesson([], { randomize: true, playAfterRender: true, pauseProfile })
  }

  async function startMissedRescue() {
    if (missedWordIds.length === 0) return
    setLessonMode('pocket')
    setLessonKind('rescue')
    setRendering(true)
    setScreen('lesson')
    try {
      const nextLesson = createRescueLesson(words, audioClips, missedWordIds, {
        pauseProfile: 'gentle',
      })
      await renderAndLoadLesson(nextLesson, true, 'Missed word rescue round ready.')
    } catch (error) {
      setLastSummary(error instanceof Error ? error.message : 'Could not render rescue round.')
    } finally {
      setRendering(false)
    }
  }

  function pauseAndSavePlace() {
    const audio = pocketAudioRef.current
    if (!audio) return
    audio.pause()
    setSavedResumeTime(audio.currentTime)
    setLastSummary('Paused and saved your place for this session.')
    // TODO: Persist resume state in IndexedDB so it survives a browser restart.
  }

  function resumeSavedPlace() {
    const audio = pocketAudioRef.current
    if (!audio || savedResumeTime === null) return
    audio.currentTime = savedResumeTime
    void audio.play()
  }

  function restartCurrentWord() {
    const audio = pocketAudioRef.current
    if (!audio || !renderedLesson?.segments || !currentSegment?.wordId) return
    let startIndex = currentStepIndex
    for (let index = currentStepIndex - 1; index >= 0; index -= 1) {
      const segment = renderedLesson.segments[index]
      if (segment?.wordId !== currentSegment.wordId) break
      startIndex = index
    }
    audio.currentTime = Math.max(0, renderedLesson.segments[startIndex]?.startSeconds ?? 0)
    void audio.play()
  }

  async function runFrom(index: number, plan = lesson) {
    if (!plan || plan.steps.length === 0) return
    const token = runToken.current + 1
    runToken.current = token
    setIsPlaying(true)

    for (let stepIndex = index; stepIndex < plan.steps.length; stepIndex += 1) {
      if (runToken.current !== token) break
      setCurrentStepIndex(stepIndex)
      const step = plan.steps[stepIndex]
      await playStep(step, token)
      if (runToken.current !== token) break
      if (step.kind === 'audio') {
        await recordEvent({
          type: 'complete',
          itemType: 'audio',
          itemId: step.audioId,
          seconds: 3,
        })
      }
      if (step.wordId && (step.kind === 'ding' || step.kind === 'audio')) {
        await completeWordExposure(step.wordId, step.kind === 'audio' ? 3 : 0)
      }
      if (!autoAdvance) break
    }

    setIsPlaying(false)
    await refresh()
  }

  function stopPlayback() {
    runToken.current += 1
    audioRef.current?.pause()
    pocketAudioRef.current?.pause()
    window.speechSynthesis?.cancel()
    setIsPlaying(false)
  }

  async function playStep(step: LessonStep, token: number) {
    await recordEvent({
      type: step.kind === 'speech' ? 'quiz_prompt' : 'play',
      itemType: step.sentenceId ? 'sentence' : step.wordId ? 'word' : 'lesson',
      itemId: step.sentenceId ?? step.wordId ?? lesson?.id ?? 'lesson',
    })

    if (step.kind === 'speech') {
      await speak(step.text, token)
    } else if (step.kind === 'audio') {
      await playAudioClip(step.audioId, token)
    } else if (step.kind === 'pause') {
      await wait(step.seconds * 1000, token)
    } else if (step.kind === 'ding') {
      await playDing(token)
    }
  }

  async function playAudioClip(audioId: string, token: number) {
    const clip = await getAudioClip(audioId)
    if (!clip || runToken.current !== token) return
    const url = URL.createObjectURL(clip.blob)
    const audio = new Audio(url)
    audio.playbackRate = playbackRate
    audioRef.current = audio
    await new Promise<void>((resolve) => {
      audio.addEventListener('ended', () => resolve(), { once: true })
      audio.addEventListener('error', () => resolve(), { once: true })
      audio.play().catch(() => resolve())
    })
    URL.revokeObjectURL(url)
  }

  async function speak(text: string, token: number) {
    if (!('speechSynthesis' in window) || runToken.current !== token) {
      await wait(800, token)
      return
    }
    await new Promise<void>((resolve) => {
      window.speechSynthesis.cancel()
      const utterance = new SpeechSynthesisUtterance(text)
      utterance.rate = playbackRate
      utterance.lang = /[\u3400-\u9fff]/.test(text) ? 'zh-CN' : 'en-US'
      utterance.onend = () => resolve()
      utterance.onerror = () => resolve()
      window.speechSynthesis.speak(utterance)
    })
  }

  async function playDing(token: number) {
    const ding =
      'data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEAESsAACJWAAACABAAZGF0YQAAAAA='
    const audio = new Audio(ding)
    audio.playbackRate = playbackRate
    await Promise.race([audio.play().catch(() => undefined), wait(250, token)])
  }

  async function wait(milliseconds: number, token: number) {
    await new Promise<void>((resolve) => {
      const timeout = window.setTimeout(resolve, milliseconds)
      const check = window.setInterval(() => {
        if (runToken.current !== token) {
          window.clearTimeout(timeout)
          window.clearInterval(check)
          resolve()
        }
      }, 80)
    })
  }

  async function handleFileText(
    files: FileList | null,
    importer: (text: string) => Promise<ImportSummary>,
  ) {
    const file = files?.[0]
    if (!file) return
    const summary = await importer(await file.text())
    setLastSummary(formatSummary(summary))
    await refresh()
  }

  async function handleBackupExport() {
    const text = await exportBackup()
    downloadText(`chunky-chinese-backup-${new Date().toISOString().slice(0, 10)}.json`, text)
  }

  function handleWordsCsvExport() {
    const text = wordsToProgressCsv(words)
    downloadText(`chunky-chinese-progress-${new Date().toISOString().slice(0, 10)}.csv`, text)
  }

  async function handleBackupImport(files: FileList | null) {
    const file = files?.[0]
    if (!file) return
    const summary = await importBackup(await file.text())
    setLastSummary(formatSummary(summary))
    await refresh()
  }

  async function handleAudioImport(files: FileList | null) {
    if (!files) return
    const summary = await importAudioFiles(files, activePackId)
    setLastSummary(formatSummary(summary))
    await refresh()
  }

  async function handleCsvTtsPackImport(files: FileList | null) {
    const file = files?.[0]
    if (!file) return
    const summary = await importCsvTtsPack(await file.text(), csvPackName, csvPackLanguage)
    setLastSummary(formatSummary(summary))
    await refresh()
  }

  async function handleClipPackImport(files: FileList | null) {
    if (!files) return
    const summary = await importClipPackFiles(files)
    setLastSummary(formatSummary(summary))
    await refresh()
  }

  async function handleHostedClipPackImport(pack: HostedClipPack) {
    setHostedImporting(true)
    setHostedProgress(`Starting ${pack.name} download...`)
    try {
      const summary = await importHostedClipPack(
        pack.baseUrl,
        (completed, total, label) => {
          setHostedProgress(`${completed} / ${total}: ${label}`)
        },
        pack,
      )
      setLastSummary(formatSummary(summary))
      setHostedProgress(`${pack.name} is ready offline in this browser.`)
      await refresh()
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Could not download hosted clip pack.'
      setLastSummary(message)
      setHostedProgress(message)
    } finally {
      setHostedImporting(false)
    }
  }

  async function handleSetActivePack(packId: string | undefined) {
    await persistActivePackId(packId)
    setActivePackId(packId)
    setLastSummary(
      packId
        ? `Active pack: ${clipPacks.find((pack) => pack.id === packId)?.name ?? packId}.`
        : 'Active pack: All words.',
    )
  }

  async function handleHotkeyChange(name: keyof HotkeySettings, value: string) {
    const next = { ...hotkeys, [name]: value.trim().toLocaleLowerCase() || DEFAULT_HOTKEYS[name] }
    setHotkeys(next)
    await saveHotkeys(next)
    setLastSummary('Hotkeys saved.')
  }

  return (
    <main className="app-shell">
      <header className="topbar">
        <button className="brand-button" type="button" onClick={() => setScreen('dashboard')}>
          <span className="brand-mark">中</span>
          <span>
            <strong>Chunky Chinese</strong>
            <small>{seedMessage}</small>
          </span>
        </button>
        <nav className="tabs" aria-label="Main screens">
          <button className={screen === 'dashboard' ? 'active' : ''} onClick={() => setScreen('dashboard')}>
            <span className="nav-icon nav-dashboard" aria-hidden="true" />
            Dashboard
          </button>
          <button className={screen === 'words' ? 'active' : ''} onClick={() => setScreen('words')}>
            <span className="nav-icon nav-words" aria-hidden="true" />
            Words
          </button>
          <button className={screen === 'import' ? 'active' : ''} onClick={() => setScreen('import')}>
            <span className="nav-icon nav-import" aria-hidden="true" />
            Import
          </button>
          <button className={screen === 'lesson' ? 'active' : ''} onClick={() => setScreen('lesson')}>
            <span className="nav-icon nav-lesson" aria-hidden="true" />
            Lesson
          </button>
        </nav>
      </header>

      {screen === 'dashboard' && (
        <section className="screen dashboard">
          <div className="screen-heading">
            <div>
              <h1>Press play, think, keep moving.</h1>
              <p>Start with due words, add new ones only when the queue is light.</p>
            </div>
            <div className="mode-start-grid" aria-label="Choose study mode">
              <button className="mode-start listen-start" type="button" onClick={() => startModeLesson('audioHandsFree')}>
                <strong>Audio - hands free</strong>
                <span>Continuous listening with auto-next on.</span>
              </button>
              <button className="mode-start listen-start" type="button" onClick={() => startModeLesson('audioEyesFree')}>
                <strong>Audio - eyes free</strong>
                <span>Answer A/B, replay, skip, and rate by hotkey.</span>
              </button>
              <button className="mode-start active-start" type="button" onClick={() => startModeLesson('activeRecall')}>
                <strong>Active recall</strong>
                <span>Pause for calm 2-choice questions.</span>
              </button>
            </div>
          </div>

          <div className="metric-grid today-grid">
            <button
              type="button"
              className="metric hero-metric"
              onClick={() => startModeLesson('activeRecall')}
            >
              <span>Due now</span>
              <strong>{stats.dueNow}</strong>
            </button>
            <button type="button" className="metric" onClick={() => startModeLesson('audioHandsFree')}>
              <span>New available</span>
              <strong>{stats.newAvailable}</strong>
            </button>
            <div className="metric passive-metric">
              <span>Due soon</span>
              <strong>{stats.dueSoon}</strong>
            </div>
            <div className="metric passive-metric">
              <span>Scheduled</span>
              <strong>{stats.scheduled}</strong>
            </div>
          </div>

          <div className="metric-grid">
            {(['new', 'learning', 'familiar', 'review', 'known'] as WordStatus[]).map(
              (status) => (
                <button
                  type="button"
                  className="metric"
                  key={status}
                  onClick={() => {
                    setStatusFilter(status)
                    setScreen('words')
                  }}
                >
                  <span>{status}</span>
                  <strong>{stats.counts[status]}</strong>
                </button>
              ),
            )}
          </div>

          <div className="action-grid">
            <InfoPanel title="Active pack">
              <dl className="stat-list">
                <div>
                  <dt>Pack</dt>
                  <dd>{activePack?.name ?? 'All words'}</dd>
                </div>
                <div>
                  <dt>Words in scope</dt>
                  <dd>{scopedWords.length}</dd>
                </div>
                <div>
                  <dt>Audio mode</dt>
                  <dd>{activePack?.browserTts ? 'Browser TTS' : 'MP3 clips'}</dd>
                </div>
              </dl>
            </InfoPanel>
            <InfoPanel title="Today">
              <dl className="stat-list">
                <div>
                  <dt>Listening minutes</dt>
                  <dd>{stats.minutesToday.toFixed(1)}</dd>
                </div>
                <div>
                  <dt>Clips completed</dt>
                  <dd>{stats.clipsCompletedToday}</dd>
                </div>
                <div>
                  <dt>Words marked known</dt>
                  <dd>{stats.knownToday}</dd>
                </div>
                <div>
                  <dt>FSRS ratings due</dt>
                  <dd>{stats.dueNow}</dd>
                </div>
              </dl>
            </InfoPanel>
            <InfoPanel title="Hotkeys">
              <dl className="stat-list">
                <div>
                  <dt>Answer A / B</dt>
                  <dd>{hotkeys.answerA.toUpperCase()} / {hotkeys.answerB.toUpperCase()}</dd>
                </div>
                <div>
                  <dt>Replay / skip</dt>
                  <dd>{hotkeys.replay.toUpperCase()} / {hotkeys.skip.toUpperCase()}</dd>
                </div>
                <div>
                  <dt>Rate</dt>
                  <dd>
                    {hotkeys.ratingAgain.toUpperCase()} {hotkeys.ratingHard.toUpperCase()}{' '}
                    {hotkeys.ratingGood.toUpperCase()} {hotkeys.ratingEasy.toUpperCase()}
                  </dd>
                </div>
                <div>
                  <dt>Quick marks</dt>
                  <dd>F / K</dd>
                </div>
              </dl>
            </InfoPanel>
            <InfoPanel title="Library">
              <dl className="stat-list">
                <div>
                  <dt>Words</dt>
                  <dd>{words.length}</dd>
                </div>
                <div>
                  <dt>Sentences</dt>
                  <dd>{sentences.length}</dd>
                </div>
                <div>
                  <dt>Audio clips</dt>
                  <dd>{audioClips.length}</dd>
                </div>
              </dl>
            </InfoPanel>
          </div>

          <div className="button-row">
            <button type="button" onClick={() => setScreen('words')}>
              Manage words
            </button>
            <button type="button" onClick={() => setScreen('import')}>
              Import data/audio
            </button>
          </div>
        </section>
      )}

      {screen === 'words' && (
        <section className="screen">
          <div className="screen-heading compact">
            <div>
              <h1>Word Manager</h1>
              <p>{filteredWords.length} visible words. Pinyin is support text, not lesson-first.</p>
            </div>
            <div className="manager-heading-actions">
              <button type="button" onClick={handleWordsCsvExport}>
                Export CSV
              </button>
              <button
                className="primary"
                type="button"
                onClick={() => startPocketLesson(selectedWordIds)}
                disabled={selectedWordIds.length === 0}
              >
                5 word lesson from selected
              </button>
            </div>
          </div>

          <div className="filters">
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search Chinese, English, pinyin"
              aria-label="Search words"
            />
            <select
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value as WordStatus | 'all')}
              aria-label="Filter by status"
            >
              <option value="all">All statuses</option>
              {(['new', 'learning', 'familiar', 'known', 'review'] as WordStatus[]).map(
                (status) => (
                  <option key={status} value={status}>
                    {status}
                  </option>
                ),
              )}
            </select>
            <input
              value={lessonFilter}
              onChange={(event) => setLessonFilter(event.target.value)}
              inputMode="numeric"
              placeholder="Lesson #"
              aria-label="Filter by lesson number"
            />
            <select
              value={tagFilter}
              onChange={(event) => setTagFilter(event.target.value)}
              aria-label="Filter by tag"
            >
              <option value="">All tags</option>
              {allTags.map((tag) => (
                <option key={tag} value={tag}>
                  {tag}
                </option>
              ))}
            </select>
          </div>

          <div className="bulk-row">
            <span>{selectedWordIds.length} selected</span>
            <span>Click a word card to cycle: unknown to familiar to known.</span>
            {(['learning', 'familiar', 'known', 'review'] as WordStatus[]).map((status) => (
              <button key={status} type="button" onClick={() => handleStatus(selectedWordIds, status)}>
                Mark {status}
              </button>
            ))}
            <button type="button" onClick={() => setSelectedWordIds([])}>
              Clear
            </button>
          </div>

          <div className="word-list">
            {filteredWords.map((word) => (
              <article className={`word-row word-row-${word.status}`} key={word.id}>
                <label className="select-box">
                  <input
                    type="checkbox"
                    checked={selectedWordIds.includes(word.id)}
                    onChange={(event) => {
                      setSelectedWordIds((ids) =>
                        event.target.checked
                          ? [...ids, word.id]
                          : ids.filter((id) => id !== word.id),
                      )
                    }}
                  />
                </label>
                <button
                  className="word-main word-cycle"
                  type="button"
                  onClick={() => cycleWordStatus(word)}
                  title="Cycle status"
                >
                  <strong>{word.word}</strong>
                  <span>{word.meaning}</span>
                  <small>
                    {word.pinyin ? `${word.pinyin} · ` : ''}
                    Lesson {word.lessonNumber ?? '-'} · seen {word.seenCount}
                  </small>
                </button>
                <StatusPill status={word.status} />
                <div className="row-actions">
                  <button
                    type="button"
                    disabled={!word.audioWordId}
                    onClick={() => word.audioWordId && playAudioClip(word.audioWordId, runToken.current)}
                  >
                    Play
                  </button>
                  {(['learning', 'familiar', 'known', 'review'] as WordStatus[]).map((status) => (
                    <button key={status} type="button" onClick={() => handleStatus([word.id], status)}>
                      {status}
                    </button>
                  ))}
                </div>
              </article>
            ))}
          </div>

          <div className="button-row end-actions">
            <button type="button" onClick={handleWordsCsvExport}>
              Export CSV
            </button>
          </div>
        </section>
      )}

      {screen === 'import' && (
        <section className="screen">
          <div className="screen-heading compact">
            <div>
              <h1>Import and Backup</h1>
              <p>Everything stays in this browser's local IndexedDB.</p>
            </div>
            <a className="ghost-link" href={`${import.meta.env.BASE_URL}seed/lms-vocab-188.csv`} download>
              Download LMS CSV
            </a>
          </div>

          <div className="import-grid">
            <section className="panel hosted-pack">
              <h2>Installed packs</h2>
              <p>Lessons use the active pack first. Progress is shared when the same word appears in multiple packs.</p>
              <div className="pack-list">
                <div className={`pack-row ${activePackId ? '' : 'active'}`}>
                  <span>
                    <strong>All words</strong>
                    <small>{words.length} words across every installed/imported pack.</small>
                  </span>
                  <button
                    type="button"
                    className={activePackId ? '' : 'primary'}
                    onClick={() => handleSetActivePack(undefined)}
                  >
                    {activePackId ? 'Set active' : 'Active'}
                  </button>
                </div>
                {clipPacks.map((pack) => (
                  <div key={pack.id} className={`pack-row ${pack.id === activePackId ? 'active' : ''}`}>
                    <span>
                      <strong>{pack.name}</strong>
                      <small>
                        {pack.wordCount} words · {pack.audioCount} clips ·{' '}
                        {pack.browserTts ? 'browser TTS' : 'MP3'}
                      </small>
                    </span>
                    <button
                      type="button"
                      className={pack.id === activePackId ? 'primary' : ''}
                      onClick={() => handleSetActivePack(pack.id)}
                    >
                      {pack.id === activePackId ? 'Active' : 'Set active'}
                    </button>
                  </div>
                ))}
                {clipPacks.length === 0 && <small>No packs installed yet.</small>}
              </div>
            </section>
            <section className="panel hosted-pack">
              <h2>Available hosted packs</h2>
              <p>Download a hosted pack into this browser for offline MP3 lessons.</p>
              <div className="pack-list">
                {hostedPacks.map((pack) => (
                  <div key={pack.id} className="pack-row">
                    <span>
                      <strong>{pack.name}</strong>
                      <small>{pack.description ?? pack.language ?? 'Hosted clip pack'}</small>
                    </span>
                    <button
                      className="primary"
                      type="button"
                      onClick={() => handleHostedClipPackImport(pack)}
                      disabled={hostedImporting}
                    >
                      {hostedImporting ? 'Downloading...' : 'Download'}
                    </button>
                  </div>
                ))}
              </div>
              {hostedProgress && <small>{hostedProgress}</small>}
            </section>
            <FilePanel
              title="Clip pack folder"
              help="Select the whole generated clip-pack folder: clips_manifest.json, vocab.csv, sentences.csv, and audio/."
              accept=".json,.csv,.mp3,audio/mpeg"
              multiple
              webkitdirectory
              onChange={handleClipPackImport}
            />
            <section className="panel">
              <h2>CSV browser TTS pack</h2>
              <p>Creates a pack from a CSV and uses browser speech when MP3 clips are missing. Best while the app stays open.</p>
              <div className="filters">
                <input
                  value={csvPackName}
                  onChange={(event) => setCsvPackName(event.target.value)}
                  placeholder="Pack name"
                  aria-label="CSV pack name"
                />
                <input
                  value={csvPackLanguage}
                  onChange={(event) => setCsvPackLanguage(event.target.value)}
                  placeholder="Language, e.g. zh-CN"
                  aria-label="CSV pack language"
                />
              </div>
              <FileInputButton
                label="Import CSV as TTS pack"
                accept=".csv"
                onChange={handleCsvTtsPackImport}
              />
            </section>
            <FilePanel
              title="Vocab CSV"
              help="Imports app CSV, LMS full CSV, or Front/Back flashcard CSV. Reimports merge by word."
              accept=".csv"
              onChange={(files) => handleFileText(files, importVocabCsv)}
            />
            <FilePanel
              title="Sentences CSV"
              help="Columns: chinese, english, targetWords, audioSentenceFilename, tags, difficulty."
              accept=".csv"
              onChange={(files) => handleFileText(files, importSentencesCsv)}
            />
            <FilePanel
              title="Audio MP3 files"
              help="Select files or a folder. Matching prefers words/, meanings/, and sentences/ paths."
              accept=".mp3,audio/mpeg"
              multiple
              webkitdirectory
              onChange={handleAudioImport}
            />
            <section className="panel">
              <h2>Clip coverage</h2>
              <dl className="stat-list">
                <div>
                  <dt>Ready words</dt>
                  <dd>{coverage.readyWords}</dd>
                </div>
                <div>
                  <dt>Missing word clips</dt>
                  <dd>{coverage.missingWordClips}</dd>
                </div>
                <div>
                  <dt>Missing meaning clips</dt>
                  <dd>{coverage.missingMeaningClips}</dd>
                </div>
                <div>
                  <dt>Prompt clips</dt>
                  <dd>{coverage.promptClips}</dd>
                </div>
              </dl>
            </section>
            <section className="panel">
              <h2>Hotkey settings</h2>
              <p>Map these to whatever your 8BitDo sends. Use lowercase letters or numbers.</p>
              <div className="hotkey-grid">
                {(Object.keys(hotkeys) as Array<keyof HotkeySettings>).map((key) => (
                  <label key={key}>
                    {hotkeyLabel(key)}
                    <input
                      value={hotkeys[key]}
                      maxLength={16}
                      onChange={(event) => handleHotkeyChange(key, event.target.value)}
                    />
                  </label>
                ))}
              </div>
            </section>
            <section className="panel">
              <h2>JSON backup</h2>
              <p>Back up words, sentences, progress, and events. Audio blobs stay importable separately.</p>
              <div className="button-row">
                <button type="button" onClick={handleBackupExport}>
                  Export backup
                </button>
                <label className="file-button">
                  Import backup
                  <input
                    type="file"
                    accept=".json,application/json"
                    onChange={(event) => handleBackupImport(event.target.files)}
                  />
                </label>
              </div>
            </section>
          </div>
        </section>
      )}

      {screen === 'lesson' && (
        <section className="screen lesson-screen">
          {lesson ? (
            <>
                <section
                  className={`study-player ${minimalVisualMode ? 'minimal-visual-player' : ''}`}
                  ref={playModeRef}
                >
                  <div
                    className={`study-stage ${focusedActiveQuiz ? 'active-focus' : ''} ${
                      minimalVisualMode ? 'minimal-visual-stage' : ''
                    }`}
                  >
                    <div className="study-meta">
                      <span>
                        {minimalVisualMode
                          ? 'Audio - hands free'
                          : focusedActiveQuiz
                          ? 'Active recall'
                          : eyesFreeQuizActive
                          ? 'Audio - eyes free'
                          : rendering
                            ? 'Rendering local audio...'
                            : renderedLesson?.title ?? lesson.title}
                      </span>
                      {minimalVisualMode ? (
                        <div className="study-toggles minimal-toggles">
                          <button type="button" onClick={() => setShowPinyin((value) => !value)}>
                            Pinyin {showPinyin ? 'on' : 'off'}
                          </button>
                          <button type="button" onClick={() => setShowEnglish((value) => !value)}>
                            English {showEnglish ? 'on' : 'off'}
                          </button>
                          <button type="button" onClick={() => setMinimalVisualMode(false)}>
                            Exit
                          </button>
                          <label className="toggle compact-toggle">
                            <input
                              type="checkbox"
                              checked={autoNextLesson}
                              onChange={(event) => setAutoNextLesson(event.target.checked)}
                            />
                            Auto next
                          </label>
                        </div>
                      ) : focusedActiveQuiz ? (
                        <span className="mode-chip">Paused for answer</span>
                      ) : (
                        <div className="study-toggles">
                          <button type="button" onClick={() => setShowPinyin((value) => !value)}>
                            Pinyin {showPinyin ? 'on' : 'off'}
                          </button>
                          <button type="button" onClick={() => setShowEnglish((value) => !value)}>
                            English {showEnglish ? 'on' : 'off'}
                          </button>
                          <button
                            type="button"
                            className={isEyesFreeMode ? 'active' : ''}
                            onClick={() => setStudyMode(isEyesFreeMode ? 'activeRecall' : 'audioEyesFree')}
                          >
                            {isEyesFreeMode ? 'Eyes free' : 'Active'}
                          </button>
                        </div>
                      )}
                    </div>
                    {focusedActiveQuiz && currentQuiz ? (
                      <ActiveRecallCard
                        key={currentQuiz.id}
                        quiz={currentQuiz}
                        response={currentQuizResponse}
                        word={studyWord}
                        sentence={studySentence}
                        hintLevel={currentQuizHintLevel}
                        showPinyin={showPinyin}
                        onAnswer={handleQuizAnswer}
                        onContinue={continueCurrentQuiz}
                        onHint={handleQuizHint}
                        onReplay={replayCurrentQuiz}
                        onReveal={revealCurrentQuiz}
                      />
                    ) : eyesFreeQuizActive && currentQuiz ? (
                      <section className="active-recall-card eyes-free-card" aria-live="polite">
                        <div className="recall-prompt">
                          <span>Audio - eyes free</span>
                          <strong>
                            {currentQuizResponse
                              ? currentQuizResponse.correct
                                ? 'Correct. Continuing...'
                                : currentQuizResponse.skipped
                                  ? 'Skipped.'
                                  : 'Not quite. Continuing...'
                              : `A or B. Replay ${hotkeys.replay.toUpperCase()}, skip ${hotkeys.skip.toUpperCase()}.`}
                          </strong>
                        </div>
                        <div className="recall-cue english">
                          {currentQuizResponse
                            ? getQuizFeedbackText(currentQuiz, studyWord, getQuizAnswerLabel(currentQuiz, studyWord))
                            : 'Listen, then choose.'}
                        </div>
                      </section>
                    ) : (
                      <>
                    <div className={`study-chinese ${studyDisplay.kind}`}>
                      {studyDisplay.chinese}
                    </div>
                    {effectiveShowPinyin && studyDisplay.pinyin && (
                      <div className="study-pinyin">{studyDisplay.pinyin}</div>
                    )}
                    {effectiveShowEnglish && <div className="study-meaning">{studyDisplay.english}</div>}
                    <div className="study-time">
                      <span>
                        {renderedLesson
                          ? `${formatTime(pocketProgress.current)} / ${formatTime(pocketProgress.duration)}`
                          : 'Import a clip pack, then render a lesson for phone-style playback.'}
                      </span>
                      {activeRecallSupportHidden && (
                        <span>Active recall: hints hidden</span>
                      )}
                      {lesson && (
                        <span>
                          Answered {answeredQuizStats.answered} · Correct{' '}
                          {answeredQuizStats.correct}
                        </span>
                      )}
                    </div>
                        {minimalVisualMode && (
                          <div className="minimal-controls">
                            <button
                              type="button"
                              className="primary"
                              onClick={() => {
                                const audio = pocketAudioRef.current
                                if (!audio) return
                                if (audio.paused) {
                                  void audio.play()
                                } else {
                                  audio.pause()
                                }
                              }}
                              disabled={!renderedUrl}
                            >
                              {isPlaying ? 'Pause' : 'Play'}
                            </button>
                            <button type="button" onClick={replayCurrentSegment} disabled={!currentSegment}>
                              Replay
                            </button>
                          </div>
                        )}
                      </>
                    )}
                    {lessonWords.length > 0 && !hideTargetStrip && (
                      <div className="study-target-strip" aria-label="Lesson words">
                        {lessonWords.map((word) => (
                          <button
                            key={word.id}
                            type="button"
                            className={`study-target-word word-row-${word.status}`}
                            onClick={() => cycleWordStatus(word)}
                            title="Click to cycle familiar / known"
                          >
                            <strong>{word.word}</strong>
                            {!hideTargetMeanings && <small>{word.meaning}</small>}
                          </button>
                        ))}
                      </div>
                    )}
                    {showMissedRescue && missedWords.length > 0 && (
                      <div className="rescue-panel" aria-live="polite">
                        <div className="review-heading">
                          <strong>Review missed words?</strong>
                          <span>About 45 seconds</span>
                        </div>
                        <p className="review-note">
                          Replay the tough ones gently before rating the set, or finish for now.
                        </p>
                        <div className="rescue-word-list">
                          {missedWords.map((word) => (
                            <span key={word.id}>{word.word}</span>
                          ))}
                        </div>
                        <div className="button-row">
                          <button type="button" className="primary" onClick={startMissedRescue}>
                            Start rescue round
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setShowMissedRescue(false)
                              setShowReviewPrompt(true)
                            }}
                          >
                            Finish for now
                          </button>
                        </div>
                      </div>
                    )}
                    {eyesFreeRatingWord && (
                      <div className="review-panel" aria-live="polite">
                        <div className="review-heading">
                          <strong>Eyes-free rating</strong>
                          <span>
                            {eyesFreeRatingIndex !== null ? eyesFreeRatingIndex + 1 : 1} / {ratingWords.length}
                          </span>
                        </div>
                        <div className="review-word">
                          <span>
                            <strong>{eyesFreeRatingWord.word}</strong>
                            <small>{eyesFreeRatingWord.meaning}</small>
                          </span>
                        </div>
                        <p className="review-note">
                          {hotkeys.ratingAgain.toUpperCase()} Again, {hotkeys.ratingHard.toUpperCase()} Hard,{' '}
                          {hotkeys.ratingGood.toUpperCase()} Good, {hotkeys.ratingEasy.toUpperCase()} Easy.
                        </p>
                        <button
                          type="button"
                          onClick={skipEyesFreeRating}
                        >
                          Skip rating
                        </button>
                      </div>
                    )}
                    {showReviewPrompt && ratingWords.length > 0 && (
                      <div className="review-panel" aria-live="polite">
                        <div className="review-heading">
                          <strong>How well do these feel right now?</strong>
                          <span>{allLessonWordsRated ? 'Set scheduled' : 'Rate each word'}</span>
                        </div>
                        <p className="review-note">
                          These ratings decide when each word comes back. Unanswered quiz questions
                          are ignored; this is the main memory signal.
                        </p>
                        <div className="review-list">
                          {ratingWords.map((word) => (
                            <div key={word.id} className="review-word">
                              <span>
                                <strong>{word.word}</strong>
                                <small>{word.meaning}</small>
                              </span>
                              <div className="review-buttons">
                                {fsrsRatingsForUi.map((rating) => (
                                  <button
                                    key={rating.value}
                                    type="button"
                                    className={fsrsRatings[word.id] === rating.value ? 'active' : ''}
                                    onClick={() => handleFsrsRating(word.id, rating.value)}
                                  >
                                    {rating.label}
                                  </button>
                                ))}
                              </div>
                            </div>
                          ))}
                        </div>
                        <button
                          type="button"
                          className="ghost-answer"
                          onClick={() => setShowReviewPrompt(false)}
                        >
                          Not now
                        </button>
                        {allLessonWordsRated && (
                          <button
                            type="button"
                            className="primary"
                            onClick={() => startPocketLesson([], { randomize: true, playAfterRender: true })}
                          >
                            Next today's 5
                          </button>
                        )}
                        <button
                          type="button"
                          className="primary"
                          onClick={finishLessonAndReturnHome}
                        >
                          Done
                        </button>
                      </div>
                    )}
                    {currentQuiz &&
                      !currentQuizResponse?.skipped &&
                      studyMode !== 'activeRecall' &&
                      studyMode !== 'audioEyesFree' &&
                      !minimalVisualMode && (
                      <div className="quiz-panel" aria-live="polite">
                        <div className="quiz-copy">
                          <strong>{currentQuiz.prompt}</strong>
                          <span>Optional keys 1-2</span>
                        </div>
                        <div className="quiz-options">
                          {currentQuiz.options.map((option, index) => {
                            const isSelected = currentQuizResponse?.selected === option.value
                            const isCorrect = option.value === currentQuiz.correctValue
                            const stateClass = currentQuizResponse
                              ? isCorrect
                                ? 'correct'
                                : isSelected
                                  ? 'wrong'
                                  : ''
                              : ''
                            return (
                              <button
                                key={option.value}
                                type="button"
                                className={stateClass}
                                disabled={Boolean(currentQuizResponse)}
                                onClick={() => handleQuizAnswer(option.value)}
                              >
                                <kbd>{index + 1}</kbd>
                                {option.label}
                              </button>
                            )
                          })}
                        </div>
                      </div>
                    )}
                  </div>

                  <div className={`play-hover-menu ${minimalVisualMode ? 'minimal-audio-host' : ''}`}>
                    {renderedUrl ? (
                      <audio
                        ref={pocketAudioRef}
                        src={renderedUrl}
                        controls={!minimalVisualMode}
                        preload="metadata"
                        onPlay={() => {
                          setIsPlaying(true)
                          if ('mediaSession' in navigator) navigator.mediaSession.playbackState = 'playing'
                        }}
                        onPause={() => {
                          setIsPlaying(false)
                          if ('mediaSession' in navigator) navigator.mediaSession.playbackState = 'paused'
                        }}
                        onTimeUpdate={(event) => {
                          const audio = event.currentTarget
                          const current = audio.currentTime
                          const segmentIndex =
                            renderedLesson?.segments?.findIndex(
                              (segment) =>
                                current >= segment.startSeconds && current < segment.endSeconds,
                            ) ?? -1
                          if (segmentIndex >= 0 && segmentIndex !== currentStepIndex) {
                            setCurrentStepIndex(segmentIndex)
                          }
                          setPocketProgress({
                            current,
                            duration: audio.duration || renderedLesson?.durationSeconds || 0,
                          })
                        }}
                        onEnded={async () => {
                          setIsPlaying(false)
                          if (renderedLesson) {
                            await recordEvent({
                              type: 'complete',
                              itemType: 'lesson',
                              itemId: renderedLesson.id,
                              seconds: renderedLesson.durationSeconds,
                            })
                            await refresh()
                            if (isHandsFreeMode && autoNextLesson) {
                              void startPocketLesson([], { randomize: true, playAfterRender: true })
                            } else if (isHandsFreeMode) {
                              setLastSummary('Hands-free lesson complete.')
                            } else if (isEyesFreeMode && ratingWords.length > 0) {
                              setEyesFreeRatingIndex(0)
                              void speakRatingPrompt(ratingWords[0], hotkeys)
                            } else if (lessonKind === 'main' && missedWordIds.length > 0) {
                              setShowMissedRescue(true)
                            } else {
                              setShowReviewPrompt(true)
                            }
                          }
                        }}
                      />
                    ) : (
                      <div className="audio-placeholder">Render a lesson to create the audio track.</div>
                    )}
                    {!minimalVisualMode && focusedActiveQuiz ? (
                      <div className="player-controls quiet-controls">
                        <button
                          type="button"
                          onClick={pauseAndSavePlace}
                          disabled={!renderedUrl}
                        >
                          Pause & save place
                        </button>
                        <button
                          type="button"
                          onClick={restartCurrentWord}
                          disabled={!renderedUrl || !currentSegment?.wordId}
                        >
                          Restart current word
                        </button>
                      </div>
                    ) : !minimalVisualMode ? (
                      <div className="player-controls">
                        <button
                          type="button"
                          onClick={() => pocketAudioRef.current?.play()}
                          disabled={!renderedUrl || isPlaying}
                        >
                          Play
                        </button>
                        <button
                          type="button"
                          onClick={() => pocketAudioRef.current?.pause()}
                          disabled={!renderedUrl || !isPlaying}
                        >
                          Pause
                        </button>
                        <button
                          type="button"
                          onClick={pauseAndSavePlace}
                          disabled={!renderedUrl}
                        >
                          Pause & save place
                        </button>
                        <button
                          type="button"
                          onClick={resumeSavedPlace}
                          disabled={!renderedUrl || savedResumeTime === null}
                        >
                          Resume lesson
                        </button>
                        <button
                          type="button"
                          onClick={restartCurrentWord}
                          disabled={!renderedUrl || !currentSegment?.wordId}
                        >
                          Restart current word
                        </button>
                        <button
                          type="button"
                          onClick={() => startPocketLesson()}
                          disabled={rendering || (showReviewPrompt && !allLessonWordsRated)}
                        >
                          Next today's 5
                        </button>
                        <label className="toggle compact-toggle">
                          <input
                            type="checkbox"
                            aria-label="Auto advance to next lesson"
                            checked={autoNextLesson}
                            onChange={(event) => setAutoNextLesson(event.target.checked)}
                          />
                          Auto advance to next lesson
                        </label>
                        <label className="compact-field">
                          Pause
                          <select
                            value={pauseProfile}
                            onChange={(event) => setPauseProfile(event.target.value as PauseProfile)}
                          >
                            <option value="gentle">Gentle</option>
                            <option value="normal">Normal</option>
                            <option value="fast">Fast</option>
                            <option value="challenge">Challenge</option>
                          </select>
                        </label>
                        <button type="button" onClick={toggleFullscreen}>
                          {isFullscreen ? 'Exit full screen' : 'Full screen'}
                        </button>
                        <button type="button" onClick={() => setMinimalVisualMode(true)}>
                          Listening mode
                        </button>
                      </div>
                    ) : null}
                    {!focusedActiveQuiz && !minimalVisualMode && (
                      <div className="coverage-grid">
                        <span>Ready words: {coverage.readyWords}</span>
                        <span>Prompt clips: {coverage.promptClips}</span>
                        <span>Rendered warnings: {renderedLesson?.warnings.length ?? 0}</span>
                      </div>
                    )}
                  </div>
                </section>

              {lessonMode === 'live' && (
              <div className="lesson-card">
                <div className="lesson-now">
                  <span>
                    Step {Math.min(currentStepIndex + 1, lesson.steps.length)} of{' '}
                    {lesson.steps.length}
                  </span>
                  <h2>{currentStep?.label ?? lesson.title}</h2>
                  {currentStep?.kind === 'display' && (
                    <pre className="display-text">{currentStep.text}</pre>
                  )}
                  {targetWord && (
                    <p>
                      Current word: <strong>{targetWord.word}</strong> · {targetWord.meaning}
                    </p>
                  )}
                </div>

                <div className="target-strip">
                  {lesson.targetWords.map((word) => (
                    <span key={word.id}>
                      {word.word}
                      <small>{word.meaning}</small>
                    </span>
                  ))}
                </div>

                <div className="player-controls">
                  <button type="button" onClick={() => runFrom(currentStepIndex)} disabled={isPlaying}>
                    Play
                  </button>
                  <button type="button" onClick={stopPlayback} disabled={!isPlaying}>
                    Pause
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      stopPlayback()
                      setCurrentStepIndex(Math.max(0, currentStepIndex - 1))
                    }}
                  >
                    Previous
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      stopPlayback()
                      setCurrentStepIndex(Math.min(lesson.steps.length - 1, currentStepIndex + 1))
                    }}
                  >
                    Next
                  </button>
                  <button type="button" onClick={() => runFrom(currentStepIndex)}>
                    Replay
                  </button>
                </div>

                <div className="player-options">
                  <label>
                    Speed
                    <select
                      value={playbackRate}
                      onChange={(event) => setPlaybackRate(Number(event.target.value))}
                    >
                      <option value={0.75}>0.75x</option>
                      <option value={0.9}>0.9x</option>
                      <option value={1}>1.0x</option>
                    </select>
                  </label>
                  <label className="toggle">
                    <input
                      type="checkbox"
                      checked={autoAdvance}
                      onChange={(event) => setAutoAdvance(event.target.checked)}
                    />
                    Auto-advance
                  </label>
                </div>

                {targetWord && (
                  <div className="button-row">
                    <button type="button" onClick={() => handleStatus([targetWord.id], 'known')}>
                      Mark known
                    </button>
                    <button type="button" onClick={() => handleStatus([targetWord.id], 'familiar')}>
                      Mark familiar
                    </button>
                    <button
                      type="button"
                      onClick={async () => {
                        await recordEvent({
                          type: 'skip',
                          itemType: 'word',
                          itemId: targetWord.id,
                        })
                        setCurrentStepIndex(Math.min(lesson.steps.length - 1, currentStepIndex + 1))
                      }}
                    >
                      Skip word
                    </button>
                  </div>
                )}
              </div>
              )}

              {lessonMode === 'live' && (
                <ol className="playlist">
                  {lesson.steps.map((step, index) => (
                    <li key={step.id} className={index === currentStepIndex ? 'active' : ''}>
                      <button
                        type="button"
                        onClick={() => {
                          stopPlayback()
                          setCurrentStepIndex(index)
                        }}
                      >
                        <span>{step.kind}</span>
                        {step.label}
                      </button>
                    </li>
                  ))}
                </ol>
              )}
            </>
          ) : (
            <section className="panel empty-state">
              <h2>No lesson loaded</h2>
              <p>Start a lesson from Dashboard or select up to five words in Word Manager.</p>
              <button className="primary" type="button" onClick={() => startPocketLesson()}>
                Start today's 5
              </button>
            </section>
          )}
        </section>
      )}

      <footer className="status-bar" aria-live="polite">
        {lastSummary}
      </footer>
    </main>
  )
}

function InfoPanel({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="panel">
      <h2>{title}</h2>
      {children}
    </section>
  )
}

function StatusPill({ status }: { status: WordStatus }) {
  return <span className={`status-pill status-${status}`}>{status}</span>
}

function FilePanel({
  title,
  help,
  accept,
  multiple,
  webkitdirectory,
  onChange,
}: {
  title: string
  help: string
  accept: string
  multiple?: boolean
  webkitdirectory?: boolean
  onChange: (files: FileList | null) => void
}) {
  return (
    <section className="panel">
      <h2>{title}</h2>
      <p>{help}</p>
      <label className="file-button">
        Choose file{multiple ? 's' : ''}
        <input
          type="file"
          accept={accept}
          multiple={multiple}
          onChange={(event) => onChange(event.target.files)}
          {...(webkitdirectory ? { webkitdirectory: '' } : {})}
        />
      </label>
    </section>
  )
}

function FileInputButton({
  label,
  accept,
  onChange,
}: {
  label: string
  accept: string
  onChange: (files: FileList | null) => void
}) {
  return (
    <label className="file-button">
      {label}
      <input type="file" accept={accept} onChange={(event) => onChange(event.target.files)} />
    </label>
  )
}

function ActiveRecallCard({
  quiz,
  response,
  word,
  sentence,
  hintLevel,
  showPinyin,
  onAnswer,
  onContinue,
  onHint,
  onReplay,
  onReveal,
}: {
  quiz: ActiveQuiz
  response?: QuizResponse
  word?: VocabWord
  sentence?: Sentence
  hintLevel: number
  showPinyin: boolean
  onAnswer: (value: string) => void | Promise<void>
  onContinue: () => void
  onHint: () => void
  onReplay: () => void
  onReveal: () => void | Promise<void>
}) {
  const [choicesReady, setChoicesReady] = useState(() => getChoiceRevealDelay(quiz.stage) === 0)
  const cue = getActiveRecallCue(quiz, word, sentence)
  const promptText = getActiveRecallPrompt(quiz)
  const correctLabel = getQuizAnswerLabel(quiz, word)
  const selectedLabel = getSelectedAnswerLabel(quiz, response)
  const feedbackText = getQuizFeedbackText(quiz, word, correctLabel)
  const showPinyinHint = ((showPinyin && quiz.stage === 'easy') || hintLevel >= 2) && Boolean(word?.pinyin)
  const answered = Boolean(response)
  const canChoose = !answered && choicesReady && quiz.options.length > 1
  const revealDelay = getChoiceRevealDelay(quiz.stage)
  const cueIsSoftened = !choicesReady && quiz.stage === 'audio-first'

  useEffect(() => {
    if (response) return
    const delay = getChoiceRevealDelay(quiz.stage)
    if (delay === 0) return
    const timeout = window.setTimeout(() => setChoicesReady(true), delay)
    return () => window.clearTimeout(timeout)
  }, [quiz.id, quiz.stage, response])

  return (
    <section className={`active-recall-card recall-stage-${quiz.stage}`} aria-live="polite">
      <div className="recall-prompt">
        <span>{getQuizModeLabel(quiz)}</span>
        <strong>{promptText}</strong>
      </div>
      <div className={`recall-cue ${cue.kind} ${cueIsSoftened ? 'softened' : ''}`}>
        {cueIsSoftened ? 'Listen first' : cue.text}
      </div>
      {!answered && !choicesReady && (
        <div className="recall-think-first">
          {revealDelay > 1000 ? 'Think first. Choices appear in a moment.' : 'Listen first.'}
        </div>
      )}
      {showPinyinHint && <div className="recall-hint">{word?.pinyin}</div>}
      {answered && (
        <div className={`recall-feedback ${response?.correct ? 'correct' : 'wrong'}`}>
          <strong>{response?.correct ? 'Correct' : response?.revealed ? 'Revealed' : 'Not quite'}</strong>
          <span>
            {response?.correct || response?.revealed || !selectedLabel
              ? `Answer: ${feedbackText}`
              : `You chose ${selectedLabel}. Answer: ${feedbackText}`}
          </span>
        </div>
      )}
      {!answered && choicesReady && (
        <div className={`recall-options ${canChoose ? '' : 'single-reveal'}`}>
          {canChoose ? (
            quiz.options.map((option, index) => (
              <button key={option.value} type="button" onClick={() => onAnswer(option.value)}>
                <kbd>{index + 1}</kbd>
                {option.label}
              </button>
            ))
          ) : (
            <button type="button" onClick={onReveal}>
              Reveal answer
            </button>
          )}
        </div>
      )}
      <div className="recall-support">
        <button type="button" onClick={onReplay}>
          Replay
        </button>
        {!answered && (
          <button type="button" onClick={onHint}>
            {hintLevel === 0 ? 'Hint' : hintLevel === 1 ? 'Show pinyin' : 'Reveal'}
          </button>
        )}
        {!answered && (
          <button type="button" onClick={onReveal}>
            Reveal
          </button>
        )}
        {answered && (
          <button type="button" className="primary" onClick={onContinue}>
            Continue
          </button>
        )}
      </div>
    </section>
  )
}

function formatSummary(summary: ImportSummary): string {
  const parts = [
    `${summary.created} created`,
    `${summary.updated} updated`,
    `${summary.skipped} skipped`,
  ]
  if (summary.importedWords !== undefined) parts.push(`${summary.importedWords} word imports`)
  if (summary.importedSentences !== undefined) {
    parts.push(`${summary.importedSentences} sentence imports`)
  }
  if (summary.linkedAudio !== undefined) parts.push(`${summary.linkedAudio} audio links`)
  if (summary.warnings.length > 0) parts.push(`${summary.warnings.length} warnings`)
  return parts.join(', ')
}

const fsrsRatingsForUi: Array<{ value: FsrsRating; label: string }> = [
  { value: 'again', label: 'Again' },
  { value: 'hard', label: 'Hard' },
  { value: 'good', label: 'Good' },
  { value: 'easy', label: 'Easy' },
]

function fsrsLabel(rating: FsrsRating): string {
  return fsrsRatingsForUi.find((item) => item.value === rating)?.label ?? rating
}

function hotkeyToRating(key: string, hotkeys: HotkeySettings): FsrsRating | undefined {
  if (key === hotkeys.ratingAgain) return 'again'
  if (key === hotkeys.ratingHard) return 'hard'
  if (key === hotkeys.ratingGood) return 'good'
  if (key === hotkeys.ratingEasy) return 'easy'
  return undefined
}

function hotkeyLabel(key: keyof HotkeySettings): string {
  return {
    answerA: 'Answer A',
    answerB: 'Answer B',
    replay: 'Replay',
    skip: 'Skip',
    ratingAgain: 'Rate again',
    ratingHard: 'Rate hard',
    ratingGood: 'Rate good',
    ratingEasy: 'Rate easy',
  }[key]
}

function hasPassedInitialVocabSection(segment: RenderedLessonSegment | undefined): boolean {
  if (!segment) return false
  return (
    segment.stepId.startsWith('mixed-') ||
    segment.stepId.startsWith('contrast-') ||
    segment.stepId.startsWith('sentence-support-') ||
    segment.stepId.startsWith('quick-') ||
    segment.stepId === 'quick-final-ding'
  )
}

function wordsToProgressCsv(words: VocabWord[]): string {
  const columns = [
    'word',
    'pinyin',
    'meaning',
    'status',
    'lessonNumber',
    'tags',
    'source',
    'partOfSpeech',
    'seenCount',
    'correctCount',
    'wrongCount',
    'listenedSeconds',
    'lastReviewedAt',
    'notes',
    'fsrsDueAt',
    'fsrsIntervalDays',
    'fsrsEase',
    'fsrsRepetitions',
    'fsrsLapses',
  ]
  const rows = words.map((word) =>
    [
      word.word,
      word.pinyin ?? '',
      word.meaning,
      word.status,
      word.lessonNumber ?? '',
      (word.tags ?? []).join(';'),
      word.source ?? '',
      word.partOfSpeech ?? '',
      word.seenCount,
      word.correctCount,
      word.wrongCount,
      word.listenedSeconds,
      word.lastReviewedAt ?? '',
      word.notes ?? '',
      word.fsrsDueAt ?? '',
      word.fsrsIntervalDays ?? '',
      word.fsrsEase ?? '',
      word.fsrsRepetitions ?? '',
      word.fsrsLapses ?? '',
    ].map(csvCell).join(','),
  )
  return [columns.join(','), ...rows].join('\n')
}

function csvCell(value: string | number): string {
  const text = String(value)
  return /[",\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text
}

function getActiveRecallCue(
  quiz: ActiveQuiz,
  word?: VocabWord,
  sentence?: Sentence,
): { text: string; kind: 'chinese' | 'english' } {
  if (sentence) return { text: sentence.chinese, kind: 'chinese' }
  if (quiz.kind === 'contrast') return { text: word?.meaning ?? quiz.prompt, kind: 'english' }
  if (quiz.kind === 'en-zh') return { text: word?.meaning ?? quiz.prompt, kind: 'english' }
  if (quiz.kind === 'audio-zh') return { text: 'Audio only', kind: 'english' }
  return { text: word?.word ?? quiz.prompt, kind: 'chinese' }
}

function getQuizModeLabel(quiz: ActiveQuiz): string {
  return {
    'zh-en': 'Recall meaning',
    'en-zh': 'Recall Chinese',
    'audio-zh': 'Audio only',
    contrast: 'Contrast choice',
    'sentence-zh-en': 'Read the sentence',
  }[quiz.kind]
}

function getActiveRecallPrompt(quiz: ActiveQuiz): string {
  if (quiz.kind === 'sentence-zh-en') return 'What does this sentence mean?'
  if (quiz.kind === 'contrast') return quiz.prompt
  if (quiz.kind === 'audio-zh') return 'Which word did you hear?'
  if (quiz.stage === 'audio-first' && quiz.kind === 'zh-en') {
    return 'What did that word mean?'
  }
  if (quiz.stage === 'try-before-choices') {
    return quiz.kind === 'en-zh' ? 'Try to recall it first.' : 'Think first. Choices appear soon.'
  }
  return quiz.prompt
}

function getQuizAnswerLabel(quiz: ActiveQuiz, word?: VocabWord): string {
  const optionLabel = quiz.options.find((option) => option.value === quiz.correctValue)?.label
  if (optionLabel) return optionLabel
  if (quiz.kind === 'zh-en') return word?.meaning ?? quiz.correctValue
  if (quiz.kind === 'sentence-zh-en') return quiz.correctValue
  return word?.word ?? quiz.correctValue
}

function getSelectedAnswerLabel(quiz: ActiveQuiz, response?: QuizResponse): string | undefined {
  if (!response?.selected) return undefined
  return quiz.options.find((option) => option.value === response.selected)?.label ?? response.selected
}

function getChoiceRevealDelay(stage: RecallStage): number {
  return {
    easy: 0,
    rescue: 0,
    'audio-first': 700,
    'try-before-choices': 1400,
    quick: 0,
  }[stage]
}

function getQuizFeedbackText(quiz: ActiveQuiz, word: VocabWord | undefined, correctLabel: string): string {
  const parts = [correctLabel]
  if (word?.word && correctLabel !== word.word) parts.push(word.word)
  if (word?.pinyin) parts.push(word.pinyin)
  if (word?.meaning && correctLabel !== word.meaning) parts.push(word.meaning)
  if (quiz.kind === 'contrast' && word?.meaning && !parts.includes(word.meaning)) {
    parts.push(word.meaning)
  }
  return parts.join(' · ')
}

function getRecallStage(stepId: string): RecallStage {
  // Progression stays 2-choice throughout: the challenge comes from reducing
  // visible support and adding a short think-first delay in later recall phases.
  if (stepId.startsWith('rescue-')) return 'rescue'
  if (stepId.startsWith('word-block-')) return 'easy'
  if (stepId.startsWith('mixed-audio-zh-')) return 'try-before-choices'
  if (stepId.startsWith('mixed-1-')) return 'audio-first'
  if (stepId.startsWith('mixed-2-') || stepId.startsWith('contrast-')) {
    return 'try-before-choices'
  }
  if (stepId.startsWith('quick-')) return 'quick'
  return 'easy'
}

function buildActiveQuiz(
  segment: RenderedLessonSegment | undefined,
  renderedLesson: RenderedLesson | null,
  lessonWords: VocabWord[],
  allWords: VocabWord[],
  allSentences: Sentence[],
): ActiveQuiz | undefined {
  if (!segment || segment.kind !== 'pause') return undefined

  if (segment.sentenceId && segment.stepId.startsWith('sentence-support-')) {
    const sentenceIndex = getSentenceSupportIndex(segment.stepId)
    if (sentenceIndex > 1) return undefined
    const sentence = allSentences.find((candidate) => candidate.id === segment.sentenceId)
    if (!sentence) return undefined
    const linkedWord = lessonWords.find((word) => sentence.targetWords.includes(word.word))
    if (!linkedWord) return undefined
    return {
      id: segment.stepId,
      kind: 'sentence-zh-en',
      stage: 'try-before-choices',
      prompt: 'What does this sentence mean?',
      wordId: linkedWord.id,
      sentenceId: sentence.id,
      correctValue: sentence.english,
      options: buildSentenceMeaningOptions(sentence, allSentences, segment.stepId),
    }
  }

  if (!segment.wordId || segment.sentenceId) return undefined
  const word = lessonWords.find((candidate) => candidate.id === segment.wordId)
  if (!word) return undefined

  if (segment.stepId.startsWith('contrast-') && segment.stepId.endsWith('-pause')) {
    const prefix = segment.stepId.replace(/-pause$/, '')
    const otherId = renderedLesson?.segments?.find(
      (candidate) => candidate.stepId === `${prefix}-option-b`,
    )?.wordId
    const other = lessonWords.find((candidate) => candidate.id === otherId)
    if (!other) return undefined
    return {
      id: segment.stepId,
      kind: 'contrast',
      stage: getRecallStage(segment.stepId),
      prompt: `Which means ${word.meaning}?`,
      wordId: word.id,
      correctValue: word.id,
      options: orderLimitedOptions(
        { value: word.id, label: word.word },
        [{ value: other.id, label: other.word }],
        segment.stepId,
      ),
    }
  }

  if (segment.stepId.startsWith('mixed-audio-zh-')) {
    return {
      id: segment.stepId,
      kind: 'audio-zh',
      stage: getRecallStage(segment.stepId),
      prompt: 'Which word did you hear?',
      wordId: word.id,
      correctValue: word.id,
      options: buildWordOptions(word, lessonWords, allWords, segment.stepId),
    }
  }

  if (segment.stepId.includes('-zh-en-') && !segment.stepId.startsWith('quick-')) {
    return {
      id: segment.stepId,
      kind: 'zh-en',
      stage: getRecallStage(segment.stepId),
      prompt: `What does ${word.word} mean?`,
      wordId: word.id,
      correctValue: word.meaning,
      options: buildMeaningOptions(word, lessonWords, allWords, segment.stepId),
    }
  }

  if (segment.stepId.includes('-en-zh-') && !segment.stepId.startsWith('quick-')) {
    return {
      id: segment.stepId,
      kind: 'en-zh',
      stage: getRecallStage(segment.stepId),
      prompt: `Which word means ${word.meaning}?`,
      wordId: word.id,
      correctValue: word.id,
      options: buildWordOptions(word, lessonWords, allWords, segment.stepId),
    }
  }

  return undefined
}

function buildMeaningOptions(
  word: VocabWord,
  lessonWords: VocabWord[],
  allWords: VocabWord[],
  quizId: string,
): ActiveQuiz['options'] {
  const seen = new Set([word.meaning.toLocaleLowerCase()])
  const distractors = [...lessonWords, ...allWords]
    .filter((candidate) => candidate.id !== word.id)
    .filter((candidate) => {
      const key = candidate.meaning.toLocaleLowerCase()
      if (seen.has(key)) return false
      seen.add(key)
      return true
    })
    .map((candidate) => ({ value: candidate.meaning, label: candidate.meaning }))

  return orderLimitedOptions({ value: word.meaning, label: word.meaning }, distractors, quizId)
}

function buildWordOptions(
  word: VocabWord,
  lessonWords: VocabWord[],
  allWords: VocabWord[],
  quizId: string,
): ActiveQuiz['options'] {
  const seen = new Set([word.id])
  const distractors = [...lessonWords, ...allWords]
    .filter((candidate) => {
      if (seen.has(candidate.id)) return false
      seen.add(candidate.id)
      return true
    })
    .map((candidate) => ({ value: candidate.id, label: candidate.word }))

  return orderLimitedOptions({ value: word.id, label: word.word }, distractors, quizId)
}

function buildSentenceMeaningOptions(
  sentence: Sentence,
  allSentences: Sentence[],
  quizId: string,
): ActiveQuiz['options'] {
  const seen = new Set([sentence.english.toLocaleLowerCase()])
  const distractors = allSentences
    .filter((candidate) => candidate.id !== sentence.id)
    .filter((candidate) => {
      const key = candidate.english.toLocaleLowerCase()
      if (!key || seen.has(key)) return false
      seen.add(key)
      return true
    })
    .sort((a, b) => Math.abs(a.chinese.length - sentence.chinese.length) - Math.abs(b.chinese.length - sentence.chinese.length))
    .map((candidate) => ({ value: candidate.english, label: candidate.english }))

  return orderLimitedOptions(
    { value: sentence.english, label: sentence.english },
    distractors,
    quizId,
  )
}

function getSentenceSupportIndex(stepId: string): number {
  const match = /^sentence-support-(\d+)-/.exec(stepId)
  return match ? Number(match[1]) : Number.MAX_SAFE_INTEGER
}

function orderOptions(options: ActiveQuiz['options'], seed: string): ActiveQuiz['options'] {
  return [...options].sort(
    (a, b) => stableSortValue(`${seed}:${a.value}`) - stableSortValue(`${seed}:${b.value}`),
  )
}

function orderLimitedOptions(
  correct: ActiveQuiz['options'][number],
  distractors: ActiveQuiz['options'],
  seed: string,
): ActiveQuiz['options'] {
  return orderOptions([correct, ...distractors.slice(0, 1)], seed)
}

function stableSortValue(value: string): number {
  let hash = 2166136261
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index)
    hash = Math.imul(hash, 16777619)
  }
  return hash >>> 0
}

function getAnsweredQuizStats(responses: Record<string, QuizResponse>) {
  const answered = Object.values(responses).filter((response) => !response.skipped)
  return {
    answered: answered.length,
    correct: answered.filter((response) => response.correct).length,
  }
}

function getStudyDisplay(word?: VocabWord, sentence?: Sentence) {
  if (sentence) {
    return {
      kind: 'sentence',
      chinese: sentence.chinese,
      english: sentence.english,
      pinyin: word?.pinyin ?? '',
    }
  }
  if (word) {
    return {
      kind: 'word',
      chinese: word.word,
      english: word.meaning,
      pinyin: word.pinyin ?? '',
    }
  }
  return {
    kind: 'word',
    chinese: '准备',
    english: 'Ready',
    pinyin: 'zhun bei',
  }
}

function formatTime(seconds: number): string {
  if (!Number.isFinite(seconds)) return '0:00'
  const minutes = Math.floor(seconds / 60)
  const remaining = Math.floor(seconds % 60)
  return `${minutes}:${remaining.toString().padStart(2, '0')}`
}

function getAudioCoverage(
  words: VocabWord[],
  sentences: Sentence[],
  audioClips: AudioClip[],
) {
  const readyWords = words.filter((word) => word.audioWordId && word.audioMeaningId).length
  const promptClips = audioClips.filter((clip) => clip.type === 'prompt').length
  const sentenceReady = sentences.filter(
    (sentence) => sentence.audioSentenceId && sentence.audioEnglishId,
  ).length

  return {
    readyWords,
    sentenceReady,
    promptClips,
    missingWordClips: words.filter((word) => !word.audioWordId).length,
    missingMeaningClips: words.filter((word) => !word.audioMeaningId).length,
    missingSentenceClips: sentences.filter((sentence) => !sentence.audioSentenceId).length,
  }
}

export default App
