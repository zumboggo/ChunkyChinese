import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { CSSProperties, ReactNode } from 'react'
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
  ReferenceArea,
  ReferenceLine,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from 'recharts'
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
  getLatestReaderProgress,
  getAllSentences,
  getAllWords,
  getAudioClip,
  getActivePackId,
  getDashboardStats,
  getNewWordsPerDay,
  getHotkeys,
  getHostedClipPackIndex,
  getHostedComicPackIndex,
  getPromptClip,
  getReaderProgress,
  getReviewSignalEvents,
  importAudioFiles,
  importBackup,
  importClipPackFiles,
  importHostedClipPack,
  importHostedComicPack,
  rateWordFsrs,
  recordEvent,
  recordQuizAnswer,
  saveRenderedLesson,
  saveNewWordsPerDay,
  saveReaderProgress,
  seedLmsWordsIfEmpty,
  seedReaderBooksIfEmpty,
  saveHotkeys,
  setWordActiveRecallPriority,
  clearWordActiveRecallPriorities,
  setActivePackId as persistActivePackId,
  startReaderSession,
  updateReaderSession,
  getReaderSessionStats,
  getUserSettings,
  saveUserSettings,
  updateWordText,
  upsertWords,
  lookupDictionary,
  DEFAULT_USER_SETTINGS,
} from './db'
import { createLesson, createPocketLesson, selectTargetWords, type PauseProfile } from './lesson'
import { renderLessonToWav } from './renderAudio'
import {
  fsrsDueTime,
  isFsrsCardDue,
  isNewFsrsCard,
  previewFsrsRatings,
  downgradeRating,
} from './scheduler'
import {
  collectReaderComprehensionTokens,
  readerComprehensionCategory,
  readerMaxChineseWordLength,
  tokenizeReaderText,
  adaptiveReaderPinyinState,
} from './adaptiveText'
import { AdaptiveChineseText } from './AdaptiveChineseText'
import { WordInfoPopover } from './WordInfoPopover'
import { UniversalImporter } from './UniversalImporter'
import { VisualNovelWorldMode } from './visualNovel/VisualNovelWorldMode'
import { ComicReaderMode } from './comics/ComicReaderMode'
import { useReaderListeningController } from './useReaderListeningController'
import type { ReaderListeningController } from './useReaderListeningController'
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
  DashboardRange,
  DashboardStats,
  FsrsRating,
  HotkeySettings,
  HostedClipPack,
  HostedComicPack,
  ImportSummary,
  LessonPlan,

  LessonStep,
  ReaderBook,
  ReaderPack,
  ReaderSentence,
  ReaderProgress,
  ReaderWordToken,
  ReaderSession,
  ReaderSessionStats,
  RenderedLesson,
  RenderedLessonSegment,
  Sentence,
  StudyMode,
  UserSettings,
  VocabWord,
  DictionaryEntry,
} from './types'

type Screen = 'dashboard' | 'reader' | 'settings' | 'lesson' | 'flashcards' | 'visualNovel' | 'comicReader'
type FlashcardQueueMode = 'mixed' | 'due' | 'new'
type FlashcardFrontMode = 'text' | 'audio' | 'reverse'
type ReaderPinyinMode = UserSettings['readerPinyinMode']
type ReaderTheme = UserSettings['readerTheme']
type FlashcardSessionCounts = {
  new: number
  learning: number
  review: number
  done: number
  total: number
}
type ReaderResumeLocation = {
  book: ReaderBook
  story: string
  chapter: number
  sentenceIndex: number
  sentenceCount: number
  percent: number
  label: string
}
type ReaderComprehensionSummary = {
  knownPercent: number
  known: number
  learning: number
  new: number
  total: number
}
type ReaderBookComprehension = ReaderComprehensionSummary & {
  chapters: Array<
    ReaderComprehensionSummary & {
      id: string
      chapter: number
      title: string
    }
  >
}
type LessonStartOptions = {
  randomize?: boolean
  playAfterRender?: boolean
  pauseProfile?: PauseProfile
  newWordsLimit?: number
  allowExtraNew?: boolean
  extraReviewFirst?: boolean
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
  scheduled: 0,
  minutesToday: 0,
  clipsCompletedToday: 0,
  knownToday: 0,
  lingqsCreatedToday: 0,
  lingqsLearnedToday: 0,
  newWordsToday: 0,
  ranges: {
    today: { cardsReviewed: 0, successfulRecalls: 0, studyMinutes: 0, newWords: 0 },
    week: { cardsReviewed: 0, successfulRecalls: 0, studyMinutes: 0, newWords: 0 },
    month: { cardsReviewed: 0, successfulRecalls: 0, studyMinutes: 0, newWords: 0 },
    allTime: { cardsReviewed: 0, successfulRecalls: 0, studyMinutes: 0, newWords: 0 },
  },
  previousRanges: {
    today: { cardsReviewed: 0, successfulRecalls: 0, studyMinutes: 0, newWords: 0 },
    week: { cardsReviewed: 0, successfulRecalls: 0, studyMinutes: 0, newWords: 0 },
    month: { cardsReviewed: 0, successfulRecalls: 0, studyMinutes: 0, newWords: 0 },
  },
  currentStreak: 0,
  longestStreak: 0,
  avgFlashcardSetSeconds: 0,
  lastFlashcardSetSeconds: 0,
  learningProcessSeries: [],
  studyHeatmap: [],
  retentionSeries: [],
  readingSeries: [],
}

const DEFAULT_PACK_ID = 'lms-1000-azure'
const HIDDEN_PACK_IDS = new Set(['annas-reading-deck'])
const FLASHCARD_LEARN_AHEAD_MS = 5 * 60 * 1000
const FLASHCARD_REVERSE_RATE = 0.1

function App() {
  const [screen, setScreen] = useState<Screen>('dashboard')
  const [words, setWords] = useState<VocabWord[]>([])
  const [sentences, setSentences] = useState<Sentence[]>([])
  const [audioClips, setAudioClips] = useState<AudioClip[]>([])
  const [clipPacks, setClipPacks] = useState<ClipPack[]>([])
  const [hostedClipPacks, setHostedClipPacks] = useState<HostedClipPack[]>([])
  const [hostedComicPacks, setHostedComicPacks] = useState<HostedComicPack[]>([])
  const [readerPacks, setReaderPacks] = useState<ReaderPack[]>([])
  const [readerBooks, setReaderBooks] = useState<ReaderBook[]>([])
  const [activePackId, setActivePackId] = useState<string | undefined>()
  const [stats, setStats] = useState<DashboardStats>(emptyStats)
  const [dashboardRange, setDashboardRange] = useState<DashboardRange>('today')
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
  const [readerShowEnglish, setReaderShowEnglish] = useState(false)
  const [selectedReaderToken, setSelectedReaderToken] = useState<ReaderWordToken | null>(null)
  const [readerDictionaryEntry, setReaderDictionaryEntry] = useState<DictionaryEntry | null>(null)
  const [hostedPackDownloadId, setHostedPackDownloadId] = useState<string | null>(null)
  const [hostedPackProgress, setHostedPackProgress] = useState('')
  const [flashcardQueueIds, setFlashcardQueueIds] = useState<string[]>([])
  const [flashcardCurrentId, setFlashcardCurrentId] = useState<string | null>(null)
  const [flashcardDoneIds, setFlashcardDoneIds] = useState<string[]>([])
  const [flashcardClock, setFlashcardClock] = useState(() => Date.now())
  const [flashcardAnswerShown, setFlashcardAnswerShown] = useState(false)
  const [lmsSentences, setLmsSentences] = useState<Array<{ word: string; chinese: string; english: string }>>([])
  const [flashcardSessionKind, setFlashcardSessionKind] = useState<'words' | 'sentences'>('words')
  const [flashcardSentenceQueue, setFlashcardSentenceQueue] = useState<Array<{ word: string; chinese: string; english: string }>>([])
  const [flashcardSentenceIndex, setFlashcardSentenceIndex] = useState(0)
  const [flashcardSentenceAnswerShown, setFlashcardSentenceAnswerShown] = useState(false)
  const [flashcardAudioOnly, setFlashcardAudioOnly] = useState(false)
  const [flashcardSessionFeedback, setFlashcardSessionFeedback] = useState<FsrsRating | null>(null)
  const [flashcardSessionId, setFlashcardSessionId] = useState<string | null>(null)
  const [flashcardCelebrationId, setFlashcardCelebrationId] = useState(0)
  const [flashcardSessionRatingCounts, setFlashcardSessionRatingCounts] = useState<Record<FsrsRating, number>>({ again: 0, hard: 0, good: 0, easy: 0 })
  const [flashcardSessionStartMs, setFlashcardSessionStartMs] = useState<number>(0)
  const [flashcardSessionStruggledWords, setFlashcardSessionStruggledWords] = useState<VocabWord[]>([])
  const [editingWord, setEditingWord] = useState<CardEditDraft | null>(null)
  const [activeReaderSession, setActiveReaderSession] = useState<ReaderSession | null>(null)
  const [todayReaderStats, setTodayReaderStats] = useState<ReaderSessionStats | null>(null)
  const [latestReaderProgress, setLatestReaderProgress] = useState<ReaderProgress | undefined>()
  const [cloudUserEmail, setCloudUserEmail] = useState<string | null>(null)
  const [cloudSync, setCloudSync] = useState<CloudSyncUiState>({
    status: isSupabaseConfigured ? 'signed-out' : 'unconfigured',
    email: '',
    message: isSupabaseConfigured
      ? 'Sign in to sync progress across devices.'
      : 'Supabase sync is not configured yet.',
  })
  const [dashboardToast, setDashboardToast] = useState<string | null>(null)
  const lastReaderActivityTimeRef = useRef<number>(0)
  const runToken = useRef(0)
  const activeAnswerLockRef = useRef<string | null>(null)
  const autoContinueTimeoutRef = useRef<number | null>(null)
  const spokenQuizIdRef = useRef<string | null>(null)
  const startNextLessonRef = useRef<(() => void) | null>(null)
  const startModeLessonRef = useRef<((mode: StudyMode, options?: LessonStartOptions) => void) | null>(null)
  const runFromRef = useRef<((index: number, plan?: LessonPlan) => void) | null>(null)
  const activeChoiceAudioRef = useRef<HTMLAudioElement | null>(null)
  const activeChoiceSpeechTokenRef = useRef(0)
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const pocketAudioRef = useRef<HTMLAudioElement | null>(null)
  const lastPocketTimeRef = useRef(0)
  const playModeRef = useRef<HTMLElement | null>(null)
  const flashcardFeedbackTimeoutRef = useRef<number | null>(null)
  const syncTimerRef = useRef<number | null>(null)
  const clearedActiveRecallLessonRef = useRef<string | null>(null)
  const syncedFlashcardCompletionRef = useRef<string | null>(null)
  const dashboardToastKeyRef = useRef<string | null>(null)
  const dashboardToastReadyRef = useRef(false)

  useEffect(() => {
    fetch('seed/lms-sentences.json')
      .then((r) => r.json())
      .then((data) => setLmsSentences(data))
      .catch(() => {})
  }, [])

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
      nextHostedComicPacks,
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
      getHostedComicPackIndex(),
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
    const nextLatestReaderProgress = await getLatestReaderProgress(nextReaderBooks)
    setAudioClips(nextAudio)
    setClipPacks(visiblePacks)
    setReaderPacks(nextReaderPacks)
    setReaderBooks(nextReaderBooks)
    setLatestReaderProgress(nextLatestReaderProgress)
    setActivePackId(resolvedActivePackId)
    setNewWordsPerDay(nextNewWordsPerDay)
    setUserSettings(nextUserSettings)
    setHostedClipPacks(nextHostedClipPacks)
    setHostedComicPacks(nextHostedComicPacks)
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
    document.documentElement.dataset.theme = userSettings.darkMode ? 'dark' : 'light'
  }, [userSettings.darkMode])

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
  const extraReviewWords = useMemo(
    () =>
      words
        .filter((word) => word.activeRecallPriorityAt)
        .sort((a, b) => priorityTime(a) - priorityTime(b)),
    [words],
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
  const readerComprehensionByBook = useMemo(
    () =>
      screen === 'reader' && !activeReaderBook
        ? getReaderComprehensionByBook(readerBooks, scopedWords.length > 0 ? scopedWords : words)
        : new Map<string, ReaderBookComprehension>(),
    [activeReaderBook, readerBooks, scopedWords, screen, words],
  )
  const readerResumeLocation = useMemo(
    () => getReaderResumeLocation(latestReaderProgress, readerBooks),
    [latestReaderProgress, readerBooks],
  )
  const selectedRangeStats = stats.ranges[dashboardRange] ?? stats.ranges.today
  const selectedPreviousRangeStats = stats.previousRanges[dashboardRange]
  const remainingNewWordsToday = Math.max(0, newWordsPerDay - stats.newWordsToday)
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
  const currentFlashcardFrontMode = useMemo<FlashcardFrontMode>(
    () => getFlashcardFrontMode(currentFlashcardWord, flashcardSessionId, flashcardAudioOnly, userSettings.flashcardAudioFrontPercent),
    [currentFlashcardWord, flashcardSessionId, flashcardAudioOnly, userSettings.flashcardAudioFrontPercent],
  )

  useEffect(() => {
    if (!flashcardSessionComplete || !flashcardSessionId) return
    if (syncedFlashcardCompletionRef.current === flashcardSessionId) return
    syncedFlashcardCompletionRef.current = flashcardSessionId
    setFlashcardCelebrationId((value) => value + 1)
    playGentleCelebration()
    const durationSeconds = Math.round((Date.now() - flashcardSessionStartMs) / 1000)
    void recordEvent({
      type: 'complete',
      itemType: 'lesson',
      itemId: flashcardSessionId,
      seconds: durationSeconds,
      source: 'flashcards',
    })
    setLastSummary(
      isSupabaseConfigured && cloudUserEmail
        ? 'Flashcard set complete. Sync queued.'
        : 'Flashcard set complete.',
    )
    queueCloudSync()
  }, [cloudUserEmail, flashcardSessionComplete, flashcardSessionId, flashcardSessionStartMs, queueCloudSync])

  const flashcardSentenceSessionComplete = flashcardSessionKind === 'sentences' && flashcardSentenceQueue.length > 0 && flashcardSentenceIndex >= flashcardSentenceQueue.length
  useEffect(() => {
    if (!flashcardSentenceSessionComplete || !flashcardSessionId) return
    if (syncedFlashcardCompletionRef.current === flashcardSessionId) return
    syncedFlashcardCompletionRef.current = flashcardSessionId
    setFlashcardCelebrationId((value) => value + 1)
    playGentleCelebration()
    const durationSeconds = Math.round((Date.now() - flashcardSessionStartMs) / 1000)
    void recordEvent({
      type: 'complete',
      itemType: 'lesson',
      itemId: flashcardSessionId,
      seconds: durationSeconds,
      source: 'flashcards',
    })
  }, [flashcardSentenceSessionComplete, flashcardSessionId, flashcardSessionStartMs])

  useEffect(() => {
    if (!dashboardToastReadyRef.current) {
      dashboardToastReadyRef.current = true
      return
    }
    const encouragement = getDashboardEncouragement(stats, userSettings)
    if (!encouragement) return
    const key = `${new Date().toDateString()}:${encouragement}`
    if (dashboardToastKeyRef.current === key) return
    dashboardToastKeyRef.current = key
    setDashboardToast(encouragement)
    const timeout = window.setTimeout(() => setDashboardToast(null), 5200)
    return () => window.clearTimeout(timeout)
  }, [stats, userSettings])

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
    setFlashcardSessionKind('words')
    setFlashcardSentenceQueue([])
    setFlashcardSentenceIndex(0)
    setFlashcardSentenceAnswerShown(false)
    setFlashcardAudioOnly(false)
    setFlashcardSessionRatingCounts({ again: 0, hard: 0, good: 0, easy: 0 })
    setFlashcardSessionStartMs(Date.now())
    setFlashcardSessionStruggledWords([])
    setScreen('flashcards')
    setLastSummary(queue.length > 0 ? `Loaded ${queue.length} flashcards.` : 'No flashcards match that queue.')
  }, [buildFlashcardQueue])

  const startSavedFlashcards = useCallback(() => {
    startFlashcards(userSettings.flashcardQueueMode ?? 'mixed')
  }, [startFlashcards, userSettings.flashcardQueueMode])

  const startSentenceFlashcards = useCallback(() => {
    const pool = lmsSentences.length > 0 ? lmsSentences : []
    const shuffled = [...pool].sort(() => Math.random() - 0.5)
    const queue = shuffled.slice(0, 50)
    setFlashcardSessionKind('sentences')
    setFlashcardSentenceQueue(queue)
    setFlashcardSentenceIndex(0)
    setFlashcardSentenceAnswerShown(false)
    setFlashcardAudioOnly(false)
    setFlashcardSessionId(`sentences:${crypto.randomUUID()}`)
    setFlashcardClock(Date.now())
    setFlashcardSessionFeedback(null)
    setFlashcardSessionRatingCounts({ again: 0, hard: 0, good: 0, easy: 0 })
    setFlashcardSessionStartMs(Date.now())
    setFlashcardSessionStruggledWords([])
    setScreen('flashcards')
    setLastSummary(queue.length > 0 ? `Loaded ${queue.length} sentence flashcards.` : 'No sentence flashcards available.')
  }, [lmsSentences])

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

  const toggleActiveRecallPriority = useCallback(async (word: VocabWord) => {
    const prioritized = !word.activeRecallPriorityAt
    const updatedWord = await setWordActiveRecallPriority(word.id, prioritized)
    if (!updatedWord) return
    setWords((currentWords) =>
      currentWords.map((currentWord) => (currentWord.id === updatedWord.id ? updatedWord : currentWord)),
    )
    setSelectedReaderToken((token) =>
      token?.word?.id === updatedWord.id ? { ...token, word: updatedWord } : token,
    )
    setLastSummary(
      prioritized
        ? `${updatedWord.word} starred for extra review.`
        : `${updatedWord.word} removed from extra review.`,
    )
    queueCloudSync()
  }, [queueCloudSync])

  useEffect(() => {
    if (studyMode !== 'activeRecall' || !lesson || !allLessonWordsRated) return
    const lessonWordIds = lesson.targetWords.map((word) => word.id).sort()
    const clearKey = lessonWordIds.join('|')
    if (!clearKey || clearedActiveRecallLessonRef.current === clearKey) return
    clearedActiveRecallLessonRef.current = clearKey
    const prioritizedIds = lessonWordIds.filter((wordId) =>
      words.some((word) => word.id === wordId && word.activeRecallPriorityAt),
    )
    if (prioritizedIds.length === 0) return
    void clearWordActiveRecallPriorities(prioritizedIds).then((updatedWords) => {
      if (updatedWords.length === 0) return
      const updatedById = new Map(updatedWords.map((word) => [word.id, word]))
      setWords((currentWords) =>
        currentWords.map((word) => updatedById.get(word.id) ?? word),
      )
      setLastSummary('Completed extra review stars were cleared.')
      queueCloudSync()
    })
  }, [allLessonWordsRated, lesson, queueCloudSync, studyMode, words])

  const finishFlashcardSession = useCallback(() => {
    setLastSummary('Flashcard session saved.')
    setFlashcardCurrentId(null)
    setFlashcardAnswerShown(false)
    setFlashcardSessionFeedback(null)
    setFlashcardSessionKind('words')
    setFlashcardSentenceQueue([])
    setFlashcardSentenceIndex(0)
    setFlashcardSentenceAnswerShown(false)
    setFlashcardAudioOnly(false)
    setScreen('dashboard')
    void refresh()
  }, [refresh])

  const refreshFlashcardSession = useCallback(() => {
    if (flashcardSessionKind === 'sentences') {
      startSentenceFlashcards()
      setLastSummary('Loaded a fresh sentence flashcard set.')
    } else {
      startSavedFlashcards()
      setLastSummary('Loaded a fresh flashcard set.')
    }
  }, [flashcardSessionKind, startSavedFlashcards, startSentenceFlashcards])

  useEffect(() => {
    if (screen !== 'flashcards') return
    const interval = window.setInterval(() => setFlashcardClock(Date.now()), 15_000)
    return () => window.clearInterval(interval)
  }, [screen])

  useEffect(() => {
    if (screen !== 'flashcards' || !flashcardSessionId) return
    const timeout = window.setTimeout(() => {
      window.scrollTo({
        top: document.documentElement.scrollHeight,
        behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth',
      })
    }, 120)
    return () => window.clearTimeout(timeout)
  }, [flashcardSessionId, screen])

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
    clearedActiveRecallLessonRef.current = null
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
    setReaderDictionaryEntry(null)
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
      setLatestReaderProgress(await getLatestReaderProgress(readerBooks))
      queueCloudSync()
    }
  }, [queueCloudSync, readerBooks, recordReaderInteraction, recordReaderSentenceView])

  const moveReaderSentence = useCallback(async (delta: number) => {
    if (!activeReaderBook || readerSentences.length === 0) return
    const nextIndex = Math.min(
      Math.max(readerSentenceIndex + delta, 0),
      readerSentences.length - 1,
    )
    recordReaderInteraction()
    setReaderSentenceIndex(nextIndex)
    setSelectedReaderToken(null)
    setReaderDictionaryEntry(null)
    await saveReaderProgress({
      packId: activeReaderBook.packId,
      bookId: activeReaderBook.id,
      sentenceIndex: nextIndex,
    })
    setLatestReaderProgress(await getLatestReaderProgress(readerBooks))
    queueCloudSync()
    const nextSentence = readerSentences[nextIndex]
    if (nextSentence && activeReaderSession) {
      await recordReaderSentenceView(nextSentence, activeReaderSession)
    }
  }, [
    activeReaderBook,
    activeReaderSession,
    readerSentenceIndex,
    readerBooks,
    readerSentences,
    queueCloudSync,
    recordReaderInteraction,
    recordReaderSentenceView,
  ])

  const readerListening = useReaderListeningController({
    sentence: currentReaderSentence,
    sentenceIndex: readerSentenceIndex,
    sentenceCount: readerSentences.length,
    rate: userSettings.readerListeningRate,
    repeatCount: userSettings.readerListeningRepeats,
    autoAdvance: userSettings.readerListeningAutoAdvance,
    mediaSessionEnabled: screen === 'reader',
    onNext: () => moveReaderSentence(1),
    onPrevious: () => moveReaderSentence(-1),
  })
  const readerListeningActive = readerListening.active
  const stopReaderListening = readerListening.stop

  useEffect(() => {
    if (screen !== 'reader' && readerListeningActive) stopReaderListening()
  }, [readerListeningActive, screen, stopReaderListening])

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
    setFlashcardSessionRatingCounts((prev) => ({ ...prev, [rating]: prev[rating] + 1 }))
    if (rating === 'again') {
      setFlashcardSessionStruggledWords((prev) => prev.some((w) => w.id === wordId) ? prev : [...prev, ratedWord])
    }
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

  const playSentenceTwice = useCallback(async (sentence: string) => {
    const token = runToken.current + 1
    runToken.current = token
    audioRef.current?.pause()
    window.speechSynthesis?.cancel()
    for (let index = 0; index < 2; index += 1) {
      if (runToken.current !== token) return
      await speakUtterance(sentence, playbackRate, 'zh-CN')
    }
  }, [playbackRate])

  useEffect(() => {
    if (screen !== 'flashcards') return
    if (flashcardSessionKind === 'sentences') return
    if (!currentFlashcardWord || flashcardAnswerShown || currentFlashcardFrontMode !== 'audio') return
    void playFlashcardWordTwice(currentFlashcardWord)
  }, [
    currentFlashcardFrontMode,
    currentFlashcardWord,
    flashcardAnswerShown,
    playFlashcardWordTwice,
    screen,
    flashcardSessionKind,
  ])

  useEffect(() => {
    if (screen !== 'flashcards') return
    if (flashcardSessionKind !== 'sentences') return
    const sentence = flashcardSentenceQueue[flashcardSentenceIndex]
    if (!sentence || flashcardSentenceAnswerShown) return
    if (flashcardAudioOnly) {
      void playSentenceTwice(sentence.chinese)
    }
  }, [
    flashcardSessionKind,
    flashcardSentenceQueue,
    flashcardSentenceIndex,
    flashcardSentenceAnswerShown,
    flashcardAudioOnly,
    playSentenceTwice,
    screen,
  ])

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
        if (readerListening.active && mappedIndex === 0) {
          event.preventDefault()
          readerListening.togglePlayPause()
        } else if (readerListening.active && mappedIndex === 1) {
          event.preventDefault()
          void readerListening.next()
        } else if (pressed === hotkeys.choiceF && currentReaderSentence) {
          event.preventDefault()
          readerListening.playSentenceOnce()
        } else if (mappedIndex === 0) {
          event.preventDefault()
          setReaderShowEnglish((value) => !value)
        } else if (mappedIndex === 1) {
          event.preventDefault()
          void moveReaderSentence(1)
        }
        return
      }
      if (screen === 'dashboard') {
        if (mappedIndex === 0) {
          event.preventDefault()
          startSavedFlashcards()
        } else if (mappedIndex === 1) {
          event.preventDefault()
          setScreen('comicReader')
        } else if (mappedIndex === 2) {
          event.preventDefault()
          startModeLessonRef.current?.('listeningMode')
        } else if (mappedIndex === 3) {
          event.preventDefault()
          setScreen('visualNovel')
        }
        return
      }
      if (screen === 'flashcards') {
        if (flashcardSessionKind === 'sentences') {
          const currentSentence = flashcardSentenceQueue[flashcardSentenceIndex]
          if (pressed === hotkeys.choiceF && currentSentence) {
            event.preventDefault()
            void playSentenceTwice(currentSentence.chinese)
            return
          }
          if (!currentSentence && flashcardSentenceIndex >= flashcardSentenceQueue.length) {
            if (mappedIndex === 0) {
              event.preventDefault()
              refreshFlashcardSession()
            } else if (mappedIndex === 1) {
              event.preventDefault()
              finishFlashcardSession()
            }
            return
          }
          if (!currentSentence) return
          if (!flashcardSentenceAnswerShown && (mappedIndex === 0 || event.key === 'Enter' || event.key === ' ')) {
            event.preventDefault()
            setFlashcardSentenceAnswerShown(true)
            void playSentenceTwice(currentSentence.chinese)
            return
          }
          if (flashcardSentenceAnswerShown) {
            if (mappedIndex === 0 || mappedIndex === 1) {
              event.preventDefault()
              setFlashcardSentenceAnswerShown(false)
              setFlashcardSentenceIndex((i) => i + 1)
            }
          }
          return
        }
        if (pressed === hotkeys.choiceF && currentFlashcardWord) {
          event.preventDefault()
          void playFlashcardWordTwice(currentFlashcardWord)
          return
        }
        if (pressed === hotkeys.choiceE && currentFlashcardWord) {
          event.preventDefault()
          void toggleActiveRecallPriority(currentFlashcardWord)
          return
        }
        if (!currentFlashcardWord && flashcardSessionComplete) {
          if (mappedIndex === 0) {
            event.preventDefault()
            refreshFlashcardSession()
          } else if (mappedIndex === 1) {
            event.preventDefault()
            finishFlashcardSession()
          }
          return
        }
        if (!currentFlashcardWord) return
        if (!flashcardAnswerShown && (mappedIndex === 0 || event.key === 'Enter' || event.key === ' ')) {
          event.preventDefault()
          setFlashcardAnswerShown(true)
          void playFlashcardWordTwice(currentFlashcardWord)
          return
        }
        const rating = hotkeyToReviewRating(pressed, hotkeys)
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
        if (pressed === hotkeys.choiceE && currentReviewWord) {
          event.preventDefault()
          void toggleActiveRecallPriority(currentReviewWord)
          return
        }
        if (pressed === hotkeys.choiceF && currentReviewWord) {
          event.preventDefault()
          void playFlashcardWordTwice(currentReviewWord)
          return
        }
        if (flashcardFeedback) return
        if (!reviewAnswerShown && (mappedIndex === 0 || event.key === 'Enter' || event.key === ' ')) {
          event.preventDefault()
          setReviewAnswerShown(true)
          if (currentReviewWord) void playFlashcardWordTwice(currentReviewWord)
          return
        }
        const rating = hotkeyToReviewRating(pressed, hotkeys)
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
    finishFlashcardSession,
    flashcardFeedback,
    flashcardSessionComplete,
    fsrsRatings,
    handleFlashcardRate,
    handleQuizAnswer,
    hotkeys,
    isSentenceContinueSection,
    currentReviewWord,
    currentFlashcardWord,
    currentReaderSentence,
    flashcardAnswerShown,
    flashcardSentenceAnswerShown,
    flashcardSentenceIndex,
    flashcardSentenceQueue,
    flashcardSessionKind,
    handleStandaloneFlashcardRate,
    refreshFlashcardSession,
    moveReaderSentence,
    playFlashcardWordTwice,
    readerListening,
    playSentenceTwice,
    ratingWords,
    reviewAnswerShown,
    screen,
    showReviewPrompt,
    startSavedFlashcards,
    toggleActiveRecallPriority,
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
            extraReviewFirst: studyMode === 'listeningMode',
            ...selectionOptions,
          })
        : createPocketLesson(lessonWords, lessonSentences, audioClips, manualIds, {
            pauseProfile,
            activeRecall: studyMode === 'activeRecall',
            activeRecallEvents,
            extraReviewFirst: studyMode === 'listeningMode',
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

  useEffect(() => {
    startModeLessonRef.current = (mode, options) => {
      void startModeLesson(mode, options)
    }
  })

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

  function handleVocabSnapshotExport() {
    const strong: string[] = []
    const medium: string[] = []
    const learning: string[] = []

    for (const word of words) {
      const state = adaptiveReaderPinyinState(word)
      if (state === 'known') {
        strong.push(word.word)
      } else if (state === 'medium') {
        medium.push(word.word)
      } else {
        learning.push(word.word)
      }
    }

    const snapshot = {
      generatedAt: new Date().toISOString(),
      source: "ChunkyChinese vocabulary database",
      knownCriteria: {
        description: "Mapped using adaptiveReaderPinyinState. 'known' -> strong, 'medium' -> medium, 'unknown' -> learning."
      },
      words: {
        strong,
        medium,
        learning
      }
    }

    downloadText(`vocab-snapshot-${new Date().toISOString().slice(0, 10)}.json`, JSON.stringify(snapshot, null, 2))
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

  async function handleHostedComicPackImport(pack: HostedComicPack) {
    setHostedPackDownloadId(pack.id)
    setHostedPackProgress('Starting download...')
    try {
      const summary = await importHostedComicPack(
        pack.baseUrl,
        (message) => setHostedPackProgress(message),
      )
      setLastSummary(`Downloaded ${pack.name}. ${summary.chapters} chapters, ${summary.pages} pages.`)
      setHostedPackProgress('')
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
    const next = { ...hotkeys, [name]: value.trim().toLocaleLowerCase() }
    setHotkeys(next)
    await saveHotkeys(next)
    setLastSummary('Hotkeys saved.')
  }

  function saveReaderSettings(patch: Partial<Pick<
    UserSettings,
    | 'readerPinyinMode'
    | 'readerTheme'
    | 'readerFontScale'
    | 'readerLineHeight'
    | 'readerListeningRate'
    | 'readerListeningRepeats'
    | 'readerListeningAutoAdvance'
  >>) {
    const next = { ...userSettings, ...patch }
    setUserSettings(next)
    void saveUserSettings(next)
    setLastSummary('Reader settings saved.')
  }

  return (
    <main className="app-shell">
      <header className="topbar">
        <button className="brand-button" type="button" onClick={() => setScreen('dashboard')} aria-label="Go to dashboard">
          <span className="brand-mark">中</span>
          <span>
            <strong>Chunky Chinese</strong>
            <small>{seedMessage}</small>
          </span>
          <span className="brand-home-pill" aria-hidden="true">Home</span>
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
              <button className="mode-start flashcards-start" type="button" onClick={startSavedFlashcards}>
                <kbd>{hotkeys.choiceA.toUpperCase()}</kbd>
                <strong>Flashcards</strong>
                <span>Sort due and new words with FSRS.</span>
              </button>
              <button className="mode-start comic-start" type="button" onClick={() => setScreen('comicReader')}>
                <kbd>{hotkeys.choiceB.toUpperCase()}</kbd>
                <strong>Comic Reading</strong>
                <span>Read comic pages with clickable Chinese transcripts.</span>
              </button>
              <button className="mode-start listen-start" type="button" onClick={() => startModeLesson('listeningMode')}>
                <kbd>{hotkeys.choiceC.toUpperCase()}</kbd>
                <strong>Listening</strong>
                <span>Listen with passive or active recall modes.</span>
              </button>
              <button className="mode-start novel-start" type="button" onClick={() => setScreen('visualNovel')}>
                <kbd>{hotkeys.choiceD.toUpperCase()}</kbd>
                <strong>Visual Novel</strong>
                <span>Play a story scene with the same Adaptive Mode text.</span>
              </button>
            </div>
          </div>

          <section className="dashboard-today-panel" aria-label="Today">
            <div className="dashboard-today-heading">
              <strong>{dashboardRangeLabel(dashboardRange)}</strong>
              <span>{stats.currentStreak} day streak</span>
            </div>
            <div className="segmented-control dashboard-range-control" aria-label="Dashboard stats range">
              {dashboardRanges.map((range) => (
                <button
                  key={range.value}
                  type="button"
                  className={dashboardRange === range.value ? 'active' : ''}
                  onClick={() => setDashboardRange(range.value)}
                >
                  {range.label}
                </button>
              ))}
            </div>
            <div
              className={`dashboard-comparison-head ${selectedPreviousRangeStats ? '' : 'single-period'}`.trim()}
              aria-hidden="true"
            >
              <span>Metric</span>
              <strong>{dashboardRangeLabel(dashboardRange)}</strong>
              {selectedPreviousRangeStats && <strong>{dashboardPreviousRangeLabel(dashboardRange)}</strong>}
            </div>
            <dl className={`dashboard-today-stats ${selectedPreviousRangeStats ? '' : 'single-period'}`.trim()}>
              <div>
                <dt>Cards reviewed</dt>
                <dd>{selectedRangeStats.cardsReviewed}</dd>
                {selectedPreviousRangeStats && <dd>{selectedPreviousRangeStats.cardsReviewed}</dd>}
              </div>
              <div>
                <dt>Successful recalls</dt>
                <dd>{selectedRangeStats.successfulRecalls}</dd>
                {selectedPreviousRangeStats && <dd>{selectedPreviousRangeStats.successfulRecalls}</dd>}
              </div>
              <div>
                <dt>Study minutes</dt>
                <dd>{selectedRangeStats.studyMinutes.toFixed(1)}</dd>
                {selectedPreviousRangeStats && <dd>{selectedPreviousRangeStats.studyMinutes.toFixed(1)}</dd>}
              </div>
              <div>
                <dt>New words</dt>
                <dd>{selectedRangeStats.newWords}</dd>
                {selectedPreviousRangeStats && <dd>{selectedPreviousRangeStats.newWords}</dd>}
              </div>
            </dl>
          </section>

          {dashboardToast && (
            <div className="dashboard-toast" role="status">
              {dashboardToast}
            </div>
          )}

          <details className="extra-review-panel">
            <summary>
              <span>Extra review words</span>
              <strong>{extraReviewWords.length}</strong>
            </summary>
            <div className="extra-review-list">
              {extraReviewWords.map((word) => (
                <div className="extra-review-row" key={word.id}>
                  <span>
                    <strong>{word.word}</strong>
                    <small>{word.pinyin ? `${word.pinyin} · ${word.meaning}` : word.meaning}</small>
                  </span>
                  <button type="button" className="ghost-answer" onClick={() => toggleActiveRecallPriority(word)}>
                    Remove
                  </button>
                </div>
              ))}
              {extraReviewWords.length === 0 && (
                <small>No starred words yet. Press {hotkeys.choiceE.toUpperCase()} on a flashcard to add one.</small>
              )}
            </div>
          </details>

          <div className="dashboard-progress-grid">
            <InfoPanel title="Learning process" className="process-chart-panel">
              <LearningProcessChart points={stats.learningProcessSeries} />
            </InfoPanel>
            <InfoPanel title="Recent Activity (Last 7 Days)">
              <ActivityChart days={stats.studyHeatmap} />
            </InfoPanel>
            <InfoPanel title="Review heatmap">
              <ProgressHeatmap days={stats.studyHeatmap} />
            </InfoPanel>
            <InfoPanel title="Vocab Growth" className="vocab-growth-panel">
              <VocabGrowthChart points={stats.retentionSeries} />
            </InfoPanel>
            <InfoPanel title="Study details" className="study-details-panel">
              <dl className="stat-list">
                <div>
                  <dt>Current streak</dt>
                  <dd>{stats.currentStreak} 🔥</dd>
                </div>
                <div>
                  <dt>Longest streak</dt>
                  <dd>{stats.longestStreak}</dd>
                </div>
                <div>
                  <dt>Study minutes</dt>
                  <dd>{stats.minutesToday.toFixed(1)}</dd>
                </div>
                <div>
                  <dt>Due soon</dt>
                  <dd>{stats.dueSoon}</dd>
                </div>
                <div>
                  <dt>Scheduled</dt>
                  <dd>{stats.scheduled}</dd>
                </div>
                <div>
                  <dt>New cards</dt>
                  <dd>{stats.counts.new}</dd>
                </div>
                <div>
                  <dt>Learning</dt>
                  <dd>{stats.counts.learning}</dd>
                </div>
                <div>
                  <dt>Due cards</dt>
                  <dd>{stats.counts.due}</dd>
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
                <div>
                  <dt>Reading time</dt>
                  <dd>{formatDuration(todayReaderStats?.todayActiveSeconds ?? 0)}</dd>
                </div>
                <div>
                  <dt>Words read</dt>
                  <dd>{todayReaderStats?.todayWordsRead ?? 0}</dd>
                </div>
                <div>
                  <dt>Pages read</dt>
                  <dd>{todayReaderStats?.todayPagesRead ?? 0} / {userSettings.readingGoalPages}</dd>
                </div>
                <div>
                  <dt>WPM</dt>
                  <dd>{todayReaderStats?.todayWpm ?? 0}</dd>
                </div>
                <div>
                  <dt>Total sessions</dt>
                  <dd>{todayReaderStats?.totalSessions ?? 0}</dd>
                </div>
                <div>
                  <dt>Avg flashcard set</dt>
                  <dd>{stats.avgFlashcardSetSeconds > 0 ? formatDuration(Math.round(stats.avgFlashcardSetSeconds)) : '—'}</dd>
                </div>
                <div>
                  <dt>Last set duration</dt>
                  <dd>{stats.lastFlashcardSetSeconds > 0 ? formatDuration(stats.lastFlashcardSetSeconds) : '—'}</dd>
                </div>
              </dl>
              <button type="button" className="ghost-answer" onClick={() => setScreen('comicReader')}>
                Open reader
              </button>
            </InfoPanel>
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
            <InfoPanel title="Hotkeys">
              <dl className="stat-list">
                <div>
                  <dt>Choice A</dt>
                  <dd>{hotkeys.choiceA.toUpperCase()} · Again / primary</dd>
                </div>
                <div>
                  <dt>Choice B</dt>
                  <dd>{hotkeys.choiceB.toUpperCase()} · Hard / secondary</dd>
                </div>
                <div>
                  <dt>Choice C</dt>
                  <dd>{hotkeys.choiceC.toUpperCase()} · Good</dd>
                </div>
                <div>
                  <dt>Choice D</dt>
                  <dd>{hotkeys.choiceD.toUpperCase()} · Easy</dd>
                </div>
                <div>
                  <dt>Choice E</dt>
                  <dd>{hotkeys.choiceE.toUpperCase()} · Extra review</dd>
                </div>
                <div>
                  <dt>Choice F</dt>
                  <dd>{hotkeys.choiceF.toUpperCase()} · Replay audio</dd>
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
            </InfoPanel>
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
          {flashcardCelebrationId > 0 && <FlashcardCelebration key={flashcardCelebrationId} />}
          <div className="screen-heading compact">
            <div>
              <h1>Flashcards</h1>
              <p>
                {flashcardSessionKind === 'sentences'
                  ? 'Sentence mode. Front is Chinese; back is English.'
                  : 'Fast FSRS reviews. Front is Chinese; back is pinyin and definition.'}
              </p>
            </div>
          </div>

          <section className="flashcards-workspace">
            <div className="flashcards-meta">
              <span>
                {flashcardSessionKind === 'sentences'
                  ? `${hotkeys.choiceA.toUpperCase()} flip, then ${hotkeys.choiceA.toUpperCase()} / ${hotkeys.choiceB.toUpperCase()} next`
                  : `${hotkeys.choiceA.toUpperCase()} flip, then Again · ${hotkeys.choiceE.toUpperCase()} star for extra review`}
              </span>
              <div className="flashcard-mode-buttons">
                <button
                  type="button"
                  className={`ghost-answer ${flashcardSessionKind === 'sentences' ? 'active' : ''}`}
                  onClick={startSentenceFlashcards}
                >
                  Sentences
                </button>
                <button
                  type="button"
                  className={`ghost-answer ${flashcardAudioOnly ? 'active' : ''}`}
                  onClick={() => setFlashcardAudioOnly((v) => !v)}
                >
                  Audio only
                </button>
              </div>
            </div>
            {flashcardSessionKind === 'words' && <FlashcardQueueCounters counts={flashcardSessionCounts} />}

            {flashcardSessionKind === 'sentences' ? (
              flashcardSentenceIndex < flashcardSentenceQueue.length ? (
                (() => {
                  const sentence = flashcardSentenceQueue[flashcardSentenceIndex]
                  const audioFront = flashcardAudioOnly && !flashcardSentenceAnswerShown
                  return (
                    <section className="flashcard-review">
                      <div className={`flashcard ${flashcardSentenceAnswerShown ? 'answer-side' : 'front-side'} ${audioFront ? 'audio-front' : ''}`}>
                        <span>
                          {flashcardSentenceAnswerShown
                            ? 'Sentence + meaning'
                            : audioFront
                              ? 'Audio front'
                              : 'Sentence front'}
                        </span>
                        {flashcardSentenceAnswerShown ? (
                          <>
                            <strong className="flashcard-sentence-cn">{sentence.chinese}</strong>
                            <p className="flashcard-answer-text">{sentence.english}</p>
                            <p className="flashcard-word-meaning">{sentence.word}</p>
                          </>
                        ) : (
                          <>
                            {audioFront ? (
                              <>
                                <strong>Listen first</strong>
                                <p className="flashcard-answer-text">The sentence audio plays twice.</p>
                              </>
                            ) : (
                              <strong className="flashcard-sentence-cn">{sentence.chinese}</strong>
                            )}
                            <button
                              type="button"
                              className="primary"
                              onClick={() => {
                                setFlashcardSentenceAnswerShown(true)
                                void playSentenceTwice(sentence.chinese)
                              }}
                            >
                              Flip
                            </button>
                          </>
                        )}
                        <button
                          type="button"
                          className="ghost-answer"
                          onClick={() => void playSentenceTwice(sentence.chinese)}
                        >
                          <kbd>{hotkeys.choiceF.toUpperCase()}</kbd>
                          Play audio
                        </button>
                      </div>
                      {flashcardSentenceAnswerShown && (
                        <div className="review-buttons fsrs-preview-buttons">
                          <button
                            type="button"
                            onClick={() => {
                              const matchedWord = words.find((w) => w.word === sentence.word)
                              if (matchedWord) {
                                const halfRating = downgradeRating('again')
                                void rateWordFsrs(matchedWord.id, halfRating, { source: 'flashcards', sessionId: flashcardSessionId ?? undefined })
                              }
                              setFlashcardSessionRatingCounts((prev) => ({ ...prev, again: prev.again + 1 }))
                              setFlashcardSentenceAnswerShown(false)
                              setFlashcardSentenceIndex((i) => i + 1)
                            }}
                          >
                            <kbd>{hotkeys.choiceA.toUpperCase()}</kbd>
                            <strong>Again</strong>
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              const matchedWord = words.find((w) => w.word === sentence.word)
                              if (matchedWord) {
                                const halfRating = downgradeRating('good')
                                void rateWordFsrs(matchedWord.id, halfRating, { source: 'flashcards', sessionId: flashcardSessionId ?? undefined })
                              }
                              setFlashcardSessionRatingCounts((prev) => ({ ...prev, good: prev.good + 1 }))
                              setFlashcardSentenceAnswerShown(false)
                              setFlashcardSentenceIndex((i) => i + 1)
                            }}
                          >
                            <kbd>{hotkeys.choiceB.toUpperCase()}</kbd>
                            <strong>Good</strong>
                          </button>
                        </div>
                      )}
                      <div className="flashcard-bottom-actions">
                        <button
                          type="button"
                          className="ghost-answer"
                          onClick={() => {
                            setFlashcardSessionKind('words')
                            setFlashcardSentenceQueue([])
                            setFlashcardSentenceIndex(0)
                            setFlashcardSentenceAnswerShown(false)
                          }}
                        >
                          Back to words
                        </button>
                      </div>
                    </section>
                  )
                })()
              ) : (
                <div className="review-complete flashcards-complete">
                  <strong>Sentence flashcard queue complete.</strong>
                  <span>You reviewed {flashcardSentenceQueue.length} sentences.</span>
                  <div className="flashcard-session-summary">
                    <div className="session-summary-stats">
                      <span><strong>{formatDuration(Math.round((Date.now() - flashcardSessionStartMs) / 1000))}</strong> duration</span>
                      {fsrsRatingsForUi.filter((r) => flashcardSessionRatingCounts[r.value] > 0).map((r) => (
                        <span key={r.value}>
                          <strong>{flashcardSessionRatingCounts[r.value]}</strong> {r.label}
                        </span>
                      ))}
                    </div>
                  </div>
                  <div className="flashcard-complete-actions">
                    <button type="button" className="primary" onClick={refreshFlashcardSession}>
                      <kbd>{hotkeys.choiceA.toUpperCase()}</kbd>
                      New set
                    </button>
                    <button type="button" onClick={finishFlashcardSession}>
                      <kbd>{hotkeys.choiceB.toUpperCase()}</kbd>
                      Done
                    </button>
                  </div>
                </div>
              )
            ) : currentFlashcardWord ? (
              <FlashcardReview
                word={currentFlashcardWord}
                answerShown={flashcardAnswerShown}
                frontMode={currentFlashcardFrontMode}
                onFlip={() => {
                  setFlashcardAnswerShown(true)
                  void playFlashcardWordTwice(currentFlashcardWord)
                }}
                onReplayAudio={() => playFlashcardWordTwice(currentFlashcardWord)}
                onRate={handleStandaloneFlashcardRate}
                onEdit={() => openCardEditor(currentFlashcardWord)}
                onToggleActiveRecallPriority={() => toggleActiveRecallPriority(currentFlashcardWord)}
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
                  <>
                    <div className="flashcard-session-summary">
                      <div className="session-summary-stats">
                        <span><strong>{formatDuration(Math.round((Date.now() - flashcardSessionStartMs) / 1000))}</strong> duration</span>
                        {fsrsRatingsForUi.map((r) => (
                          <span key={r.value}>
                            <strong>{flashcardSessionRatingCounts[r.value]}</strong> {r.label}
                          </span>
                        ))}
                      </div>
                      {flashcardSessionStruggledWords.length > 0 && (
                        <div className="session-struggled-words">
                          <span className="struggled-label">Rated Again this round:</span>
                          {flashcardSessionStruggledWords.map((word) => (
                            <button
                              key={word.id}
                              type="button"
                              className={`ghost-answer struggled-word-btn ${word.activeRecallPriorityAt ? 'active' : ''}`}
                              onClick={() => void toggleActiveRecallPriority(word)}
                            >
                              {word.activeRecallPriorityAt ? '★' : '☆'} {word.word}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                    <div className="flashcard-complete-actions">
                      <button type="button" className="primary" onClick={refreshFlashcardSession}>
                        <kbd>{hotkeys.choiceA.toUpperCase()}</kbd>
                        New set
                      </button>
                      <button type="button" onClick={finishFlashcardSession}>
                        <kbd>{hotkeys.choiceB.toUpperCase()}</kbd>
                        Done
                      </button>
                    </div>
                  </>
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
          comprehensionByBook={readerComprehensionByBook}
          activeBook={activeReaderBook}
          sentence={currentReaderSentence}
          sentenceIndex={readerSentenceIndex}
          sentenceCount={readerSentences.length}
          tokens={readerTokens}
          selectedToken={selectedReaderToken}
          resumeLocation={readerResumeLocation}
          pinyinMode={userSettings.readerPinyinMode}
          readerTheme={userSettings.readerTheme}
          readerFontScale={userSettings.readerFontScale}
          readerLineHeight={userSettings.readerLineHeight}
          replayHotkey={hotkeys.choiceF}
          choiceA={hotkeys.choiceA}
          choiceB={hotkeys.choiceB}
          showEnglish={readerShowEnglish}
          listening={readerListening}
          listeningRate={userSettings.readerListeningRate}
          listeningRepeats={userSettings.readerListeningRepeats}
          listeningAutoAdvance={userSettings.readerListeningAutoAdvance}
          onChooseBook={openReaderBook}
          onResume={() => {
            if (readerResumeLocation) void openReaderBook(readerResumeLocation.book, 'resume')
          }}
          onPrevious={() => readerListening.previous()}
          onNext={() => readerListening.next()}
          onListeningSettingsChange={(patch) => saveReaderSettings(patch)}
          onSelectToken={(token) => {
            recordReaderInteraction()
            if (token && selectedReaderToken?.id === token.id) {
              setSelectedReaderToken(null)
              setReaderDictionaryEntry(null)
              return
            }
            setSelectedReaderToken(token)
            setReaderDictionaryEntry(null)
            if (token && !token.word && token.isChinese) {
              lookupDictionary(token.text).then((entry) => setReaderDictionaryEntry(entry ?? null)).catch(console.error)
            }
          }}
          onSaveWord={async (text, pinyin, meaning) => {
            await upsertWords([{
              id: crypto.randomUUID(),
              word: text,
              meaning: meaning,
              pinyin: pinyin,
              status: 'learning',
              seenCount: 0,
              correctCount: 0,
              wrongCount: 0,
              listenedSeconds: 0,
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
            }])
            await refresh()
          }}
          onEditWord={openCardEditor}
          onPinyinModeChange={(mode) => {
            recordReaderInteraction()
            saveReaderSettings({ readerPinyinMode: mode })
          }}
          onToggleEnglish={() => {
            recordReaderInteraction()
            setReaderShowEnglish((value) => !value)
          }}
          readerDictionaryEntry={readerDictionaryEntry}
        />
      )}

      {screen === 'visualNovel' && (
        <VisualNovelWorldMode
          words={scopedWords.length > 0 ? scopedWords : words}
          readerBooks={readerBooks}
          pinyinMode={userSettings.readerPinyinMode}
          readerTheme={userSettings.readerTheme}
          readerFontScale={userSettings.readerFontScale}
          readerLineHeight={userSettings.readerLineHeight}
          playbackRate={playbackRate}
          hotkeys={hotkeys}
          onEditWord={openCardEditor}
          onWordsChanged={refresh}
          onReturnToReader={() => setScreen('comicReader')}
        />
      )}

      {screen === 'comicReader' && (
        <ComicReaderMode
          words={scopedWords.length > 0 ? scopedWords : words}
          pinyinMode={userSettings.readerPinyinMode}
          hotkeys={hotkeys}
          onEditWord={openCardEditor}
          onWordsChanged={refresh}
          onReturnHome={() => setScreen('dashboard')}
          onOpenClassicReader={() => setScreen('reader')}
        />
      )}

      {screen === 'settings' && (
        <section className="screen">
          <div className="screen-heading compact">
            <div>
              <h1>Settings</h1>
              <p>Import packs, set study defaults, export progress, and tune controls.</p>
            </div>
            <div className="button-group" style={{ display: 'flex', gap: '0.5rem' }}>
              <button type="button" onClick={handleWordsCsvExport}>
                Export CSV
              </button>
              <button type="button" onClick={handleVocabSnapshotExport}>
                Export Vocab Snapshot
              </button>
            </div>
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
            {hostedComicPacks.length > 0 && (
              <section className="panel hosted-pack">
                <h2>Download comic packs</h2>
                <p>Download comic packs for the Comic Reader with bubble transcripts and vocabulary lookup.</p>
                <div className="pack-list">
                  {hostedComicPacks.map((pack) => {
                    const isDownloading = hostedPackDownloadId === pack.id
                    return (
                      <div key={pack.id} className="pack-row">
                        <span>
                          <strong>{pack.name}</strong>
                          <small>{pack.description ?? `${pack.language ?? 'zh-CN'} comic pack`}</small>
                        </span>
                        <button
                          type="button"
                          className="primary"
                          disabled={Boolean(hostedPackDownloadId)}
                          onClick={() => void handleHostedComicPackImport(pack)}
                        >
                          {isDownloading ? 'Downloading...' : 'Download'}
                        </button>
                      </div>
                    )
                  })}
                </div>
                {hostedPackDownloadId && hostedPackProgress && <small>{hostedPackProgress}</small>}
              </section>
            )}
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
              <h2>Appearance</h2>
              <p>Set a quieter display for low-light study.</p>
              <label className="toggle-row">
                <span>
                  <strong>Dark mode</strong>
                  <small>Use a darker background and softer panels.</small>
                </span>
                <input
                  type="checkbox"
                  checked={userSettings.darkMode}
                  onChange={(event) => {
                    const next = { ...userSettings, darkMode: event.target.checked }
                    setUserSettings(next)
                    void saveUserSettings(next)
                  }}
                />
              </label>
            </section>

            <section className="panel reader-settings-panel">
              <h2>Reader settings</h2>
              <p>Shape Reader into a clean book view with adaptive pinyin hints.</p>
              <div className="hotkey-grid">
                <label>
                  <span>Pinyin hints</span>
                  <select
                    value={userSettings.readerPinyinMode}
                    onChange={(event) =>
                      saveReaderSettings({ readerPinyinMode: event.target.value as ReaderPinyinMode })
                    }
                  >
                    <option value="adaptive">Adaptive</option>
                    <option value="all">All pinyin</option>
                    <option value="none">No pinyin</option>
                  </select>
                </label>
                <label>
                  <span>Reader theme</span>
                  <select
                    value={userSettings.readerTheme}
                    onChange={(event) => saveReaderSettings({ readerTheme: event.target.value as ReaderTheme })}
                  >
                    <option value="light">Light</option>
                    <option value="sepia">Sepia</option>
                    <option value="dark">Dark</option>
                  </select>
                </label>
                <label>
                  <span>Chinese font size</span>
                  <input
                    type="range"
                    min={0.82}
                    max={1.35}
                    step={0.01}
                    value={userSettings.readerFontScale}
                    onChange={(event) => saveReaderSettings({ readerFontScale: Number(event.target.value) })}
                  />
                  <small>{Math.round(userSettings.readerFontScale * 100)}%</small>
                </label>
                <label>
                  <span>Line spacing</span>
                  <input
                    type="range"
                    min={1.45}
                    max={2.35}
                    step={0.05}
                    value={userSettings.readerLineHeight}
                    onChange={(event) => saveReaderSettings({ readerLineHeight: Number(event.target.value) })}
                  />
                  <small>{userSettings.readerLineHeight.toFixed(2)}x</small>
                </label>
              </div>
              <div className="reader-pinyin-legend" aria-label="Adaptive pinyin legend">
                <span className="legend-pinyin-known">Known: no pinyin</span>
                <span className="legend-pinyin-medium">Medium: blurred hint</span>
                <span className="legend-pinyin-unknown">Unknown: visible pinyin</span>
              </div>
            </section>

            <section className="panel goals-settings-panel">
              <h2>Goals</h2>
              <p>Set the daily targets used across Dashboard, Flashcards, and Reader.</p>
              <div className="hotkey-grid">
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
                    min={0}
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
                    min={0}
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
                <label>
                  <span>Reader Pages / Day</span>
                  <input
                    type="number"
                    min={1}
                    max={500}
                    value={userSettings.readingGoalPages}
                    onChange={(event) => {
                      const next = { ...userSettings, readingGoalPages: Number(event.target.value) }
                      setUserSettings(next)
                      void saveUserSettings(next)
                    }}
                  />
                </label>
              </div>
            </section>

            <section className="panel">
              <h2>Flashcard settings</h2>
              <p>Choose the queue and audio presentation for regular FSRS study.</p>
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
                  <span>Audio front % (regular mode)</span>
                  <div className="audio-slider-row">
                    <input
                      type="range"
                      min={0}
                      max={100}
                      step={5}
                      value={userSettings.flashcardAudioFrontPercent}
                      onChange={(event) => {
                        const next = { ...userSettings, flashcardAudioFrontPercent: Number(event.target.value) }
                        setUserSettings(next)
                        void saveUserSettings(next)
                      }}
                    />
                    <span className="audio-slider-value">{userSettings.flashcardAudioFrontPercent}%</span>
                  </div>
                </label>
              </div>
            </section>
            <section className="panel">
              <h2>Hotkey settings</h2>
              <p>Choice A-D rate flashcards; Choice E stars cards; Choice F replays audio.</p>
              <dl className="stat-list">
                <div>
                  <dt>Choice A</dt>
                  <dd>{hotkeys.choiceA.toUpperCase()}</dd>
                </div>
                <div>
                  <dt>Choice B</dt>
                  <dd>{hotkeys.choiceB.toUpperCase()}</dd>
                </div>
                <div>
                  <dt>Choice C</dt>
                  <dd>{hotkeys.choiceC.toUpperCase()}</dd>
                </div>
                <div>
                  <dt>Choice D</dt>
                  <dd>{hotkeys.choiceD.toUpperCase()}</dd>
                </div>
                <div>
                  <dt>Choice E</dt>
                  <dd>{hotkeys.choiceE.toUpperCase()}</dd>
                </div>
                <div>
                  <dt>Choice F</dt>
                  <dd>{hotkeys.choiceF.toUpperCase()}</dd>
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
                <div className="hotkey-grid hotkey-edit-grid">
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
                          ? 'Listening'
                          : focusedActiveQuiz
                            ? 'Active Recall'
                            : rendering
                              ? 'Rendering local audio...'
                              : renderedLesson?.title ?? lesson.title}
                      </span>
                      {minimalVisualMode ? (
                        <div className="study-toggles minimal-toggles">
                          <div className="segmented-control listening-mode-toggle" aria-label="Listening mode">
                            <button
                              type="button"
                              className={studyMode === 'listeningMode' ? 'active' : ''}
                              onClick={() => { if (studyMode !== 'listeningMode') void startModeLesson('listeningMode') }}
                            >
                              Passive
                            </button>
                            <button
                              type="button"
                              className={studyMode === 'activeRecall' ? 'active' : ''}
                              onClick={() => { if (studyMode !== 'activeRecall') void startModeLesson('activeRecall') }}
                            >
                              Active Recall
                            </button>
                          </div>
                          <button type="button" onClick={() => setShowPinyin((value) => !value)}>
                            Pinyin {showPinyin ? 'on' : 'off'}
                          </button>
                          <button type="button" onClick={() => setShowEnglish((value) => !value)}>
                            English {showEnglish ? 'on' : 'off'}
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
                          <div className="segmented-control listening-mode-toggle" aria-label="Listening mode">
                            <button
                              type="button"
                              className={studyMode === 'listeningMode' ? 'active' : ''}
                              onClick={() => { if (studyMode !== 'listeningMode') void startModeLesson('listeningMode') }}
                            >
                              Passive
                            </button>
                            <button
                              type="button"
                              className={studyMode === 'activeRecall' ? 'active' : ''}
                              onClick={() => { if (studyMode !== 'activeRecall') void startModeLesson('activeRecall') }}
                            >
                              Active Recall
                            </button>
                          </div>
                          <button type="button" onClick={() => setShowPinyin((value) => !value)}>
                            Pinyin {showPinyin ? 'on' : 'off'}
                          </button>
                          <button type="button" onClick={() => setShowEnglish((value) => !value)}>
                            English {showEnglish ? 'on' : 'off'}
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
                              onToggleActiveRecallPriority={() => toggleActiveRecallPriority(currentReviewWord)}
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

function InfoPanel({ title, children, className = '' }: { title: string; children: ReactNode; className?: string }) {
  return (
    <section className={`panel ${className}`.trim()}>
      <h2>{title}</h2>
      {children}
    </section>
  )
}

const readerPinyinModes: Array<{ value: ReaderPinyinMode; label: string }> = [
  { value: 'adaptive', label: 'Adaptive' },
  { value: 'all', label: 'All' },
  { value: 'none', label: 'None' },
]

const dashboardRanges: Array<{ value: DashboardRange; label: string }> = [
  { value: 'today', label: 'Today' },
  { value: 'week', label: 'This week' },
  { value: 'month', label: 'This month' },
  { value: 'allTime', label: 'All time' },
]

function dashboardRangeLabel(range: DashboardRange): string {
  return dashboardRanges.find((item) => item.value === range)?.label ?? 'Today'
}

function dashboardPreviousRangeLabel(range: DashboardRange): string {
  if (range === 'today') return 'Yesterday'
  if (range === 'week') return 'Last week'
  if (range === 'month') return 'Last month'
  return ''
}

function ReaderMode({
  readerPacks,
  readerBooks,
  comprehensionByBook,
  activeBook,
  sentence,
  sentenceIndex,
  sentenceCount,
  tokens,
  selectedToken,
  resumeLocation,
  pinyinMode,
  readerTheme,
  readerFontScale,
  readerLineHeight,
  replayHotkey,
  choiceA,
  choiceB,
  showEnglish,
  listening,
  listeningRate,
  listeningRepeats,
  listeningAutoAdvance,
  onChooseBook,
  onResume,
  onPrevious,
  onNext,
  onListeningSettingsChange,
  onSelectToken,
  onEditWord,
  onPinyinModeChange,
  onToggleEnglish,
  readerDictionaryEntry,
  onSaveWord,
}: {
  readerPacks: ReaderPack[]
  readerBooks: ReaderBook[]
  comprehensionByBook: Map<string, ReaderBookComprehension>
  activeBook?: ReaderBook
  sentence?: ReaderSentence
  sentenceIndex: number
  sentenceCount: number
  tokens: ReaderWordToken[]
  selectedToken: ReaderWordToken | null
  resumeLocation?: ReaderResumeLocation
  pinyinMode: ReaderPinyinMode
  readerTheme: ReaderTheme
  readerFontScale: number
  readerLineHeight: number
  replayHotkey: string
  choiceA: string
  choiceB: string
  showEnglish: boolean
  listening: ReaderListeningController
  listeningRate: number
  listeningRepeats: number
  listeningAutoAdvance: boolean
  onChooseBook: (book: ReaderBook, action?: 'resume' | 'start') => void | Promise<void>
  onResume: () => void
  onPrevious: () => void | Promise<void>
  onNext: () => void | Promise<void>
  onListeningSettingsChange: (patch: Partial<Pick<
    UserSettings,
    'readerListeningRate' | 'readerListeningRepeats' | 'readerListeningAutoAdvance'
  >>) => void
  onSelectToken: (token: ReaderWordToken | null) => void
  onEditWord: (word: VocabWord) => void
  onPinyinModeChange: (mode: ReaderPinyinMode) => void
  onToggleEnglish: () => void
  readerDictionaryEntry: DictionaryEntry | null
  onSaveWord: (text: string, pinyin: string, meaning: string) => void | Promise<void>
}) {
  const [listeningMenuOpen, setListeningMenuOpen] = useState(false)
  const listeningRepeatTotal = listening.snapshot.mode === 'single' ? 1 : listeningRepeats
  const listeningPlaying =
    listening.snapshot.status === 'playing' || listening.snapshot.status === 'loading'

  const illustration = activeBook ? getReaderIllustration(activeBook, sentenceIndex) : undefined
  const illustrationSrc = illustration ? publicAssetPath(illustration.imageFilename) : ''
  const fallbackIllustrationSrc = illustration?.fallbackImageFilename
    ? publicAssetPath(illustration.fallbackImageFilename)
    : ''

  return (
    <section className={`screen reader-screen reader-theme-${readerTheme}`}>
      <div className="screen-heading compact">
        <div>
          <h1>Reader Mode</h1>
          <p>
            {readerPacks[0]?.name ?? 'LMS Reader Books'} · {readerBooks.length} compilation books.
          </p>
        </div>
        <div className="study-toggles">
          {activeBook && sentence && (
            <button
              type="button"
              className={listening.active ? 'active' : ''}
              onClick={() => setListeningMenuOpen(true)}
            >
              Listening Mode
            </button>
          )}
          <div className="segmented-control reader-pinyin-control" aria-label="Reader pinyin mode">
            {readerPinyinModes.map((mode) => (
              <button
                key={mode.value}
                type="button"
                className={pinyinMode === mode.value ? 'active' : ''}
                onClick={() => onPinyinModeChange(mode.value)}
              >
                {mode.label}
              </button>
            ))}
          </div>
          <button type="button" className={showEnglish ? 'active' : ''} onClick={onToggleEnglish}>
            English {showEnglish ? 'sharp' : 'blurred'}
          </button>
        </div>
      </div>

      {resumeLocation && !activeBook && (
        <section className="reader-resume-panel">
          <button type="button" className="primary reader-resume-button" onClick={onResume}>
            Resume
          </button>
          <div>
            <strong>{resumeLocation.book.title}</strong>
            <span>{resumeLocation.label}</span>
          </div>
        </section>
      )}

      <div className={`reader-layout ${activeBook ? 'zen-mode' : ''}`}>
        <aside className="reader-book-list" aria-label="Reader books">
            {readerBooks.map((book) => {
              const comprehension = comprehensionByBook.get(book.id)
              return (
              <div
                key={book.id}
                className={`reader-book-card ${book.id === activeBook?.id ? 'active' : ''}`}
              >
                <strong>{book.title}</strong>
                <span>
                  Chapters {book.chapterStart}-{book.chapterEnd} · {book.stories.length} stories
                </span>
                <ReaderComprehensionMeter
                  summary={comprehension}
                  label={`You know ${comprehension?.knownPercent ?? 0}% of the words in this book.`}
                />
                {comprehension?.chapters.length ? (
                  <details className="reader-chapter-metrics">
                    <summary>Chapter breakdown</summary>
                    <div className="reader-chapter-list">
                      {comprehension.chapters.map((chapter) => (
                        <div className="reader-chapter-row" key={chapter.id}>
                          <span>
                            <strong>Chapter {chapter.chapter}</strong>
                            <small>{chapter.title}</small>
                          </span>
                          <ReaderComprehensionMeter
                            summary={chapter}
                            label={`You know ${chapter.knownPercent}% of the words in Chapter ${chapter.chapter}.`}
                            compact
                          />
                        </div>
                      ))}
                    </div>
                  </details>
                ) : null}
                <div className="reader-book-actions">
                  <button type="button" className="primary" onClick={() => onChooseBook(book, 'resume')}>
                    Resume
                  </button>
                  <button type="button" onClick={() => onChooseBook(book, 'start')}>
                    Start from beginning
                  </button>
                </div>
              </div>
              )
            })}
            {readerBooks.length === 0 && <small>No reader books are installed yet.</small>}
        </aside>

        <section
          className="reader-page"
          style={{
            '--reader-font-scale': readerFontScale,
            '--reader-line-height': readerLineHeight,
          } as CSSProperties}
        >
          {activeBook && sentence ? (
            <>
              <div className="reader-page-meta">
                <span>{activeBook.title}</span>
                <span>
                  Sentence {sentenceIndex + 1} / {sentenceCount}
                </span>
              </div>
              <div className="reader-progress-bar" aria-label={`Story progress ${readerProgressPercent(sentenceIndex, sentenceCount)}%`}>
                <span style={{ width: `${readerProgressPercent(sentenceIndex, sentenceCount)}%` }} />
              </div>
              <AnimatePresence mode="wait">
                <motion.div
                  key={sentence.id}
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.3 }}
                  className={`reader-reading-area${listening.active ? ' reader-listening-highlight' : ''}`}
                >
                  {illustration && (
                    <figure className="reader-illustration">
                      <img
                        key={illustration.imageFilename}
                        src={illustrationSrc}
                        alt={illustration.alt}
                        loading="lazy"
                        onError={(event) => {
                          if (!fallbackIllustrationSrc) return
                          const image = event.currentTarget
                          if (image.dataset.fallbackShown === 'true') return
                          image.dataset.fallbackShown = 'true'
                          image.src = fallbackIllustrationSrc
                        }}
                      />
                    </figure>
                  )}
                  <AdaptiveChineseText
                    tokens={tokens}
                    selectedToken={selectedToken}
                    pinyinMode={pinyinMode}
                    onSelectToken={onSelectToken}
                  />
                </motion.div>
              </AnimatePresence>
              <p
                className={`reader-translation ${
                  showEnglish || listening.active ? 'revealed' : 'blur-reveal'
                }${listening.active ? ' reader-listening-highlight' : ''}`}
              >
                {sentence.english}
              </p>
              {listening.active ? (
                <div className="reader-listening-dock" aria-live="polite">
                  <div className="reader-listening-status">
                    <strong>
                      {listening.snapshot.status === 'completed'
                        ? 'Finished'
                        : `Repeat ${listening.snapshot.repeatNumber} of ${listeningRepeatTotal}`}
                    </strong>
                    <span>
                      {listeningRate.toFixed(1)}× · {listeningAutoAdvance ? 'Auto-advance on' : 'Auto-advance off'}
                    </span>
                  </div>
                  <div className="reader-listening-controls">
                    <button
                      type="button"
                      onClick={() => void onPrevious()}
                      disabled={sentenceIndex <= 0}
                    >
                      Previous
                    </button>
                    <button
                      type="button"
                      className="primary"
                      onClick={listening.togglePlayPause}
                    >
                      <kbd>{choiceA.toUpperCase()}</kbd>
                      {listeningPlaying ? 'Pause' : 'Play'}
                    </button>
                    <button
                      type="button"
                      onClick={() => void onNext()}
                      disabled={sentenceIndex >= sentenceCount - 1}
                    >
                      <kbd>{choiceB.toUpperCase()}</kbd>
                      Next
                    </button>
                    <button type="button" onClick={() => setListeningMenuOpen(true)}>
                      Settings
                    </button>
                    <button type="button" onClick={listening.stop}>
                      Stop
                    </button>
                  </div>
                </div>
              ) : (
                <div className="reader-controls">
                  <button type="button" onClick={() => void onPrevious()} disabled={sentenceIndex <= 0}>
                    Previous
                  </button>
                  <button type="button" className="primary" onClick={listening.playSentenceOnce}>
                    <kbd>{replayHotkey.toUpperCase()}</kbd>
                    Play sentence
                  </button>
                  <button type="button" onClick={() => void onNext()} disabled={sentenceIndex >= sentenceCount - 1}>
                    Next
                  </button>
                  <button type="button" className="reader-listening-start" onClick={() => setListeningMenuOpen(true)}>
                    Listening Mode
                  </button>
                </div>
              )}
              {selectedToken && (
                <WordInfoPopover
                  selectedToken={selectedToken}
                  dictionaryEntry={readerDictionaryEntry}
                  onClose={() => onSelectToken(null)}
                  onEditWord={onEditWord}
                  onSaveWord={onSaveWord}
                  formatDueDate={formatDueDate}
                />
              )}
              {listeningMenuOpen && (
                <>
                  <button
                    type="button"
                    className="reader-listening-backdrop"
                    aria-label="Close Listening Mode settings"
                    onClick={() => setListeningMenuOpen(false)}
                  />
                  <section
                    className="reader-listening-sheet"
                    role="dialog"
                    aria-modal="true"
                    aria-labelledby="reader-listening-heading"
                  >
                    <div className="sheet-heading">
                      <div>
                        <strong id="reader-listening-heading">Listening Mode</strong>
                        <small>Chinese audio with synchronized English text</small>
                      </div>
                      <button type="button" onClick={() => setListeningMenuOpen(false)}>Close</button>
                    </div>
                    <label>
                      <span>Speed</span>
                      <select
                        value={listeningRate}
                        onChange={(event) => onListeningSettingsChange({
                          readerListeningRate: Number(event.target.value),
                        })}
                      >
                        {[0.6, 0.7, 0.8, 0.9, 1, 1.1, 1.2].map((value) => (
                          <option key={value} value={value}>{value.toFixed(1)}×</option>
                        ))}
                      </select>
                    </label>
                    <label>
                      <span>Repeat each sentence</span>
                      <select
                        value={listeningRepeats}
                        onChange={(event) => onListeningSettingsChange({
                          readerListeningRepeats: Number(event.target.value),
                        })}
                      >
                        {[1, 2, 3, 4, 5].map((value) => (
                          <option key={value} value={value}>{value}×</option>
                        ))}
                      </select>
                    </label>
                    <label className="reader-listening-toggle">
                      <input
                        type="checkbox"
                        checked={listeningAutoAdvance}
                        onChange={(event) => onListeningSettingsChange({
                          readerListeningAutoAdvance: event.target.checked,
                        })}
                      />
                      <span>Automatically continue to the next sentence</span>
                    </label>
                    <button
                      type="button"
                      className="primary reader-listening-launch"
                      onClick={() => {
                        listening.startListening()
                        setListeningMenuOpen(false)
                      }}
                    >
                      Start from sentence {sentenceIndex + 1}
                    </button>
                  </section>
                </>
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

function ReaderComprehensionMeter({
  summary,
  label,
  compact = false,
}: {
  summary?: ReaderComprehensionSummary
  label: string
  compact?: boolean
}) {
  const percent = summary?.knownPercent ?? 0
  const learning = summary?.learning ?? 0
  const fresh = summary?.new ?? 0
  const total = summary?.total ?? 0
  return (
    <div className={`reader-comprehension ${compact ? 'compact' : ''}`} aria-label={label}>
      <div className="reader-comprehension-bar">
        <span style={{ width: `${percent}%` }} />
      </div>
      <p>
        You know {percent}% of the words{total > 0 ? ` (${summary?.known ?? 0}/${total})` : ''}.{' '}
        {learning} Learning, {fresh} New.
      </p>
    </div>
  )
}

function ActivityChart({ days }: { days: DashboardStats['studyHeatmap'] }) {
  const last7Days = days.slice(-7)
  if (last7Days.length === 0) {
    return <div className="progress-caption">No activity data yet</div>
  }
  return (
    <div style={{ width: '100%', height: 200 }}>
      <ResponsiveContainer width="100%" height="100%" minWidth={0}>
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

function LearningProcessChart({ points }: { points: DashboardStats['learningProcessSeries'] }) {
  const latestPoint = [...points].reverse().find((point) => point.value !== null)
  const todayPoint = points.at(-1)
  const limitPoint = points.find((point) => point.center !== null)
  const last7Days = points.slice(-7)
  const recentSignalCount = last7Days.filter((point) => point.signal).length
  const chartNumbers = points.flatMap((point) =>
    [point.value, point.center, point.upperLimit, point.lowerLimit].filter(
      (value): value is number => value !== null && Number.isFinite(value),
    ),
  )
  const chartMax = Math.max(1, ...chartNumbers)
  const yDomain: [number, number] = [0, Math.ceil(chartMax * 1.12)]
  const status = getLearningProcessStatus(todayPoint, latestPoint, limitPoint)
  const todayLabel =
    todayPoint?.value !== null && todayPoint?.value !== undefined
      ? formatProcessValue(todayPoint.value)
      : 'No recalls yet'
  const normalLabel = limitPoint?.center !== null && limitPoint?.center !== undefined
    ? formatProcessValue(limitPoint.center)
    : 'Building history'

  if (points.length === 0) {
    return <div className="progress-caption">No review data yet</div>
  }

  return (
    <div className="process-chart-wrap">
      <div className="process-chart-summary">
        <dl aria-label="Learning process summary">
          <div>
            <dt>Today</dt>
            <dd>{todayLabel}</dd>
          </div>
          <div>
            <dt>Normal</dt>
            <dd>{normalLabel}</dd>
          </div>
          <div>
            <dt>7 day signals</dt>
            <dd>{recentSignalCount}</dd>
          </div>
        </dl>
        <span className={`process-status process-status-${status.tone}`}>{status.label}</span>
      </div>

      <div className="process-chart" aria-label="Good and Easy recalls per 10 study minutes">
        <ResponsiveContainer width="100%" height="100%" minWidth={0}>
          <LineChart data={points} margin={{ top: 14, right: 16, left: 0, bottom: 4 }}>
            <CartesianGrid strokeDasharray="3 3" opacity={0.18} />
            {last7Days.length > 1 && (
              <ReferenceArea
                x1={last7Days[0].date}
                x2={last7Days[last7Days.length - 1].date}
                fill="var(--accent-2)"
                fillOpacity={0.08}
              />
            )}
            {limitPoint?.upperLimit !== null && limitPoint?.upperLimit !== undefined && (
              <ReferenceLine y={limitPoint.upperLimit} stroke="#38bdf8" strokeDasharray="5 5" />
            )}
            {limitPoint?.center !== null && limitPoint?.center !== undefined && (
              <ReferenceLine y={limitPoint.center} stroke="var(--muted-navy)" strokeDasharray="6 4" />
            )}
            {limitPoint?.lowerLimit !== null && limitPoint?.lowerLimit !== undefined && (
              <ReferenceLine y={limitPoint.lowerLimit} stroke="#38bdf8" strokeDasharray="5 5" />
            )}
            <XAxis dataKey="date" tickFormatter={shortMonthDay} minTickGap={18} />
            <YAxis width={34} domain={yDomain} tickFormatter={(value) => `${Number(value).toFixed(0)}`} />
            <Tooltip
              formatter={(value: unknown) => [`${Number(value ?? 0).toFixed(1)} / 10 min`, 'Good/Easy']}
              labelFormatter={(label) => friendlyDate(String(label))}
            />
            <Line
              type="monotone"
              dataKey="value"
              name="Good/Easy"
              stroke="var(--accent)"
              strokeWidth={3}
              dot={{ r: 4, strokeWidth: 2, fill: 'var(--card-solid)' }}
              activeDot={{ r: 7 }}
              connectNulls
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      <div className="process-day-strip" aria-label="Recent learning process days">
        {last7Days.map((day) => (
          <span
            key={day.date}
            className={`process-day process-day-${day.signal ?? (day.value === null ? 'empty' : 'normal')}`}
            title={`${friendlyDate(day.date)}: ${
              day.value === null ? 'no recall reviews' : `${formatProcessValue(day.value)}, ${day.successfulRecalls}/${day.recallAttempts} Good/Easy`
            }`}
          />
        ))}
      </div>
    </div>
  )
}

function getLearningProcessStatus(
  todayPoint: DashboardStats['learningProcessSeries'][number] | undefined,
  latestPoint: DashboardStats['learningProcessSeries'][number] | undefined,
  limitPoint: DashboardStats['learningProcessSeries'][number] | undefined,
): { tone: 'neutral' | 'normal' | 'high' | 'low'; label: string } {
  if (!latestPoint) return { tone: 'neutral', label: 'No recalls yet' }
  if (!limitPoint) return { tone: 'neutral', label: 'Building history' }
  const todayHasValue = todayPoint?.value !== null && todayPoint?.value !== undefined
  const point = todayHasValue ? todayPoint : latestPoint
  if (!todayHasValue) return { tone: 'neutral', label: 'No recalls today' }
  if (point?.signal === 'high') return { tone: 'high', label: 'Above normal range' }
  if (point?.signal === 'low') return { tone: 'low', label: 'Below normal range' }
  return { tone: 'normal', label: 'Inside normal range' }
}

function formatProcessValue(value: number): string {
  return `${value.toFixed(1)} / 10 min`
}

function ProgressHeatmap({ days }: { days: DashboardStats['studyHeatmap'] }) {
  const totalMinutes = days.reduce((sum, day) => sum + day.studySeconds, 0) / 60
  const activeDays = days.filter((day) => day.activityCount > 0).length
  const weekdayLabels = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

  return (
    <div className="progress-visual">
      <div className="heatmap-with-labels">
        <div className="heatmap-weekdays" aria-hidden="true">
          {weekdayLabels.map((label) => (
            <span key={label}>{label}</span>
          ))}
        </div>
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
      </div>
      <div className="progress-caption">
        <span>{activeDays} study days</span>
        <span>{totalMinutes.toFixed(0)} minutes tracked</span>
      </div>
    </div>
  )
}

function VocabGrowthChart({ points }: { points: DashboardStats['retentionSeries'] }) {
  if (points.length === 0) {
    return <div className="progress-caption">No vocab data yet</div>
  }
  return (
    <div style={{ width: '100%', height: 250 }}>
      <ResponsiveContainer width="100%" height="100%" minWidth={0}>
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

function FlashcardCelebration() {
  return (
    <div className="flashcard-celebration" aria-hidden="true">
      {Array.from({ length: 18 }, (_, index) => (
        <span
          key={index}
          style={{
            '--confetti-index': index,
            '--confetti-x': `${(index % 6) * 18 - 45}vw`,
            '--confetti-delay': `${(index % 5) * 45}ms`,
          } as CSSProperties}
        />
      ))}
    </div>
  )
}

function FlashcardReview({
  word,
  answerShown,
  frontMode = 'text',
  onFlip,
  onReplayAudio,
  onRate,
  onEdit,
  onToggleActiveRecallPriority,
  selectedRating,
  choiceKeys,
}: {
  word: VocabWord
  answerShown: boolean
  frontMode?: FlashcardFrontMode
  onFlip: () => void
  onReplayAudio?: () => void | Promise<void>
  onRate: (rating: FsrsRating) => void | Promise<void>
  onEdit?: () => void
  onToggleActiveRecallPriority?: () => void | Promise<void>
  selectedRating?: FsrsRating | null
  choiceKeys?: HotkeySettings
}) {
  const previews = previewFsrsRatings(word)
  const audioFront = frontMode === 'audio' && !answerShown
  const reverseFront = frontMode === 'reverse' && !answerShown
  const touchStartRef = useRef<{ x: number; y: number } | null>(null)
  const [swipeDir, setSwipeDir] = useState<string | null>(null)

  const SWIPE_THRESHOLD = 40

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    const t = e.touches[0]
    touchStartRef.current = { x: t.clientX, y: t.clientY }
    setSwipeDir(null)
  }, [])

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (!touchStartRef.current || !answerShown) return
    const t = e.touches[0]
    const dx = t.clientX - touchStartRef.current.x
    const dy = t.clientY - touchStartRef.current.y
    if (Math.abs(dx) < SWIPE_THRESHOLD && Math.abs(dy) < SWIPE_THRESHOLD) {
      setSwipeDir(null)
      return
    }
    if (Math.abs(dx) > Math.abs(dy)) {
      setSwipeDir(dx > 0 ? 'right' : 'left')
    } else {
      setSwipeDir(dy > 0 ? 'down' : 'up')
    }
  }, [answerShown])

  const handleTouchEnd = useCallback(() => {
    if (!touchStartRef.current || !answerShown || !swipeDir || selectedRating) {
      touchStartRef.current = null
      setSwipeDir(null)
      return
    }
    const swipeRating: Record<string, FsrsRating> = { up: 'again', left: 'hard', right: 'good', down: 'easy' }
    const rating = swipeRating[swipeDir]
    if (rating) onRate(rating)
    touchStartRef.current = null
    setSwipeDir(null)
  }, [answerShown, swipeDir, selectedRating, onRate])

  return (
    <section
      className={`flashcard-review${swipeDir ? ` swipe-${swipeDir}` : ''}`}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      <div className={`flashcard ${answerShown ? 'answer-side' : 'front-side'} ${audioFront ? 'audio-front' : ''} ${reverseFront ? 'reverse-front' : ''}`}>
        <span>{answerShown ? 'Front + back' : audioFront ? 'Audio front' : reverseFront ? 'Reverse front' : 'Front'}</span>
        {answerShown ? (
          reverseFront ? (
            <>
              <strong>{word.meaning}</strong>
              <p className="flashcard-answer-text">
                {word.word}{word.pinyin ? ` (${word.pinyin})` : ''}
              </p>
            </>
          ) : (
            <>
              <strong>{word.word}</strong>
              <p className="flashcard-answer-text">
                {word.pinyin ? `${word.pinyin} is ${word.meaning}` : word.meaning}
              </p>
            </>
          )
        ) : (
          <>
            {audioFront ? (
              <>
                <strong>Listen first</strong>
                <p className="flashcard-answer-text">The word audio plays twice.</p>
              </>
            ) : reverseFront ? (
              <strong>{word.meaning}</strong>
            ) : (
              <strong>{word.word}</strong>
            )}
          </>
        )}
        {onReplayAudio && (
          <button type="button" className="ghost-answer" onClick={onReplayAudio}>
            {choiceKeys?.choiceF && <kbd>{choiceKeys.choiceF.toUpperCase()}</kbd>}
            Play audio
          </button>
        )}
        {onToggleActiveRecallPriority && (
          <button
            type="button"
            className={`active-recall-priority-button ${word.activeRecallPriorityAt ? 'active' : ''}`}
            onClick={onToggleActiveRecallPriority}
            aria-pressed={Boolean(word.activeRecallPriorityAt)}
          >
            {choiceKeys?.choiceE && <kbd>{choiceKeys.choiceE.toUpperCase()}</kbd>}
            <span>{word.activeRecallPriorityAt ? '★ Extra review' : '☆ Extra review'}</span>
          </button>
        )}
        {!answerShown && (
          <button type="button" className="primary flashcard-flip-btn" onClick={onFlip}>
            Flip
          </button>
        )}
      </div>
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
              <strong>
                {rating.label} <span className="fsrs-delay">({formatFsrsPreviewDelay(previews[rating.value].dueAt)})</span>
              </strong>
              <span>{previews[rating.value].state}</span>
            </button>
          ))}
        </div>
      )}
      {answerShown && swipeDir && (
        <div className={`swipe-indicator swipe-indicator-${swipeDir}`}>
          {{ up: 'Again', left: 'Hard', right: 'Good', down: 'Easy' }[swipeDir]}
        </div>
      )}
      {answerShown && !selectedRating && (
        <div className="swipe-instructions">
          Swipe: ↑ Again ← Hard → Good ↓ Easy
        </div>
      )}
      <div className="flashcard-bottom-actions">
        {onEdit && (
          <button type="button" className="ghost-answer" onClick={onEdit}>
            Edit
          </button>
        )}
      </div>
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
    `${result.pushedReaderProgress} reader bookmarks sent`,
    `${result.pulledReaderProgress} reader bookmarks received`,
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
  { value: 'hard', label: 'Hard' },
  { value: 'good', label: 'Good' },
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
  if (rating === 'hard') return hotkeys.choiceB.toUpperCase()
  if (rating === 'good') return hotkeys.choiceC.toUpperCase()
  return hotkeys.choiceD.toUpperCase()
}

function getFlashcardFrontMode(word: VocabWord | undefined, sessionId: string | null, audioOnly = false, audioPercent = 40): FlashcardFrontMode {
  if (!word) return 'text'
  if (audioOnly) return 'audio'
  const bucket = stableStringBucket(`${sessionId ?? 'flashcards'}:${word.id}`, 1000) / 1000
  if (bucket < FLASHCARD_REVERSE_RATE) return 'reverse'
  if (bucket < FLASHCARD_REVERSE_RATE + audioPercent / 100) return 'audio'
  return 'text'
}

function formatFsrsPreviewDelay(value: string, now = Date.now()): string {
  const due = Date.parse(value)
  if (!Number.isFinite(due)) return '?'
  const ms = Math.max(0, due - now)
  if (ms < 90_000) return '< 1m'
  const minutes = Math.ceil(ms / 60_000)
  if (minutes < 60) return `${minutes}m`
  const hours = Math.ceil(minutes / 60)
  if (hours < 24) return `${hours}h`
  const days = Math.ceil(hours / 24)
  if (days < 60) return `${days}d`
  const months = Math.ceil(days / 30)
  if (months < 24) return `${months}mo`
  return `${Math.ceil(months / 12)}y`
}

function stableStringBucket(value: string, modulo: number): number {
  let hash = 2166136261
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index)
    hash = Math.imul(hash, 16777619)
  }
  return Math.abs(hash >>> 0) % modulo
}

function priorityTime(word: VocabWord): number {
  const time = Date.parse(word.activeRecallPriorityAt ?? '')
  return Number.isFinite(time) ? time : Number.MAX_SAFE_INTEGER
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

function playGentleCelebration(): void {
  const AudioContextConstructor =
    window.AudioContext ??
    (window as Window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
  if (!AudioContextConstructor) return
  const context = new AudioContextConstructor()
  const now = context.currentTime
  const gain = context.createGain()
  gain.gain.setValueAtTime(0.0001, now)
  gain.gain.exponentialRampToValueAtTime(0.08, now + 0.02)
  gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.58)
  gain.connect(context.destination)
  ;[523.25, 659.25, 783.99].forEach((frequency, index) => {
    const oscillator = context.createOscillator()
    oscillator.type = 'sine'
    oscillator.frequency.setValueAtTime(frequency, now + index * 0.09)
    oscillator.connect(gain)
    oscillator.start(now + index * 0.09)
    oscillator.stop(now + index * 0.09 + 0.28)
  })
  window.setTimeout(() => void context.close(), 900)
}

function getDashboardEncouragement(stats: DashboardStats, settings: UserSettings): string | null {
  const today = stats.ranges.today
  if (today.cardsReviewed >= Math.max(1, settings.flashcardsPerDay) * 2) {
    return `You reviewed ${today.cardsReviewed} cards today. That's 2x your daily flashcard goal.`
  }
  if (today.cardsReviewed >= Math.max(1, settings.flashcardsPerDay)) {
    return `Daily flashcard goal reached: ${today.cardsReviewed} cards reviewed.`
  }
  const previousDays = stats.studyHeatmap.slice(-8, -1).filter((day) => day.studySeconds > 0)
  if (previousDays.length >= 3) {
    const averageSeconds =
      previousDays.reduce((sum, day) => sum + day.studySeconds, 0) / previousDays.length
    const todaySeconds = (stats.studyHeatmap.at(-1)?.studySeconds ?? 0)
    if (todaySeconds >= Math.max(600, averageSeconds * 1.25)) {
      return `You're ahead of your recent daily average today.`
    }
  }
  return null
}

function getReaderComprehensionByBook(books: ReaderBook[], vocab: VocabWord[]): Map<string, ReaderBookComprehension> {
  const summaries = new Map<string, ReaderBookComprehension>()
  for (const book of books) {
    const chapters = book.stories.map((story) => ({
      ...summarizeReaderTexts(story.sentences.map((sentence) => sentence.chinese), vocab),
      id: story.id,
      chapter: story.chapter,
      title: story.title,
    }))
    const bookSummary = summarizeReaderTexts(
      book.stories.flatMap((story) => story.sentences.map((sentence) => sentence.chinese)),
      vocab,
    )
    summaries.set(book.id, {
      ...bookSummary,
      chapters,
    })
  }
  return summaries
}

function summarizeReaderTexts(texts: string[], vocab: VocabWord[]): ReaderComprehensionSummary {
  const categories = new Map<string, 'known' | 'learning' | 'new'>()
  const wordMap = new Map(vocab.map((word) => [word.word, word]))
  const maxWordLength = readerMaxChineseWordLength(wordMap)
  for (const text of texts) {
    for (const token of collectReaderComprehensionTokens(text, wordMap, maxWordLength)) {
      const key = token.word?.id ?? `unsaved:${token.text}`
      if (categories.has(key)) continue
      categories.set(key, readerComprehensionCategory(token.word))
    }
  }

  let known = 0
  let learning = 0
  let fresh = 0
  for (const category of categories.values()) {
    if (category === 'known') known += 1
    else if (category === 'learning') learning += 1
    else fresh += 1
  }
  const total = categories.size
  return {
    known,
    learning,
    new: fresh,
    total,
    knownPercent: total > 0 ? Math.round((known / total) * 100) : 0,
  }
}

function getReaderIllustration(book: ReaderBook, sentenceIndex: number) {
  const sentenceNumber = sentenceIndex + 1
  if (!book.id.startsWith('lms-book-1-chapters-')) {
    return book.illustrations?.find(
      (item) => sentenceNumber >= item.sentenceStart && sentenceNumber <= item.sentenceEnd,
    )
  }
  const sentenceCount = book.stories.reduce((sum, story) => sum + story.sentences.length, 0)
  if (sentenceNumber < 1 || sentenceNumber > sentenceCount) return undefined

  if (book.id === 'lms-book-1-chapters-16-20') {
    const sentenceImageFilename = `reader-packs/lms-books/images/${book.id}/sentence-${String(sentenceNumber).padStart(3, '0')}.webp`
    return {
      imageFilename: sentenceImageFilename,
      fallbackImageFilename: undefined,
      sentenceStart: sentenceNumber,
      sentenceEnd: sentenceNumber,
      alt: undefined,
    }
  }

  const imageNumber = Math.ceil(sentenceNumber / 2)
  const pairImageFilename = `reader-packs/lms-books/images/${book.id}/illustration-${String(imageNumber).padStart(3, '0')}.webp`
  const exactIllustration = book.illustrations?.find(
    (item) => item.sentenceStart === sentenceNumber && item.sentenceEnd === sentenceNumber,
  )
  if (exactIllustration) {
    return {
      ...exactIllustration,
      fallbackImageFilename: exactIllustration.fallbackImageFilename ?? pairImageFilename,
    }
  }
  const illustration = book.illustrations?.find(
    (item) => sentenceNumber >= item.sentenceStart && sentenceNumber <= item.sentenceEnd,
  )
  if (illustration) return illustration
  return {
    id: `${book.id}-illustration-${String(imageNumber).padStart(3, '0')}`,
    imageFilename: pairImageFilename,
    alt: `Manga reader illustration ${imageNumber} for ${book.title}.`,
    sentenceStart: (imageNumber - 1) * 2 + 1,
    sentenceEnd: Math.min(imageNumber * 2, sentenceCount),
  }
}

function getReaderResumeLocation(
  progress: ReaderProgress | undefined,
  books: ReaderBook[],
): ReaderResumeLocation | undefined {
  if (!progress) return undefined
  const book = books.find((item) => item.id === progress.bookId && item.packId === progress.packId)
  if (!book) return undefined
  const sentences = book.stories.flatMap((story) =>
    story.sentences.map((sentence) => ({ sentence, story })),
  )
  if (sentences.length === 0) return undefined
  const sentenceIndex = Math.min(Math.max(0, progress.sentenceIndex), sentences.length - 1)
  const item = sentences[sentenceIndex]
  const percent = readerProgressPercent(sentenceIndex, sentences.length)
  const label = [
    `Chapter ${item.story.chapter}`,
    item.story.title,
    `Sentence ${sentenceIndex + 1}/${sentences.length}`,
    `${percent}%`,
  ].join(' · ')
  return {
    book,
    story: item.story.title,
    chapter: item.story.chapter,
    sentenceIndex,
    sentenceCount: sentences.length,
    percent,
    label,
  }
}

function readerProgressPercent(sentenceIndex: number, sentenceCount: number): number {
  if (sentenceCount <= 0) return 0
  return Math.min(100, Math.max(1, Math.round(((sentenceIndex + 1) / sentenceCount) * 100)))
}

function publicAssetPath(path: string): string {
  const base = import.meta.env.BASE_URL || '/'
  return `${base.replace(/\/$/u, '')}/${path.replace(/^\//u, '')}`
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
  return (['again', 'hard', 'good', 'easy'] as FsrsRating[])[index]
}

function choiceKeyIndex(key: string, hotkeys: HotkeySettings): number {
  if (key === 'arrowright') return 0
  return [hotkeys.choiceA, hotkeys.choiceB, hotkeys.choiceC, hotkeys.choiceD].findIndex(
    (candidate) => candidate === key,
  )
}

function hotkeyLabel(key: keyof HotkeySettings): string {
  return {
    choiceA: 'Choice A / Again',
    choiceB: 'Choice B / Hard',
    choiceC: 'Choice C / Good',
    choiceD: 'Choice D / Easy',
    choiceE: 'Choice E / Extra review star',
    choiceF: 'Choice F / Replay audio',
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
