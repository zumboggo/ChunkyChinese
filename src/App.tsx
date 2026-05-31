import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  LineChart,
  Line,
  CartesianGrid,
  Legend,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from 'recharts'
import { pinyin } from 'pinyin-pro'
import {
  completeWordExposure,
  DEFAULT_HOTKEYS,
  deferWordsAfterListening,
  downloadText,
  exportBackup,
  getAllAudioClips,
  getAllClipPacks,
  getAllReaderBooks,
  getAllReaderPacks,
  getAllSentences,
  getAllWords,
  getAudioClip,
  getActivePackId,
  getDashboardStats,
  getNewWordsPerDay,
  getHotkeys,
  getHostedClipPackIndex,
  getPromptClip,
  getReaderProgress,
  getReviewSignalEvents,
  importAudioFiles,
  importBackup,
  importClipPackFiles,
  importHostedClipPack,
  rateWordFsrs,
  recordEvent,
  recordQuizAnswer,
  saveRenderedLesson,
  saveNewWordsPerDay,
  saveReaderProgress,
  seedLmsWordsIfEmpty,
  seedReaderBooksIfEmpty,
  saveHotkeys,
  setActivePackId as persistActivePackId,
  startReaderSession,
  updateReaderSession,
  getReaderSessionStats,
  getUserSettings,
  saveUserSettings,
  updateWordText,
  DEFAULT_USER_SETTINGS,
} from './db'
import { createLesson, createPocketLesson, selectTargetWords, type PauseProfile } from './lesson'
import { renderLessonToWav } from './renderAudio'
import {
  fsrsDueTime,
  fsrsQueueLabel,
  isFsrsCardDue,
  isNewFsrsCard,
  previewFsrsRatings,
  type FsrsQueueBucket,
} from './scheduler'
import { UniversalImporter } from './UniversalImporter'
import {
  getCloudAuthState,
  isSupabaseConfigured,
  onCloudAuthChange,
  signInWithGoogle,
  signInWithMagicLink,
  signOutOfCloud,
  syncNow,
  type CloudSyncResult,
  type CloudSyncStatus,
} from './supabaseSync'
import type {
  AudioClip,
  ClipPack,
  DashboardStats,
  FsrsRating,
  HotkeySettings,
  HostedClipPack,
  ImportSummary,
  LessonPlan,
  LessonStep,
  ReaderBook,
  ReaderPack,
  ReaderSentence,
  ReaderWordToken,
  ReaderSession,
  ReaderSessionStats,
  RenderedLesson,
  RenderedLessonSegment,
  Sentence,
  StudyMode,
  VocabWord,
} from './types'

type Screen = 'dashboard' | 'reader' | 'settings' | 'lesson' | 'flashcards'
type FlashcardQueueMode = 'mixed' | 'due' | 'new'
type FlashcardSessionCounts = {
  new: number
  learning: number
  review: number
  done: number
  total: number
}
type LessonStartOptions = {
  randomize?: boolean
  playAfterRender?: boolean
  pauseProfile?: PauseProfile
  newWordsLimit?: number
  allowExtraNew?: boolean
}
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

interface CardEditDraft {
  wordId: string
  word: string
  pinyin: string
  meaning: string
  notes: string
}

interface CloudSyncUiState {
  status: CloudSyncStatus
  email: string
  message: string
  lastSyncedAt?: string
}

const emptyStats: DashboardStats = {
  counts: { new: 0, learning: 0, due: 0, scheduled: 0 },
  dueNow: 0,
  dueSoon: 0,
  newAvailable: 0,
  scheduled: 0,
  minutesToday: 0,
  clipsCompletedToday: 0,
  knownToday: 0,
  lingqsCreatedToday: 0,
  lingqsLearnedToday: 0,
  newWordsToday: 0,
  currentStreak: 0,
  studyHeatmap: [],
  retentionSeries: [],
  readingSeries: [],
}

const DEFAULT_PACK_ID = 'lms-1000-azure'
const HIDDEN_PACK_IDS = new Set(['annas-reading-deck'])
const FLASHCARD_LEARN_AHEAD_MS = 5 * 60 * 1000

function App() {
  const [screen, setScreen] = useState<Screen>('dashboard')
  const [words, setWords] = useState<VocabWord[]>([])
  const [sentences, setSentences] = useState<Sentence[]>([])
  const [audioClips, setAudioClips] = useState<AudioClip[]>([])
  const [clipPacks, setClipPacks] = useState<ClipPack[]>([])
  const [hostedClipPacks, setHostedClipPacks] = useState<HostedClipPack[]>([])
  const [readerPacks, setReaderPacks] = useState<ReaderPack[]>([])
  const [readerBooks, setReaderBooks] = useState<ReaderBook[]>([])
  const [activePackId, setActivePackId] = useState<string | undefined>()
  const [stats, setStats] = useState<DashboardStats>(emptyStats)
  const [userSettings, setUserSettings] = useState(DEFAULT_USER_SETTINGS)
  const [newWordsPerDay, setNewWordsPerDay] = useState(15)
  const [hotkeysEditing, setHotkeysEditing] = useState(false)
  const [initialDataReady, setInitialDataReady] = useState(false)
  const [lesson, setLesson] = useState<LessonPlan | null>(null)
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
  const [studyMode, setStudyMode] = useState<StudyMode>('listeningMode')
  const [minimalVisualMode, setMinimalVisualMode] = useState(false)
  const [lessonMenuOpen, setLessonMenuOpen] = useState(false)
  const [pauseProfile, setPauseProfile] = useState<PauseProfile>('normal')
  const [quizResponses, setQuizResponses] = useState<Record<string, QuizResponse>>({})
  const [fsrsRatings, setFsrsRatings] = useState<Record<string, FsrsRating>>({})
  const [showReviewPrompt, setShowReviewPrompt] = useState(false)
  const [reviewCardIndex, setReviewCardIndex] = useState(0)
  const [reviewAnswerShown, setReviewAnswerShown] = useState(false)
  const [flashcardFeedback, setFlashcardFeedback] = useState<FsrsRating | null>(null)
  const [savedResumeTime, setSavedResumeTime] = useState<number | null>(null)
  const [autoNextLesson, setAutoNextLesson] = useState(true)
  const [autoAdvance, setAutoAdvance] = useState(true)
  const [hotkeys, setHotkeys] = useState<HotkeySettings>(DEFAULT_HOTKEYS)
  const [playbackRate, setPlaybackRate] = useState(1)
  const [lastSummary, setLastSummary] = useState<string>('Ready.')
  const [seedMessage, setSeedMessage] = useState('Loading LMS vocabulary...')
  const [activeReaderBookId, setActiveReaderBookId] = useState<string | undefined>()
  const [readerSentenceIndex, setReaderSentenceIndex] = useState(0)
  const [readerShowPinyin, setReaderShowPinyin] = useState(true)
  const [readerShowEnglish, setReaderShowEnglish] = useState(true)
  const [selectedReaderToken, setSelectedReaderToken] = useState<ReaderWordToken | null>(null)
  const [hostedPackDownloadId, setHostedPackDownloadId] = useState<string | null>(null)
  const [hostedPackProgress, setHostedPackProgress] = useState('')
  const [flashcardQueueIds, setFlashcardQueueIds] = useState<string[]>([])
  const [flashcardCurrentId, setFlashcardCurrentId] = useState<string | null>(null)
  const [flashcardDoneIds, setFlashcardDoneIds] = useState<string[]>([])
  const [flashcardClock, setFlashcardClock] = useState(() => Date.now())
  const [flashcardAnswerShown, setFlashcardAnswerShown] = useState(false)
  const [flashcardSessionFeedback, setFlashcardSessionFeedback] = useState<FsrsRating | null>(null)
  const [flashcardSessionId, setFlashcardSessionId] = useState<string | null>(null)
  const [editingWord, setEditingWord] = useState<CardEditDraft | null>(null)
  const [activeReaderSession, setActiveReaderSession] = useState<ReaderSession | null>(null)
  const [todayReaderStats, setTodayReaderStats] = useState<ReaderSessionStats | null>(null)
  const [cloudUserEmail, setCloudUserEmail] = useState<string | null>(null)
  const [cloudSync, setCloudSync] = useState<CloudSyncUiState>({
    status: isSupabaseConfigured ? 'signed-out' : 'unconfigured',
    email: '',
    message: isSupabaseConfigured
      ? 'Sign in to sync progress across devices.'
      : 'Supabase sync is not configured yet.',
  })
  const lastReaderActivityTimeRef = useRef<number>(0)
  const runToken = useRef(0)
  const activeAnswerLockRef = useRef<string | null>(null)
  const autoContinueTimeoutRef = useRef<number | null>(null)
  const spokenQuizIdRef = useRef<string | null>(null)
  const startNextLessonRef = useRef<(() => void) | null>(null)
  const runFromRef = useRef<((index: number, plan?: LessonPlan) => void) | null>(null)
  const activeChoiceAudioRef = useRef<HTMLAudioElement | null>(null)
  const activeChoiceSpeechTokenRef = useRef(0)
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const pocketAudioRef = useRef<HTMLAudioElement | null>(null)
  const lastPocketTimeRef = useRef(0)
  const playModeRef = useRef<HTMLElement | null>(null)
  const readerAutoPlayKeyRef = useRef<string | null>(null)
  const flashcardFeedbackTimeoutRef = useRef<number | null>(null)
  const syncTimerRef = useRef<number | null>(null)

  const refresh = useCallback(async () => {
    const [
      nextWords,
      nextSentences,
      nextAudio,
      nextPacks,
      nextReaderPacks,
      nextReaderBooks,
      nextActivePackId,
      nextNewWordsPerDay,
      nextUserSettings,
      nextHostedClipPacks,
    ] = await Promise.all([
      getAllWords(),
      getAllSentences(),
      getAllAudioClips(),
      getAllClipPacks(),
      getAllReaderPacks(),
      getAllReaderBooks(),
      getActivePackId(),
      getNewWordsPerDay(),
      getUserSettings(),
      getHostedClipPackIndex(),
    ])
    setWords(nextWords)
    setSentences(nextSentences)
    const visiblePacks = nextPacks.filter((pack) => !HIDDEN_PACK_IDS.has(pack.id))
    const defaultPack = visiblePacks.find((pack) => pack.id === DEFAULT_PACK_ID)
    const shouldUseDefault =
      !nextActivePackId || HIDDEN_PACK_IDS.has(nextActivePackId) || !visiblePacks.some((pack) => pack.id === nextActivePackId)
    const resolvedActivePackId = shouldUseDefault ? defaultPack?.id : nextActivePackId
    if (resolvedActivePackId !== nextActivePackId) {
      await persistActivePackId(resolvedActivePackId)
    }
    const nextStats = await getDashboardStats()
    setAudioClips(nextAudio)
    setClipPacks(visiblePacks)
    setReaderPacks(nextReaderPacks)
    setReaderBooks(nextReaderBooks)
    setActivePackId(resolvedActivePackId)
    setNewWordsPerDay(nextNewWordsPerDay)
    setUserSettings(nextUserSettings)
    setHostedClipPacks(nextHostedClipPacks)
    setStats(nextStats)
  }, [])

  const handleCloudSyncNow = useCallback(async (silent = false) => {
    if (!isSupabaseConfigured) {
      setCloudSync((current) => ({
        ...current,
        status: 'unconfigured',
        message: 'Supabase sync is not configured yet.',
      }))
      return
    }
    if (!cloudUserEmail) {
      setCloudSync((current) => ({
        ...current,
        status: 'signed-out',
        message: 'Sign in to sync progress across devices.',
      }))
      return
    }
    if (!navigator.onLine) {
      setCloudSync((current) => ({
        ...current,
        status: 'offline',
        message: 'Offline. Changes will sync when this device reconnects.',
      }))
      return
    }

    setCloudSync((current) => ({
      ...current,
      status: 'syncing',
      message: silent ? current.message : 'Syncing progress...',
    }))
    try {
      const result = await syncNow()
      setCloudSync((current) => ({
        ...current,
        status: 'synced',
        lastSyncedAt: result.syncedAt,
        message: formatCloudSyncResult(result),
      }))
      await refresh()
    } catch (error) {
      setCloudSync((current) => ({
        ...current,
        status: 'error',
        message: error instanceof Error ? error.message : 'Could not sync progress.',
      }))
    }
  }, [cloudUserEmail, refresh])

  const queueCloudSync = useCallback(() => {
    if (!isSupabaseConfigured || !cloudUserEmail) return
    if (syncTimerRef.current) window.clearTimeout(syncTimerRef.current)
    syncTimerRef.current = window.setTimeout(() => {
      syncTimerRef.current = null
      void handleCloudSyncNow(true)
    }, 1200)
  }, [cloudUserEmail, handleCloudSyncNow])

  useEffect(() => {
    async function start() {
      const seeded = await seedLmsWordsIfEmpty()
      const seededReaderSentences = await seedReaderBooksIfEmpty()
      setSeedMessage(
        seeded > 0
          ? `Seeded ${seeded} LMS target words.`
          : seededReaderSentences > 0
            ? `Loaded ${seededReaderSentences} reader sentences.`
            : 'LMS vocabulary loaded.',
      )
      const nextHotkeys = await getHotkeys()
      setHotkeys(nextHotkeys)
      await refresh()
      setInitialDataReady(true)
    }
    void start()
  }, [refresh])

  useEffect(() => {
    let cancelled = false

    async function loadAuth() {
      try {
        const state = await getCloudAuthState()
        if (cancelled) return
        const email = state.user?.email ?? null
        setCloudUserEmail(email)
        setCloudSync((current) => ({
          ...current,
          status: !state.configured ? 'unconfigured' : email ? 'idle' : 'signed-out',
          message: !state.configured
            ? 'Supabase sync is not configured yet.'
            : email
              ? 'Signed in. Sync is ready.'
              : 'Sign in to sync progress across devices.',
        }))
      } catch (error) {
        if (cancelled) return
        setCloudSync((current) => ({
          ...current,
          status: 'error',
          message: error instanceof Error ? error.message : 'Could not load sync sign-in.',
        }))
      }
    }

    void loadAuth()
    const unsubscribe = onCloudAuthChange((state) => {
      const email = state.user?.email ?? null
      setCloudUserEmail(email)
      setCloudSync((current) => ({
        ...current,
        status: !state.configured ? 'unconfigured' : email ? 'idle' : 'signed-out',
        message: !state.configured
          ? 'Supabase sync is not configured yet.'
          : email
            ? 'Signed in. Sync is ready.'
            : 'Sign in to sync progress across devices.',
      }))
    })
    return () => {
      cancelled = true
      unsubscribe()
    }
  }, [])

  useEffect(() => {
    if (!cloudUserEmail || !initialDataReady) return
    void handleCloudSyncNow(true)
  }, [cloudUserEmail, handleCloudSyncNow, initialDataReady])

  useEffect(() => {
    function handleOnline() {
      void handleCloudSyncNow(true)
    }
    function handleOffline() {
      setCloudSync((current) => ({
        ...current,
        status: 'offline',
        message: 'Offline. Changes will sync when this device reconnects.',
      }))
    }
    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)
    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
      if (syncTimerRef.current) window.clearTimeout(syncTimerRef.current)
    }
  }, [handleCloudSyncNow])

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
          src: `${import.meta.env.BASE_URL}icons/icon-192.png`,
          sizes: '192x192',
          type: 'image/png',
        },
        {
          src: `${import.meta.env.BASE_URL}icons/icon-512.png`,
          sizes: '512x512',
          type: 'image/png',
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
    () => buildActiveQuiz(currentSegment, lessonWords, scopedWords, scopedSentences),
    [currentSegment, lessonWords, scopedSentences, scopedWords],
  )
  const currentQuizResponse = currentQuiz ? quizResponses[currentQuiz.id] : undefined
  const answeredQuizStats = useMemo(() => getAnsweredQuizStats(quizResponses), [quizResponses])
  const isActiveLearningMode = studyMode === 'activeRecall'
  const isListeningMode = studyMode === 'listeningMode'
  const activeRecallSupportHidden =
    isActiveLearningMode && hasPassedInitialVocabSection(currentSegment)
  const isSentenceContinueSection =
    currentQuiz?.kind === 'sentence-zh-en' || currentSegment?.quiz?.kind === 'sentence-zh-en'
  const focusedActiveQuiz = studyMode === 'activeRecall' && Boolean(currentQuiz)
  const effectiveShowPinyin = showPinyin && !activeRecallSupportHidden
  const effectiveShowEnglish = showEnglish && (!activeRecallSupportHidden || isSentenceContinueSection)
  const allLessonWordsRated =
    ratingWords.length > 0 && ratingWords.every((word) => fsrsRatings[word.id])
  const activeReaderBook = useMemo(
    () => readerBooks.find((book) => book.id === activeReaderBookId),
    [activeReaderBookId, readerBooks],
  )
  const readerSentences = useMemo(
    () => activeReaderBook?.stories.flatMap((story) => story.sentences) ?? [],
    [activeReaderBook],
  )
  const currentReaderSentence = readerSentences[readerSentenceIndex]
  const readerTokens = useMemo(
    () => tokenizeReaderText(currentReaderSentence?.chinese ?? '', scopedWords.length > 0 ? scopedWords : words),
    [currentReaderSentence, scopedWords, words],
  )
  const remainingNewWordsToday = Math.max(0, newWordsPerDay - stats.newWordsToday)
  const dueWordList = useMemo(
    () =>
      scopedWords
        .filter((word) => isDueForDisplay(word))
        .sort((a, b) => dueTimeForDisplay(a) - dueTimeForDisplay(b))
        .slice(0, 6),
    [scopedWords],
  )
  const currentReviewWord = ratingWords[reviewCardIndex]
  const flashcardQueue = useMemo(
    () =>
      flashcardQueueIds
        .map((id) => words.find((word) => word.id === id))
        .filter((word): word is VocabWord => Boolean(word)),
    [flashcardQueueIds, words],
  )
  const flashcardDoneSet = useMemo(() => new Set(flashcardDoneIds), [flashcardDoneIds])
  const flashcardSessionCounts = useMemo(
    () => getFlashcardSessionCounts(flashcardQueue, flashcardDoneSet, flashcardClock),
    [flashcardClock, flashcardDoneSet, flashcardQueue],
  )
  const currentFlashcardWord = useMemo(
    () => {
      const selected =
        flashcardCurrentId && !flashcardDoneSet.has(flashcardCurrentId)
          ? flashcardQueue.find((word) => word.id === flashcardCurrentId)
          : undefined
      if (selected) return selected
      if (flashcardAnswerShown || flashcardSessionFeedback) return undefined
      return selectNextFlashcardWord(flashcardQueue, flashcardDoneSet, undefined, flashcardClock)
    },
    [
      flashcardAnswerShown,
      flashcardClock,
      flashcardCurrentId,
      flashcardDoneSet,
      flashcardQueue,
      flashcardSessionFeedback,
    ],
  )
  const flashcardSessionComplete =
    flashcardQueue.length > 0 && flashcardSessionCounts.done >= flashcardSessionCounts.total

  const buildFlashcardQueue = useCallback((mode: FlashcardQueueMode = 'mixed') => {
    const source = scopedWords.length > 0 ? scopedWords : words
    const limit = Math.max(1, userSettings.flashcardsPerDay || 50)
    const now = Date.now()
    const due = source
      .filter(
        (word) =>
          isFsrsCardDue(word, now) ||
          (isFlashcardLearning(word) && fsrsDueTime(word) <= now + FLASHCARD_LEARN_AHEAD_MS),
      )
      .sort((a, b) => fsrsDueTime(a) - fsrsDueTime(b))
    const fresh = source
      .filter(isNewFsrsCard)
      .sort((a, b) => (a.lessonNumber ?? 9999) - (b.lessonNumber ?? 9999))
    if (mode === 'due') return due.slice(0, limit)
    if (mode === 'new') return fresh.slice(0, limit)
    const mixed = [...due, ...fresh].filter(
      (word, index, all) => all.findIndex((candidate) => candidate.id === word.id) === index,
    )
    return mixed.slice(0, limit)
  }, [scopedWords, userSettings.flashcardsPerDay, words])

  const startFlashcards = useCallback((mode: FlashcardQueueMode = 'mixed', overrideWords?: VocabWord[]) => {
    const queue = overrideWords ?? buildFlashcardQueue(mode)
    setFlashcardQueueIds(queue.map((word) => word.id))
    setFlashcardDoneIds([])
    setFlashcardCurrentId(selectNextFlashcardWord(queue, new Set())?.id ?? null)
    setFlashcardSessionId(`flashcards:${crypto.randomUUID()}`)
    setFlashcardClock(Date.now())
    setFlashcardAnswerShown(false)
    setFlashcardSessionFeedback(null)
    setScreen('flashcards')
    setLastSummary(queue.length > 0 ? `Loaded ${queue.length} flashcards.` : 'No flashcards match that queue.')
  }, [buildFlashcardQueue])

  const startSavedFlashcards = useCallback(() => {
    startFlashcards(userSettings.flashcardQueueMode ?? 'mixed')
  }, [startFlashcards, userSettings.flashcardQueueMode])

  const openCardEditor = useCallback((word: VocabWord) => {
    setEditingWord({
      wordId: word.id,
      word: word.word,
      pinyin: word.pinyin ?? '',
      meaning: word.meaning,
      notes: word.notes ?? '',
    })
  }, [])

  const saveCardEdit = useCallback(async () => {
    if (!editingWord) return
    const updatedWord = await updateWordText(editingWord.wordId, editingWord)
    if (!updatedWord) {
      setLastSummary('Could not find that card to edit.')
      setEditingWord(null)
      return
    }
    setWords((currentWords) =>
      currentWords.map((word) => (word.id === updatedWord.id ? updatedWord : word)),
    )
    setSelectedReaderToken((token) =>
      token?.word?.id === updatedWord.id ? { ...token, word: updatedWord } : token,
    )
    setEditingWord(null)
    setLastSummary(`Saved edits to ${updatedWord.word}.`)
    queueCloudSync()
    void refresh()
  }, [editingWord, queueCloudSync, refresh])

  const finishFlashcardSession = useCallback(() => {
    setLastSummary('Flashcard session saved.')
    setFlashcardCurrentId(null)
    setFlashcardAnswerShown(false)
    setFlashcardSessionFeedback(null)
    setScreen('dashboard')
    void refresh()
  }, [refresh])

  useEffect(() => {
    if (screen !== 'flashcards') return
    const interval = window.setInterval(() => setFlashcardClock(Date.now()), 15_000)
    return () => window.clearInterval(interval)
  }, [screen])

  const recordReaderInteraction = useCallback(() => {
    lastReaderActivityTimeRef.current = Date.now()
  }, [])

  const recordReaderSentenceView = useCallback(async (sentence: ReaderSentence, session: ReaderSession) => {
    if (session.sentenceIdsRead.includes(sentence.id)) {
      return
    }
    const currentVocab = scopedWords.length > 0 ? scopedWords : words
    const tokens = tokenizeReaderText(sentence.chinese, currentVocab)
    const chineseTokensCount = tokens.filter(t => t.isChinese).length
    const updatedSession: ReaderSession = {
      ...session,
      sentenceIdsRead: [...session.sentenceIdsRead, sentence.id],
      wordsRead: session.wordsRead + chineseTokensCount,
      updatedAt: new Date().toISOString(),
    }
    await updateReaderSession(updatedSession)
    setActiveReaderSession(updatedSession)
    const stats = await getReaderSessionStats()
    setTodayReaderStats(stats)
  }, [words, scopedWords])

  const renderAndLoadLesson = useCallback(async (
    nextLesson: LessonPlan,
    playAfterRender: boolean,
    readyMessage: string,
  ) => {
    setLesson(nextLesson)
    setCurrentStepIndex(0)
    setQuizResponses({})
    setShowReviewPrompt(false)
    setReviewCardIndex(0)
    setReviewAnswerShown(false)
    if (nextLesson.steps.filter((step) => step.kind === 'audio').length === 0) {
      setLessonMode('live')
      setLastSummary('No local clips are linked yet. Using browser TTS while the app stays open.')
      if (playAfterRender) window.setTimeout(() => runFromRef.current?.(0, nextLesson), 120)
      return
    }
    const rendered = await renderLessonToWav(nextLesson, getAudioClip)
    await saveRenderedLesson(rendered)
    if (renderedUrl) URL.revokeObjectURL(renderedUrl)
    const url = URL.createObjectURL(rendered.blob)
    setRenderedLesson(rendered)
    setRenderedUrl(url)
    setPocketProgress({ current: 0, duration: rendered.durationSeconds })
    lastPocketTimeRef.current = 0
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
  }, [renderedUrl])

  const refreshRecallLesson = useCallback(async () => {
    if (!lesson) return
    setRendering(true)
    try {
      const targetWords = lesson.targetWords
      const keptWords: VocabWord[] = []
      for (const word of targetWords) {
        const currentWord = words.find(w => w.id === word.id)
        if (!fsrsRatings[word.id]) {
          keptWords.push(currentWord || word)
        }
      }
      setQuizResponses({})
      setFsrsRatings({})
      const useBrowserTts = activePack?.browserTts
      const activeRecallEvents = await getReviewSignalEvents()

      if (keptWords.length === 0) {
        const nextWords = scopedWords.length > 0 ? scopedWords : words
        const nextSentences = scopedSentences.length > 0 ? scopedSentences : sentences
        const nextLesson = useBrowserTts
          ? createLesson(nextWords, nextSentences, [], {
              activeRecall: true,
              activeRecallEvents,
              newWordsLimit: remainingNewWordsToday,
            })
          : createPocketLesson(nextWords, nextSentences, audioClips, [], {
              pauseProfile,
              activeRecall: true,
              activeRecallEvents,
              newWordsLimit: remainingNewWordsToday,
            })
        setRatingWordIds(nextLesson.targetWords.map((word) => word.id))
        await renderAndLoadLesson(
          nextLesson,
          true,
          'Lesson refreshed with a totally new word set.',
        )
      } else {
        const nextWords = scopedWords.length > 0 ? scopedWords : words
        const nextSentences = scopedSentences.length > 0 ? scopedSentences : sentences
        const keptWordIds = keptWords.map(w => w.id)
        const nextLessonTargetWords = selectTargetWords(nextWords, [], {
          activeRecall: true,
          activeRecallEvents,
          newWordsLimit: remainingNewWordsToday,
          keptWordIds,
        })
        const nextLesson = useBrowserTts
          ? createLesson(nextWords, nextSentences, nextLessonTargetWords.map(w => w.id), {
              activeRecall: true,
              allowExtraNew: true,
            })
          : createPocketLesson(nextWords, nextSentences, audioClips, nextLessonTargetWords.map(w => w.id), {
              pauseProfile,
              activeRecall: true,
              allowExtraNew: true,
            })
        setRatingWordIds(nextLesson.targetWords.map((word) => word.id))
        await renderAndLoadLesson(
          nextLesson,
          true,
          'Lesson refreshed, keeping unmodified words.',
        )
      }
    } catch (error) {
      setLastSummary(error instanceof Error ? error.message : 'Could not refresh lesson.')
    } finally {
      setRendering(false)
    }
  }, [lesson, words, fsrsRatings, activePack, audioClips, pauseProfile, remainingNewWordsToday, scopedWords, scopedSentences, sentences, renderAndLoadLesson])

  // Reader Mode activity event listeners
  useEffect(() => {
    if (screen !== 'reader') return
    const handleActivity = () => {
      recordReaderInteraction()
    }
    window.addEventListener('keydown', handleActivity, { passive: true })
    window.addEventListener('pointerdown', handleActivity, { passive: true })
    return () => {
      window.removeEventListener('keydown', handleActivity)
      window.removeEventListener('pointerdown', handleActivity)
    }
  }, [screen, recordReaderInteraction])

  // Reader Mode 1-second active timer
  useEffect(() => {
    if (screen !== 'reader' || !activeReaderSession) return
    const interval = window.setInterval(() => {
      const now = Date.now()
      const timeSinceLastActivity = now - lastReaderActivityTimeRef.current
      if (timeSinceLastActivity <= 60000) {
        setActiveReaderSession((prev: ReaderSession | null) => {
          if (!prev) return null
          const updated = {
            ...prev,
            activeSeconds: prev.activeSeconds + 1,
            updatedAt: new Date().toISOString(),
          }
          void updateReaderSession(updated)
          return updated
        })
      }
    }, 1000)
    return () => {
      window.clearInterval(interval)
    }
  }, [screen, activeReaderSession])

  // Load today's reader stats when activeSeconds or wordsRead changes
  useEffect(() => {
    let active = true
    async function loadStats() {
      const stats = await getReaderSessionStats()
      if (active) {
        setTodayReaderStats(stats)
      }
    }
    void loadStats()
    return () => {
      active = false
    }
  }, [screen, activeReaderSession?.activeSeconds, activeReaderSession?.wordsRead])

  useEffect(
    () => () => {
      if (flashcardFeedbackTimeoutRef.current !== null) {
        window.clearTimeout(flashcardFeedbackTimeoutRef.current)
      }
    },
    [],
  )


  const openReviewPrompt = useCallback(() => {
    setReviewCardIndex(0)
    setReviewAnswerShown(false)
    setShowReviewPrompt(true)
  }, [])

  const openReaderBook = useCallback(async (book: ReaderBook, action: 'resume' | 'start' = 'resume') => {
    const progress = await getReaderProgress(book.packId, book.id)
    const sentenceCount = book.stories.reduce((sum, story) => sum + story.sentences.length, 0)
    const sentenceIndex = action === 'start' ? 0 : progress?.sentenceIndex ?? 0
    const readerSentencesForBook = book.stories.flatMap((story) => story.sentences)
    const boundedIndex = Math.min(Math.max(0, sentenceIndex), Math.max(0, sentenceCount - 1))
    setActiveReaderBookId(book.id)
    setReaderSentenceIndex(boundedIndex)
    setSelectedReaderToken(null)
    setScreen('reader')
    const session = await startReaderSession(book.packId, book.id)
    setActiveReaderSession(session)
    recordReaderInteraction()
    const firstSentence = readerSentencesForBook[boundedIndex]
    if (firstSentence) {
      await recordReaderSentenceView(firstSentence, session)
    }
    if (action === 'start') {
      await saveReaderProgress({
        packId: book.packId,
        bookId: book.id,
        sentenceIndex: 0,
      })
    }
  }, [recordReaderInteraction, recordReaderSentenceView])

  const moveReaderSentence = useCallback(async (delta: number) => {
    if (!activeReaderBook || readerSentences.length === 0) return
    const nextIndex = Math.min(
      Math.max(readerSentenceIndex + delta, 0),
      readerSentences.length - 1,
    )
    recordReaderInteraction()
    setReaderSentenceIndex(nextIndex)
    setSelectedReaderToken(null)
    await saveReaderProgress({
      packId: activeReaderBook.packId,
      bookId: activeReaderBook.id,
      sentenceIndex: nextIndex,
    })
    const nextSentence = readerSentences[nextIndex]
    if (nextSentence && activeReaderSession) {
      await recordReaderSentenceView(nextSentence, activeReaderSession)
    }
  }, [
    activeReaderBook,
    activeReaderSession,
    readerSentenceIndex,
    readerSentences,
    recordReaderInteraction,
    recordReaderSentenceView,
  ])

  async function playReaderSentence(sentence: ReaderSentence) {
    recordReaderInteraction()
    const token = runToken.current + 1
    runToken.current = token
    audioRef.current?.pause()
    window.speechSynthesis?.cancel()
    const clip = await getAudioClip(sentence.audioClipId)
    if (clip) {
      await playAudioClip(clip.id, token)
      return
    }
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel()
      await speakUtterance(sentence.chinese, playbackRate, 'zh-CN')
    }
  }

  useEffect(() => {
    if (screen !== 'reader' || !activeReaderBook || !currentReaderSentence) return
    const key = `${activeReaderBook.id}:${readerSentenceIndex}:${currentReaderSentence.id}`
    if (readerAutoPlayKeyRef.current === key) return
    readerAutoPlayKeyRef.current = key
    const token = runToken.current + 1
    runToken.current = token
    audioRef.current?.pause()
    window.speechSynthesis?.cancel()

    async function playCurrentReaderSentence() {
      const sentence = currentReaderSentence
      const clip = await getAudioClip(sentence.audioClipId)
      if (clip && runToken.current === token) {
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
        return
      }
      if ('speechSynthesis' in window && runToken.current === token) {
        await speakUtterance(sentence.chinese, playbackRate, 'zh-CN')
      }
    }

    void playCurrentReaderSentence()
  }, [activeReaderBook, currentReaderSentence, playbackRate, readerSentenceIndex, screen])

  async function handleNewWordsPerDayChange(value: number) {
    await saveNewWordsPerDay(value)
    setNewWordsPerDay(Math.min(50, Math.max(0, Math.round(value))))
    await refresh()
  }

  const clearAutoContinueTimeout = useCallback(() => {
    if (autoContinueTimeoutRef.current !== null) {
      window.clearTimeout(autoContinueTimeoutRef.current)
      autoContinueTimeoutRef.current = null
    }
  }, [])

  const stopActiveChoiceSpeech = useCallback(() => {
    activeChoiceSpeechTokenRef.current += 1
    activeChoiceAudioRef.current?.pause()
    activeChoiceAudioRef.current = null
    window.speechSynthesis?.cancel()
  }, [])

  useEffect(() => {
    if (!isActiveLearningMode || !currentQuiz || currentQuizResponse) return
    if (!pocketAudioRef.current || pocketAudioRef.current.paused) return
    pocketAudioRef.current.pause()
  }, [currentQuiz, currentQuizResponse, isActiveLearningMode])

  useEffect(() => {
    activeAnswerLockRef.current = null
    spokenQuizIdRef.current = null
    stopActiveChoiceSpeech()
    clearAutoContinueTimeout()
  }, [clearAutoContinueTimeout, currentQuiz?.id, renderedLesson?.id, stopActiveChoiceSpeech])

  useEffect(() => clearAutoContinueTimeout, [clearAutoContinueTimeout])

  const handleQuizAnswer = useCallback(async (value: string) => {
    if (
      !currentQuiz ||
      quizResponses[currentQuiz.id] ||
      activeAnswerLockRef.current === currentQuiz.id
    ) {
      return
    }
    stopActiveChoiceSpeech()
    activeAnswerLockRef.current = currentQuiz.id
    const correct = value === currentQuiz.correctValue
    setQuizResponses((responses) => ({
      ...responses,
      [currentQuiz.id]: { selected: value, correct, hintCount: 0 },
    }))
    // TODO: Persist richer recall analytics: correctWithoutHint, correctWithHint, wrong, revealed.
    await recordQuizAnswer(currentQuiz.wordId, correct)
    setLastSummary(correct ? 'Correct.' : 'Not quite.')
    await refresh()
    queueCloudSync()
    if (!isActiveLearningMode) {
      window.setTimeout(() => {
        void pocketAudioRef.current?.play()
      }, 350)
    }
  }, [currentQuiz, isActiveLearningMode, queueCloudSync, quizResponses, refresh, stopActiveChoiceSpeech])

  const continueCurrentQuiz = useCallback(() => {
    stopActiveChoiceSpeech()
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
  }, [clearAutoContinueTimeout, currentSegment, stopActiveChoiceSpeech])

  const playActiveChoiceClip = useCallback(async (audioId: string, token: number) => {
    const clip = await getAudioClip(audioId)
    if (!clip || activeChoiceSpeechTokenRef.current !== token) return
    const url = URL.createObjectURL(clip.blob)
    const audio = new Audio(url)
    audio.playbackRate = playbackRate
    activeChoiceAudioRef.current = audio
    await new Promise<void>((resolve) => {
      audio.addEventListener('ended', () => resolve(), { once: true })
      audio.addEventListener('error', () => resolve(), { once: true })
      audio.play().catch(() => resolve())
    })
    URL.revokeObjectURL(url)
    if (activeChoiceAudioRef.current === audio) activeChoiceAudioRef.current = null
  }, [playbackRate])

  const playActiveChoiceText = useCallback(async (text: string, token: number, lang?: string) => {
    if (activeChoiceSpeechTokenRef.current !== token || !('speechSynthesis' in window)) return
    await speakUtterance(text, playbackRate, lang)
  }, [playbackRate])

  const playActiveQuizChoices = useCallback(async (quiz: ActiveQuiz) => {
    stopActiveChoiceSpeech()
    const token = activeChoiceSpeechTokenRef.current
    window.speechSynthesis.cancel()
    for (const [index, option] of quiz.options.slice(0, 2).entries()) {
      if (activeChoiceSpeechTokenRef.current !== token) return
      const promptClip = await getPromptClip(index === 0 ? 'choice-a' : 'choice-b')
      if (promptClip) await playActiveChoiceClip(promptClip.id, token)
      else await playActiveChoiceText(index === 0 ? 'A.' : 'B.', token, 'en-US')
      const optionClipId = getActiveQuizOptionClipId(option, quiz, words, sentences)
      if (optionClipId) await playActiveChoiceClip(optionClipId, token)
      else await playActiveChoiceText(option.label, token)
    }
  }, [playActiveChoiceClip, playActiveChoiceText, sentences, stopActiveChoiceSpeech, words])

  useEffect(() => {
    if (!focusedActiveQuiz || !currentQuiz || currentQuizResponse) return
    if (currentQuiz.kind === 'sentence-zh-en') return
    if (spokenQuizIdRef.current === currentQuiz.id) return
    spokenQuizIdRef.current = currentQuiz.id
    void playActiveQuizChoices(currentQuiz)
  }, [currentQuiz, currentQuizResponse, focusedActiveQuiz, playActiveQuizChoices])

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

  const replayCurrentSegment = useCallback(() => {
    const audio = pocketAudioRef.current
    if (!audio || !currentSegment) return
    audio.currentTime = Math.max(0, currentSegment.startSeconds)
    void audio.play()
  }, [currentSegment])

  const replayActiveRecallQuestionAudio = useCallback(async () => {
    if (!currentQuiz) {
      replayCurrentSegment()
      return
    }
    stopActiveChoiceSpeech()
    const token = runToken.current + 1
    runToken.current = token
    pocketAudioRef.current?.pause()
    audioRef.current?.pause()
    window.speechSynthesis?.cancel()

    const sentence = currentQuiz.sentenceId
      ? sentences.find((candidate) => candidate.id === currentQuiz.sentenceId)
      : undefined
    const word = currentQuiz.wordId
      ? words.find((candidate) => candidate.id === currentQuiz.wordId)
      : undefined
    const audioId = sentence?.audioSentenceId ?? word?.audioWordId
    const text = sentence?.chinese ?? word?.word

    if (audioId) {
      const clip = await getAudioClip(audioId)
      if (clip && runToken.current === token) {
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
        return
      }
    }

    if (text && 'speechSynthesis' in window && runToken.current === token) {
      await speakUtterance(text, playbackRate, 'zh-CN')
    }
  }, [currentQuiz, playbackRate, replayCurrentSegment, sentences, stopActiveChoiceSpeech, words])

  const handleFsrsRating = useCallback(async (wordId: string, rating: FsrsRating) => {
    await rateWordFsrs(wordId, rating, {
      source: studyMode === 'activeRecall' ? 'active-recall' : 'lesson-review',
    })
    const nextRatings = { ...fsrsRatings, [wordId]: rating }
    setFsrsRatings(nextRatings)
    setLastSummary(`Rated ${fsrsLabel(rating)}.`)
    await refresh()
    queueCloudSync()
    const ratingIds =
      ratingWordIds.length > 0 ? ratingWordIds : lessonWords.map((word) => word.id)
    const completeSet = ratingIds.length > 0 && ratingIds.every((id) => nextRatings[id])
    if (showReviewPrompt) {
      setReviewAnswerShown(false)
      if (completeSet) {
        setReviewCardIndex(ratingWords.length)
      } else {
        const nextIndex = ratingWords.findIndex((word) => !nextRatings[word.id])
        setReviewCardIndex(nextIndex >= 0 ? nextIndex : reviewCardIndex + 1)
      }
    }
  }, [fsrsRatings, lessonWords, queueCloudSync, ratingWordIds, ratingWords, refresh, reviewCardIndex, showReviewPrompt, studyMode])

  const handleFlashcardRate = useCallback((wordId: string, rating: FsrsRating) => {
    if (flashcardFeedback) return
    setFlashcardFeedback(rating)
    if (flashcardFeedbackTimeoutRef.current !== null) {
      window.clearTimeout(flashcardFeedbackTimeoutRef.current)
    }
    flashcardFeedbackTimeoutRef.current = window.setTimeout(() => {
      flashcardFeedbackTimeoutRef.current = null
      setFlashcardFeedback(null)
      void handleFsrsRating(wordId, rating)
    }, 500)
  }, [flashcardFeedback, handleFsrsRating])

  const handleStandaloneFlashcardRate = useCallback((rating: FsrsRating) => {
    if (!currentFlashcardWord || flashcardSessionFeedback) return
    const wordId = currentFlashcardWord.id
    const ratedWord = currentFlashcardWord
    setFlashcardSessionFeedback(rating)
    window.setTimeout(() => {
      void (async () => {
        const updatedWord = await rateWordFsrs(wordId, rating, {
          source: 'flashcards',
          sessionId: flashcardSessionId ?? undefined,
        })
        const now = Date.now()
        const nextDoneIds = getNextFlashcardDoneIds(
          flashcardDoneIds,
          wordId,
          updatedWord,
          rating,
          now,
        )
        const updatedQueue = flashcardQueue.map((word) => (word.id === wordId ? updatedWord ?? word : word))
        const nextWord = selectNextFlashcardWord(updatedQueue, new Set(nextDoneIds), wordId, now)
        if (updatedWord) {
          setWords((currentWords) =>
            currentWords.map((word) => (word.id === wordId ? updatedWord : word)),
          )
        }
        setFlashcardDoneIds(nextDoneIds)
        setFlashcardClock(now)
        setFlashcardCurrentId(nextWord?.id ?? null)
        void refresh()
        queueCloudSync()
        setLastSummary(`Rated ${ratedWord.word} ${fsrsLabel(rating)}.`)
        setFlashcardAnswerShown(false)
        setFlashcardSessionFeedback(null)
      })()
    }, 500)
  }, [currentFlashcardWord, flashcardDoneIds, flashcardQueue, flashcardSessionFeedback, flashcardSessionId, queueCloudSync, refresh])

  const togglePlayback = useCallback(() => {
    const audio = pocketAudioRef.current
    if (!audio || !renderedUrl) return
    if (audio.paused) {
      void audio.play()
    } else {
      audio.pause()
    }
  }, [renderedUrl])

  const completeListeningLesson = useCallback(async () => {
    if (!renderedLesson) return
    await recordEvent({
      type: 'complete',
      itemType: 'lesson',
      itemId: renderedLesson.id,
      seconds: renderedLesson.durationSeconds,
    })
    await deferWordsAfterListening(lessonWords.map((word) => word.id), 1)
    await refresh()
    queueCloudSync()
  }, [lessonWords, queueCloudSync, refresh, renderedLesson])

  const completeListeningLessonAndStartNext = useCallback(async () => {
    if (!renderedLesson) return
    pocketAudioRef.current?.pause()
    await completeListeningLesson()
    setLastSummary('Listening mode lesson counted. Starting the next lesson.')
    startNextLessonRef.current?.()
  }, [completeListeningLesson, renderedLesson])

  function finishLessonAndReturnHome() {
    pocketAudioRef.current?.pause()
    setShowReviewPrompt(false)
    setMinimalVisualMode(false)
    setSavedResumeTime(null)
    setScreen('dashboard')
    setLastSummary('Lesson finished. Your selected ratings were saved.')
  }

  const playFlashcardWordTwice = useCallback(async (word: VocabWord) => {
    const token = runToken.current + 1
    runToken.current = token
    audioRef.current?.pause()
    window.speechSynthesis?.cancel()
    for (let index = 0; index < 2; index += 1) {
      if (runToken.current !== token) return
      if (word.audioWordId) {
        const clip = await getAudioClip(word.audioWordId)
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
      } else {
        await speakUtterance(word.word, playbackRate, 'zh-CN')
      }
    }
  }, [playbackRate])

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      const target = event.target
      const isTyping =
        target instanceof HTMLInputElement ||
        target instanceof HTMLSelectElement ||
        target instanceof HTMLTextAreaElement
      if (isTyping) return
      const pressed = event.key.toLocaleLowerCase()
      const mappedIndex = choiceKeyIndex(pressed, hotkeys)
      if (screen === 'reader') {
        if (mappedIndex === 0) {
          event.preventDefault()
          setReaderShowEnglish((value) => !value)
        } else if (mappedIndex === 1) {
          event.preventDefault()
          void moveReaderSentence(1)
        }
        return
      }
      if (screen === 'flashcards') {
        if (!currentFlashcardWord) return
        if (!flashcardAnswerShown && (mappedIndex === 0 || event.key === 'Enter' || event.key === ' ')) {
          event.preventDefault()
          setFlashcardAnswerShown(true)
          void playFlashcardWordTwice(currentFlashcardWord)
          return
        }
        const rating = mappedIndex === 0 ? 'again' : mappedIndex === 1 ? 'good' : hotkeyToReviewRating(pressed, hotkeys)
        if (rating && flashcardAnswerShown) {
          event.preventDefault()
          handleStandaloneFlashcardRate(rating)
        }
        return
      }
      if (screen !== 'lesson') return
      if (pressed === hotkeys.playPause) {
        event.preventDefault()
        togglePlayback()
        return
      }
      if (showReviewPrompt) {
        if (allLessonWordsRated) {
          if (mappedIndex === 0) {
            event.preventDefault()
            startNextLessonRef.current?.()
          } else if (mappedIndex === 1) {
            event.preventDefault()
            finishLessonAndReturnHome()
          }
          return
        }
        if (flashcardFeedback) return
        if (!reviewAnswerShown && (mappedIndex === 0 || event.key === 'Enter' || event.key === ' ')) {
          event.preventDefault()
          setReviewAnswerShown(true)
          if (currentReviewWord) void playFlashcardWordTwice(currentReviewWord)
          return
        }
        const rating = mappedIndex === 0 ? 'again' : mappedIndex === 1 ? 'good' : hotkeyToReviewRating(pressed, hotkeys)
        if (rating && reviewAnswerShown && currentReviewWord) {
          event.preventDefault()
          handleFlashcardRate(currentReviewWord.id, rating)
        }
        return
      }
      if (
        mappedIndex >= 0 &&
        isSentenceContinueSection
      ) {
        event.preventDefault()
        if (mappedIndex === 0) {
          continueCurrentQuiz()
        } else if (mappedIndex === 1) {
          setShowEnglish((value) => !value)
        }
        return
      }
      if (
        currentQuiz &&
        currentQuiz.options.length > 1 &&
        mappedIndex >= 0 &&
        mappedIndex < currentQuiz.options.length &&
        !currentQuizResponse
      ) {
        event.preventDefault()
        const option = currentQuiz.options[mappedIndex]
        if (option) void handleQuizAnswer(option.value)
      } else if (currentQuiz && currentQuizResponse && event.key === 'Enter') {
        event.preventDefault()
        continueCurrentQuiz()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [
    continueCurrentQuiz,
    currentQuiz,
    currentQuizResponse,
    currentSegment,
    allLessonWordsRated,
    flashcardFeedback,
    fsrsRatings,
    handleFlashcardRate,
    handleQuizAnswer,
    hotkeys,
    isSentenceContinueSection,
    currentReviewWord,
    currentFlashcardWord,
    flashcardAnswerShown,
    handleStandaloneFlashcardRate,
    moveReaderSentence,
    playFlashcardWordTwice,
    ratingWords,
    reviewAnswerShown,
    screen,
    showReviewPrompt,
    togglePlayback,
  ])

  async function toggleFullscreen() {
    if (document.fullscreenElement) {
      await document.exitFullscreen()
    } else {
      await playModeRef.current?.requestFullscreen()
    }
  }

  async function startPocketLesson(
    manualIds: string[] = [],
    options: LessonStartOptions = { randomize: true },
  ) {
    setLessonMode('pocket')
    setRendering(true)
    setScreen('lesson')
    try {
      const { playAfterRender = false, ...selectionOptions } = options
      const lessonWords = scopedWords.length > 0 ? scopedWords : words
      const lessonSentences = scopedSentences.length > 0 ? scopedSentences : sentences
      const useBrowserTts = activePack?.browserTts
      const activeRecallEvents = studyMode === 'activeRecall' ? await getReviewSignalEvents() : undefined
      const nextLesson = useBrowserTts
        ? createLesson(lessonWords, lessonSentences, manualIds, {
            activeRecall: studyMode === 'activeRecall',
            activeRecallEvents,
            ...selectionOptions,
          })
        : createPocketLesson(lessonWords, lessonSentences, audioClips, manualIds, {
            pauseProfile,
            activeRecall: studyMode === 'activeRecall',
            activeRecallEvents,
            ...selectionOptions,
          })
      setRatingWordIds(nextLesson.targetWords.map((word) => word.id))
      setFsrsRatings({})
      await renderAndLoadLesson(
        nextLesson,
        playAfterRender,
        'Lesson rendered and ready for background-style playback.',
      )
    } catch (error) {
      setLastSummary(error instanceof Error ? error.message : 'Could not render lesson.')
    } finally {
      setRendering(false)
    }
  }

  useEffect(() => {
    startNextLessonRef.current = () => {
      setShowReviewPrompt(false)
      void startPocketLesson([], {
        randomize: true,
        playAfterRender: true,
        newWordsLimit: remainingNewWordsToday,
      })
    }
  })

  async function startModeLesson(mode: StudyMode, options: LessonStartOptions = {}) {
    setStudyMode(mode)
    setShowEnglish(true)
    setShowPinyin(true)
    setMinimalVisualMode(mode === 'listeningMode')
    setAutoNextLesson(mode === 'listeningMode')
    await startPocketLesson([], {
      randomize: true,
      playAfterRender: true,
      pauseProfile,
      newWordsLimit: remainingNewWordsToday,
      ...options,
    })
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

  function stopPlayback() {
    stopActiveChoiceSpeech()
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

  useEffect(() => {
    runFromRef.current = (index: number, plan?: LessonPlan) => {
      void runFrom(index, plan)
    }
  })


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
    queueCloudSync()
  }

  async function handleGoogleSignIn() {
    try {
      setCloudSync((current) => ({ ...current, status: 'syncing', message: 'Opening Google sign-in...' }))
      await signInWithGoogle()
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Could not start Google sign-in.'
      setCloudSync((current) => ({
        ...current,
        status: 'error',
        message,
      }))
    }
  }

  async function handleMagicLinkSignIn() {
    try {
      await signInWithMagicLink(cloudSync.email)
      setCloudSync((current) => ({
        ...current,
        status: 'signed-out',
        message: 'Check your email for the sign-in link.',
      }))
    } catch (error) {
      setCloudSync((current) => ({
        ...current,
        status: 'error',
        message: error instanceof Error ? error.message : 'Could not send sign-in link.',
      }))
    }
  }

  async function handleCloudSignOut() {
    try {
      await signOutOfCloud()
      setCloudUserEmail(null)
      setCloudSync((current) => ({
        ...current,
        status: 'signed-out',
        message: 'Signed out. Local progress is still saved on this device.',
      }))
    } catch (error) {
      setCloudSync((current) => ({
        ...current,
        status: 'error',
        message: error instanceof Error ? error.message : 'Could not sign out.',
      }))
    }
  }

  async function handleAudioImport(files: FileList | null) {
    if (!files) return
    const summary = await importAudioFiles(files, activePackId)
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
    setHostedPackDownloadId(pack.id)
    setHostedPackProgress('Starting download...')
    try {
      const summary = await importHostedClipPack(
        pack.baseUrl,
        (completed, total, label) => {
          setHostedPackProgress(`Downloading ${completed}/${total}: ${label}`)
        },
        pack,
      )
      setLastSummary(`Downloaded ${pack.name}. ${formatSummary(summary)}`)
      setHostedPackProgress('')
      await refresh()
    } catch (error) {
      setLastSummary(error instanceof Error ? error.message : `Could not download ${pack.name}.`)
    } finally {
      setHostedPackDownloadId(null)
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
          <button type="button" className={screen === 'flashcards' ? 'active' : ''} onClick={startSavedFlashcards}>
            <span className="nav-icon nav-flashcards" aria-hidden="true" />
            Flashcards
          </button>
          <button type="button" className={screen === 'settings' ? 'active' : ''} onClick={() => setScreen('settings')}>
            <span className="nav-icon nav-settings" aria-hidden="true" />
            Settings
          </button>
          <button
            type="button"
            className={screen === 'lesson' && studyMode === 'listeningMode' ? 'active' : ''}
            onClick={() => startModeLesson('listeningMode')}
          >
            <span className="nav-icon nav-listen" aria-hidden="true" />
            Listen
          </button>
        </nav>
      </header>

      <AnimatePresence mode="wait">
      {screen === 'dashboard' && (
        <motion.section
          key="dashboard"
          className="screen dashboard"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.2 }}
        >
          <div className="screen-heading">
            <div>
              <h1>Press play, think, keep moving.</h1>
              <p>Start with due words, add new ones only when the queue is light.</p>
            </div>
            <div className="mode-start-grid" aria-label="Choose study mode">
              <button className="mode-start reader-start" type="button" onClick={() => setScreen('reader')}>
                <strong>Reading</strong>
                <span>Read the LMS stories sentence by sentence.</span>
              </button>
              <button className="mode-start active-start" type="button" onClick={() => startModeLesson('activeRecall')}>
                <strong>Active Recall</strong>
                <span>Pause for spoken 2-choice questions.</span>
              </button>
              <button className="mode-start listen-start" type="button" onClick={() => startModeLesson('listeningMode')}>
                <strong>Listening</strong>
                <span>Continuous listening with auto-next on.</span>
              </button>
              <button className="mode-start flashcards-start" type="button" onClick={startSavedFlashcards}>
                <strong>Flashcards</strong>
                <span>Sort due and new words with FSRS.</span>
              </button>
            </div>
          </div>

          <div className="gamification-banner">
            <div className="coin-balance" title="Total Coins">
              🪙 <strong>{userSettings.coins}</strong>
            </div>
            <div className="lingqs-status">
              <span><strong>{stats.lingqsCreatedToday}</strong> cards reviewed</span>
              <span><strong>{stats.lingqsLearnedToday}</strong> successful recalls</span>
            </div>
          </div>

          <div className="metric-grid today-grid">
            <div className="metric hero-metric passive-metric">
              <span>Due now</span>
              <strong>{stats.dueNow}</strong>
            </div>
            <div className="metric passive-metric">
              <span>New available</span>
              <strong>{stats.newAvailable}</strong>
            </div>
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
            {([
              ['new', 'New cards'],
              ['learning', 'Learning'],
              ['due', 'Due cards'],
              ['scheduled', 'Scheduled'],
            ] as Array<[FsrsQueueBucket, string]>).map(
              ([bucket, label]) => (
                <div className="metric passive-metric" key={bucket}>
                  <span>{label}</span>
                  <strong>{stats.counts[bucket]}</strong>
                </div>
              ),
            )}
          </div>

          <div className="dashboard-progress-grid">
            <InfoPanel title="Recent Activity (Last 7 Days)">
              <ActivityChart days={stats.studyHeatmap} />
            </InfoPanel>
            <InfoPanel title="Review heatmap">
              <ProgressHeatmap days={stats.studyHeatmap} />
            </InfoPanel>
            <InfoPanel title="Vocab Growth">
              <VocabGrowthChart points={stats.retentionSeries} />
            </InfoPanel>
            <InfoPanel title="Reading Speed (WPM)">
              <ReadingWpmChart points={stats.readingSeries} />
            </InfoPanel>
          </div>

          <div className="action-grid">
            <InfoPanel title="Flashcard Goals">
              <dl className="stat-list">
                <div>
                  <dt>Total Coins</dt>
                  <dd>🪙 {userSettings.coins}</dd>
                </div>
                <div>
                  <dt>Cards reviewed today</dt>
                  <dd>{stats.lingqsCreatedToday}</dd>
                </div>
                <div>
                  <dt>Successful recalls today</dt>
                  <dd>{stats.lingqsLearnedToday}</dd>
                </div>
                <div>
                  <dt>Flashcards / Day</dt>
                  <dd>{userSettings.flashcardsPerDay}</dd>
                </div>
              </dl>
              <div className="button-row compact-buttons" style={{ marginTop: '0.5rem' }}>
                <button type="button" onClick={() => setScreen('settings')}>
                  Edit Goals
                </button>
              </div>
            </InfoPanel>
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
                  <dt>Current streak</dt>
                  <dd>{stats.currentStreak} 🔥</dd>
                </div>
                <div>
                  <dt>Study minutes</dt>
                  <dd>{stats.minutesToday.toFixed(1)}</dd>
                </div>
                <div>
                  <dt>Clips completed</dt>
                  <dd>{stats.clipsCompletedToday}</dd>
                </div>
                <div>
                  <dt>Cards rated Good/Easy</dt>
                  <dd>{stats.knownToday}</dd>
                </div>
                <div>
                  <dt>FSRS ratings due</dt>
                  <dd>{stats.dueNow}</dd>
                </div>
                <div>
                  <dt>New words today</dt>
                  <dd>{stats.newWordsToday} / {newWordsPerDay}</dd>
                </div>
              </dl>
            </InfoPanel>
            <InfoPanel title="Daily plan">
              <div className="daily-plan">
                <label>
                  New words/day
                  <strong>{newWordsPerDay}</strong>
                </label>
                <span>{remainingNewWordsToday} new word slots left today. Change this in Settings.</span>
                <label>
                  Flashcards/session
                  <input
                    type="number"
                    min={1}
                    max={300}
                    value={userSettings.flashcardsPerDay}
                    onChange={(event) => {
                      const next = { ...userSettings, flashcardsPerDay: Number(event.target.value) }
                      setUserSettings(next)
                      void saveUserSettings(next)
                    }}
                  />
                </label>
              </div>
              <div className="button-row compact-buttons">
                <button type="button" onClick={() => startModeLesson('activeRecall')}>
                  Active Recall
                </button>
                <button
                  type="button"
                  className="ghost-answer"
                  onClick={startSavedFlashcards}
                >
                  Flashcards
                </button>
              </div>
            </InfoPanel>
            <InfoPanel title="Due next">
              <div className="due-list">
                {dueWordList.map((word) => (
                  <button
                    key={word.id}
                    type="button"
                    onClick={() => startFlashcards('mixed', [word])}
                  >
                    <strong>{word.word}</strong>
                    <span>{formatDueDate(word.fsrsDueAt)}</span>
                  </button>
                ))}
                {dueWordList.length === 0 && <small>No scheduled reviews are due.</small>}
              </div>
            </InfoPanel>
            <InfoPanel title="Hotkeys">
              <dl className="stat-list">
                <div>
                  <dt>A / B choices</dt>
                  <dd>{hotkeys.choiceA.toUpperCase()} / {hotkeys.choiceB.toUpperCase()}</dd>
                </div>
                <div>
                  <dt>C / D choices</dt>
                  <dd>
                    {hotkeys.choiceC.toUpperCase()} / {hotkeys.choiceD.toUpperCase()}
                  </dd>
                </div>
                <div>
                  <dt>At rating time</dt>
                  <dd>A=Again, B=Good, C=Hard, D=Easy</dd>
                </div>
                <div>
                  <dt>Play / pause</dt>
                  <dd>{hotkeys.playPause.toUpperCase()}</dd>
                </div>
              </dl>
              <button
                type="button"
                className="ghost-answer"
                onClick={() => {
                  setHotkeysEditing(true)
                  setScreen('settings')
                }}
              >
                Edit hotkeys
              </button>
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
                <div>
                  <dt>Reader books</dt>
                  <dd>{readerBooks.length}</dd>
                </div>
              </dl>
              <button type="button" className="ghost-answer" onClick={() => setScreen('reader')}>
                Open reader mode
              </button>
            </InfoPanel>
          </div>

          <div className="button-row">
            <button type="button" onClick={() => setScreen('reader')}>
              Reader mode
            </button>
            <button type="button" onClick={() => setScreen('settings')}>
              Settings
            </button>
          </div>
        </motion.section>
      )}
      </AnimatePresence>


      <AnimatePresence mode="wait">
      {screen === 'flashcards' && (
        <motion.section
          key="flashcards"
          className="screen flashcards-screen"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.2 }}
        >
          <div className="screen-heading compact">
            <div>
              <h1>Flashcards</h1>
              <p>Fast FSRS reviews. Front is Chinese; back is pinyin and definition.</p>
            </div>
          </div>

          <section className="flashcards-workspace">
            <div className="flashcards-meta">
              <span>{hotkeys.choiceA.toUpperCase()} flip, then Again · {hotkeys.choiceB.toUpperCase()} Good</span>
            </div>
            <FlashcardQueueCounters counts={flashcardSessionCounts} />

            {currentFlashcardWord ? (
              <FlashcardReview
                word={currentFlashcardWord}
                answerShown={flashcardAnswerShown}
                onFlip={() => {
                  setFlashcardAnswerShown(true)
                  void playFlashcardWordTwice(currentFlashcardWord)
                }}
                onRate={handleStandaloneFlashcardRate}
                onEdit={() => openCardEditor(currentFlashcardWord)}
                selectedRating={flashcardSessionFeedback}
                choiceKeys={hotkeys}
              />
            ) : (
              <div className="review-complete flashcards-complete">
                <strong>
                  {flashcardSessionComplete
                    ? 'Flashcard queue complete.'
                    : flashcardQueue.length > 0
                      ? 'Short-step cards are waiting.'
                      : 'Choose a flashcard queue.'}
                </strong>
                <span>
                  {flashcardSessionComplete
                    ? 'Every card in this set is scheduled for tomorrow or later.'
                    : flashcardQueue.length > 0
                      ? 'Learning cards will come back within the 5-minute learn-ahead window.'
                      : 'Choose your queue in Settings, then use Flashcards from the top banner.'}
                </span>
                {flashcardSessionComplete && (
                  <button type="button" className="primary" onClick={finishFlashcardSession}>
                    Done
                  </button>
                )}
              </div>
            )}
          </section>
        </motion.section>
      )}
      </AnimatePresence>

      {screen === 'reader' && (
        <ReaderMode
          readerPacks={readerPacks}
          readerBooks={readerBooks}
          activeBook={activeReaderBook}
          sentence={currentReaderSentence}
          sentenceIndex={readerSentenceIndex}
          sentenceCount={readerSentences.length}
          tokens={readerTokens}
          selectedToken={selectedReaderToken}
          showPinyin={readerShowPinyin}
          showEnglish={readerShowEnglish}
          onChooseBook={openReaderBook}
          onPrevious={() => moveReaderSentence(-1)}
          onNext={() => moveReaderSentence(1)}
          onPlay={playReaderSentence}
          onSelectToken={(token) => {
            recordReaderInteraction()
            setSelectedReaderToken(token)
          }}
          onEditWord={openCardEditor}
          onTogglePinyin={() => {
            recordReaderInteraction()
            setReaderShowPinyin((value) => !value)
          }}
          onToggleEnglish={() => {
            recordReaderInteraction()
            setReaderShowEnglish((value) => !value)
          }}
          activeSession={activeReaderSession}
          todayReaderStats={todayReaderStats}
        />
      )}

      {screen === 'settings' && (
        <section className="screen">
          <div className="screen-heading compact">
            <div>
              <h1>Settings</h1>
              <p>Import packs, set study defaults, export progress, and tune controls.</p>
            </div>
            <button type="button" onClick={handleWordsCsvExport}>
              Export CSV
            </button>
          </div>

          <div className="import-grid">
            <section className="panel cloud-sync-panel">
              <div className="panel-title-row">
                <div>
                  <h2>Cloud sync</h2>
                  <p>Sync vocab progress and card edits across your signed-in devices.</p>
                </div>
                <span className={`sync-pill sync-${cloudSync.status}`}>
                  {syncStatusLabel(cloudSync.status)}
                </span>
              </div>
              {cloudUserEmail ? (
                <>
                  <dl className="stat-list compact-stat-list">
                    <div>
                      <dt>Account</dt>
                      <dd>{cloudUserEmail}</dd>
                    </div>
                    <div>
                      <dt>Last sync</dt>
                      <dd>{cloudSync.lastSyncedAt ? formatRelativeTime(cloudSync.lastSyncedAt) : 'Not yet'}</dd>
                    </div>
                  </dl>
                  <div className="button-row">
                    <button
                      type="button"
                      className="primary"
                      disabled={cloudSync.status === 'syncing'}
                      onClick={() => void handleCloudSyncNow(false)}
                    >
                      {cloudSync.status === 'syncing' ? 'Syncing...' : 'Sync now'}
                    </button>
                    <button type="button" onClick={() => void handleCloudSignOut()}>
                      Sign out
                    </button>
                  </div>
                </>
              ) : (
                <>
                  <div className="button-row">
                    <button
                      type="button"
                      className="primary"
                      disabled={!isSupabaseConfigured || cloudSync.status === 'syncing'}
                      onClick={() => void handleGoogleSignIn()}
                    >
                      Continue with Google
                    </button>
                  </div>
                  <div className="magic-link-row">
                    <input
                      type="email"
                      placeholder="Email for magic link"
                      value={cloudSync.email}
                      disabled={!isSupabaseConfigured}
                      onChange={(event) =>
                        setCloudSync((current) => ({ ...current, email: event.target.value }))
                      }
                    />
                    <button
                      type="button"
                      disabled={!isSupabaseConfigured || cloudSync.status === 'syncing'}
                      onClick={() => void handleMagicLinkSignIn()}
                    >
                      Send link
                    </button>
                  </div>
                </>
              )}
              <small>{cloudSync.message}</small>
            </section>
            <UniversalImporter
              onComplete={async (summary) => {
                setLastSummary(summary)
                await refresh()
                queueCloudSync()
              }}
            />
            <section className="panel hosted-pack">
              <h2>Download clip packs</h2>
              <p>Hosted packs download MP3 clips into this browser for offline lessons.</p>
              <div className="pack-list">
                {hostedClipPacks.map((pack) => {
                  const installed = clipPacks.some((installedPack) => installedPack.id === pack.id)
                  const isDownloading = hostedPackDownloadId === pack.id
                  return (
                    <div key={pack.id} className="pack-row">
                      <span>
                        <strong>{pack.name}</strong>
                        <small>{pack.description ?? `${pack.language ?? 'zh-CN'} clip pack`}</small>
                      </span>
                      <button
                        type="button"
                        className={installed ? '' : 'primary'}
                        disabled={Boolean(hostedPackDownloadId)}
                        onClick={() => handleHostedClipPackImport(pack)}
                      >
                        {isDownloading ? 'Downloading...' : installed ? 'Redownload' : 'Download'}
                      </button>
                    </div>
                  )
                })}
                {hostedClipPacks.length === 0 && <small>No hosted clip packs are available.</small>}
              </div>
              {hostedPackProgress && <small>{hostedPackProgress}</small>}
            </section>
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

            <FilePanel
              title="Clip pack folder"
              help="Select the whole generated clip-pack folder: clips_manifest.json, vocab.csv, sentences.csv, and audio/."
              accept=".json,.csv,.mp3,audio/mpeg"
              multiple
              webkitdirectory
              onChange={handleClipPackImport}
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
              <h2>Flashcard settings</h2>
              <p>Set lightweight targets for daily FSRS work.</p>
              <div className="hotkey-grid">
                <label>
                  <span>Flashcard queue</span>
                  <select
                    value={userSettings.flashcardQueueMode}
                    onChange={(event) => {
                      const next = {
                        ...userSettings,
                        flashcardQueueMode: event.target.value as FlashcardQueueMode,
                      }
                      setUserSettings(next)
                      void saveUserSettings(next)
                    }}
                  >
                    <option value="mixed">Mix</option>
                    <option value="due">Due</option>
                    <option value="new">New</option>
                  </select>
                </label>
                <label>
                  <span>New Words / Day</span>
                  <input
                    type="number"
                    min={0}
                    max={50}
                    value={newWordsPerDay}
                    onChange={(event) => handleNewWordsPerDayChange(Number(event.target.value))}
                  />
                </label>
                <label>
                  <span>Cards Reviewed / Day</span>
                  <input
                    type="number"
                    value={userSettings.lingqCreatedGoal}
                    onChange={(event) => {
                      const next = { ...userSettings, lingqCreatedGoal: Number(event.target.value) }
                      setUserSettings(next)
                      void saveUserSettings(next)
                    }}
                  />
                </label>
                <label>
                  <span>Successful Recalls / Day</span>
                  <input
                    type="number"
                    value={userSettings.lingqLearnedGoal}
                    onChange={(event) => {
                      const next = { ...userSettings, lingqLearnedGoal: Number(event.target.value) }
                      setUserSettings(next)
                      void saveUserSettings(next)
                    }}
                  />
                </label>
                <label>
                  <span>Flashcards / Day</span>
                  <input
                    type="number"
                    value={userSettings.flashcardsPerDay}
                    onChange={(event) => {
                      const next = { ...userSettings, flashcardsPerDay: Number(event.target.value) }
                      setUserSettings(next)
                      void saveUserSettings(next)
                    }}
                  />
                </label>
              </div>
            </section>
            <section className="panel">
              <h2>Hotkey settings</h2>
              <p>Choice A/B are the main 8BitDo controls; extra ratings stay available by tap.</p>
              <dl className="stat-list">
                <div>
                  <dt>Choice A / B</dt>
                  <dd>{hotkeys.choiceA.toUpperCase()} / {hotkeys.choiceB.toUpperCase()}</dd>
                </div>
                <div>
                  <dt>Choice C / D</dt>
                  <dd>{hotkeys.choiceC.toUpperCase()} / {hotkeys.choiceD.toUpperCase()}</dd>
                </div>
                <div>
                  <dt>Play / pause</dt>
                  <dd>{hotkeys.playPause.toUpperCase()}</dd>
                </div>
              </dl>
              <button type="button" onClick={() => setHotkeysEditing((value) => !value)}>
                {hotkeysEditing ? 'Done editing hotkeys' : 'Edit hotkeys'}
              </button>
              {hotkeysEditing && (
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
              )}
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
                    } ${showReviewPrompt ? 'review-stage' : ''}`}
                  >
                    <div className="study-meta">
                      <span>
                        {minimalVisualMode
                          ? 'Listening mode'
                          : focusedActiveQuiz
                            ? 'Active recall'
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
                            className={studyMode === 'activeRecall' ? 'active' : ''}
                            onClick={() =>
                              setStudyMode((mode) =>
                                mode === 'activeRecall' ? 'listeningMode' : 'activeRecall',
                              )
                            }
                          >
                            {studyMode === 'activeRecall' ? 'Active' : 'Listening'}
                          </button>
                        </div>
                      )}
                    </div>
                    {showReviewPrompt && ratingWords.length > 0 ? (
                      <div className="review-panel main-review-panel" aria-live="polite">
                        <div className="review-heading">
                          <strong>Active recall review</strong>
                          <span>
                            {allLessonWordsRated
                              ? 'Set scheduled'
                              : `Card ${Math.min(reviewCardIndex + 1, ratingWords.length)} / ${ratingWords.length}`}
                          </span>
                        </div>
                        <p className="review-note">
                          These ratings decide when each word comes back. Unanswered quiz questions
                          are ignored; this is the main memory signal.
                        </p>
                        {currentReviewWord && !fsrsRatings[currentReviewWord.id] ? (
                            <FlashcardReview
                              word={currentReviewWord}
                              answerShown={reviewAnswerShown}
                              onFlip={() => {
                                setReviewAnswerShown(true)
                                void playFlashcardWordTwice(currentReviewWord)
                              }}
                              onRate={(rating) => handleFlashcardRate(currentReviewWord.id, rating)}
                              onEdit={() => openCardEditor(currentReviewWord)}
                              selectedRating={flashcardFeedback}
                              choiceKeys={hotkeys}
                          />
                        ) : (
                          <div className="review-complete">
                            <strong>All five cards are scheduled.</strong>
                            <span>Due dates are now visible across the dashboard, reader, and flashcards.</span>
                          </div>
                        )}
                        <div className="review-actions">
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
                              onClick={() =>
                                startPocketLesson([], {
                                  randomize: true,
                                  playAfterRender: true,
                                  newWordsLimit: remainingNewWordsToday,
                                })
                              }
                            >
                              Next Lesson
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
                      </div>
                    ) : focusedActiveQuiz && currentQuiz ? (
                      <ActiveRecallCard
                        key={currentQuiz.id}
                        quiz={currentQuiz}
                        response={currentQuizResponse}
                        word={studyWord}
                        sentence={studySentence}
                        showPinyin={showPinyin}
                        showEnglish={showEnglish}
                        choiceKeys={[
                          'A',
                          'B',
                          'C',
                          'D',
                        ]}
                        onAnswer={handleQuizAnswer}
                        onContinue={continueCurrentQuiz}
                        onReplay={() => void replayActiveRecallQuestionAudio()}
                      />
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
                            <button
                              type="button"
                              onClick={() => void completeListeningLessonAndStartNext()}
                              disabled={!renderedLesson || rendering}
                            >
                              Next Lesson
                            </button>
                          </div>
                        )}
                      </>
                    )}
                    {currentQuiz &&
                      !currentQuizResponse?.skipped &&
                      studyMode !== 'activeRecall' &&
                      !minimalVisualMode && (
                      <div className="quiz-panel" aria-live="polite">
                        <div className="quiz-copy">
                          <strong>{currentQuiz.prompt}</strong>
                          <span>
                            Answer keys {hotkeys.choiceA.toUpperCase()} / {hotkeys.choiceB.toUpperCase()}
                          </span>
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
                                <kbd>{['A', 'B'][index] ?? index + 1}</kbd>
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
                          const previous =
                            current + 0.1 < lastPocketTimeRef.current
                              ? 0
                              : lastPocketTimeRef.current
                          lastPocketTimeRef.current = current
                          const quizSegmentIndex =
                            studyMode === 'activeRecall'
                              ? renderedLesson?.segments?.findIndex(
                                  (segment) =>
                                    isQuizPauseSegment(segment) &&
                                    !quizResponses[segment.stepId] &&
                                    segment.startSeconds > previous + 0.005 &&
                                    segment.startSeconds <= current + 0.35,
                                ) ?? -1
                              : -1
                          if (quizSegmentIndex >= 0 && renderedLesson?.segments) {
                            const segment = renderedLesson.segments[quizSegmentIndex]
                            const markerTime =
                              segment.startSeconds +
                              Math.max(
                                0.005,
                                Math.min(0.02, (segment.endSeconds - segment.startSeconds) / 2),
                              )
                            audio.pause()
                            audio.currentTime = Math.max(0, markerTime)
                            lastPocketTimeRef.current = markerTime
                            setCurrentStepIndex(quizSegmentIndex)
                            setPocketProgress({
                              current: markerTime,
                              duration: audio.duration || renderedLesson.durationSeconds || 0,
                            })
                            return
                          }
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
                            if (isListeningMode) {
                              await completeListeningLesson()
                            } else {
                              await recordEvent({
                                type: 'complete',
                                itemType: 'lesson',
                                itemId: renderedLesson.id,
                                seconds: renderedLesson.durationSeconds,
                              })
                              await refresh()
                            }
                            if (isListeningMode && autoNextLesson) {
                              void startPocketLesson([], {
                                randomize: true,
                                playAfterRender: true,
                                newWordsLimit: remainingNewWordsToday,
                              })
                            } else if (isListeningMode) {
                              setLastSummary('Listening mode lesson complete.')
                            } else {
                              openReviewPrompt()
                            }
                          }
                        }}
                      />
                    ) : (
                      <div className="audio-placeholder">Render a lesson to create the audio track.</div>
                    )}
                    {(focusedActiveQuiz || showReviewPrompt) && (
                      <ControllerHUD
                        choiceA={hotkeys.choiceA}
                        choiceB={hotkeys.choiceB}
                        labelA={
                          showReviewPrompt
                            ? reviewAnswerShown
                              ? 'Again'
                              : 'Flip'
                            : isSentenceContinueSection
                              ? 'I understand'
                              : currentQuiz?.options[0]?.label ?? 'Continue'
                        }
                        labelB={showReviewPrompt ? (reviewAnswerShown ? 'Good' : '') : (currentQuiz?.options.length ?? 0) > 1 ? currentQuiz!.options[1].label : ''}
                      />
                    )}
                    {!minimalVisualMode && (
                      <div className="lesson-menu-shell">
                        <button
                          type="button"
                          className="lesson-menu-trigger"
                          onClick={() => setLessonMenuOpen((open) => !open)}
                          aria-expanded={lessonMenuOpen}
                          aria-controls="lesson-action-sheet"
                        >
                          {lessonMenuOpen ? 'Close menu' : 'Menu'}
                        </button>
                        {lessonMenuOpen && (
                          <>
                            <button
                              type="button"
                              className="lesson-menu-backdrop"
                              aria-label="Close lesson menu"
                              onClick={() => setLessonMenuOpen(false)}
                            />
                            <div
                              className="lesson-action-sheet"
                              id="lesson-action-sheet"
                              role="dialog"
                              aria-label="Lesson controls"
                            >
                              <div className="sheet-heading">
                                <strong>Lesson controls</strong>
                                <button type="button" onClick={() => setLessonMenuOpen(false)}>
                                  Close
                                </button>
                              </div>
                              <div className="player-controls lesson-menu-controls">
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
                                                                {studyMode === 'activeRecall' ? (
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setLessonMenuOpen(false)
                                      void refreshRecallLesson()
                                    }}
                                    disabled={rendering}
                                  >
                                    Refresh
                                  </button>
                                ) : (
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setLessonMenuOpen(false)
                                      void startPocketLesson()
                                    }}
                                    disabled={rendering || (showReviewPrompt && !allLessonWordsRated)}
                                  >
                                    Next Lesson
                                  </button>
                                )}
                                {studyMode === 'activeRecall' && (
                                  <button
                                    type="button"
                                    onClick={() => {
                                      pocketAudioRef.current?.pause()
                                      setLessonMenuOpen(false)
                                      openReviewPrompt()
                                    }}
                                    disabled={ratingWords.length === 0}
                                  >
                                    Flash Cards
                                  </button>
                                )}
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
                                <button
                                  type="button"
                                  onClick={() => {
                                    setLessonMenuOpen(false)
                                    setMinimalVisualMode(true)
                                  }}
                                >
                                  Listening mode
                                </button>
                              </div>
                              {!focusedActiveQuiz && (
                                <div className="coverage-grid menu-coverage">
                                  <span>Ready words: {coverage.readyWords}</span>
                                  <span>Prompt clips: {coverage.promptClips}</span>
                                  <span>Rendered warnings: {renderedLesson?.warnings.length ?? 0}</span>
                                </div>
                              )}
                            </div>
                          </>
                        )}
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
                    <button type="button" onClick={() => startFlashcards('mixed', [targetWord])}>
                      Review card
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
              <p>Start a lesson from Dashboard, or open Flashcards from the top banner.</p>
              <button className="primary" type="button" onClick={() => startPocketLesson()}>
                Next Lesson
              </button>
            </section>
          )}
        </section>
      )}

      {editingWord && (
        <div className="modal-backdrop" role="presentation" onMouseDown={() => setEditingWord(null)}>
          <form
            className="card-edit-dialog"
            onSubmit={(event) => {
              event.preventDefault()
              void saveCardEdit()
            }}
            onMouseDown={(event) => event.stopPropagation()}
          >
            <div>
              <h2>Edit card</h2>
              <p>Fix card text without changing review history.</p>
            </div>
            <label>
              Chinese
              <input
                value={editingWord.word}
                onChange={(event) => setEditingWord({ ...editingWord, word: event.target.value })}
              />
            </label>
            <label>
              Pinyin
              <input
                value={editingWord.pinyin}
                onChange={(event) => setEditingWord({ ...editingWord, pinyin: event.target.value })}
              />
            </label>
            <label>
              Meaning
              <textarea
                value={editingWord.meaning}
                onChange={(event) => setEditingWord({ ...editingWord, meaning: event.target.value })}
              />
            </label>
            <label>
              Notes
              <textarea
                value={editingWord.notes}
                onChange={(event) => setEditingWord({ ...editingWord, notes: event.target.value })}
              />
            </label>
            <div className="button-row">
              <button type="button" onClick={() => setEditingWord(null)}>
                Cancel
              </button>
              <button type="submit" className="primary">
                Save card
              </button>
            </div>
          </form>
        </div>
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

function ReaderMode({
  readerPacks,
  readerBooks,
  activeBook,
  sentence,
  sentenceIndex,
  sentenceCount,
  tokens,
  selectedToken,
  showPinyin,
  showEnglish,
  onChooseBook,
  onPrevious,
  onNext,
  onPlay,
  onSelectToken,
  onEditWord,
  onTogglePinyin,
  onToggleEnglish,
  activeSession,
}: {
  readerPacks: ReaderPack[]
  readerBooks: ReaderBook[]
  activeBook?: ReaderBook
  sentence?: ReaderSentence
  sentenceIndex: number
  sentenceCount: number
  tokens: ReaderWordToken[]
  selectedToken: ReaderWordToken | null
  showPinyin: boolean
  showEnglish: boolean
  onChooseBook: (book: ReaderBook, action?: 'resume' | 'start') => void | Promise<void>
  onPrevious: () => void | Promise<void>
  onNext: () => void | Promise<void>
  onPlay: (sentence: ReaderSentence) => void | Promise<void>
  onSelectToken: (token: ReaderWordToken | null) => void
  onEditWord: (word: VocabWord) => void
  onTogglePinyin: () => void
  onToggleEnglish: () => void
  activeSession: ReaderSession | null
  todayReaderStats: ReaderSessionStats | null
}) {
  const illustration = activeBook ? getReaderIllustration(activeBook, sentenceIndex) : undefined
  const illustrationSrc = illustration ? publicAssetPath(illustration.imageFilename) : ''

  return (
    <section className="screen reader-screen">
      <div className="screen-heading compact">
        <div>
          <h1>Reader Mode</h1>
          <p>
            {readerPacks[0]?.name ?? 'LMS Reader Books'} · {readerBooks.length} compilation books.
          </p>
        </div>
        <div className="study-toggles">
          <button type="button" className={showPinyin ? 'active' : ''} onClick={onTogglePinyin}>
            Pinyin {showPinyin ? 'on' : 'off'}
          </button>
          <button type="button" className={showEnglish ? 'active' : ''} onClick={onToggleEnglish}>
            English {showEnglish ? 'on' : 'off'}
          </button>
        </div>
      </div>

      <div className={`reader-layout ${activeBook ? 'zen-mode' : ''}`}>
        <aside className="reader-book-list" aria-label="Reader books">
            {readerBooks.map((book) => (
              <div
                key={book.id}
                className={`reader-book-card ${book.id === activeBook?.id ? 'active' : ''}`}
              >
                <strong>{book.title}</strong>
                <span>
                  Chapters {book.chapterStart}-{book.chapterEnd} · {book.stories.length} stories
                </span>
                <div className="reader-book-actions">
                  <button type="button" className="primary" onClick={() => onChooseBook(book, 'resume')}>
                    Resume
                  </button>
                  <button type="button" onClick={() => onChooseBook(book, 'start')}>
                    Start from beginning
                  </button>
                </div>
              </div>
            ))}
            {readerBooks.length === 0 && <small>No reader books are installed yet.</small>}
        </aside>

        <section className="reader-page">
          {activeBook && sentence ? (
            <>
              <div className="reader-page-meta">
                <span>{activeBook.title}</span>
                <span>
                  Sentence {sentenceIndex + 1} / {sentenceCount}
                </span>
              </div>

              {/* Compact Reader WPM Dashboard */}
              <div className="reader-wpm-dashboard compact-bar" aria-label="Reading stats dashboard">
                <div className="dashboard-metric">
                  <dt>WPM</dt>
                  <dd>
                    {activeSession && activeSession.activeSeconds > 0
                      ? Math.round((activeSession.wordsRead / activeSession.activeSeconds) * 60)
                      : 0}
                  </dd>
                </div>
                <div className="dashboard-metric">
                  <dt>Read</dt>
                  <dd>{activeSession?.wordsRead ?? 0}</dd>
                </div>
                <div className="dashboard-metric">
                  <dt>Time</dt>
                  <dd>{formatDuration(activeSession?.activeSeconds ?? 0)}</dd>
                </div>
              </div>
              <AnimatePresence mode="wait">
                <motion.div
                  key={sentence.id}
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.3 }}
                  className="reader-reading-area"
                >
                  {illustration && (
                    <figure className="reader-illustration">
                      <img src={illustrationSrc} alt={illustration.alt} loading="lazy" />
                    </figure>
                  )}
                  <div className="reader-sentence">
                    {tokens.map((token) =>
                      token.isChinese ? (
                        <ruby
                          key={token.id}
                          className={`reader-token ${token.word ? 'saved-token' : ''} ${
                            selectedToken?.id === token.id ? 'active' : ''
                          }`}
                          onClick={() => onSelectToken(token)}
                        >
                          {token.text}
                          {showPinyin && <rt>{token.pinyin}</rt>}
                        </ruby>
                      ) : (
                        <span key={token.id} className="reader-token-space">
                          {token.text}
                        </span>
                      ),
                    )}
                  </div>
                </motion.div>
              </AnimatePresence>
              {showEnglish && <p className="reader-translation blur-reveal">{sentence.english}</p>}
              <div className="reader-controls">
                <button type="button" onClick={onPrevious} disabled={sentenceIndex <= 0}>
                  Previous
                </button>
                <button type="button" className="primary" onClick={() => onPlay(sentence)}>
                  Play sentence
                </button>
                <button type="button" onClick={onNext} disabled={sentenceIndex >= sentenceCount - 1}>
                  Next
                </button>
              </div>
              {selectedToken?.word && (
                <div className="reader-word-popover" aria-live="polite">
                  <button type="button" className="popover-close" onClick={() => onSelectToken(null)}>
                    Close
                  </button>
                  <strong>{selectedToken.word.word}</strong>
                  <span>{selectedToken.word.pinyin ?? selectedToken.pinyin}</span>
                  <p>{selectedToken.word.meaning}</p>
                  <button
                    type="button"
                    className="ghost-answer"
                    onClick={() => {
                      if (selectedToken.word) onEditWord(selectedToken.word)
                    }}
                  >
                    Edit card
                  </button>
                  <dl className="stat-list compact-stats">
                    <div>
                      <dt>FSRS</dt>
                      <dd>{fsrsQueueLabel(selectedToken.word)}</dd>
                    </div>
                    <div>
                      <dt>Due</dt>
                      <dd>{formatDueDate(selectedToken.word.fsrsDueAt)}</dd>
                    </div>
                  </dl>
                </div>
              )}
              {selectedToken && !selectedToken.word && selectedToken.isChinese && (
                <div className="reader-word-popover" aria-live="polite">
                  <button type="button" className="popover-close" onClick={() => onSelectToken(null)}>
                    Close
                  </button>
                  <strong>{selectedToken.text}</strong>
                  <span>{selectedToken.pinyin}</span>
                  <p>No saved vocabulary entry yet.</p>
                </div>
              )}
            </>
          ) : (
            <div className="reader-empty">
              <h2>Choose a book</h2>
              <p>Open one of the LMS compilation books to read sentence by sentence.</p>
            </div>
          )}
        </section>
      </div>
    </section>
  )
}

function ActivityChart({ days }: { days: DashboardStats['studyHeatmap'] }) {
  const last7Days = days.slice(-7)
  return (
    <div style={{ width: '100%', height: 200 }}>
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={last7Days}>
          <defs>
            <linearGradient id="colorStudy" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="var(--accent-vibrant)" stopOpacity={0.8}/>
              <stop offset="95%" stopColor="var(--accent-vibrant)" stopOpacity={0}/>
            </linearGradient>
          </defs>
          <XAxis dataKey="date" tickFormatter={shortMonthDay} />
          <YAxis hide />
          <Tooltip
            formatter={(value: unknown) => [`${(Number(value ?? 0) / 60).toFixed(1)} mins`, 'Study Time']}
            labelFormatter={(label) => friendlyDate(label)}
          />
          <Area type="monotone" dataKey="studySeconds" stroke="var(--accent-vibrant)" fillOpacity={1} fill="url(#colorStudy)" />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  )
}

function ProgressHeatmap({ days }: { days: DashboardStats['studyHeatmap'] }) {
  const totalMinutes = days.reduce((sum, day) => sum + day.studySeconds, 0) / 60
  const activeDays = days.filter((day) => day.activityCount > 0).length

  return (
    <div className="progress-visual">
      <div className="heatmap-grid" aria-label="Recent study activity by day">
        {days.map((day) => {
          const minutes = day.studySeconds / 60
          const level = heatLevel(minutes, day.activityCount)
          return (
            <span
              key={day.date}
              className={`heat-cell heat-${level}`}
              title={`${friendlyDate(day.date)}: ${minutes.toFixed(1)} min, ${day.activityCount} events`}
              aria-label={`${friendlyDate(day.date)}, ${minutes.toFixed(1)} study minutes`}
            />
          )
        })}
      </div>
      <div className="progress-caption">
        <span>{activeDays} study days</span>
        <span>{totalMinutes.toFixed(0)} minutes tracked</span>
      </div>
    </div>
  )
}

function VocabGrowthChart({ points }: { points: DashboardStats['retentionSeries'] }) {
  return (
    <div style={{ width: '100%', height: 250 }}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={points} margin={{ top: 20, right: 30, left: 0, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
          <XAxis dataKey="date" tickFormatter={shortMonthDay} />
          <YAxis />
          <Tooltip
            labelFormatter={(label) => friendlyDate(label)}
          />
          <Legend />
          <Bar dataKey="barelyKnown" name="Early FSRS" stackId="a" fill="#ef4444" />
          <Bar dataKey="familiar" name="Growing FSRS" stackId="a" fill="#10b981" />
          <Bar dataKey="wellKnown" name="Mature FSRS" stackId="a" fill="var(--accent-vibrant)" />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}

function ReadingWpmChart({ points }: { points: DashboardStats['readingSeries'] }) {
  if (!points || points.length === 0) {
    return <div className="progress-caption">No reading data yet</div>
  }
  return (
    <div style={{ width: '100%', height: 250 }}>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={points} margin={{ top: 20, right: 30, left: 0, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
          <XAxis dataKey="date" tickFormatter={shortMonthDay} />
          <YAxis />
          <Tooltip
            formatter={(value: unknown, name: unknown) => [
              String(value ?? ''),
              name === 'wpm' ? 'WPM' : String(name ?? ''),
            ]}
            labelFormatter={(label) => friendlyDate(label)}
          />
          <Legend />
          <Line type="monotone" dataKey="wpm" name="Reading WPM" stroke="#f59e0b" activeDot={{ r: 8 }} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
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

function ActiveRecallCard({
  quiz,
  response,
  word,
  sentence,
  showPinyin,
  showEnglish,
  choiceKeys,
  onAnswer,
  onContinue,
  onReplay,
}: {
  quiz: ActiveQuiz
  response?: QuizResponse
  word?: VocabWord
  sentence?: Sentence
  showPinyin: boolean
  showEnglish: boolean
  choiceKeys: string[]
  onAnswer: (value: string) => void | Promise<void>
  onContinue: () => void
  onReplay: () => void
}) {
  const [choicesReady, setChoicesReady] = useState(() => getChoiceRevealDelay(quiz.stage) === 0)
  const cue = getActiveRecallCue(quiz, word, sentence)
  const promptText = getActiveRecallPrompt(quiz)
  const correctLabel = getQuizAnswerLabel(quiz, word)
  const selectedLabel = getSelectedAnswerLabel(quiz, response)
  const feedbackText = getQuizFeedbackText(quiz, word, correctLabel)
  const showPinyinHint = showPinyin && quiz.stage === 'easy' && Boolean(word?.pinyin)
  const answered = Boolean(response)
  const isSentenceContinue = quiz.kind === 'sentence-zh-en'
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
    <motion.section
      key={quiz.id}
      initial={{ opacity: 0, rotateX: -20, scale: 0.95 }}
      animate={{ opacity: 1, rotateX: 0, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ duration: 0.3 }}
      className={`active-recall-card recall-stage-${quiz.stage} recall-kind-${quiz.kind}`}
      aria-live="polite"
    >
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
      {!answered && isSentenceContinue && showEnglish && sentence?.english && (
        <div className="recall-hint">{sentence.english}</div>
      )}
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
      {!answered && choicesReady && isSentenceContinue && (
        <div className="recall-options single-reveal">
          <button type="button" className="primary" onClick={onContinue}>
            <kbd>{choiceKeys[0]?.toUpperCase() ?? 'A'}</kbd>
            I understand
          </button>
        </div>
      )}
      {!answered && choicesReady && !isSentenceContinue && canChoose && (
        <div className="recall-options">
          {quiz.options.map((option, index) => (
            <button key={option.value} type="button" onClick={() => onAnswer(option.value)}>
              <kbd>{choiceKeys[index]?.toUpperCase() ?? index + 1}</kbd>
              {option.label}
            </button>
          ))}
        </div>
      )}
      <div className="recall-support">
        <button type="button" onClick={onReplay}>
          <span className="ui-icon icon-replay" aria-hidden="true" />
          Replay
        </button>
        {answered && (
          <button type="button" className="primary" onClick={onContinue}>
            Continue
          </button>
        )}
      </div>
    </motion.section>
  )
}

function FlashcardQueueCounters({ counts }: { counts: FlashcardSessionCounts }) {
  return (
    <div className="flashcard-queue-counts" aria-label="Flashcard queue counts">
      <span className="queue-count queue-new">
        <strong>{counts.new}</strong>
        New
      </span>
      <span className="queue-count queue-learning">
        <strong>{counts.learning}</strong>
        Learning
      </span>
      <span className="queue-count queue-review">
        <strong>{counts.review}</strong>
        Review
      </span>
      <span className="queue-count queue-done">
        <strong>{counts.done}</strong>
        Done
      </span>
    </div>
  )
}

function FlashcardReview({
  word,
  answerShown,
  onFlip,
  onRate,
  onEdit,
  selectedRating,
  choiceKeys,
}: {
  word: VocabWord
  answerShown: boolean
  onFlip: () => void
  onRate: (rating: FsrsRating) => void | Promise<void>
  onEdit?: () => void
  selectedRating?: FsrsRating | null
  choiceKeys?: HotkeySettings
}) {
  const previews = previewFsrsRatings(word)
  return (
    <section className="flashcard-review">
      <div className={`flashcard ${answerShown ? 'answer-side' : 'front-side'}`}>
        <span>{answerShown ? 'Back' : 'Front'}</span>
        <strong>{word.word}</strong>
        {answerShown ? (
          <>
            <p>{word.pinyin ? `${word.pinyin} is ${word.meaning}` : word.meaning}</p>
          </>
        ) : (
          <button type="button" className="primary" onClick={onFlip}>
            Flip
          </button>
        )}
      </div>
      {onEdit && (
        <button type="button" className="ghost-answer flashcard-edit-button" onClick={onEdit}>
          Edit card
        </button>
      )}
      {answerShown && (
        <div className="review-buttons fsrs-preview-buttons">
          {fsrsRatingsForUi.map((rating) => (
            <button
              key={rating.value}
              type="button"
              className={selectedRating === rating.value ? 'feedback-selected' : ''}
              onClick={() => onRate(rating.value)}
              disabled={Boolean(selectedRating)}
            >
              {choiceKeys && <kbd>{ratingHotkeyLabel(rating.value, choiceKeys)}</kbd>}
              <strong>{rating.label}</strong>
              <span>{formatDueDate(previews[rating.value].dueAt)}</span>
            </button>
          ))}
        </div>
      )}
    </section>
  )
}

function ControllerHUD({
  choiceA,
  choiceB,
  labelA,
  labelB,
}: {
  choiceA: string
  choiceB: string
  labelA: string
  labelB: string
}) {
  return (
    <div className="controller-hud">
      <div className="hud-button">
        <kbd>{choiceA.toUpperCase()}</kbd>
        <span>{labelA}</span>
      </div>
      <div className="hud-button">
        <kbd>{choiceB.toUpperCase()}</kbd>
        <span>{labelB}</span>
      </div>
    </div>
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

function formatCloudSyncResult(result: CloudSyncResult): string {
  const parts = [
    `${result.pushedWords} word updates sent`,
    `${result.pulledWords} word updates received`,
    `${result.pushedEvents} events sent`,
    `${result.pulledEvents} events received`,
  ]
  return `Synced. ${parts.join(', ')}.`
}

function syncStatusLabel(status: CloudSyncStatus): string {
  if (status === 'unconfigured') return 'Setup needed'
  if (status === 'signed-out') return 'Signed out'
  if (status === 'syncing') return 'Syncing'
  if (status === 'synced') return 'Synced'
  if (status === 'offline') return 'Offline'
  if (status === 'error') return 'Check sync'
  return 'Ready'
}

function formatRelativeTime(value: string): string {
  const time = Date.parse(value)
  if (!Number.isFinite(time)) return 'Unknown'
  const seconds = Math.max(0, Math.round((Date.now() - time) / 1000))
  if (seconds < 60) return 'Just now'
  const minutes = Math.round(seconds / 60)
  if (minutes < 60) return `${minutes} min ago`
  const hours = Math.round(minutes / 60)
  if (hours < 24) return `${hours} hr ago`
  const days = Math.round(hours / 24)
  return `${days} day${days === 1 ? '' : 's'} ago`
}

const fsrsRatingsForUi: Array<{ value: FsrsRating; label: string }> = [
  { value: 'again', label: 'Again' },
  { value: 'good', label: 'Good' },
  { value: 'hard', label: 'Hard' },
  { value: 'easy', label: 'Easy' },
]

function selectNextFlashcardWord(
  words: VocabWord[],
  doneIds: Set<string>,
  previousId?: string,
  now = Date.now(),
): VocabWord | undefined {
  const pending = words.filter((word) => !doneIds.has(word.id))
  const groups = [
    pending
      .filter((word) => isFlashcardLearning(word) && fsrsDueTime(word) <= now)
      .sort(sortFlashcardByDueThenLesson),
    pending
      .filter((word) => !isFlashcardLearning(word) && !isNewFsrsCard(word) && isFsrsCardDue(word, now))
      .sort(sortFlashcardByDueThenLesson),
    pending
      .filter(isNewFsrsCard)
      .sort(sortFlashcardByLesson),
    pending
      .filter((word) => isFlashcardLearning(word) && fsrsDueTime(word) <= now + FLASHCARD_LEARN_AHEAD_MS)
      .sort(sortFlashcardByDueThenLesson),
  ]

  for (const group of groups) {
    const available = uniqueWordsById(group)
    if (available.length === 0) continue
    return available.find((word) => word.id !== previousId) ?? available[0]
  }

  return undefined
}

function getFlashcardSessionCounts(
  words: VocabWord[],
  doneIds: Set<string>,
  now = Date.now(),
): FlashcardSessionCounts {
  const counts: FlashcardSessionCounts = {
    new: 0,
    learning: 0,
    review: 0,
    done: 0,
    total: words.length,
  }

  for (const word of words) {
    if (doneIds.has(word.id)) {
      counts.done += 1
    } else if (isNewFsrsCard(word)) {
      counts.new += 1
    } else if (isFlashcardLearning(word)) {
      counts.learning += 1
    } else if (isFsrsCardDue(word, now)) {
      counts.review += 1
    } else {
      counts.done += 1
    }
  }

  return counts
}

function getNextFlashcardDoneIds(
  currentDoneIds: string[],
  wordId: string,
  updatedWord: VocabWord | undefined,
  rating: FsrsRating,
  now = Date.now(),
): string[] {
  const nextDoneIds = new Set(currentDoneIds)
  if (updatedWord && isFlashcardSessionDone(updatedWord, rating, now)) {
    nextDoneIds.add(wordId)
  } else {
    nextDoneIds.delete(wordId)
  }
  return [...nextDoneIds]
}

function isFlashcardSessionDone(word: VocabWord, rating: FsrsRating, now = Date.now()): boolean {
  if (rating === 'easy') return true
  if (isNewFsrsCard(word) || isFlashcardLearning(word)) return false
  return !isFsrsCardDue(word, now)
}

function isFlashcardLearning(word: VocabWord): boolean {
  return word.fsrsState === 'Learning' || word.fsrsState === 'Relearning'
}

function sortFlashcardByDueThenLesson(a: VocabWord, b: VocabWord): number {
  return fsrsDueTime(a) - fsrsDueTime(b) || sortFlashcardByLesson(a, b)
}

function sortFlashcardByLesson(a: VocabWord, b: VocabWord): number {
  return (a.lessonNumber ?? 9999) - (b.lessonNumber ?? 9999) || a.word.localeCompare(b.word)
}

function uniqueWordsById(words: VocabWord[]): VocabWord[] {
  const seen = new Set<string>()
  return words.filter((word) => {
    if (seen.has(word.id)) return false
    seen.add(word.id)
    return true
  })
}

function fsrsLabel(rating: FsrsRating): string {
  return fsrsRatingsForUi.find((item) => item.value === rating)?.label ?? rating
}

function ratingHotkeyLabel(rating: FsrsRating, hotkeys: HotkeySettings): string {
  if (rating === 'again') return hotkeys.choiceA.toUpperCase()
  if (rating === 'good') return hotkeys.choiceB.toUpperCase()
  if (rating === 'hard') return hotkeys.choiceC.toUpperCase()
  return hotkeys.choiceD.toUpperCase()
}

function formatDueDate(value?: string): string {
  if (!value) return 'Not scheduled'
  const due = new Date(value)
  if (!Number.isFinite(due.getTime())) return 'Invalid date'
  const now = new Date()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const dueDay = new Date(due.getFullYear(), due.getMonth(), due.getDate())
  const dayDelta = Math.round((dueDay.getTime() - today.getTime()) / 86_400_000)
  const time = due.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })
  if (dayDelta === 0) return `Today ${time}`
  if (dayDelta === 1) return `Tomorrow ${time}`
  if (dayDelta === -1) return `Yesterday ${time}`
  return due.toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })
}

function isDueForDisplay(word: VocabWord): boolean {
  return isFsrsCardDue(word)
}

function dueTimeForDisplay(word: VocabWord): number {
  return fsrsDueTime(word)
}

function tokenizeReaderText(text: string, vocab: VocabWord[]): ReaderWordToken[] {
  const wordMap = new Map(vocab.map((word) => [word.word, word]))
  const maxWordLength = Math.max(1, ...[...wordMap.keys()].map((word) => word.length))
  const segmenter =
    typeof Intl.Segmenter === 'function'
      ? new Intl.Segmenter('zh-CN', { granularity: 'word' })
      : undefined
  const tokens: ReaderWordToken[] = []
  let index = 0
  let tokenIndex = 0

  while (index < text.length) {
    if (!isChineseChar(text[index])) {
      const start = index
      while (index < text.length && !isChineseChar(text[index])) index += 1
      tokens.push({
        id: `token-${tokenIndex}`,
        text: text.slice(start, index),
        index: tokenIndex,
        isChinese: false,
      })
      tokenIndex += 1
      continue
    }

    const match = longestWordMatch(text, index, maxWordLength, wordMap)
    const segment = match?.text ?? firstChineseSegment(text.slice(index), segmenter)
    tokens.push({
      id: `token-${tokenIndex}`,
      text: segment,
      index: tokenIndex,
      isChinese: true,
      pinyin: match?.word.pinyin ?? pinyin(segment, { type: 'string', separator: ' ' }),
      word: match?.word,
    })
    index += segment.length
    tokenIndex += 1
  }

  return tokens.filter((token) => token.text.length > 0)
}

function getReaderIllustration(book: ReaderBook, sentenceIndex: number) {
  const sentenceNumber = sentenceIndex + 1
  const illustration = book.illustrations?.find(
    (item) => sentenceNumber >= item.sentenceStart && sentenceNumber <= item.sentenceEnd,
  )
  if (illustration) return illustration
  if (!book.id.startsWith('lms-book-1-chapters-')) {
    return undefined
  }
  const sentenceCount = book.stories.reduce((sum, story) => sum + story.sentences.length, 0)
  if (sentenceNumber < 1 || sentenceNumber > sentenceCount) return undefined
  const imageNumber = Math.ceil(sentenceNumber / 2)
  return {
    id: `${book.id}-illustration-${String(imageNumber).padStart(3, '0')}`,
    imageFilename: `reader-packs/lms-books/images/${book.id}/illustration-${String(imageNumber).padStart(3, '0')}.webp`,
    alt: `Chibi manga reader illustration ${imageNumber} for ${book.title}.`,
    sentenceStart: (imageNumber - 1) * 2 + 1,
    sentenceEnd: Math.min(imageNumber * 2, sentenceCount),
  }
}

function publicAssetPath(path: string): string {
  const base = import.meta.env.BASE_URL || '/'
  return `${base.replace(/\/$/u, '')}/${path.replace(/^\//u, '')}`
}

function longestWordMatch(
  text: string,
  start: number,
  maxWordLength: number,
  wordMap: Map<string, VocabWord>,
): { text: string; word: VocabWord } | undefined {
  for (let length = Math.min(maxWordLength, text.length - start); length > 0; length -= 1) {
    const candidate = text.slice(start, start + length)
    const word = wordMap.get(candidate)
    if (word) return { text: candidate, word }
  }
  return undefined
}

function firstChineseSegment(text: string, segmenter?: Intl.Segmenter): string {
  const segment = segmenter ? Array.from(segmenter.segment(text))[0]?.segment : undefined
  if (segment && isChineseChar(segment[0])) return segment
  return text[0] ?? ''
}

function isChineseChar(char: string): boolean {
  return /[\u3400-\u9fff]/u.test(char)
}

function speakUtterance(text: string, rate: number, lang = detectSpeechLanguage(text)): Promise<void> {
  return new Promise((resolve) => {
    const utterance = new SpeechSynthesisUtterance(text)
    utterance.rate = rate
    utterance.lang = lang
    utterance.onend = () => resolve()
    utterance.onerror = () => resolve()
    window.speechSynthesis.speak(utterance)
  })
}

function detectSpeechLanguage(text: string): string {
  return /[\u3400-\u9fff]/.test(text) ? 'zh-CN' : 'en-US'
}

function hotkeyToReviewRating(key: string, hotkeys: HotkeySettings): FsrsRating | undefined {
  const index = choiceKeyIndex(key, hotkeys)
  return (['again', 'good', 'hard', 'easy'] as FsrsRating[])[index]
}

function choiceKeyIndex(key: string, hotkeys: HotkeySettings): number {
  return [hotkeys.choiceA, hotkeys.choiceB, hotkeys.choiceC, hotkeys.choiceD].findIndex(
    (candidate) => candidate === key,
  )
}

function hotkeyLabel(key: keyof HotkeySettings): string {
  return {
    choiceA: 'Choice A / Again',
    choiceB: 'Choice B / Good',
    choiceC: 'Choice C / Hard',
    choiceD: 'Choice D / Easy',
    playPause: 'Play / Pause',
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
    'fsrsState',
    'fsrsStability',
    'fsrsDifficulty',
    'fsrsLearningSteps',
  ]
  const rows = words.map((word) =>
    [
      word.word,
      word.pinyin ?? '',
      word.meaning,
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
      word.fsrsState ?? '',
      word.fsrsStability ?? '',
      word.fsrsDifficulty ?? '',
      word.fsrsLearningSteps ?? '',
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
  if (quiz.kind === 'sentence-zh-en') return 'Press A to continue.'
  if (quiz.kind === 'contrast') return quiz.prompt
  if (quiz.kind === 'audio-zh') return 'Which word did you hear?'
  if (quiz.stage === 'audio-first' && quiz.kind === 'zh-en') {
    return 'What did that word mean?'
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

function getActiveQuizOptionClipId(
  option: ActiveQuiz['options'][number],
  quiz: ActiveQuiz,
  words: VocabWord[],
  sentences: Sentence[],
): string | undefined {
  if (quiz.kind === 'zh-en') {
    return words.find((word) => word.meaning === option.value || word.meaning === option.label)
      ?.audioMeaningId
  }
  if (quiz.kind === 'sentence-zh-en') {
    return sentences.find(
      (sentence) => sentence.english === option.value || sentence.english === option.label,
    )?.audioEnglishId
  }
  return words.find(
    (word) => word.id === option.value || word.word === option.value || word.word === option.label,
  )?.audioWordId
}

function getSelectedAnswerLabel(quiz: ActiveQuiz, response?: QuizResponse): string | undefined {
  if (!response?.selected) return undefined
  return quiz.options.find((option) => option.value === response.selected)?.label ?? response.selected
}

function getChoiceRevealDelay(stage: RecallStage): number {
  return {
    easy: 0,
    rescue: 0,
    'audio-first': 0,
    'try-before-choices': 0,
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
  // Progression stays 2-choice throughout: question types vary, but Active
  // Recall no longer adds extra wait time before showing the choices.
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
  lessonWords: VocabWord[],
  allWords: VocabWord[],
  allSentences: Sentence[],
): ActiveQuiz | undefined {
  if (!segment || segment.kind !== 'pause' || !segment.quiz) return undefined

  if (segment.quiz.kind === 'sentence-zh-en' && segment.sentenceId) {
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

  if (segment.quiz.kind === 'contrast') {
    const other = lessonWords.find((candidate) => candidate.id === segment.quiz?.otherWordId)
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

  if (segment.quiz.kind === 'audio-zh') {
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

  if (segment.quiz.kind === 'zh-en') {
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

  if (segment.quiz.kind === 'en-zh') {
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

function isQuizPauseSegment(segment: RenderedLessonSegment): boolean {
  return segment.kind === 'pause' && Boolean(segment.quiz)
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

function heatLevel(minutes: number, activityCount: number): number {
  if (activityCount === 0) return 0
  if (minutes >= 20) return 4
  if (minutes >= 10) return 3
  if (minutes >= 3) return 2
  return 1
}

function friendlyDate(dateKey: string): string {
  const date = new Date(`${dateKey}T12:00:00`)
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
}

function shortMonthDay(dateKey: string): string {
  const date = new Date(`${dateKey}T12:00:00`)
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
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

function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return `${m}m ${s}s`
}
