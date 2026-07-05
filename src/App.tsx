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
  getDashboardStats,
  getNewWordsPerDay,
  getHotkeys,
  getHostedClipPackIndex,
  getHostedComicPackIndex,
  getReaderProgress,
  importAudioFiles,
  importBackup,
  importClipPackFiles,
  importHostedClipPack,
  importHostedComicPack,
  rateWordFsrs,
  recordEvent,
  restoreArchivedWord,
  saveRenderedLesson,
  saveAudioClip,
  saveNewWordsPerDay,
  saveReaderProgress,
  saveGeneratedReaderBook,
  deleteGeneratedReaderBook,
  saveReaderVocabularyWord,
  seedLmsWordsIfEmpty,
  seedReaderBooksIfEmpty,
  saveHotkeys,
  setWordActiveRecallPriority,
  archiveWord,
  isActiveVocabWord,
  startReaderSession,
  updateReaderSession,
  getReaderSessionStats,
  getUserSettings,
  saveUserSettings,
  getAiStorySettings,
  saveAiStorySettings,
  DEFAULT_AI_STORY_SETTINGS,
  type AiStorySettings,
  updateWordText,
  lookupDictionary,
  DEFAULT_USER_SETTINGS,
  getSentenceRepData,
  saveSentenceRepData,
  restoreWordFsrs,
} from './db'
import { generateAiStory, generateStoryCover, AI_STORY_MODELS, AI_STORY_LENGTHS } from './aiStories'
import {
  STORY_WORLDS,
  buildStoryWorldContext,
  loadStoryWorldSelection,
  saveStoryWorldSelection,
  loadFamilyProfile,
  saveFamilyProfile,
  DEFAULT_FAMILY_PROFILE,
  type StoryWorldSelection,
} from './storyWorlds'
import { synthesizeStoryAudio, AZURE_VOICES } from './storyAudio'
import {
  GENERATED_STORIES_PACK_ID,
  GENERATED_STORY_TARGET_COVERAGE,
  appendGeneratedChapter,
  generatedStoryToReaderBook,
  validateGeneratedStoryCoverage,
  type GeneratedStoryPayload,
  type GeneratedStoryValidation,
} from './generatedStories'
import {
  mergeStoryChunkMetrics,
  readerComfortLabel,
  sortReaderBooksByKnownPercent,
  storyChunkSentenceMetrics,
  type StoryChunkMetrics,
  type StoryChunkReceipt,
} from './storyFeatures'
import { createPocketLesson, type PauseProfile, type SentenceLessonItem } from './lesson'
import { pinyin as getPinyin } from 'pinyin-pro'
import { renderLessonToWav, renderSessionToWav, type SessionAudioSegment } from './renderAudio'
import {
  buildSentenceSessionSteps,
  ensureSentenceClip,
  selectSequentialSentences,
  SENTENCE_SESSION_SAMPLE_RATE,
  type SentenceListeningSettings,
} from './sentenceListening'
import {
  fsrsDueTime,
  isFsrsCardDue,
  isNewFsrsCard,
  downgradeRating,
  previewFsrsRatings,
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
import { GrammarPopover } from './GrammarPopover'
import { findGrammarMatches, mapGrammarToTokens, type GrammarMatch } from './grammarPoints'
import { UniversalImporter } from './UniversalImporter'
import { VisualNovelWorldMode } from './visualNovel/VisualNovelWorldMode'
import { RenpyPrototypeMode } from './visualNovel/RenpyPrototypeMode'
import { ComicReaderMode, ComicShelf } from './comics/ComicReaderMode'
import { useReaderListeningController } from './useReaderListeningController'
import { shouldCountReaderActiveSecond } from './readerActivity'
import type { ReaderListeningController } from './useReaderListeningController'
import { useSwipeCard, SWIPE_NAV_GLOW, type SwipeDir } from './useSwipeCard'
import { StudyMenuPopup, StudyMenuSection, StudyMenuToggle, StudyMenuSelect } from './StudyMenuPopup'
import { StudyControls } from './StudyControls'
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
  ReaderStory,
  ReaderProgress,
  ReaderWordToken,
  ReaderSession,
  ReaderSessionStats,
  RenderedLesson,
  Sentence,
  StudyMode,
  UserSettings,
  VocabWord,
  DictionaryEntry,
} from './types'

type Screen = 'dashboard' | 'reader' | 'settings' | 'lesson' | 'flashcards' | 'visualNovel' | 'renpyPrototype' | 'renpyLms' | 'comicReader' | 'readingTexts'
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
type StoryChunkSession = {
  id: string
  bookId: string
  packId: string
  startIndex: number
  endIndex: number
  startedAtMs: number
  sentenceIdsRead: string[]
  metrics: StoryChunkMetrics
}
type GeneratedStoryResult = {
  book: ReaderBook
  story: GeneratedStoryPayload
  validation: GeneratedStoryValidation
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
type LmsSeedSentence = { word: string; chinese: string; english: string }

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
    today: { cardsReviewed: 0, successfulRecalls: 0, studyMinutes: 0, newWords: 0, readingGraduatedWords: 0 },
    week: { cardsReviewed: 0, successfulRecalls: 0, studyMinutes: 0, newWords: 0, readingGraduatedWords: 0 },
    month: { cardsReviewed: 0, successfulRecalls: 0, studyMinutes: 0, newWords: 0, readingGraduatedWords: 0 },
    allTime: { cardsReviewed: 0, successfulRecalls: 0, studyMinutes: 0, newWords: 0, readingGraduatedWords: 0 },
  },
  previousRanges: {
    today: { cardsReviewed: 0, successfulRecalls: 0, studyMinutes: 0, newWords: 0, readingGraduatedWords: 0 },
    week: { cardsReviewed: 0, successfulRecalls: 0, studyMinutes: 0, newWords: 0, readingGraduatedWords: 0 },
    month: { cardsReviewed: 0, successfulRecalls: 0, studyMinutes: 0, newWords: 0, readingGraduatedWords: 0 },
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

const HIDDEN_PACK_IDS = new Set(['annas-reading-deck'])
const FLASHCARD_LEARN_AHEAD_MS = 5 * 60 * 1000
const FLASHCARD_REVERSE_RATE = 0.1

const SENTENCE_REP_RING_COLORS = ['#bae6fd', '#7dd3fc', '#38bdf8', '#0ea5e9', '#0284c7', '#0369a1']
const FLASHCARD_REVIEW_RING_COLORS = ['#fce7f3', '#f9a8d4', '#f472b6', '#ec4899', '#db2777', '#9d174d']

function SentenceRepRing({ repsToday, totalReps }: { repsToday: number; totalReps: number }) {
  const sessionsToday = Math.floor(repsToday / 50)
  const partialProgress = (repsToday % 50) / 50
  const colorIndex = Math.min(sessionsToday, SENTENCE_REP_RING_COLORS.length - 1)
  const color = SENTENCE_REP_RING_COLORS[colorIndex]
  const r = 38
  const circumference = 2 * Math.PI * r
  // full ring for completed sessions; partial arc for the in-progress session
  const fillFraction = sessionsToday >= 1 ? 1 : partialProgress
  const strokeDashoffset = circumference * (1 - fillFraction)
  return (
    <div className="sentence-rep-ring-wrap">
      <p className="ring-title">Sentences</p>
      <svg className="sentence-rep-ring" viewBox="0 0 100 100" aria-label={`${repsToday} sentence reps today`}>
        <circle cx="50" cy="50" r={r} className="sentence-rep-ring-track" />
        <circle
          cx="50" cy="50" r={r}
          className="sentence-rep-ring-fill"
          style={{
            stroke: color,
            strokeDasharray: circumference,
            strokeDashoffset,
            filter: `drop-shadow(0 0 6px ${color})`,
          }}
        />
        <text x="50" y="46" className="sentence-rep-ring-count">{repsToday}</text>
        <text x="50" y="60" className="sentence-rep-ring-label">reps today</text>
      </svg>
      <p className="sentence-rep-total">{totalReps.toLocaleString()} total reps</p>
    </div>
  )
}

function FlashcardReviewRing({ reviewsToday, totalReviews }: { reviewsToday: number; totalReviews: number }) {
  const SESSION_SIZE = 40
  const sessionsToday = Math.floor(reviewsToday / SESSION_SIZE)
  const partialProgress = (reviewsToday % SESSION_SIZE) / SESSION_SIZE
  const colorIndex = Math.min(sessionsToday, FLASHCARD_REVIEW_RING_COLORS.length - 1)
  const color = FLASHCARD_REVIEW_RING_COLORS[colorIndex]
  const r = 38
  const circumference = 2 * Math.PI * r
  const fillFraction = sessionsToday >= 1 ? 1 : partialProgress
  const strokeDashoffset = circumference * (1 - fillFraction)
  return (
    <div className="sentence-rep-ring-wrap">
      <p className="ring-title">Flashcards</p>
      <svg className="sentence-rep-ring" viewBox="0 0 100 100" aria-label={`${reviewsToday} flashcards reviewed today`}>
        <circle cx="50" cy="50" r={r} className="sentence-rep-ring-track" />
        <circle
          cx="50" cy="50" r={r}
          className="sentence-rep-ring-fill"
          style={{
            stroke: color,
            strokeDasharray: circumference,
            strokeDashoffset,
            filter: `drop-shadow(0 0 6px ${color})`,
          }}
        />
        <text x="50" y="46" className="sentence-rep-ring-count">{reviewsToday}</text>
        <text x="50" y="60" className="sentence-rep-ring-label">cards today</text>
      </svg>
      <p className="sentence-rep-total">{totalReviews.toLocaleString()} total reviews</p>
    </div>
  )
}

const BOOK_LISTEN_SPEEDS = [0.6, 0.8, 1.0, 1.2, 1.4]

function App() {
  const [screen, setScreen] = useState<Screen>('dashboard')
  const [initialVisualNovelWorldId, setInitialVisualNovelWorldId] = useState<string | undefined>()
  const [initialComicPack, setInitialComicPack] = useState<{ id: string; mode: 'continue' | 'start' } | undefined>()
  const [words, setWords] = useState<VocabWord[]>([])
  const [sentences, setSentences] = useState<Sentence[]>([])
  const [audioClips, setAudioClips] = useState<AudioClip[]>([])
  const [clipPacks, setClipPacks] = useState<ClipPack[]>([])
  const [hostedClipPacks, setHostedClipPacks] = useState<HostedClipPack[]>([])
  const [hostedComicPacks, setHostedComicPacks] = useState<HostedComicPack[]>([])
  const [readerPacks, setReaderPacks] = useState<ReaderPack[]>([])
  const [readerBooks, setReaderBooks] = useState<ReaderBook[]>([])
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
  const [vocabSourceSearch, setVocabSourceSearch] = useState('')
  const [showArchivedVocabSources, setShowArchivedVocabSources] = useState(false)
  const [flashcardQueueIds, setFlashcardQueueIds] = useState<string[]>([])
  const [flashcardCurrentId, setFlashcardCurrentId] = useState<string | null>(null)
  const [flashcardDoneIds, setFlashcardDoneIds] = useState<string[]>([])
  const [flashcardClock, setFlashcardClock] = useState(() => Date.now())
  const [flashcardAnswerShown, setFlashcardAnswerShown] = useState(false)
  const [lmsSentences, setLmsSentences] = useState<LmsSeedSentence[]>([])
  const [flashcardSessionKind, setFlashcardSessionKind] = useState<'words' | 'sentences'>('words')
  const [flashcardSentenceQueue, setFlashcardSentenceQueue] = useState<LmsSeedSentence[]>([])
  const [flashcardSentenceIndex, setFlashcardSentenceIndex] = useState(0)
  const [flashcardSentenceAnswerShown, setFlashcardSentenceAnswerShown] = useState(false)
  const [flashcardAudioOnly, setFlashcardAudioOnly] = useState(false)
  const [flashcardSessionFeedback, setFlashcardSessionFeedback] = useState<FsrsRating | null>(null)
  const [flashcardExternalDismissDir, setFlashcardExternalDismissDir] = useState<string | null>(null)
  const [flashcardSessionId, setFlashcardSessionId] = useState<string | null>(null)
  const [flashcardCelebrationId, setFlashcardCelebrationId] = useState(0)
  const [flashcardSessionRatingCounts, setFlashcardSessionRatingCounts] = useState<Record<FsrsRating, number>>({ again: 0, hard: 0, good: 0, easy: 0 })
  const [flashcardSessionStartMs, setFlashcardSessionStartMs] = useState<number>(0)
  const [flashcardSessionStruggledWords, setFlashcardSessionStruggledWords] = useState<VocabWord[]>([])
  const [editingWord, setEditingWord] = useState<CardEditDraft | null>(null)
  const [activeReaderSession, setActiveReaderSession] = useState<ReaderSession | null>(null)
  const [todayReaderStats, setTodayReaderStats] = useState<ReaderSessionStats | null>(null)
  const [latestReaderProgress, setLatestReaderProgress] = useState<ReaderProgress | undefined>()
  const [storyChunkSession, setStoryChunkSession] = useState<StoryChunkSession | null>(null)
  const [storyChunkReceipt, setStoryChunkReceipt] = useState<StoryChunkReceipt | null>(null)
  const [aiStoryMessage, setAiStoryMessage] = useState<string | null>(null)
  const [aiStoryBusy, setAiStoryBusy] = useState(false)
  const [aiStorySettings, setAiStorySettings] = useState<AiStorySettings>(DEFAULT_AI_STORY_SETTINGS)
  const [aiKeyDraft, setAiKeyDraft] = useState('')
  const [azureKeyDraft, setAzureKeyDraft] = useState('')
  const [cloudUserEmail, setCloudUserEmail] = useState<string | null>(null)
  const [cloudSync, setCloudSync] = useState<CloudSyncUiState>({
    status: isSupabaseConfigured ? 'signed-out' : 'unconfigured',
    email: '',
    message: isSupabaseConfigured
      ? 'Sign in to sync progress across devices.'
      : 'Supabase sync is not configured yet.',
  })
  const [dashboardToast, setDashboardToast] = useState<string | null>(null)
  const [sentenceQueue, setSentenceQueue] = useState<SentenceLessonItem[]>([])
  const [sentenceSetComplete, setSentenceSetComplete] = useState(false)
  const [sentenceSetStartMs, setSentenceSetStartMs] = useState(0)
  const [sentencePaused, setSentencePaused] = useState(true)
  const [sentenceRendered, setSentenceRendered] = useState<{
    url: string
    durationSeconds: number
    segments: SessionAudioSegment[]
  } | null>(null)
  const [sentenceRendering, setSentenceRendering] = useState(false)
  const [sentencePosition, setSentencePosition] = useState({ sentenceIndex: 0, round: 0 })
  const [sentenceProgress, setSentenceProgress] = useState({ current: 0, duration: 0 })
  const sentenceAudioRef = useRef<HTMLAudioElement | null>(null)
  const lastReaderActivityTimeRef = useRef<number>(0)
  const runToken = useRef(0)
  const startNextLessonRef = useRef<(() => void) | null>(null)
  const startModeLessonRef = useRef<((mode: StudyMode, options?: LessonStartOptions) => void) | null>(null)
  const runFromRef = useRef<((index: number, plan?: LessonPlan) => void) | null>(null)
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const pocketAudioRef = useRef<HTMLAudioElement | null>(null)
  const lastPocketTimeRef = useRef(0)
  const playModeRef = useRef<HTMLElement | null>(null)
  const studyStageRef = useRef<HTMLDivElement | null>(null)
  const flashcardFeedbackTimeoutRef = useRef<number | null>(null)
  const flashcardUndoTimeoutRef = useRef<number | null>(null)
  const [flashcardUndoState, setFlashcardUndoState] = useState<{
    word: VocabWord
    rating: FsrsRating
    prevDoneIds: string[]
  } | null>(null)
  const syncTimerRef = useRef<number | null>(null)
  const syncedFlashcardCompletionRef = useRef<string | null>(null)
  const dashboardToastKeyRef = useRef<string | null>(null)
  const bookListenStartRef = useRef<(() => void) | null>(null)
  // sentenceStreak removed; badge feature dropped
  const [sentencePinyinVisible, setSentencePinyinVisible] = useState(false)
  const [sentenceMenuOpen, setSentenceMenuOpen] = useState(false)
  const [listeningLessonMenuOpen, setListeningLessonMenuOpen] = useState(false)
  const [sentenceQueueOffset, setSentenceQueueOffset] = useState(0)
  const [sentenceRepsToday, setSentenceRepsToday] = useState(0)
  const [sentenceTotalReps, setSentenceTotalReps] = useState(0)
  const [sentenceSubMode, setSentenceSubMode] = useState<'sets' | 'books'>('sets')
  const [bookListenBookId, setBookListenBookId] = useState<string | null>(null)
  const [bookListenIndex, setBookListenIndex] = useState(0)
  const [bookListenPinyinVisible, setBookListenPinyinVisible] = useState(true)
  const [bookListenEnglishVisible, setBookListenEnglishVisible] = useState(true)
  const [bookListenDismissDir, setBookListenDismissDir] = useState<string | null>(null)
  const [bookListenAnimKey, setBookListenAnimKey] = useState(0)
  const [bookListenFinished, setBookListenFinished] = useState(false)
  const wakeLockRef = useRef<{ release: () => Promise<void> } | null>(null)
  const dashboardToastReadyRef = useRef(false)

  const stopAudioOutputs = useCallback(() => {
    audioRef.current?.pause()
    audioRef.current = null
    pocketAudioRef.current?.pause()
    sentenceAudioRef.current?.pause()
    window.speechSynthesis?.cancel()
    setIsPlaying(false)
  }, [])

  const loadLmsSentences = useCallback(async () => {
    const response = await fetch('seed/lms-sentences.json')
    if (!response.ok) throw new Error('Could not load sentence listening data.')
    const data = (await response.json()) as LmsSeedSentence[]
    setLmsSentences(data)
    return data
  }, [])

  useEffect(() => {
    loadLmsSentences().catch(() => {})
  }, [loadLmsSentences])

  useEffect(() => {
    getSentenceRepData().then(({ queueOffset, repsToday, totalReps }) => {
      setSentenceQueueOffset(queueOffset)
      setSentenceRepsToday(repsToday)
      setSentenceTotalReps(totalReps)
    }).catch(() => {})
  }, [])

  const refresh = useCallback(async () => {
    const [
      nextWords,
      nextSentences,
      nextAudio,
      nextPacks,
      nextReaderPacks,
      nextReaderBooks,
      nextNewWordsPerDay,
      nextUserSettings,
      nextHostedClipPacks,
      nextHostedComicPacks,
      nextAiStorySettings,
    ] = await Promise.all([
      getAllWords(),
      getAllSentences(),
      getAllAudioClips(),
      getAllClipPacks(),
      getAllReaderPacks(),
      getAllReaderBooks(),
      getNewWordsPerDay(),
      getUserSettings(),
      getHostedClipPackIndex(),
      getHostedComicPackIndex(),
      getAiStorySettings(),
    ])
    setWords(nextWords)
    setSentences(nextSentences)
    const visiblePacks = nextPacks.filter((pack) => !HIDDEN_PACK_IDS.has(pack.id))
    const nextStats = await getDashboardStats()
    const nextLatestReaderProgress = await getLatestReaderProgress(nextReaderBooks)
    setAudioClips(nextAudio)
    setClipPacks(visiblePacks)
    setReaderPacks(nextReaderPacks)
    setReaderBooks(nextReaderBooks)
    setLatestReaderProgress(nextLatestReaderProgress)
    setNewWordsPerDay(nextNewWordsPerDay)
    setUserSettings(nextUserSettings)
    setHostedClipPacks(nextHostedClipPacks)
    setHostedComicPacks(nextHostedComicPacks)
    setAiStorySettings(nextAiStorySettings)
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
  const activeWords = useMemo(() => words.filter(isActiveVocabWord), [words])
  const extraReviewWords = useMemo(
    () =>
      activeWords
        .filter((word) => word.activeRecallPriorityAt)
        .sort((a, b) => priorityTime(a) - priorityTime(b)),
    [activeWords],
  )
  const coverage = useMemo(() => getAudioCoverage(activeWords, sentences, audioClips), [
    activeWords,
    audioClips,
    sentences,
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
  const isListeningMode = studyMode === 'listeningMode'
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
    () => tokenizeReaderText(currentReaderSentence?.chinese ?? '', activeWords),
    [activeWords, currentReaderSentence],
  )
  const readerComprehensionByBook = useMemo(
    () =>
      screen === 'readingTexts' || (screen === 'reader' && !activeReaderBook)
        ? getReaderComprehensionByBook(readerBooks, activeWords)
        : new Map<string, ReaderBookComprehension>(),
    [activeReaderBook, activeWords, readerBooks, screen],
  )
  const readerResumeLocation = useMemo(
    () => getReaderResumeLocation(latestReaderProgress, readerBooks),
    [latestReaderProgress, readerBooks],
  )
  const bookListenBook = useMemo(
    () => readerBooks.find(b => b.id === bookListenBookId) ?? null,
    [bookListenBookId, readerBooks],
  )
  const bookListenSentences = useMemo(
    () => bookListenBook?.stories.flatMap(s => s.sentences) ?? [],
    [bookListenBook],
  )
  const bookListenSentence = bookListenSentences[bookListenIndex] ?? null
  const bookListenStory = useMemo(
    () => bookListenBook?.stories.find(s => s.id === bookListenSentence?.storyId) ?? null,
    [bookListenBook, bookListenSentence],
  )
  const bookListenIllustration = bookListenBook
    ? getReaderIllustration(bookListenBook, bookListenIndex)
    : undefined
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
    const source = activeWords
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
  }, [activeWords, userSettings.flashcardsPerDay])

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

  const sentenceListeningSettings = useMemo<SentenceListeningSettings>(() => ({
    sentenceRepeats: userSettings.sentenceRepeats,
    sentenceIncludeEnglish: userSettings.sentenceIncludeEnglish,
    sentencePauseFactor: userSettings.sentencePauseFactor,
    sentenceSessionSize: userSettings.sentenceSessionSize,
    sentenceRounds: userSettings.sentenceRounds,
    sentenceShuffle: userSettings.sentenceShuffle,
  }), [userSettings])

  const wordLessonMap = useMemo(() => {
    const map = new Map<string, number>()
    for (const word of words) {
      if (word.lessonNumber !== undefined) map.set(word.word, word.lessonNumber)
    }
    return map
  }, [words])

  const sentencePoolProgress = useMemo(() => {
    const current = sentenceQueue[sentencePosition.sentenceIndex]
    if (!current || lmsSentences.length === 0) return null
    const position = ((sentenceQueueOffset + sentencePosition.sentenceIndex) % lmsSentences.length) + 1
    return {
      position,
      total: lmsSentences.length,
      lesson: wordLessonMap.get(current.word),
    }
  }, [lmsSentences.length, sentencePosition.sentenceIndex, sentenceQueue, sentenceQueueOffset, wordLessonMap])

  const startSentenceLesson = useCallback(async (offsetOverride?: number) => {
    stopAudioOutputs()
    runToken.current += 1

    let sentencePool = lmsSentences
    if (sentencePool.length === 0) {
      try {
        sentencePool = await loadLmsSentences()
      } catch {
        setLastSummary('Could not load sentence listening data.')
        return
      }
    }

    setStudyMode('sentenceMode')
    setMinimalVisualMode(true)
    setAutoNextLesson(false)
    setScreen('lesson')
    setSentenceSetComplete(false)
    setSentenceRendering(true)
    setSentencePinyinVisible(false)

    try {
      const candidates = selectSequentialSentences(
        sentencePool,
        sentenceListeningSettings.sentenceSessionSize,
        offsetOverride ?? sentenceQueueOffset,
      )
      const clipDeps = { getAudioClip, saveAudioClip }
      const set: SentenceLessonItem[] = []
      for (const sent of candidates) {
        const zhClip = await ensureSentenceClip(sent.word, 'zh', sent.chinese, clipDeps)
        if (!zhClip) continue
        if (sentenceListeningSettings.sentenceIncludeEnglish) {
          await ensureSentenceClip(sent.word, 'en', sent.english, clipDeps)
        }
        set.push(sent)
      }
      if (set.length === 0) {
        setLastSummary('No sentence audio available. Check your connection for the first download.')
        return
      }

      const steps = buildSentenceSessionSteps(set, sentenceListeningSettings)
      const rendered = await renderSessionToWav(steps, getAudioClip, SENTENCE_SESSION_SAMPLE_RATE)
      const url = URL.createObjectURL(rendered.blob)
      setSentenceRendered((previous) => {
        if (previous) URL.revokeObjectURL(previous.url)
        return { url, durationSeconds: rendered.durationSeconds, segments: rendered.segments }
      })
      setSentenceQueue(set)
      setSentencePosition({ sentenceIndex: rendered.segments[0]?.sentenceIndex ?? 0, round: 0 })
      setSentenceProgress({ current: 0, duration: rendered.durationSeconds })
      setSentenceSetStartMs(Date.now())
      setLastSummary(
        `Sentence set: ${set.length} sentences × ${sentenceListeningSettings.sentenceRounds} rounds`,
      )
    } catch (error) {
      setLastSummary(error instanceof Error ? error.message : 'Could not prepare sentence audio.')
    } finally {
      setSentenceRendering(false)
    }
  }, [lmsSentences, loadLmsSentences, sentenceListeningSettings, sentenceQueueOffset, stopAudioOutputs])

  const completeSentenceSet = useCallback(async () => {
    const repsInSet = sentenceQueue.length * sentenceListeningSettings.sentenceRounds
    const nextOffset = sentenceQueueOffset + sentenceQueue.length
    const { repsToday, totalReps } = await saveSentenceRepData({
      reps: repsInSet,
      queueOffset: nextOffset,
    })
    setSentenceQueueOffset(nextOffset)
    setSentenceRepsToday(repsToday)
    setSentenceTotalReps(totalReps)
    setSentenceSetComplete(false)
    await startSentenceLesson(nextOffset)
  }, [sentenceListeningSettings.sentenceRounds, sentenceQueue, sentenceQueueOffset, startSentenceLesson])

  const toggleSentencePlayback = useCallback(() => {
    const audio = sentenceAudioRef.current
    if (!audio || !sentenceRendered) return
    if (audio.paused) {
      void audio.play().catch(() => {})
    } else {
      audio.pause()
    }
  }, [sentenceRendered])

  const seekSentence = useCallback((direction: 1 | -1) => {
    const audio = sentenceAudioRef.current
    const segments = sentenceRendered?.segments
    if (!audio || !segments || segments.length === 0) return
    const time = audio.currentTime
    let index = segments.findIndex((s) => time >= s.startSeconds && time < s.endSeconds)
    if (index < 0) index = segments.length - 1
    const current = segments[index]
    const sameBlock = (s: SessionAudioSegment) =>
      s.sentenceIndex === current.sentenceIndex && s.round === current.round

    if (direction === 1) {
      const next = segments.find((s, i) => i > index && !sameBlock(s))
      if (next) audio.currentTime = next.startSeconds
      return
    }

    let blockStart = index
    while (blockStart > 0 && sameBlock(segments[blockStart - 1])) blockStart -= 1
    const blockStartSeconds = segments[blockStart].startSeconds
    // First back-press replays the current sentence; a quick second press goes back one.
    if (time - blockStartSeconds > 1.5 || blockStart === 0) {
      audio.currentTime = blockStartSeconds
      return
    }
    const previous = segments[blockStart - 1]
    let previousStart = blockStart - 1
    while (
      previousStart > 0 &&
      segments[previousStart - 1].sentenceIndex === previous.sentenceIndex &&
      segments[previousStart - 1].round === previous.round
    ) {
      previousStart -= 1
    }
    audio.currentTime = segments[previousStart].startSeconds
  }, [sentenceRendered])

  const sentenceSetSwipe = useSwipeCard({
    enabled: true,
    onSwipe: (dir) => {
      if (dir === 'left') seekSentence(1)
      else if (dir === 'right') seekSentence(-1)
      else if (dir === 'down') toggleSentencePlayback()
      else if (dir === 'up') setSentencePinyinVisible((value) => !value)
    },
  })

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
    const tokens = tokenizeReaderText(sentence.chinese, activeWords)
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
  }, [activeWords])

  const finishStoryChunk = useCallback((receipt: StoryChunkReceipt) => {
    setStoryChunkSession(null)
    setStoryChunkReceipt(receipt)
    setFlashcardCelebrationId((id) => id + 1)
    playGentleCelebration()
    setLastSummary(`Story Chunk complete: ${receipt.sentencesRead} sentences read.`)
  }, [])

  const storyChunkReceiptFromSession = useCallback((
    session: StoryChunkSession,
    metrics: StoryChunkMetrics,
  ): StoryChunkReceipt => {
    const targetSentences = session.endIndex - session.startIndex + 1
    return {
      title: 'Story Chunk complete',
      sentencesRead: session.sentenceIdsRead.length,
      targetSentences,
      activeSeconds: Math.max(1, Math.round((Date.now() - session.startedAtMs) / 1000)),
      progressPercent: readerProgressPercent(session.endIndex, readerSentences.length),
      knownWords: metrics.knownWords.length,
      learningWords: metrics.learningWords.length,
      unsavedWordsTapped: metrics.tappedUnsavedWords.length,
      wordsSaved: metrics.savedWords.length,
    }
  }, [readerSentences.length])

  const recordStoryChunkSentence = useCallback((sentence: ReaderSentence, sentenceIndex: number) => {
    const sentenceMetrics = storyChunkSentenceMetrics(sentence.chinese, activeWords)
    setStoryChunkSession((current) => {
      if (!current || current.sentenceIdsRead.includes(sentence.id)) return current
      if (sentenceIndex < current.startIndex || sentenceIndex > current.endIndex) return current
      const nextMetrics = mergeStoryChunkMetrics(current.metrics, sentenceMetrics)
      const nextSession: StoryChunkSession = {
        ...current,
        sentenceIdsRead: [...current.sentenceIdsRead, sentence.id],
        metrics: nextMetrics,
      }
      if (sentenceIndex >= current.endIndex || nextSession.sentenceIdsRead.length >= current.endIndex - current.startIndex + 1) {
        const receipt = storyChunkReceiptFromSession(nextSession, nextMetrics)
        window.setTimeout(() => finishStoryChunk(receipt), 0)
        return null
      }
      return nextSession
    })
  }, [activeWords, finishStoryChunk, storyChunkReceiptFromSession])

  const startStoryChunk = useCallback(() => {
    if (!activeReaderBook || !currentReaderSentence || readerSentences.length === 0) return
    const endIndex = Math.min(readerSentenceIndex + 9, readerSentences.length - 1)
    const metrics = storyChunkSentenceMetrics(currentReaderSentence.chinese, activeWords)
    const session: StoryChunkSession = {
      id: `story-chunk:${activeReaderBook.id}:${Date.now()}`,
      bookId: activeReaderBook.id,
      packId: activeReaderBook.packId,
      startIndex: readerSentenceIndex,
      endIndex,
      startedAtMs: Date.now(),
      sentenceIdsRead: [currentReaderSentence.id],
      metrics,
    }
    setStoryChunkReceipt(null)
    if (endIndex <= readerSentenceIndex) {
      finishStoryChunk(storyChunkReceiptFromSession(session, metrics))
      return
    }
    setStoryChunkSession(session)
    setLastSummary(`Story Chunk started: ${endIndex - readerSentenceIndex + 1} sentences.`)
  }, [
    activeReaderBook,
    currentReaderSentence,
    finishStoryChunk,
    readerSentenceIndex,
    readerSentences.length,
    activeWords,
    storyChunkReceiptFromSession,
  ])

  const updateStoryChunkMetrics = useCallback((patch: Partial<StoryChunkMetrics>) => {
    setStoryChunkSession((current) => (
      current ? { ...current, metrics: mergeStoryChunkMetrics(current.metrics, patch) } : current
    ))
  }, [])

  const renderAndLoadLesson = useCallback(async (
    nextLesson: LessonPlan,
    playAfterRender: boolean,
    readyMessage: string,
  ) => {
    setLesson(nextLesson)
    setCurrentStepIndex(0)
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
      if (shouldCountReaderActiveSecond(lastReaderActivityTimeRef.current, now)) {
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
    setStoryChunkSession(null)
    setStoryChunkReceipt(null)
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

  const openBookListen = useCallback(async (book: ReaderBook) => {
    const progress = await getReaderProgress(book.packId, book.id)
    const sentenceCount = book.stories.flatMap(s => s.sentences).length
    const savedIndex = progress?.sentenceIndex ?? 0
    const bounded = Math.min(Math.max(0, savedIndex), Math.max(0, sentenceCount - 1))
    setBookListenFinished(false)
    setBookListenBookId(book.id)
    setBookListenIndex(bounded)
  }, [])

  const bookListenGoBack = useCallback(async () => {
    if (!bookListenBook) return
    const nextIndex = Math.max(0, bookListenIndex - 1)
    setBookListenIndex(nextIndex)
    await saveReaderProgress({
      packId: bookListenBook.packId,
      bookId: bookListenBook.id,
      sentenceIndex: nextIndex,
    })
  }, [bookListenBook, bookListenIndex])

  const bookListenAdvance = useCallback(async () => {
    if (!bookListenBook) return
    const total = bookListenSentences.length
    if (bookListenIndex >= total - 1) {
      setBookListenFinished(true)
      setFlashcardCelebrationId(id => id + 1)
      playGentleCelebration()
      return
    }
    const nextIndex = bookListenIndex + 1
    setBookListenIndex(nextIndex)
    await saveReaderProgress({
      packId: bookListenBook.packId,
      bookId: bookListenBook.id,
      sentenceIndex: nextIndex,
    })
    const { repsToday, totalReps } = await saveSentenceRepData({
      reps: 1,
      queueOffset: sentenceQueueOffset,
    })
    setSentenceRepsToday(repsToday)
    setSentenceTotalReps(totalReps)
  }, [bookListenBook, bookListenIndex, bookListenSentences.length, sentenceQueueOffset])

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
    if (nextSentence && delta > 0) {
      recordStoryChunkSentence(nextSentence, nextIndex)
    }
    if (delta > 0) {
      const { repsToday, totalReps } = await saveSentenceRepData({ reps: 1, queueOffset: sentenceQueueOffset })
      setSentenceRepsToday(repsToday)
      setSentenceTotalReps(totalReps)
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
    recordStoryChunkSentence,
    sentenceQueueOffset,
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

  const bookListening = useReaderListeningController({
    sentence: bookListenSentence ?? undefined,
    sentenceIndex: bookListenIndex,
    sentenceCount: bookListenSentences.length,
    rate: userSettings.readerListeningRate,
    repeatCount: userSettings.readerListeningRepeats,
    autoAdvance: true,
    mediaSessionEnabled: screen === 'lesson' && sentenceSubMode === 'books',
    onNext: bookListenAdvance,
    onPrevious: bookListenGoBack,
  })

  // Keep a stable ref to startListening so auto-start effect doesn't need it as a dep
  bookListenStartRef.current = bookListening.startListening

  const bookListenSwipe = useSwipeCard({
    enabled: !bookListenDismissDir,
    glowColors: SWIPE_NAV_GLOW,
    onSwipe: (dir) => {
      if (dir === 'left' || dir === 'right') {
        navigator.vibrate?.(30)
        setBookListenDismissDir(dir)
        window.setTimeout(() => {
          setBookListenDismissDir(null)
          setBookListenAnimKey(k => k + 1)
          if (dir === 'left') void bookListening.next()
          else void bookListening.previous()
        }, 320)
      } else if (dir === 'down') {
        if (bookListening.snapshot.status === 'idle') bookListening.startListening()
        else bookListening.togglePlayPause()
      } else {
        // cycle: both on → English off → both off → both on
        if (bookListenPinyinVisible && bookListenEnglishVisible) {
          setBookListenEnglishVisible(false)
        } else if (bookListenPinyinVisible && !bookListenEnglishVisible) {
          setBookListenPinyinVisible(false)
        } else {
          setBookListenPinyinVisible(true)
          setBookListenEnglishVisible(true)
        }
      }
    },
  })

  // Auto-start when a book is opened or books tab is activated
  useEffect(() => {
    if (sentenceSubMode === 'books' && bookListenBookId) {
      bookListenStartRef.current?.()
    }
  }, [bookListenBookId, sentenceSubMode])

  // Wake lock: keep screen on while book audio is playing
  useEffect(() => {
    const playing = bookListening.snapshot.status === 'playing'
    const nav = navigator as Navigator & { wakeLock?: { request: (type: string) => Promise<{ release: () => Promise<void> }> } }
    if (!nav.wakeLock) return
    if (playing) {
      nav.wakeLock.request('screen').then(lock => { wakeLockRef.current = lock }).catch(() => {})
    } else {
      wakeLockRef.current?.release().catch(() => {})
      wakeLockRef.current = null
    }
  }, [bookListening.snapshot.status])

  useEffect(() => {
    if (screen !== 'reader' && readerListeningActive) stopReaderListening()
  }, [readerListeningActive, screen, stopReaderListening])

  async function handleNewWordsPerDayChange(value: number) {
    await saveNewWordsPerDay(value)
    setNewWordsPerDay(Math.min(50, Math.max(0, Math.round(value))))
    await refresh()
  }

  useEffect(() => {
    if (studyMode !== 'sentenceMode' || !sentenceSetComplete) return
    window.requestAnimationFrame(() => {
      studyStageRef.current?.scrollTo({ top: 0, behavior: 'auto' })
      window.scrollTo({ top: 0, behavior: 'auto' })
    })
  }, [sentenceSetComplete, studyMode])

  // Autoplay a freshly rendered sentence session and keep its speed in sync.
  useEffect(() => {
    if (studyMode !== 'sentenceMode' || !sentenceRendered) return
    const audio = sentenceAudioRef.current
    if (!audio) return
    audio.playbackRate = playbackRate
    void audio.play().catch(() => {})
    // Only re-run when a new session WAV lands, not on speed changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sentenceRendered, studyMode])

  useEffect(() => {
    const audio = sentenceAudioRef.current
    if (audio) audio.playbackRate = playbackRate
  }, [playbackRate])

  // Media Session: expose sentence-mode controls to lock screen / headphones
  useEffect(() => {
    if (!('mediaSession' in navigator)) return
    if (studyMode !== 'sentenceMode' || sentenceSubMode !== 'sets') {
      if (studyMode !== 'sentenceMode') navigator.mediaSession.metadata = null
      return
    }
    const current = sentenceQueue[sentencePosition.sentenceIndex]
    navigator.mediaSession.metadata = new MediaMetadata({
      title: current?.chinese ?? 'Sentence Practice',
      artist: current?.english ?? '',
      album: 'Chunky Chinese',
    })
    navigator.mediaSession.playbackState = sentencePaused ? 'paused' : 'playing'
    const actions: [MediaSessionAction, MediaSessionActionHandler][] = [
      ['play', () => { void sentenceAudioRef.current?.play().catch(() => {}) }],
      ['pause', () => sentenceAudioRef.current?.pause()],
      ['nexttrack', () => seekSentence(1)],
      ['previoustrack', () => seekSentence(-1)],
    ]
    for (const [action, handler] of actions) {
      try { navigator.mediaSession.setActionHandler(action, handler) } catch { /* not supported */ }
    }
    return () => {
      for (const [action] of actions) {
        try { navigator.mediaSession.setActionHandler(action, null) } catch { /* not supported */ }
      }
    }
  }, [seekSentence, sentencePaused, sentencePosition.sentenceIndex, sentenceQueue, sentenceSubMode, studyMode])

  const replayCurrentSegment = useCallback(() => {
    const audio = pocketAudioRef.current
    if (!audio || !currentSegment) return
    audio.currentTime = Math.max(0, currentSegment.startSeconds)
    void audio.play()
  }, [currentSegment])

  const handleFsrsRating = useCallback(async (wordId: string, rating: FsrsRating) => {
    await rateWordFsrs(wordId, rating, {
      source: 'lesson-review',
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
  }, [fsrsRatings, lessonWords, queueCloudSync, ratingWordIds, ratingWords, refresh, reviewCardIndex, showReviewPrompt])

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

  const RATING_DISMISS_DIR: Record<FsrsRating, string> = { again: 'left', hard: 'up', good: 'right', easy: 'down' }

  const handleStandaloneFlashcardRate = useCallback((rating: FsrsRating) => {
    if (!currentFlashcardWord || flashcardSessionFeedback) return
    const wordId = currentFlashcardWord.id
    const ratedWord = currentFlashcardWord
    const preRatingWord = currentFlashcardWord
    const preRatingDoneIds = flashcardDoneIds
    setFlashcardSessionFeedback(rating)
    setFlashcardExternalDismissDir(RATING_DISMISS_DIR[rating])
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
          preRatingDoneIds,
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
        if (flashcardUndoTimeoutRef.current !== null) window.clearTimeout(flashcardUndoTimeoutRef.current)
        setFlashcardUndoState({ word: preRatingWord, rating, prevDoneIds: preRatingDoneIds })
        flashcardUndoTimeoutRef.current = window.setTimeout(() => {
          setFlashcardUndoState(null)
          flashcardUndoTimeoutRef.current = null
        }, 5000)
      })()
    }, 500)
  }, [currentFlashcardWord, flashcardDoneIds, flashcardQueue, flashcardSessionFeedback, flashcardSessionId, queueCloudSync, refresh])

  // Reset external dismiss dir whenever the active flashcard word changes
  useEffect(() => {
    setFlashcardExternalDismissDir(null)
  }, [currentFlashcardWord?.id])

  const handleFlashcardUndo = useCallback(async () => {
    if (!flashcardUndoState) return
    if (flashcardUndoTimeoutRef.current !== null) {
      window.clearTimeout(flashcardUndoTimeoutRef.current)
      flashcardUndoTimeoutRef.current = null
    }
    await restoreWordFsrs(flashcardUndoState.word)
    setWords((currentWords) =>
      currentWords.map((w) => w.id === flashcardUndoState.word.id ? flashcardUndoState.word : w),
    )
    setFlashcardSessionRatingCounts((prev) => ({
      ...prev,
      [flashcardUndoState.rating]: Math.max(0, prev[flashcardUndoState.rating] - 1),
    }))
    setFlashcardDoneIds(flashcardUndoState.prevDoneIds)
    setFlashcardCurrentId(flashcardUndoState.word.id)
    setFlashcardAnswerShown(true)
    setFlashcardSessionFeedback(null)
    setFlashcardUndoState(null)
    setLastSummary(`Undid rating for ${flashcardUndoState.word.word}.`)
  }, [flashcardUndoState])

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
          setScreen('readingTexts')
        } else if (mappedIndex === 2) {
          event.preventDefault()
          startModeLessonRef.current?.('listeningMode')
        } else if (mappedIndex === 3) {
          event.preventDefault()
          void startSentenceLesson()
        } else if (pressed === hotkeys.choiceE) {
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
            if (mappedIndex === 0) {
              event.preventDefault()
              const matchedWord = words.find((w) => w.word === currentSentence.word)
              if (matchedWord) void rateWordFsrs(matchedWord.id, downgradeRating('again'), { source: 'flashcards', sessionId: flashcardSessionId ?? undefined })
              setFlashcardSessionRatingCounts((prev) => ({ ...prev, again: prev.again + 1 }))
              setFlashcardSentenceAnswerShown(false)
              setFlashcardSentenceIndex((i) => i + 1)
            } else if (mappedIndex === 1) {
              event.preventDefault()
              const matchedWord = words.find((w) => w.word === currentSentence.word)
              if (matchedWord) void rateWordFsrs(matchedWord.id, downgradeRating('good'), { source: 'flashcards', sessionId: flashcardSessionId ?? undefined })
              setFlashcardSessionRatingCounts((prev) => ({ ...prev, good: prev.good + 1 }))
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
        if (studyMode === 'sentenceMode') {
          toggleSentencePlayback()
        } else {
          togglePlayback()
        }
        return
      }
      if (studyMode === 'sentenceMode' && !sentenceSetComplete) {
        if (mappedIndex === 0) {
          event.preventDefault()
          seekSentence(-1)
        } else if (mappedIndex === 1) {
          event.preventDefault()
          seekSentence(1)
        } else if (mappedIndex === 2) {
          event.preventDefault()
          setSentencePinyinVisible((value) => !value)
        }
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
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [
    currentSegment,
    allLessonWordsRated,
    finishFlashcardSession,
    flashcardFeedback,
    flashcardSessionComplete,
    fsrsRatings,
    handleFlashcardRate,
    hotkeys,
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
    seekSentence,
    toggleSentencePlayback,
    moveReaderSentence,
    playFlashcardWordTwice,
    readerListening,
    playSentenceTwice,
    ratingWords,
    reviewAnswerShown,
    screen,
    sentenceSetComplete,
    showReviewPrompt,
    startSentenceLesson,
    startSavedFlashcards,
    studyMode,
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
      const nextLesson = createPocketLesson(activeWords, sentences, audioClips, manualIds, {
        pauseProfile,
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
    stopAudioOutputs()
    runToken.current += 1
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

    for (const word of activeWords) {
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

  const collectKnownWords = useCallback(() => {
    const knownWords = activeWords
      .filter((word) => adaptiveReaderPinyinState(word) === 'known')
      .map((word) => ({
        word: word.word,
        pinyin: word.pinyin,
        meaning: word.meaning,
      }))
      .slice(0, 1500)
    if (knownWords.length < 20) {
      throw new Error('You need at least 20 mature known words before generating a known-word story.')
    }
    return knownWords
  }, [activeWords])

  const requireOpenRouterKey = useCallback(() => {
    const apiKey = aiStorySettings.openRouterApiKey
    if (!apiKey) {
      throw new Error('Add your OpenRouter API key under Settings > AI Story Generation first.')
    }
    return apiKey
  }, [aiStorySettings.openRouterApiKey])

  // Generate → validate coverage → one stricter retry when the draft is too hard.
  const generateValidatedStory = useCallback(async (
    generateOptions: Parameters<typeof generateAiStory>[0],
  ): Promise<{ story: GeneratedStoryPayload; validation: GeneratedStoryValidation }> => {
    let story = await generateAiStory(generateOptions)
    let validation = validateGeneratedStoryCoverage(story, activeWords)
    if (
      validation.knownCoveragePercent < GENERATED_STORY_TARGET_COVERAGE ||
      validation.unavoidableNewWords.length > 5
    ) {
      setAiStoryMessage('First draft was too spicy. Retrying with simpler known words...')
      story = await generateAiStory({ ...generateOptions, strictRetry: true })
      validation = validateGeneratedStoryCoverage(story, activeWords)
    }
    return { story, validation }
  }, [activeWords])

  const synthesizeChapterAudio = useCallback(async (story: ReaderStory) => {
    const result = await synthesizeStoryAudio(
      story,
      aiStorySettings,
      (done, total) => setAiStoryMessage(`Generating audio ${done}/${total}...`),
    )
    if (result.failed > 0) {
      return ` Audio: ${result.succeeded}/${result.succeeded + result.failed} sentences narrated${result.firstError ? ` (${result.firstError})` : ''}.`
    }
    return result.succeeded > 0 ? ` Narration ready (${result.succeeded} sentences).` : ''
  }, [aiStorySettings])

  const handleGenerateStory = useCallback(async (
    prompt: string,
    options: { lengthChars: number; model: string; cover: boolean; audio: boolean; world?: StoryWorldSelection },
  ): Promise<GeneratedStoryResult> => {
    const apiKey = requireOpenRouterKey()
    const knownWords = collectKnownWords()

    const generateOptions = {
      prompt,
      knownWords,
      apiKey,
      model: options.model,
      lengthChars: options.lengthChars,
      worldContext: options.world ? buildStoryWorldContext(options.world) : undefined,
    }
    // Remember the last-used choices as the new defaults.
    const nextSettings = {
      ...aiStorySettings,
      model: options.model,
      defaultLengthChars: options.lengthChars,
      generateCover: options.cover,
      generateAudio: options.audio,
    }
    setAiStorySettings(nextSettings)
    void saveAiStorySettings(nextSettings)

    setAiStoryBusy(true)
    setAiStoryMessage('Generating a known-word story...')
    try {
      const { story, validation } = await generateValidatedStory(generateOptions)
      const book = generatedStoryToReaderBook(story, validation)
      if (options.cover) {
        setAiStoryMessage('Generating cover image...')
        try {
          book.coverImage = await generateStoryCover({ apiKey, title: book.title, prompt })
        } catch (error) {
          console.warn('Cover generation failed; saving story without a cover.', error)
        }
      }
      await saveGeneratedReaderBook(book)
      await refresh()
      let audioNote = ''
      if (options.audio && aiStorySettings.azureSpeechKey && aiStorySettings.azureSpeechRegion) {
        audioNote = await synthesizeChapterAudio(book.stories[0])
      }
      setAiStoryMessage(
        (validation.warning
          ? `${book.title} saved. ${validation.warning}`
          : `${book.title} saved with ${validation.knownCoveragePercent}% known-word coverage.`) + audioNote,
      )
      return { book, story, validation }
    } finally {
      setAiStoryBusy(false)
    }
  }, [aiStorySettings, collectKnownWords, generateValidatedStory, refresh, requireOpenRouterKey, synthesizeChapterAudio])

  const handleContinueStory = useCallback(async (book: ReaderBook, prompt = ''): Promise<GeneratedStoryResult> => {
    const apiKey = requireOpenRouterKey()
    const knownWords = collectKnownWords()
    const nextChapter = book.stories.length + 1
    const recentSentences = book.stories
      .flatMap((story) => story.sentences)
      .slice(-20)
      .map((sentence) => sentence.chinese)

    setAiStoryBusy(true)
    setAiStoryMessage(`Writing chapter ${nextChapter} of ${book.title}...`)
    try {
      const { story, validation } = await generateValidatedStory({
        prompt,
        knownWords,
        apiKey,
        model: aiStorySettings.model,
        lengthChars: aiStorySettings.defaultLengthChars,
        continueFrom: { title: book.title, recentSentences, nextChapter },
      })
      const updated = appendGeneratedChapter(book, story, validation)
      await saveGeneratedReaderBook(updated)
      await refresh()
      let audioNote = ''
      if (aiStorySettings.generateAudio && aiStorySettings.azureSpeechKey && aiStorySettings.azureSpeechRegion) {
        audioNote = await synthesizeChapterAudio(updated.stories[updated.stories.length - 1])
      }
      setAiStoryMessage(
        `Chapter ${nextChapter} of ${updated.title} saved (${validation.knownCoveragePercent}% known).` + audioNote,
      )
      return { book: updated, story, validation }
    } finally {
      setAiStoryBusy(false)
    }
  }, [aiStorySettings, collectKnownWords, generateValidatedStory, refresh, requireOpenRouterKey, synthesizeChapterAudio])

  const handleDeleteGeneratedStory = useCallback(async (book: ReaderBook) => {
    if (!window.confirm(`Delete "${book.title}" from this device? This also removes its audio and reading progress.`)) return
    await deleteGeneratedReaderBook(book.id)
    setActiveReaderBookId((current) => (current === book.id ? undefined : current))
    await refresh()
    setLastSummary(`Deleted "${book.title}".`)
  }, [refresh])

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
    const summary = await importAudioFiles(files)
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

  async function handleArchiveVocabularyWord(wordId: string) {
    await archiveWord(wordId)
    setLastSummary('Word archived. It is hidden from study and Reader coverage.')
    await refresh()
    queueCloudSync()
  }

  async function handleRestoreVocabularyWord(wordId: string) {
    await restoreArchivedWord(wordId)
    setLastSummary('Word restored to your central vocabulary list.')
    await refresh()
    queueCloudSync()
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
    | 'readerStatusHighlight'
  >>) {
    const next = { ...userSettings, ...patch }
    setUserSettings(next)
    void saveUserSettings(next)
    setLastSummary('Reader settings saved.')
  }

  function saveSentenceListeningSettings(patch: Partial<Pick<
    UserSettings,
    | 'sentenceRepeats'
    | 'sentenceIncludeEnglish'
    | 'sentencePauseFactor'
    | 'sentenceSessionSize'
    | 'sentenceRounds'
    | 'sentenceShuffle'
  >>) {
    const next = { ...userSettings, ...patch }
    setUserSettings(next)
    void saveUserSettings(next)
    setLastSummary('Listening settings saved — applies to the next set.')
  }

  return (
    <main className={`app-shell app-screen-${screen}`}>
      <header className="topbar">
        <div className="brand-area">
          <button className="brand-button" type="button" onClick={() => setScreen('dashboard')} aria-label="Go to dashboard">
            <span className="brand-mark">中</span>
            <span>
              <strong>Chunky Chinese</strong>
              <small>{seedMessage}</small>
            </span>
          </button>
          <div className="brand-pills">
            <button className="brand-home-pill" type="button" onClick={() => setScreen('dashboard')}>Home</button>
            <button className="topbar-settings-btn" type="button" onClick={() => setScreen('settings')}>Settings</button>
          </div>
        </div>
        <nav className="tabs" aria-label="Main screens">
          <button type="button" className={screen === 'flashcards' ? 'active' : ''} onClick={startSavedFlashcards}>
            <span className="nav-icon nav-flashcards" aria-hidden="true" />
            Flashcards
          </button>
          <button type="button" className={screen === 'lesson' && studyMode === 'sentenceMode' ? 'active' : ''} onClick={() => void startSentenceLesson()}>
            <span className="nav-icon nav-listen" aria-hidden="true" />
            Listening
          </button>
          <button
            type="button"
            className={screen === 'readingTexts' ? 'active' : ''}
            onClick={() => setScreen('readingTexts')}
          >
            <span className="nav-icon nav-reading" aria-hidden="true" />
            Reading
          </button>
        </nav>
        {screen === 'dashboard' && (
          <div className="dashboard-sidebar-streak" aria-label={`${stats.currentStreak} day streak`}>
            <span className="dashboard-sidebar-flame" aria-hidden="true" />
            <span>
              <small>Current streak</small>
              <strong>{stats.currentStreak} days</strong>
              <small>Keep it up!</small>
            </span>
          </div>
        )}
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
          <div className="dashboard-overview">
            <div className="screen-heading dashboard-hero-card">
              <div className="dashboard-hero-copy">
                <h1>Press play, think, keep moving.</h1>
                <p>Start with due words, add new ones only when the queue is light.</p>
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
                <div>
                  <dt>Reading graduates</dt>
                  <dd>{selectedRangeStats.readingGraduatedWords}</dd>
                  {selectedPreviousRangeStats && <dd>{selectedPreviousRangeStats.readingGraduatedWords}</dd>}
                </div>
              </dl>
            </section>
          </div>

          <div className="mode-start-grid mode-start-grid-three dashboard-mode-list" aria-label="Choose study mode">
            <button className="mode-start dashboard-mode-card flashcards-start" type="button" onClick={startSavedFlashcards}>
              <span className="mode-start-logo" aria-hidden="true">
                <span className="nav-icon nav-flashcards" />
              </span>
              <span className="mode-start-copy">
                <strong>Flashcards</strong>
                <span>Sort due and new words with FSRS.</span>
              </span>
              <kbd>{hotkeys.choiceA.toUpperCase()}</kbd>
              <span className="mode-start-metric">
                <span>Due now</span>
                <strong>{stats.dueNow}</strong>
              </span>
              <span className="mode-start-arrow" aria-hidden="true">→</span>
            </button>
            <button className="mode-start dashboard-mode-card listen-start" type="button" onClick={() => void startSentenceLesson()}>
              <span className="mode-start-logo" aria-hidden="true">
                <span className="nav-icon nav-listen" />
              </span>
              <span className="mode-start-copy">
                <strong>Listening</strong>
                <span>Sentence loops by default — switch to Words or Active Recall in the menu.</span>
              </span>
              <kbd>{hotkeys.choiceB.toUpperCase()}</kbd>
              <span className="mode-start-metric">
                <span>Streak</span>
                <strong>{stats.currentStreak}</strong>
              </span>
              <span className="mode-start-arrow" aria-hidden="true">→</span>
            </button>
            <button className="mode-start dashboard-mode-card reading-texts-start" type="button" onClick={() => setScreen('readingTexts')}>
              <span className="mode-start-logo" aria-hidden="true">
                <span className="nav-icon nav-reading" />
              </span>
              <span className="mode-start-copy">
                <strong>Reading</strong>
                <span>Novels, comics, stories, and visual novels.</span>
              </span>
              <kbd>{hotkeys.choiceC.toUpperCase()}</kbd>
              <span className="mode-start-metric">
                <span>In progress</span>
                <strong>{readerResumeLocation ? 1 : 0}</strong>
              </span>
              <span className="mode-start-arrow" aria-hidden="true">→</span>
            </button>
          </div>

          {(sentenceRepsToday > 0 || stats.ranges.today.cardsReviewed > 0) && (
            <div className="rep-rings-row">
              {sentenceRepsToday > 0 && (
                <SentenceRepRing repsToday={sentenceRepsToday} totalReps={sentenceTotalReps} />
              )}
              {stats.ranges.today.cardsReviewed > 0 && (
                <FlashcardReviewRing
                  reviewsToday={stats.ranges.today.cardsReviewed}
                  totalReviews={stats.ranges.allTime?.cardsReviewed ?? 0}
                />
              )}
            </div>
          )}

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

          <div className="dashboard-progress-grid" id="dashboard-progress">
            <InfoPanel title="Learning process" className="process-chart-panel">
              <LearningProcessChart points={stats.learningProcessSeries} />
            </InfoPanel>
            <InfoPanel title="Recent Activity (Last 7 Days)">
              <ActivityChart days={stats.studyHeatmap} />
            </InfoPanel>
            <InfoPanel title="Reading WPM Trend" className="reading-wpm-trend-panel">
              <ReadingWpmTrendChart points={stats.readingSeries} />
            </InfoPanel>
            <InfoPanel title="Words Graduated From Reading" className="reading-graduated-panel">
              <ReadingGraduatedCounter
                current={selectedRangeStats.readingGraduatedWords}
                previous={selectedPreviousRangeStats?.readingGraduatedWords}
                allTime={stats.ranges.allTime.readingGraduatedWords}
                rangeLabel={dashboardRangeLabel(dashboardRange)}
              />
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

          <nav className="dashboard-bottom-nav" aria-label="Dashboard quick navigation">
            <button type="button" className="active" onClick={() => setScreen('dashboard')}>
              <span className="dashboard-bottom-icon dashboard-bottom-home" aria-hidden="true" />
              Home
            </button>
            <button type="button" onClick={startSavedFlashcards}>
              <span className="dashboard-bottom-icon dashboard-bottom-review" aria-hidden="true" />
              Review
            </button>
            <button type="button" onClick={() => setScreen('readingTexts')}>
              <span className="dashboard-bottom-icon dashboard-bottom-explore" aria-hidden="true" />
              Explore
            </button>
            <button
              type="button"
              onClick={() => document.getElementById('dashboard-progress')?.scrollIntoView({ behavior: 'smooth' })}
            >
              <span className="dashboard-bottom-icon dashboard-bottom-progress" aria-hidden="true" />
              Progress
            </button>
            <button type="button" onClick={() => setScreen('settings')}>
              <span className="dashboard-bottom-icon dashboard-bottom-profile" aria-hidden="true" />
              Profile
            </button>
          </nav>

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
              <div className="flashcard-mode-buttons">
                {currentFlashcardWord && flashcardSessionKind === 'words' && (
                  <button
                    type="button"
                    className="ghost-answer"
                    onClick={() => openCardEditor(currentFlashcardWord)}
                  >
                    Edit
                  </button>
                )}
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
                        <div className="swipe-instructions">
                          {hotkeys.choiceA.toUpperCase()} Again · {hotkeys.choiceB.toUpperCase()} Good
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
                onToggleActiveRecallPriority={() => toggleActiveRecallPriority(currentFlashcardWord)}
                selectedRating={flashcardSessionFeedback}
                externalDismissDir={flashcardExternalDismissDir}
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
          {flashcardUndoState && (
            <div className="flashcard-undo-toast">
              <span>Rated <strong>{flashcardUndoState.word.word}</strong> as {fsrsLabel(flashcardUndoState.rating)}</span>
              <button type="button" onClick={() => void handleFlashcardUndo()}>Undo</button>
            </div>
          )}
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
          choiceB={hotkeys.choiceB}
          showEnglish={readerShowEnglish}
          storyChunk={storyChunkSession}
          storyChunkReceipt={storyChunkReceipt}
          listening={readerListening}
          listeningRate={userSettings.readerListeningRate}
          listeningRepeats={userSettings.readerListeningRepeats}
          listeningAutoAdvance={userSettings.readerListeningAutoAdvance}
          statusHighlight={userSettings.readerStatusHighlight}
          onChooseBook={openReaderBook}
          onOpenLibrary={() => {
            readerListening.stop()
            setScreen('readingTexts')
          }}
          onResume={() => {
            if (readerResumeLocation) void openReaderBook(readerResumeLocation.book, 'resume')
          }}
          onPrevious={() => readerListening.previous()}
          onNext={() => readerListening.next()}
          onListeningSettingsChange={(patch) => saveReaderSettings(patch)}
          onStartStoryChunk={startStoryChunk}
          onDismissStoryChunkReceipt={() => setStoryChunkReceipt(null)}
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
              updateStoryChunkMetrics({ tappedUnsavedWords: [token.text] })
              lookupDictionary(token.text).then((entry) => setReaderDictionaryEntry(entry ?? null)).catch(console.error)
            }
          }}
          onSaveWord={async (text, pinyin, meaning) => {
            await saveReaderVocabularyWord(text, pinyin, meaning)
            updateStoryChunkMetrics({ savedWords: [text] })
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
          words={activeWords}
          readerBooks={readerBooks}
          pinyinMode={userSettings.readerPinyinMode}
          readerTheme={userSettings.readerTheme}
          readerFontScale={userSettings.readerFontScale}
          readerLineHeight={userSettings.readerLineHeight}
          playbackRate={playbackRate}
          hotkeys={hotkeys}
          onEditWord={openCardEditor}
          onWordsChanged={refresh}
          onReturnToReader={() => setScreen('readingTexts')}
          initialWorldId={initialVisualNovelWorldId}
        />
      )}

      {screen === 'renpyPrototype' && (
        <RenpyPrototypeMode
          hotkeys={hotkeys}
          onReturnToLibrary={() => setScreen('readingTexts')}
          onOpenReactVisualNovel={() => {
            setInitialVisualNovelWorldId('just-friends')
            setScreen('visualNovel')
          }}
        />
      )}

      {screen === 'renpyLms' && (
        <RenpyPrototypeMode
          hotkeys={hotkeys}
          storyId="lms"
          title="Legendary Moonlight Sculptor"
          description="The main story as an exported RenPy web build, with ruby pinyin and English you can toggle."
          onReturnToLibrary={() => setScreen('readingTexts')}
        />
      )}

      {screen === 'comicReader' && (
        <ComicReaderMode
          words={activeWords}
          pinyinMode={userSettings.readerPinyinMode}
          hotkeys={hotkeys}
          onEditWord={openCardEditor}
          onWordsChanged={refresh}
          onReturnHome={() => setScreen('readingTexts')}
          onOpenClassicReader={() => setScreen('reader')}
          initialPackId={initialComicPack?.id}
          initialMode={initialComicPack?.mode}
        />
      )}

      {screen === 'readingTexts' && (
        <ReadingTextsLibrary
          readerBooks={readerBooks}
          comprehensionByBook={readerComprehensionByBook}
          resumeLocation={readerResumeLocation}
          onBack={() => setScreen('dashboard')}
          onChooseBook={openReaderBook}
          onBrowseNovels={() => {
            setActiveReaderBookId(undefined)
            setScreen('reader')
          }}
          onOpenComic={(packId, mode) => {
            setInitialComicPack({ id: packId, mode })
            setScreen('comicReader')
          }}
          onOpenComics={() => {
            setInitialComicPack(undefined)
            setScreen('comicReader')
          }}
          onOpenRenpyPrototype={() => setScreen('renpyPrototype')}
          onOpenRenpyLms={() => setScreen('renpyLms')}
          onOpenVisualNovel={(book) => {
            setInitialVisualNovelWorldId(book?.visualNovelWorldId)
            setScreen('visualNovel')
          }}
          onGenerateStory={handleGenerateStory}
          onContinueStory={handleContinueStory}
          onDeleteStory={handleDeleteGeneratedStory}
          aiStoryBusy={aiStoryBusy}
          aiStoryMessage={aiStoryMessage}
          canGenerateAiStories={aiStorySettings.openRouterApiKey.length > 0}
          aiStoryDefaults={{
            model: aiStorySettings.model,
            lengthChars: aiStorySettings.defaultLengthChars,
            generateCover: aiStorySettings.generateCover,
            generateAudio: aiStorySettings.generateAudio,
            azureConfigured: Boolean(aiStorySettings.azureSpeechKey && aiStorySettings.azureSpeechRegion),
          }}
        />
      )}

      {screen === 'settings' && (
        <section className="screen">
          <div className="screen-heading compact">
            <div>
              <h1>Settings</h1>
              <p>Import packs, set study defaults, export progress, and tune controls.</p>
            </div>
          </div>

          <div className="settings-sections">
            <details className="settings-group" open={!cloudUserEmail}>
              <summary className="settings-group-summary">Account &amp; Sync</summary>
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
              </div>
            </details>

            <details className="settings-group">
              <summary className="settings-group-summary">AI Story Generation</summary>
              <div className="import-grid">
                <section className="panel">
                  <h2>OpenRouter API key</h2>
                  <p>
                    Powers the Generate a Story feature. The key is stored only on this device
                    (IndexedDB) and sent only to openrouter.ai. Get one at openrouter.ai/keys.
                  </p>
                  {aiStorySettings.openRouterApiKey ? (
                    <div className="button-row">
                      <span className="pill-note">
                        Key saved (…{aiStorySettings.openRouterApiKey.slice(-4)})
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                          const next = { ...aiStorySettings, openRouterApiKey: '' }
                          setAiStorySettings(next)
                          void saveAiStorySettings(next)
                          setLastSummary('OpenRouter API key removed.')
                        }}
                      >
                        Clear key
                      </button>
                    </div>
                  ) : (
                    <div className="magic-link-row">
                      <input
                        type="password"
                        autoComplete="off"
                        placeholder="sk-or-v1-..."
                        value={aiKeyDraft}
                        onChange={(event) => setAiKeyDraft(event.target.value)}
                      />
                      <button
                        type="button"
                        className="primary"
                        disabled={aiKeyDraft.trim().length === 0}
                        onClick={() => {
                          const next = { ...aiStorySettings, openRouterApiKey: aiKeyDraft.trim() }
                          setAiStorySettings(next)
                          void saveAiStorySettings(next)
                          setAiKeyDraft('')
                          setLastSummary('OpenRouter API key saved on this device.')
                        }}
                      >
                        Save key
                      </button>
                    </div>
                  )}
                  <label className="settings-inline-label">
                    Default model
                    <select
                      value={aiStorySettings.model}
                      onChange={(event) => {
                        const next = { ...aiStorySettings, model: event.target.value }
                        setAiStorySettings(next)
                        void saveAiStorySettings(next)
                      }}
                    >
                      {AI_STORY_MODELS.map((model) => (
                        <option key={model.id} value={model.id}>{model.label}</option>
                      ))}
                    </select>
                  </label>
                </section>
                <section className="panel">
                  <h2>Azure Speech (optional story narration)</h2>
                  <p>
                    Adds real narration audio to generated stories. Stored only on this device;
                    sent only to {aiStorySettings.azureSpeechRegion || 'your-region'}.tts.speech.microsoft.com.
                    Azure's free tier covers about 500k characters per month.
                  </p>
                  {aiStorySettings.azureSpeechKey ? (
                    <div className="button-row">
                      <span className="pill-note">
                        Key saved (…{aiStorySettings.azureSpeechKey.slice(-4)})
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                          const next = { ...aiStorySettings, azureSpeechKey: '' }
                          setAiStorySettings(next)
                          void saveAiStorySettings(next)
                          setLastSummary('Azure Speech key removed.')
                        }}
                      >
                        Clear key
                      </button>
                    </div>
                  ) : (
                    <div className="magic-link-row">
                      <input
                        type="password"
                        autoComplete="off"
                        placeholder="Azure Speech key"
                        value={azureKeyDraft}
                        onChange={(event) => setAzureKeyDraft(event.target.value)}
                      />
                      <button
                        type="button"
                        className="primary"
                        disabled={azureKeyDraft.trim().length === 0}
                        onClick={() => {
                          const next = { ...aiStorySettings, azureSpeechKey: azureKeyDraft.trim() }
                          setAiStorySettings(next)
                          void saveAiStorySettings(next)
                          setAzureKeyDraft('')
                          setLastSummary('Azure Speech key saved on this device.')
                        }}
                      >
                        Save key
                      </button>
                    </div>
                  )}
                  <label className="settings-inline-label">
                    Region
                    <input
                      type="text"
                      placeholder="eastus"
                      value={aiStorySettings.azureSpeechRegion}
                      onChange={(event) => {
                        const next = { ...aiStorySettings, azureSpeechRegion: event.target.value.trim() }
                        setAiStorySettings(next)
                        void saveAiStorySettings(next)
                      }}
                    />
                  </label>
                  <label className="settings-inline-label">
                    Voice
                    <select
                      value={aiStorySettings.azureVoice}
                      onChange={(event) => {
                        const next = { ...aiStorySettings, azureVoice: event.target.value }
                        setAiStorySettings(next)
                        void saveAiStorySettings(next)
                      }}
                    >
                      {AZURE_VOICES.map((voice) => (
                        <option key={voice.id} value={voice.id}>{voice.label}</option>
                      ))}
                    </select>
                  </label>
                </section>
              </div>
            </details>

            <details className="settings-group">
              <summary className="settings-group-summary">Imports &amp; Packs</summary>
              <div className="import-grid">
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
                <VocabularySourcesPanel
                  words={words}
                  clipPacks={clipPacks}
                  search={vocabSourceSearch}
                  showArchived={showArchivedVocabSources}
                  onSearchChange={setVocabSourceSearch}
                  onShowArchivedChange={setShowArchivedVocabSources}
                  onArchiveWord={(wordId) => void handleArchiveVocabularyWord(wordId)}
                  onRestoreWord={(wordId) => void handleRestoreVocabularyWord(wordId)}
                />
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
              </div>
            </details>

            <details className="settings-group">
              <summary className="settings-group-summary">Goals</summary>
              <div className="import-grid">
                <section className="panel goals-settings-panel">
                  <h2>Daily targets</h2>
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
              </div>
            </details>

            <details className="settings-group">
              <summary className="settings-group-summary">Flashcards</summary>
              <div className="import-grid">
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
              </div>
            </details>

            <details className="settings-group">
              <summary className="settings-group-summary">Reader</summary>
              <div className="import-grid">
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
              </div>
            </details>

            <details className="settings-group">
              <summary className="settings-group-summary">Appearance</summary>
              <div className="import-grid">
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
              </div>
            </details>

            <details className="settings-group">
              <summary className="settings-group-summary">Hotkeys</summary>
              <div className="import-grid">
                <section className="panel">
                  <h2>Hotkey settings</h2>
                  <p>Choice A–D rate flashcards and sentences; Choice E stars cards; Choice F replays audio.</p>
                  <dl className="stat-list">
                    <div><dt>Again (A)</dt><dd>{hotkeys.choiceA.toUpperCase()}</dd></div>
                    <div><dt>Hard (B)</dt><dd>{hotkeys.choiceB.toUpperCase()}</dd></div>
                    <div><dt>Good (C)</dt><dd>{hotkeys.choiceC.toUpperCase()}</dd></div>
                    <div><dt>Easy (D)</dt><dd>{hotkeys.choiceD.toUpperCase()}</dd></div>
                    <div><dt>Star (E)</dt><dd>{hotkeys.choiceE.toUpperCase()}</dd></div>
                    <div><dt>Replay (F)</dt><dd>{hotkeys.choiceF.toUpperCase()}</dd></div>
                    <div><dt>Play / pause</dt><dd>{hotkeys.playPause.toUpperCase()}</dd></div>
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
              </div>
            </details>

            <details className="settings-group">
              <summary className="settings-group-summary">Backup &amp; Export</summary>
              <div className="import-grid">
                <section className="panel">
                  <h2>Export</h2>
                  <p>Download your vocabulary list or a full snapshot for analysis.</p>
                  <div className="button-row">
                    <button type="button" onClick={handleWordsCsvExport}>
                      Export CSV
                    </button>
                    <button type="button" onClick={handleVocabSnapshotExport}>
                      Export Vocab Snapshot
                    </button>
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
                <section className="panel">
                  <h2>App update</h2>
                  <p>If the app looks out of date, force a fresh reload — clears all cached files and restarts.</p>
                  <div className="button-row">
                    <button
                      type="button"
                      onClick={() => {
                        const url = new URL(window.location.href)
                        url.searchParams.set('resetPwa', '1')
                        window.location.replace(url.toString())
                      }}
                    >
                      Force update
                    </button>
                  </div>
                </section>
              </div>
            </details>
          </div>
        </section>
      )}

      {screen === 'lesson' && (
        <section className="screen lesson-screen">
          {lesson || studyMode === 'sentenceMode' ? (
            <>
                <section
                  className={`study-player ${minimalVisualMode ? 'minimal-visual-player' : ''}`}
                  ref={playModeRef}
                >
                  <div
                    ref={studyStageRef}
                    className={`study-stage ${minimalVisualMode ? 'minimal-visual-stage' : ''} ${showReviewPrompt ? 'review-stage' : ''}`}
                  >
                    <div className="study-meta">
                      <span>
                        {minimalVisualMode
                          ? 'Listening'
                          : rendering
                            ? 'Rendering local audio...'
                            : renderedLesson?.title ?? lesson?.title ?? 'Sentence listening'}
                      </span>
                      {studyMode === 'sentenceMode' ? null : (
                        <div className="study-toggles">
                          <div className="sentence-menu-wrap">
                            <button
                              type="button"
                              className="sentence-menu-btn"
                              onClick={() => setListeningLessonMenuOpen(o => !o)}
                              aria-label="Listening menu"
                            >
                              ☰
                            </button>
                            <StudyMenuPopup open={listeningLessonMenuOpen} onClose={() => setListeningLessonMenuOpen(false)}>
                              <p className="sentence-menu-label">Mode</p>
                              <div className="sentence-menu-modes">
                                <button
                                  type="button"
                                  className={studyMode === 'listeningMode' ? 'active' : ''}
                                  onClick={() => { if (studyMode !== 'listeningMode') void startModeLesson('listeningMode'); setListeningLessonMenuOpen(false) }}
                                >Words</button>
                                <button
                                  type="button"
                                  onClick={() => { void startSentenceLesson(); setListeningLessonMenuOpen(false) }}
                                >Sentences</button>
                              </div>
                              <StudyMenuSection label="Display">
                                <StudyMenuToggle label="Pinyin" checked={showPinyin} onChange={() => setShowPinyin(v => !v)} />
                                <StudyMenuToggle label="English" checked={showEnglish} onChange={() => setShowEnglish(v => !v)} />
                                <StudyMenuToggle label="Auto next" checked={autoNextLesson} onChange={checked => setAutoNextLesson(checked)} />
                              </StudyMenuSection>
                            </StudyMenuPopup>
                          </div>
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
                    ) : studyMode === 'sentenceMode' && sentenceSetComplete ? (
                      <div className="sentence-set-summary">
                        <button
                          type="button"
                          className="sentence-play-pause sentence-set-next-play"
                          onClick={() => void completeSentenceSet()}
                          aria-label="Start next sentence set"
                        >
                          <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor" aria-hidden="true">
                            <polygon points="5,3 19,12 5,21" />
                          </svg>
                        </button>
                        <div className="sentence-set-header">
                          <strong>Set Complete</strong>
                          <span>{Math.round((Date.now() - sentenceSetStartMs) / 1000)}s</span>
                        </div>
                        <div className="sentence-set-list">
                          {sentenceQueue.map((sent, i) => (
                            <div key={sent.word} className="sentence-set-item">
                              <span className="sentence-set-num">{i + 1}</span>
                              <div className="sentence-set-item-content">
                                <p className="sentence-set-zh">{sent.chinese}</p>
                                <p className="sentence-set-en">{sent.english}</p>
                              </div>
                            </div>
                          ))}
                        </div>
                        <div className="sentence-set-actions">
                          <button
                            type="button"
                            className="primary"
                            onClick={() => void completeSentenceSet()}
                          >
                            Next Set
                          </button>
                        </div>
                      </div>
                    ) : studyMode === 'sentenceMode' ? (
                      <div className="sentence-mode-root">
                        {/* Sets / Books segmented tab */}
                        <div className="sentence-submode-tabs">
                          <button
                            type="button"
                            className={sentenceSubMode === 'sets' ? 'active' : ''}
                            onClick={() => setSentenceSubMode('sets')}
                          >Sets</button>
                          <button
                            type="button"
                            className={sentenceSubMode === 'books' ? 'active' : ''}
                            onClick={() => { setSentenceSubMode('books'); setSentencePaused(true) }}
                          >Books</button>
                        </div>

                        {sentenceSubMode === 'books' ? (
                          /* ── Book Listening sub-mode ── */
                          bookListenBook === null ? (
                            /* Book picker */
                            <div className="book-picker-list">
                              <p className="book-picker-heading">Choose a book to listen to</p>
                              {readerBooks.map(book => (
                                <button
                                  key={book.id}
                                  type="button"
                                  className="book-picker-row"
                                  onClick={() => void openBookListen(book)}
                                >
                                  {book.coverImage && (
                                    <img
                                      className="book-picker-cover"
                                      src={readerBookCoverSrc(book)}
                                      alt=""
                                    />
                                  )}
                                  <span className="book-picker-title">{book.title}</span>
                                  <span className="book-picker-meta">{book.stories.flatMap(s => s.sentences).length} sentences</span>
                                </button>
                              ))}
                            </div>
                          ) : bookListenFinished ? (
                            /* Book finished screen */
                            <div className="book-listen-finished-screen">
                              {bookListenBook.coverImage && (
                                <img
                                  className="book-listen-finished-cover"
                                  src={readerBookCoverSrc(bookListenBook)}
                                  alt=""
                                />
                              )}
                              <strong className="book-listen-finished-title">Finished!</strong>
                              <span className="book-listen-finished-meta">{bookListenSentences.length} sentences complete</span>
                              <div className="book-listen-finished-actions">
                                <button
                                  type="button"
                                  className="primary"
                                  onClick={() => {
                                    setBookListenIndex(0)
                                    setBookListenFinished(false)
                                    window.setTimeout(() => bookListening.startListening(), 50)
                                  }}
                                >
                                  Start Over
                                </button>
                                <button
                                  type="button"
                                  onClick={() => { setBookListenFinished(false); setBookListenBookId(null) }}
                                >
                                  Choose Book
                                </button>
                              </div>
                            </div>
                          ) : (
                            /* Book card view */
                            <div
                              className={`sentence-mode-display book-listen-display${bookListenSwipe.swipeDir ? ` swipe-${bookListenSwipe.swipeDir}` : ''}`}
                              {...bookListenSwipe.handlers}
                            >
                              {/* Top bar */}
                              <div className="sentence-top-bar">
                                <div className="sentence-menu-wrap">
                                  <button
                                    type="button"
                                    className="sentence-menu-btn"
                                    onClick={() => setSentenceMenuOpen(o => !o)}
                                    aria-label="Menu"
                                  >
                                    ☰
                                  </button>
                                  <StudyMenuPopup open={sentenceMenuOpen} onClose={() => setSentenceMenuOpen(false)}>
                                    <p className="sentence-menu-label">Book</p>
                                    <button
                                      type="button"
                                      className="sentence-menu-change-book"
                                      onClick={() => { setBookListenBookId(null); setSentenceMenuOpen(false) }}
                                    >Change Book</button>
                                    <StudyMenuSection label="Display">
                                      <StudyMenuToggle label="Pinyin" checked={bookListenPinyinVisible} onChange={() => setBookListenPinyinVisible(v => !v)} />
                                      <StudyMenuToggle label="English" checked={bookListenEnglishVisible} onChange={() => setBookListenEnglishVisible(v => !v)} />
                                    </StudyMenuSection>
                                    <StudyMenuSection label="Playback">
                                      <StudyMenuSelect
                                        label="Speed"
                                        value={userSettings.readerListeningRate}
                                        options={[0.5, 0.6, 0.7, 0.8, 0.9, 1.0, 1.1, 1.2, 1.5].map(r => ({ value: r, label: `${r}×` }))}
                                        onChange={value => { void saveReaderSettings({ readerListeningRate: value }) }}
                                      />
                                      <StudyMenuSelect
                                        label="Repeats"
                                        value={userSettings.readerListeningRepeats}
                                        options={[1, 2, 3, 4, 5].map(n => ({ value: n, label: `${n}×` }))}
                                        onChange={value => { void saveReaderSettings({ readerListeningRepeats: value }) }}
                                      />
                                    </StudyMenuSection>
                                  </StudyMenuPopup>
                                </div>

                                <span className="book-listen-title">{bookListenBook.title}</span>
                                <button
                                  type="button"
                                  className="book-speed-badge"
                                  onClick={() => {
                                    const idx = BOOK_LISTEN_SPEEDS.indexOf(userSettings.readerListeningRate)
                                    const next = BOOK_LISTEN_SPEEDS[(idx + 1) % BOOK_LISTEN_SPEEDS.length] ?? 1.0
                                    void saveReaderSettings({ readerListeningRate: next })
                                  }}
                                  title="Cycle playback speed"
                                >
                                  {userSettings.readerListeningRate}×
                                </button>
                              </div>

                              {/* Story / chapter label */}
                              {bookListenStory && (
                                <div className="book-listen-story-label">{bookListenStory.title}</div>
                              )}

                              {/* Illustration */}
                              {bookListenIllustration && (
                                <div className="book-sentence-illustration">
                                  <img
                                    src={publicAssetPath(bookListenIllustration.imageFilename)}
                                    alt={bookListenIllustration.alt ?? ''}
                                    className="book-sentence-illustration-img"
                                  />
                                </div>
                              )}

                              {/* Sentence card */}
                              <div
                                key={bookListenAnimKey}
                                ref={bookListenSwipe.cardRef}
                                className={`sentence-card${bookListenDismissDir ? ` sentence-dismiss-${bookListenDismissDir}` : ''}`}
                              >
                                <div className={`sentence-chinese${bookListening.snapshot.status === 'playing' ? ' book-playing' : ''}`}>{bookListenSentence?.chinese}</div>
                                {bookListenPinyinVisible && bookListenSentence?.chinese && (
                                  <div className="sentence-pinyin">
                                    {getPinyin(bookListenSentence.chinese, { toneType: 'symbol', separator: ' ' })}
                                  </div>
                                )}
                                {bookListenEnglishVisible && (
                                  <div className="sentence-english">{bookListenSentence?.english}</div>
                                )}
                              </div>

                              {bookListenSwipe.swipeDir && !bookListenDismissDir && (
                                <div className={`swipe-indicator swipe-indicator-${bookListenSwipe.swipeDir}`}>
                                  {{ left: '← Next', right: '→ Prev', down: '⏸ Pause', up: '↑ Display' }[bookListenSwipe.swipeDir] ?? ''}
                                </div>
                              )}

                              {/* Progress */}
                              <div className="book-listen-progress">
                                <span>{bookListenIndex + 1} / {bookListenSentences.length}</span>
                                <div className="book-listen-progress-bar">
                                  <span style={{ width: `${((bookListenIndex + 1) / Math.max(1, bookListenSentences.length)) * 100}%` }} />
                                </div>
                              </div>

                              <StudyControls
                                playing={bookListening.snapshot.status === 'playing'}
                                onTogglePlay={() => bookListening.snapshot.status === 'idle' ? bookListening.startListening() : bookListening.togglePlayPause()}
                                onPrevious={() => { void bookListening.previous() }}
                                onNext={() => { void bookListening.next() }}
                              />

                              {/* Swipe hints */}
                              <div className="book-listen-hints">
                                <span>↑ display</span>
                                <span>→ prev</span>
                                <span>↓ pause</span>
                                <span>← next</span>
                              </div>
                            </div>
                          )
                        ) : (
                          /* ── Sets sub-mode (original sentence mode) ── */
                          <div
                            className={`sentence-mode-display${sentenceSetSwipe.swipeDir ? ` swipe-${sentenceSetSwipe.swipeDir}` : ''}`}
                            {...sentenceSetSwipe.handlers}
                          >
                            {/* Top bar: Menu | Play/Pause | End Set */}
                            <div className="sentence-top-bar">
                              <div className="sentence-menu-wrap">
                                <button
                                  type="button"
                                  className="sentence-menu-btn"
                                  onClick={() => setSentenceMenuOpen(o => !o)}
                                  aria-label="Menu"
                                >
                                  ☰
                                </button>
                                <StudyMenuPopup open={sentenceMenuOpen} onClose={() => setSentenceMenuOpen(false)}>
                                  <p className="sentence-menu-label">Mode</p>
                                  <div className="sentence-menu-modes">
                                    <button
                                      type="button"
                                      className=""
                                      onClick={() => { void startModeLesson('listeningMode'); setSentenceMenuOpen(false) }}
                                    >Words</button>
                                    <button
                                      type="button"
                                      className="active"
                                      onClick={() => { setSentenceMenuOpen(false) }}
                                    >Sentences</button>
                                  </div>
                                  <StudyMenuSection label="Display">
                                    <StudyMenuToggle label="Pinyin" checked={showPinyin} onChange={() => setShowPinyin(v => !v)} />
                                    <StudyMenuToggle label="English" checked={showEnglish} onChange={() => setShowEnglish(v => !v)} />
                                  </StudyMenuSection>
                                  <StudyMenuSection label="Playback">
                                    <StudyMenuSelect
                                      label="Speed"
                                      value={playbackRate}
                                      options={[0.6, 0.7, 0.8, 0.9, 1.0, 1.1, 1.2].map(r => ({ value: r, label: `${r}×` }))}
                                      onChange={value => setPlaybackRate(value)}
                                    />
                                    <StudyMenuSelect
                                      label="Chinese repeats"
                                      value={userSettings.sentenceRepeats}
                                      options={[1, 2, 3, 4, 5].map(n => ({ value: n, label: `${n}×` }))}
                                      onChange={value => saveSentenceListeningSettings({ sentenceRepeats: value })}
                                    />
                                    <StudyMenuToggle
                                      label="English audio"
                                      checked={userSettings.sentenceIncludeEnglish}
                                      onChange={checked => saveSentenceListeningSettings({ sentenceIncludeEnglish: checked })}
                                    />
                                    <StudyMenuSelect
                                      label="Shadowing pause"
                                      value={userSettings.sentencePauseFactor}
                                      options={[
                                        { value: 0, label: 'Off' },
                                        { value: 0.5, label: 'Short (½× sentence)' },
                                        { value: 1, label: 'Normal (1× sentence)' },
                                        { value: 1.5, label: 'Long (1½× sentence)' },
                                      ]}
                                      onChange={value => saveSentenceListeningSettings({ sentencePauseFactor: value })}
                                    />
                                  </StudyMenuSection>
                                  <StudyMenuSection label="Session">
                                    <StudyMenuSelect
                                      label="Sentences per set"
                                      value={userSettings.sentenceSessionSize}
                                      options={[3, 5, 8, 10].map(n => ({ value: n, label: `${n}` }))}
                                      onChange={value => saveSentenceListeningSettings({ sentenceSessionSize: value })}
                                    />
                                    <StudyMenuSelect
                                      label="Rounds"
                                      value={userSettings.sentenceRounds}
                                      options={[3, 5, 10, 15, 20].map(n => ({ value: n, label: `${n}` }))}
                                      onChange={value => saveSentenceListeningSettings({ sentenceRounds: value })}
                                    />
                                    <StudyMenuToggle
                                      label="Shuffle order"
                                      checked={userSettings.sentenceShuffle}
                                      onChange={checked => saveSentenceListeningSettings({ sentenceShuffle: checked })}
                                    />
                                    <button
                                      type="button"
                                      className="sentence-menu-change-book"
                                      onClick={() => { setSentenceMenuOpen(false); void startSentenceLesson() }}
                                    >
                                      Rebuild set with these settings
                                    </button>
                                  </StudyMenuSection>
                                </StudyMenuPopup>
                              </div>

                              <button
                                type="button"
                                className="sentence-end-btn"
                                onClick={() => {
                                  sentenceAudioRef.current?.pause()
                                  setSentenceSetComplete(true)
                                }}
                              >
                                End Set
                              </button>
                            </div>

                            <div className="sentence-round-info">
                              <span>Round {sentencePosition.round + 1} of {sentenceListeningSettings.sentenceRounds}</span>
                              <div className="sentence-progress-bar">
                                <span style={{ width: `${sentenceProgress.duration > 0 ? (sentenceProgress.current / sentenceProgress.duration) * 100 : 0}%` }} />
                              </div>
                              {sentencePoolProgress && (
                                <span className="sentence-pool-progress">
                                  {sentencePoolProgress.lesson !== undefined && `Lesson ${sentencePoolProgress.lesson} · `}
                                  {sentencePoolProgress.position}/{sentencePoolProgress.total} sentences
                                </span>
                              )}
                            </div>

                            {sentenceRendering && (
                              <div className="sentence-paused-overlay">Preparing audio…</div>
                            )}
                            {!sentenceRendering && sentencePaused && sentenceRendered && (
                              <div className="sentence-paused-overlay">Paused — tap ▶ to resume</div>
                            )}

                            {sentenceQueue.length > 0 && (() => {
                              const current = sentenceQueue[sentencePosition.sentenceIndex]
                              return (
                                <div className="sentence-card-stack">
                                  <div
                                    ref={sentenceSetSwipe.cardRef}
                                    className="sentence-card"
                                  >
                                    <div
                                      className="sentence-chinese"
                                      role="button"
                                      tabIndex={0}
                                      onClick={() => setSentencePinyinVisible(v => !v)}
                                      onKeyDown={e => e.key === 'Enter' && setSentencePinyinVisible(v => !v)}
                                    >
                                      {current?.chinese}
                                    </div>
                                    {(sentencePinyinVisible || showPinyin) ? (
                                      <div className="sentence-pinyin">
                                        {getPinyin(current?.chinese ?? '', { toneType: 'symbol', separator: ' ' })}
                                      </div>
                                    ) : (
                                      <div className="sentence-pinyin-hint">拼 pinyin</div>
                                    )}
                                    {showEnglish && (
                                      <div className="sentence-english">{current?.english}</div>
                                    )}
                                  </div>
                                </div>
                              )
                            })()}

                            {sentenceSetSwipe.swipeDir && (
                              <div className={`swipe-indicator swipe-indicator-${sentenceSetSwipe.swipeDir}`}>
                                {{ left: '← Next', right: '→ Prev', down: '⏸ Play/Pause', up: '↑ Pinyin' }[sentenceSetSwipe.swipeDir]}
                              </div>
                            )}

                            <div className="sentence-dots">
                              {sentenceQueue.map((sent, i) => (
                                <span
                                  key={sent.word}
                                  className={`sentence-dot ${sentencePosition.sentenceIndex === i ? 'active' : ''}`}
                                />
                              ))}
                            </div>

                            <StudyControls
                              playing={!sentencePaused}
                              onTogglePlay={toggleSentencePlayback}
                              playDisabled={!sentenceRendered || sentenceRendering}
                              playLabel={sentencePaused ? 'Resume' : 'Pause'}
                              onPrevious={() => seekSentence(-1)}
                              prevDisabled={!sentenceRendered}
                              prevLabel="Previous sentence"
                              onNext={() => seekSentence(1)}
                              nextDisabled={!sentenceRendered}
                              nextLabel="Next sentence"
                            />

                            <div className="book-listen-hints">
                              <span>↑ pinyin</span>
                              <span>→ prev</span>
                              <span>↓ pause</span>
                              <span>← next</span>
                            </div>

                            {sentenceRendered && (
                              <audio
                                ref={sentenceAudioRef}
                                src={sentenceRendered.url}
                                preload="auto"
                                onPlay={() => setSentencePaused(false)}
                                onPause={() => setSentencePaused(true)}
                                onTimeUpdate={(event) => {
                                  const audio = event.currentTarget
                                  const time = audio.currentTime
                                  const segments = sentenceRendered.segments
                                  const segment = segments.find(
                                    (s) => time >= s.startSeconds && time < s.endSeconds,
                                  )
                                  if (
                                    segment &&
                                    (segment.sentenceIndex !== sentencePosition.sentenceIndex ||
                                      segment.round !== sentencePosition.round)
                                  ) {
                                    setSentencePosition({
                                      sentenceIndex: segment.sentenceIndex,
                                      round: segment.round,
                                    })
                                  }
                                  setSentenceProgress({
                                    current: time,
                                    duration: audio.duration || sentenceRendered.durationSeconds,
                                  })
                                }}
                                onEnded={() => {
                                  setSentencePaused(true)
                                  void completeSentenceSet()
                                }}
                              />
                            )}
                          </div>
                        )}
                      </div>
                    ) : (
                      <>
                    <div className={`study-chinese ${studyDisplay.kind}`}>
                      {studyDisplay.chinese}
                    </div>
                    {showPinyin && studyDisplay.pinyin && (
                      <div className="study-pinyin">{studyDisplay.pinyin}</div>
                    )}
                    {showEnglish && <div className="study-meaning">{studyDisplay.english}</div>}
                    <div className="study-time">
                      <span>
                        {renderedLesson
                          ? `${formatTime(pocketProgress.current)} / ${formatTime(pocketProgress.duration)}`
                          : 'Import a clip pack, then render a lesson for phone-style playback.'}
                      </span>
                    </div>
                        {minimalVisualMode && (
                          <>
                            <StudyControls
                              playing={isPlaying}
                              onTogglePlay={() => {
                                const audio = pocketAudioRef.current
                                if (!audio) return
                                if (audio.paused) {
                                  void audio.play()
                                } else {
                                  audio.pause()
                                }
                              }}
                              playDisabled={!renderedUrl}
                              onPrevious={replayCurrentSegment}
                              prevDisabled={!currentSegment}
                              prevLabel="Replay segment"
                              onNext={() => void completeListeningLessonAndStartNext()}
                              nextDisabled={!renderedLesson || rendering}
                              nextLabel="Next lesson"
                            />
                          </>
                        )}
                      </>
                    )}
                  </div>

                  {studyMode !== 'sentenceMode' && (
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
                          lastPocketTimeRef.current = current
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
                              setLastSummary('Lesson complete.')
                            } else {
                              openReviewPrompt()
                            }
                          }
                        }}
                      />
                    ) : (
                      <div className="audio-placeholder">Render a lesson to create the audio track.</div>
                    )}
                    {showReviewPrompt && (
                      <ControllerHUD
                        choiceA={hotkeys.choiceA}
                        choiceB={hotkeys.choiceB}
                        labelA={reviewAnswerShown ? 'Again' : 'Flip'}
                        labelB={reviewAnswerShown ? 'Good' : ''}
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
                              <div className="coverage-grid menu-coverage">
                                <span>Ready words: {coverage.readyWords}</span>
                                <span>Prompt clips: {coverage.promptClips}</span>
                                <span>Rendered warnings: {renderedLesson?.warnings.length ?? 0}</span>
                              </div>
                            </div>
                        </>
                      )}
                    </div>
                    )}
                  </div>
                  )}
                </section>

              {lesson && lessonMode === 'live' && (
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

              {lesson && lessonMode === 'live' && (
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

function VocabularySourcesPanel({
  words,
  clipPacks,
  search,
  showArchived,
  onSearchChange,
  onShowArchivedChange,
  onArchiveWord,
  onRestoreWord,
}: {
  words: VocabWord[]
  clipPacks: ClipPack[]
  search: string
  showArchived: boolean
  onSearchChange: (value: string) => void
  onShowArchivedChange: (value: boolean) => void
  onArchiveWord: (wordId: string) => void
  onRestoreWord: (wordId: string) => void
}) {
  const normalizedSearch = search.trim().toLocaleLowerCase()
  const activeCount = words.filter(isActiveVocabWord).length
  const archivedCount = words.length - activeCount
  const sourceRows = [
    {
      id: 'central',
      name: 'Central vocabulary',
      description: `${activeCount} active words${archivedCount ? `, ${archivedCount} archived` : ''}`,
      words,
    },
    ...clipPacks.map((pack) => {
      const sourceWords = words.filter((word) => word.packIds?.includes(pack.id))
      return {
        id: pack.id,
        name: pack.name,
        description: `${sourceWords.filter(isActiveVocabWord).length} active words from this source`,
        words: sourceWords,
      }
    }),
    {
      id: 'reading-saves',
      name: 'Saved from reading',
      description: `${words.filter((word) => isActiveVocabWord(word) && word.readingAddedAt).length} active words saved in context`,
      words: words.filter((word) => word.readingAddedAt),
    },
  ].filter((source) => source.words.length > 0 || source.id === 'central')

  return (
    <section className="panel vocabulary-sources-panel">
      <h2>Vocabulary sources</h2>
      <p>One central vocab list powers flashcards, Reader coverage, AI stories, and lessons.</p>
      <div className="vocabulary-source-controls">
        <label>
          <span>Search words</span>
          <input
            type="search"
            value={search}
            onChange={(event) => onSearchChange(event.target.value)}
            placeholder="Chinese, pinyin, or meaning"
          />
        </label>
        <label className="toggle-line">
          <input
            type="checkbox"
            checked={showArchived}
            onChange={(event) => onShowArchivedChange(event.target.checked)}
          />
          <span>Show archived</span>
        </label>
      </div>
      <div className="vocabulary-source-list">
        {sourceRows.map((source) => {
          const sourceWords = source.words
            .filter((word) => showArchived || isActiveVocabWord(word))
            .filter((word) => {
              if (!normalizedSearch) return true
              return [word.word, word.pinyin, word.meaning]
                .filter(Boolean)
                .some((value) => value?.toLocaleLowerCase().includes(normalizedSearch))
            })
            .sort((a, b) => Number(Boolean(a.archivedAt)) - Number(Boolean(b.archivedAt)) || a.word.localeCompare(b.word, 'zh-Hans-CN'))
          const previewWords = sourceWords.slice(0, 18)
          return (
            <details className="vocabulary-source-row" key={source.id} open={source.id === 'central'}>
              <summary>
                <span>
                  <strong>{source.name}</strong>
                  <small>{source.description}</small>
                </span>
                <em>{sourceWords.length} shown</em>
              </summary>
              <div className="vocabulary-source-words">
                {previewWords.map((word) => (
                  <div className={`vocabulary-source-word ${word.archivedAt ? 'archived' : ''}`} key={word.id}>
                    <span>
                      <strong>{word.word}</strong>
                      <small>
                        {word.pinyin ? `${word.pinyin} - ` : ''}{word.meaning}
                        {word.readingAddedAt ? ` - saved ${formatRelativeTime(word.readingAddedAt)}` : ''}
                      </small>
                    </span>
                    {word.archivedAt ? (
                      <button type="button" className="ghost-answer" onClick={() => onRestoreWord(word.id)}>
                        Restore
                      </button>
                    ) : (
                      <button type="button" className="ghost-answer danger" onClick={() => onArchiveWord(word.id)}>
                        Archive
                      </button>
                    )}
                  </div>
                ))}
                {sourceWords.length > previewWords.length && (
                  <small>{sourceWords.length - previewWords.length} more match this search.</small>
                )}
                {sourceWords.length === 0 && <small>No words match this source and filter.</small>}
              </div>
            </details>
          )
        })}
      </div>
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

function readerBookCoverSrc(book: ReaderBook): string | undefined {
  if (!book.coverImage) return undefined
  // Generated covers are stored inline as data URLs; pack covers are static assets.
  return book.coverImage.startsWith('data:')
    ? book.coverImage
    : readerBookAssetUrl(book, book.coverImage)
}

function readerBookAssetUrl(book: ReaderBook, path: string): string {
  const base = import.meta.env.BASE_URL || '/'
  return `${base.replace(/\/$/u, '')}/reader-packs/${book.packId}/${path.replace(/^\//u, '')}`
}

type ReadingBookCategory = 'novel' | 'story'

// Which shelf each book lands on. Edit these to recategorize.
// Per-pack default; override an individual book by its id in READING_BOOK_CATEGORY.
const READING_PACK_CATEGORY: Record<string, ReadingBookCategory> = {
  [GENERATED_STORIES_PACK_ID]: 'story',
  'lms-books': 'novel',
  'sherlock-holmes': 'novel',
  'rise-of-the-monkey-king': 'novel',
  'just-friends': 'novel',
  'can-i-dance': 'novel',
  'john-gospel': 'story',
}
const READING_BOOK_CATEGORY: Record<string, ReadingBookCategory> = {
  // 'some-book-id': 'story',
}

function readingBookCategory(book: ReaderBook): ReadingBookCategory {
  return READING_BOOK_CATEGORY[book.id] ?? READING_PACK_CATEGORY[book.packId] ?? 'novel'
}

type ReadingCategoryView = null | 'novels' | 'stories' | 'comics' | 'visualNovels'

function ReadingTextsLibrary({
  readerBooks,
  comprehensionByBook,
  resumeLocation,
  onBack,
  onChooseBook,
  onBrowseNovels,
  onOpenComic,
  onOpenComics,
  onOpenRenpyPrototype,
  onOpenRenpyLms,
  onOpenVisualNovel,
  onGenerateStory,
  onContinueStory,
  onDeleteStory,
  aiStoryBusy,
  aiStoryMessage,
  canGenerateAiStories,
  aiStoryDefaults,
}: {
  readerBooks: ReaderBook[]
  comprehensionByBook: Map<string, ReaderBookComprehension>
  resumeLocation?: ReaderResumeLocation
  onBack: () => void
  onChooseBook: (book: ReaderBook, action?: 'resume' | 'start') => void | Promise<void>
  onBrowseNovels: () => void
  onOpenComic: (packId: string, mode: 'continue' | 'start') => void
  onOpenComics: () => void
  onOpenRenpyPrototype: () => void
  onOpenRenpyLms: () => void
  onOpenVisualNovel: (book?: ReaderBook) => void
  onGenerateStory: (prompt: string, options: { lengthChars: number; model: string; cover: boolean; audio: boolean; world?: StoryWorldSelection }) => Promise<GeneratedStoryResult>
  onContinueStory: (book: ReaderBook) => Promise<GeneratedStoryResult>
  onDeleteStory: (book: ReaderBook) => Promise<void>
  aiStoryBusy: boolean
  aiStoryMessage: string | null
  canGenerateAiStories: boolean
  aiStoryDefaults: { model: string; lengthChars: number; generateCover: boolean; generateAudio: boolean; azureConfigured: boolean }
}) {
  const [category, setCategory] = useState<ReadingCategoryView>(null)

  const novels = sortReaderBooksByKnownPercent(
    readerBooks.filter((b) => readingBookCategory(b) === 'novel'),
    comprehensionByBook,
    resumeLocation?.book.id,
  )
  const stories = sortReaderBooksByKnownPercent(
    readerBooks.filter((b) => readingBookCategory(b) === 'story'),
    comprehensionByBook,
    resumeLocation?.book.id,
  )
  const generatedBooks = stories.filter((b) => b.packId === GENERATED_STORIES_PACK_ID)
  const shelfStories = stories.filter((b) => b.packId !== GENERATED_STORIES_PACK_ID)

  const renderBookShelf = (books: ReaderBook[], emptyLabel: string) =>
    books.length > 0 ? (
      <div className="reading-book-shelf">
        <div className="reading-book-grid">
          {books.map((book, index) => {
            const comprehension = comprehensionByBook.get(book.id)
            const isResumeBook = resumeLocation?.book.id === book.id
            const progress = isResumeBook ? resumeLocation.percent : 0
            return (
              <article className="reading-library-book" key={book.id}>
                <div className={`reading-book-cover reading-book-cover-${index % 4}`}>
                  {book.coverImage ? (
                    <img src={readerBookCoverSrc(book)} alt="" />
                  ) : null}
                  <span>{book.title}</span>
                </div>
                <div className="reading-book-copy">
                  <div>
                    <h3>{book.title}</h3>
                    <p>
                      Chapters {book.chapterStart}-{book.chapterEnd} · {book.stories.length} stories
                    </p>
                  </div>
                  <div className="reading-book-progress" aria-hidden="true">
                    <span style={{ width: `${progress}%` }} />
                  </div>
                  <small>
                    {isResumeBook
                      ? `Continue at sentence ${resumeLocation.sentenceIndex + 1}`
                      : `${comprehension?.knownPercent ?? 0}% vocabulary known · ${readerComfortLabel(comprehension?.knownPercent ?? 0)}`}
                  </small>
                  <div className="reading-book-actions">
                    {isResumeBook ? (
                      <button
                        type="button"
                        className="primary"
                        onClick={() => void onChooseBook(book, 'resume')}
                      >
                        Resume
                      </button>
                    ) : null}
                    <button type="button" onClick={() => void onChooseBook(book, 'start')}>
                      Start
                    </button>
                    {book.visualNovelWorldId ? (
                      <button
                        type="button"
                        className="reading-scene-action"
                        onClick={() => onOpenVisualNovel(book)}
                      >
                        Scene mode
                      </button>
                    ) : null}
                  </div>
                </div>
              </article>
            )
          })}
        </div>
      </div>
    ) : (
      <div className="reading-library-empty">
        <strong>{emptyLabel}</strong>
        <span>Books you add to this shelf will appear here.</span>
      </div>
    )

  // ── Category sub-views ──
  if (category === 'novels' || category === 'stories') {
    const isNovels = category === 'novels'
    return (
      <section className="screen reading-texts-screen">
        <header className="reading-library-heading">
          <button type="button" className="ghost-answer reading-back-button" onClick={() => setCategory(null)}>
            Back to Reading
          </button>
          <div>
            <span className="reading-library-mark" aria-hidden="true">{isNovels ? '文' : '事'}</span>
            <div>
              <h1>{isNovels ? 'Novels' : 'Stories'}</h1>
              <p>{isNovels ? 'Long-form books with pinyin, translations, and audio.' : 'Short reads and standalone texts.'}</p>
            </div>
          </div>
        </header>
        <section className="reading-library-section">
          <div className="reading-section-heading">
            <div>
              <h2>{isNovels ? novels.length : stories.length} {isNovels ? 'novels' : 'stories'}</h2>
              <p>Tap a cover to start reading.</p>
            </div>
            <button type="button" className="ghost-answer" onClick={onBrowseNovels}>
              Classic library
            </button>
          </div>
          {!isNovels ? (
            <GenerateStoryPanel
              disabled={!canGenerateAiStories}
              busy={aiStoryBusy}
              message={aiStoryMessage}
              onGenerate={onGenerateStory}
              onOpenGenerated={(book) => void onChooseBook(book, 'start')}
              defaults={aiStoryDefaults}
            />
          ) : null}
          {!isNovels && generatedBooks.length > 0 ? (
            <details className="generated-story-list" open>
              <summary>Generated stories ({generatedBooks.length})</summary>
              {generatedBooks.map((book) => {
                const comprehension = comprehensionByBook.get(book.id)
                const cover = readerBookCoverSrc(book)
                return (
                  <div className="generated-story-row" key={book.id}>
                    {cover ? (
                      <img src={cover} alt="" />
                    ) : (
                      <span className="generated-story-thumb-fallback" aria-hidden="true">书</span>
                    )}
                    <div className="generated-story-meta">
                      <strong>{book.title}</strong>
                      <small>
                        {book.stories.length} chapter{book.stories.length > 1 ? 's' : ''} ·{' '}
                        {comprehension?.knownPercent ?? 0}% known
                      </small>
                    </div>
                    <div className="generated-story-actions">
                      <button
                        type="button"
                        className="primary"
                        onClick={() => void onChooseBook(book, resumeLocation?.book.id === book.id ? 'resume' : 'start')}
                      >
                        Read
                      </button>
                      <button type="button" disabled={aiStoryBusy} onClick={() => void onContinueStory(book)}>
                        Continue
                      </button>
                      <button type="button" className="danger" onClick={() => void onDeleteStory(book)}>
                        Delete
                      </button>
                    </div>
                  </div>
                )
              })}
            </details>
          ) : null}
          {renderBookShelf(isNovels ? novels : shelfStories, isNovels ? 'No novels yet.' : 'No stories yet.')}
        </section>
      </section>
    )
  }

  if (category === 'comics') {
    return (
      <section className="screen reading-texts-screen">
        <header className="reading-library-heading">
          <button type="button" className="ghost-answer reading-back-button" onClick={() => setCategory(null)}>
            Back to Reading
          </button>
          <div>
            <span className="reading-library-mark" aria-hidden="true">漫</span>
            <div>
              <h1>Comics</h1>
              <p>Read pages with bubble transcripts and vocabulary lookup.</p>
            </div>
          </div>
        </header>
        <ComicShelf onOpenComic={onOpenComic} onManage={onOpenComics} />
      </section>
    )
  }

  if (category === 'visualNovels') {
    return (
      <section className="screen reading-texts-screen">
        <header className="reading-library-heading">
          <button type="button" className="ghost-answer reading-back-button" onClick={() => setCategory(null)}>
            Back to Reading
          </button>
          <div>
            <span className="reading-library-mark" aria-hidden="true">剧</span>
            <div>
              <h1>Visual Novels</h1>
              <p>Interactive stories with scenes, dialogue, and choices.</p>
            </div>
          </div>
        </header>
        <section className="reading-library-section">
          <div className="reading-book-shelf">
            <div className="reading-book-grid">
              <article className="reading-library-book reading-vn-book">
                <div className="reading-book-cover reading-book-cover-0">
                  <span>Scene Mode</span>
                </div>
                <div className="reading-book-copy">
                  <div>
                    <h3>Interactive Scenes</h3>
                    <p>Quest-based world with dialogue choices.</p>
                  </div>
                  <div className="reading-book-actions">
                    <button type="button" className="primary" onClick={() => onOpenVisualNovel()}>Play</button>
                  </div>
                </div>
              </article>
              <article className="reading-library-book reading-vn-book">
                <div className="reading-book-cover reading-book-cover-1">
                  <span>Just Friends?</span>
                </div>
                <div className="reading-book-copy">
                  <div>
                    <h3>Just Friends?</h3>
                    <p>Exported Ren'Py web build.</p>
                  </div>
                  <div className="reading-book-actions">
                    <button type="button" className="primary" onClick={onOpenRenpyPrototype}>Play</button>
                  </div>
                </div>
              </article>
              <article className="reading-library-book reading-vn-book">
                <div className="reading-book-cover reading-book-cover-2">
                  <span>Moonlight Sculptor</span>
                </div>
                <div className="reading-book-copy">
                  <div>
                    <h3>Moonlight Sculptor</h3>
                    <p>Main story with ruby pinyin and English toggles.</p>
                  </div>
                  <div className="reading-book-actions">
                    <button type="button" className="primary" onClick={onOpenRenpyLms}>Play</button>
                  </div>
                </div>
              </article>
            </div>
          </div>
        </section>
      </section>
    )
  }

  // ── Hub: 4 category tiles ──
  return (
    <section className="screen reading-texts-screen">
      <header className="reading-library-heading">
        <button type="button" className="ghost-answer reading-back-button" onClick={onBack}>
          Back to Dashboard
        </button>
        <div>
          <span className="reading-library-mark" aria-hidden="true">阅</span>
          <div>
            <h1>Reading</h1>
            <p>Pick a format, then choose what to read.</p>
          </div>
        </div>
      </header>

      {resumeLocation ? (
        <section className="reading-continue" aria-labelledby="reading-continue-title">
          <div className="reading-continue-copy">
            <span>Continue reading</span>
            <h2 id="reading-continue-title">{resumeLocation.book.title}</h2>
            <p>Chapter {resumeLocation.chapter} · {resumeLocation.story}</p>
            <div className="reading-progress-row">
              <div className="reading-progress-track" aria-label={`${resumeLocation.percent}% read`}>
                <span style={{ width: `${resumeLocation.percent}%` }} />
              </div>
              <strong>{resumeLocation.percent}%</strong>
            </div>
            <small>
              Sentence {resumeLocation.sentenceIndex + 1} of {resumeLocation.sentenceCount}
            </small>
          </div>
          <div className="reading-continue-books" aria-hidden="true">
            <span>故事</span>
            <span>中文</span>
            <span>阅读</span>
          </div>
          <button
            type="button"
            className="primary reading-continue-action"
            onClick={() => void onChooseBook(resumeLocation.book, 'resume')}
          >
            Resume
            <span aria-hidden="true">→</span>
          </button>
        </section>
      ) : null}

      <section className="reading-formats-section" aria-labelledby="reading-formats-title">
        <div className="reading-formats-grid">
          <button type="button" className="reading-format reading-format-novels" onClick={() => setCategory('novels')}>
            <span className="reading-format-icon" aria-hidden="true">文</span>
            <span>
              <strong>Novels</strong>
              <small>{novels.length} long-form books with pinyin and audio.</small>
            </span>
            <span className="reading-format-arrow" aria-hidden="true">→</span>
          </button>
          <button type="button" className="reading-format reading-format-comics" onClick={() => setCategory('comics')}>
            <span className="reading-format-icon" aria-hidden="true">漫</span>
            <span>
              <strong>Comics</strong>
              <small>Pages with bubble transcripts and vocabulary lookup.</small>
            </span>
            <span className="reading-format-arrow" aria-hidden="true">→</span>
          </button>
          <button type="button" className="reading-format reading-format-novels" onClick={() => setCategory('stories')}>
            <span className="reading-format-icon" aria-hidden="true">事</span>
            <span>
              <strong>Stories</strong>
              <small>{stories.length} short reads and standalone texts.</small>
            </span>
            <span className="reading-format-arrow" aria-hidden="true">→</span>
          </button>
          <button type="button" className="reading-format reading-format-novel" onClick={() => setCategory('visualNovels')}>
            <span className="reading-format-icon" aria-hidden="true">剧</span>
            <span>
              <strong>Visual Novels</strong>
              <small>Interactive scenes, dialogue, and Ren'Py stories.</small>
            </span>
            <span className="reading-format-arrow" aria-hidden="true">→</span>
          </button>
        </div>
      </section>
    </section>
  )
}

function GenerateStoryPanel({
  disabled,
  busy,
  message,
  onGenerate,
  onOpenGenerated,
  defaults,
}: {
  disabled: boolean
  busy: boolean
  message: string | null
  onGenerate: (prompt: string, options: { lengthChars: number; model: string; cover: boolean; audio: boolean; world?: StoryWorldSelection }) => Promise<GeneratedStoryResult>
  onOpenGenerated: (book: ReaderBook) => void
  defaults: { model: string; lengthChars: number; generateCover: boolean; generateAudio: boolean; azureConfigured: boolean }
}) {
  const [prompt, setPrompt] = useState('')
  const [lengthChars, setLengthChars] = useState(defaults.lengthChars)
  const [model, setModel] = useState(defaults.model)
  const [cover, setCover] = useState(defaults.generateCover)
  const [audio, setAudio] = useState(defaults.generateAudio && defaults.azureConfigured)
  const [lastResult, setLastResult] = useState<GeneratedStoryResult | null>(null)
  const [localMessage, setLocalMessage] = useState<string | null>(null)
  const [world, setWorld] = useState<StoryWorldSelection>(() => loadStoryWorldSelection())
  const [aboutWorldId, setAboutWorldId] = useState<string | null>(null)
  const [editingFamily, setEditingFamily] = useState(false)
  const [familyDraft, setFamilyDraft] = useState('')
  const [familyEditMessage, setFamilyEditMessage] = useState<string | null>(null)

  function updateWorld(patch: Partial<StoryWorldSelection>) {
    setWorld((current) => {
      const next = { ...current, ...patch }
      saveStoryWorldSelection(next)
      return next
    })
  }

  function openFamilyEditor() {
    setFamilyDraft(JSON.stringify(loadFamilyProfile(), null, 2))
    setFamilyEditMessage(null)
    setEditingFamily(true)
  }

  function saveFamilyDraft() {
    try {
      const parsed = JSON.parse(familyDraft) as typeof DEFAULT_FAMILY_PROFILE
      if (typeof parsed.setting !== 'string' || !Array.isArray(parsed.characters) || !Array.isArray(parsed.rules)) {
        throw new Error('Profile needs "setting" (text), "characters" (list), and "rules" (list).')
      }
      saveFamilyProfile(parsed)
      setFamilyEditMessage('Family details saved.')
      setEditingFamily(false)
    } catch (error) {
      setFamilyEditMessage(error instanceof Error ? error.message : 'Invalid JSON.')
    }
  }

  async function submit() {
    setLocalMessage(null)
    try {
      const result = await onGenerate(prompt, { lengthChars, model, cover, audio, world })
      setLastResult(result)
      setLocalMessage(null)
    } catch (error) {
      setLocalMessage(error instanceof Error ? error.message : 'Could not generate a story.')
    }
  }

  const coverage = lastResult?.validation.knownCoveragePercent
  const coverageTooHard = coverage !== undefined && coverage < GENERATED_STORY_TARGET_COVERAGE
  const selectedWorld = STORY_WORLDS.find((w) => w.id === world.worldId)

  return (
    <section className="generate-story-panel">
      <div>
        <h3>Generate a known-word story</h3>
        <p>Pick a story world, write an optional prompt, and the app will write a bilingual story built from your mature known words.</p>
      </div>
      <div className="story-world-grid" role="radiogroup" aria-label="Story world">
        {STORY_WORLDS.map((w) => (
          <button
            key={w.id}
            type="button"
            role="radio"
            aria-checked={world.worldId === w.id}
            className={`story-world-card${world.worldId === w.id ? ' selected' : ''}`}
            onClick={() => updateWorld({ worldId: w.id })}
            disabled={disabled || busy}
          >
            <span className="story-world-icon" aria-hidden="true">{w.icon}</span>
            <span className="story-world-copy">
              <strong>{w.title}</strong>
              <small>{w.subtitle}</small>
            </span>
          </button>
        ))}
      </div>
      {selectedWorld && (
        <div className="story-world-detail">
          <button
            type="button"
            className="story-world-about-toggle"
            onClick={() => setAboutWorldId(aboutWorldId === selectedWorld.id ? null : selectedWorld.id)}
          >
            {aboutWorldId === selectedWorld.id ? 'Hide details' : 'About this world'}
          </button>
          {aboutWorldId === selectedWorld.id && (
            <p className="story-world-description">{selectedWorld.description}</p>
          )}
          {world.worldId === 'gospel-john' && (
            <div className="segmented-control story-world-suboption" aria-label="Gospel story mode">
              <button
                type="button"
                className={world.gospelMode === 'retelling' ? 'active' : ''}
                onClick={() => updateWorld({ gospelMode: 'retelling' })}
                disabled={disabled || busy}
              >
                Biblical retelling
              </button>
              <button
                type="button"
                className={world.gospelMode === 'companion' ? 'active' : ''}
                onClick={() => updateWorld({ gospelMode: 'companion' })}
                disabled={disabled || busy}
              >
                Imaginative companion story
              </button>
            </div>
          )}
          {world.worldId === 'lms' && (
            <label className="generate-story-check story-world-suboption">
              <input
                type="checkbox"
                checked={!world.lmsAllowSpoilers}
                onChange={(event) => updateWorld({ lmsAllowSpoilers: !event.target.checked })}
                disabled={disabled || busy}
              />
              <span>Avoid spoilers (original early-story side adventures)</span>
            </label>
          )}
          {world.worldId === 'family' && (
            <div className="story-world-suboption">
              {editingFamily ? (
                <div className="story-world-family-editor">
                  <textarea
                    value={familyDraft}
                    onChange={(event) => setFamilyDraft(event.target.value)}
                    rows={12}
                    spellCheck={false}
                    aria-label="Family world profile JSON"
                  />
                  <div className="generate-story-actions">
                    <button type="button" className="primary" onClick={saveFamilyDraft}>Save details</button>
                    <button type="button" onClick={() => setEditingFamily(false)}>Cancel</button>
                    <button
                      type="button"
                      onClick={() => setFamilyDraft(JSON.stringify(DEFAULT_FAMILY_PROFILE, null, 2))}
                    >
                      Reset to default
                    </button>
                  </div>
                </div>
              ) : (
                <button type="button" onClick={openFamilyEditor}>Edit World Details</button>
              )}
              {familyEditMessage && <small>{familyEditMessage}</small>}
            </div>
          )}
        </div>
      )}
      <label>
        <span>Prompt{world.worldId === 'original' ? '' : ' (optional)'}</span>
        <textarea
          value={prompt}
          onChange={(event) => setPrompt(event.target.value)}
          placeholder={
            world.worldId === 'family'
              ? 'A camping trip where Anna finds a mysterious map...'
              : world.worldId === 'lms'
                ? 'Weed takes a sculpting commission from a suspicious NPC...'
                : world.worldId === 'gospel-john'
                  ? 'The wedding at Cana, or a fisherman who hears Jesus teach...'
                  : 'A cozy story about a tiny robot... (or leave blank for a surprise)'
          }
          rows={3}
          maxLength={700}
          disabled={disabled || busy}
        />
      </label>
      <div className="generate-story-options">
        <label>
          <span>Length</span>
          <select
            value={lengthChars}
            onChange={(event) => setLengthChars(Number(event.target.value))}
            disabled={disabled || busy}
          >
            {AI_STORY_LENGTHS.map((length) => (
              <option key={length} value={length}>≈ {length} characters</option>
            ))}
          </select>
        </label>
        <label>
          <span>Model</span>
          <select
            value={model}
            onChange={(event) => setModel(event.target.value)}
            disabled={disabled || busy}
          >
            {AI_STORY_MODELS.map((option) => (
              <option key={option.id} value={option.id}>{option.label}</option>
            ))}
          </select>
        </label>
        <label className="generate-story-check">
          <input
            type="checkbox"
            checked={cover}
            onChange={(event) => setCover(event.target.checked)}
            disabled={disabled || busy}
          />
          <span>Generate cover</span>
        </label>
        <label className="generate-story-check" title={defaults.azureConfigured ? undefined : 'Add an Azure Speech key in Settings > AI Story Generation to enable narration.'}>
          <input
            type="checkbox"
            checked={audio}
            onChange={(event) => setAudio(event.target.checked)}
            disabled={disabled || busy || !defaults.azureConfigured}
          />
          <span>Narrate with Azure{defaults.azureConfigured ? '' : ' (key needed)'}</span>
        </label>
      </div>
      <div className="generate-story-actions">
        <button
          type="button"
          className="primary"
          onClick={() => void submit()}
          disabled={disabled || busy}
        >
          {busy ? 'Generating...' : 'Generate Story'}
        </button>
        {lastResult ? (
          <button type="button" onClick={() => onOpenGenerated(lastResult.book)}>
            Read it
          </button>
        ) : null}
        {coverageTooHard && !busy ? (
          <button type="button" onClick={() => void submit()}>
            Regenerate simpler
          </button>
        ) : null}
      </div>
      {lastResult ? (
        <div className={`generate-story-coverage${coverageTooHard ? ' too-hard' : ''}`}>
          {coverage}% of this story is words you already know
          {coverageTooHard ? ' — below the 95% target, so it may feel hard.' : '.'}
          {lastResult.validation.unavoidableNewWords.length > 0
            ? ` New words: ${lastResult.validation.unavoidableNewWords.map((w) => w.word).join('、')}`
            : ''}
        </div>
      ) : null}
      <small>
        {disabled
          ? 'Add your OpenRouter API key under Settings > AI Story Generation to enable AI stories.'
          : localMessage ?? message ?? 'Targets at least 95% known-word coverage.'}
      </small>
    </section>
  )
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
  choiceB,
  showEnglish,
  storyChunk,
  storyChunkReceipt,
  listening,
  listeningRate,
  listeningRepeats,
  listeningAutoAdvance,
  statusHighlight,
  onChooseBook,
  onOpenLibrary,
  onResume,
  onPrevious,
  onNext,
  onListeningSettingsChange,
  onStartStoryChunk,
  onDismissStoryChunkReceipt,
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
  choiceB: string
  showEnglish: boolean
  storyChunk: StoryChunkSession | null
  storyChunkReceipt: StoryChunkReceipt | null
  listening: ReaderListeningController
  listeningRate: number
  listeningRepeats: number
  listeningAutoAdvance: boolean
  statusHighlight: boolean
  onChooseBook: (book: ReaderBook, action?: 'resume' | 'start') => void | Promise<void>
  onOpenLibrary: () => void
  onResume: () => void
  onPrevious: () => void | Promise<void>
  onNext: () => void | Promise<void>
  onListeningSettingsChange: (patch: Partial<Pick<
    UserSettings,
    'readerListeningRate' | 'readerListeningRepeats' | 'readerListeningAutoAdvance' | 'readerStatusHighlight'
  >>) => void
  onStartStoryChunk: () => void
  onDismissStoryChunkReceipt: () => void
  onSelectToken: (token: ReaderWordToken | null) => void
  onEditWord: (word: VocabWord) => void
  onPinyinModeChange: (mode: ReaderPinyinMode) => void
  onToggleEnglish: () => void
  readerDictionaryEntry: DictionaryEntry | null
  onSaveWord: (text: string, pinyin: string, meaning: string) => void | Promise<void>
}) {
  const [listeningMenuOpen, setListeningMenuOpen] = useState(false)
  const [readerMenuOpen, setReaderMenuOpen] = useState(false)
  const [grammarSelection, setGrammarSelection] = useState<GrammarMatch[] | null>(null)
  const [readerBouncing, setReaderBouncing] = useState(false)
  const [nextGlow, setNextGlow] = useState(false)
  const nextGlowTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  function triggerNextGlow() {
    if (nextGlowTimer.current) clearTimeout(nextGlowTimer.current)
    setNextGlow(true)
    nextGlowTimer.current = setTimeout(() => setNextGlow(false), 700)
  }

  const readerSwipe = useSwipeCard({
    glowColors: SWIPE_NAV_GLOW,
    directions: ['left', 'right', 'down'],
    onSwipe: (dir) => {
      if (dir === 'down') {
        setReaderBouncing(true)
        setTimeout(() => setReaderBouncing(false), 600)
        if (listening.active) listening.togglePlayPause()
        else listening.playSentenceOnce()
      } else if (dir === 'left' && sentenceIndex < sentenceCount - 1) {
        setGrammarSelection(null)
        readerSwipe.dismiss('left')
      } else if (dir === 'right' && sentenceIndex > 0) {
        setGrammarSelection(null)
        readerSwipe.dismiss('right')
      }
    },
    onDismissed: (dir) => {
      if (dir === 'left') {
        triggerNextGlow()
        void onNext()
      } else {
        void onPrevious()
      }
    },
  })

  const listeningRepeatTotal = listening.snapshot.mode === 'single' ? 1 : listeningRepeats
  const listeningPlaying =
    listening.snapshot.status === 'playing' || listening.snapshot.status === 'loading'

  const illustration = activeBook ? getReaderIllustration(activeBook, sentenceIndex) : undefined
  const illustrationSrc = illustration ? publicAssetPath(illustration.imageFilename) : ''
  const fallbackIllustrationSrc = illustration?.fallbackImageFilename
    ? publicAssetPath(illustration.fallbackImageFilename)
    : ''

  const grammarMatches = useMemo(
    () => (sentence ? findGrammarMatches(sentence.chinese) : []),
    [sentence],
  )
  const grammarTokenMap = useMemo(
    () => mapGrammarToTokens(grammarMatches, tokens),
    [grammarMatches, tokens],
  )
  const sortedReaderBooks = useMemo(
    () => sortReaderBooksByKnownPercent(readerBooks, comprehensionByBook, activeBook?.id),
    [activeBook?.id, comprehensionByBook, readerBooks],
  )

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
          <button type="button" onClick={onOpenLibrary}>
            Library
          </button>
          {activeBook && sentence && (
            <>
              <button
                type="button"
                className={storyChunk ? 'active' : ''}
                onClick={onStartStoryChunk}
                disabled={Boolean(storyChunk) || sentenceIndex >= sentenceCount}
                aria-label={storyChunk ? 'Story chunk running' : 'Start story chunk'}
              >
                {storyChunk ? 'Chunks ✓' : 'Chunks'}
              </button>
              <button
                type="button"
                className={listening.active ? 'active' : ''}
                onClick={() => setListeningMenuOpen(true)}
              >
                Listening Mode
              </button>
            </>
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
            {sortedReaderBooks.map((book) => {
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
                <span className="reader-comfort-label">{readerComfortLabel(comprehension?.knownPercent ?? 0)}</span>
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
                <div className="sentence-menu-wrap">
                  <button
                    type="button"
                    className="sentence-menu-btn"
                    onClick={() => setReaderMenuOpen(o => !o)}
                    aria-label="Reader menu"
                  >
                    ☰
                  </button>
                  <StudyMenuPopup open={readerMenuOpen} onClose={() => setReaderMenuOpen(false)}>
                    <StudyMenuSection label="Display">
                      <StudyMenuSelect
                        label="Pinyin"
                        value={pinyinMode}
                        options={readerPinyinModes.map(mode => ({ value: mode.value, label: mode.label }))}
                        onChange={value => onPinyinModeChange(value as ReaderPinyinMode)}
                      />
                      <StudyMenuToggle label="English" checked={showEnglish} onChange={() => onToggleEnglish()} />
                      <StudyMenuToggle
                        label="Word highlights"
                        checked={statusHighlight}
                        onChange={checked => onListeningSettingsChange({ readerStatusHighlight: checked })}
                      />
                    </StudyMenuSection>
                    <StudyMenuSection label="Playback">
                      <StudyMenuSelect
                        label="Speed"
                        value={listeningRate}
                        options={[0.6, 0.7, 0.8, 0.9, 1, 1.1, 1.2].map(r => ({ value: r, label: `${r.toFixed(1)}×` }))}
                        onChange={value => onListeningSettingsChange({ readerListeningRate: value })}
                      />
                      <StudyMenuSelect
                        label="Repeats"
                        value={listeningRepeats}
                        options={[1, 2, 3, 4, 5].map(n => ({ value: n, label: `${n}×` }))}
                        onChange={value => onListeningSettingsChange({ readerListeningRepeats: value })}
                      />
                      <StudyMenuToggle
                        label="Auto-advance"
                        checked={listeningAutoAdvance}
                        onChange={checked => onListeningSettingsChange({ readerListeningAutoAdvance: checked })}
                      />
                    </StudyMenuSection>
                  </StudyMenuPopup>
                </div>
                <span>{activeBook.title}</span>
                <span>
                  Sentence {sentenceIndex + 1} / {sentenceCount}
                </span>
              </div>
              <div className="reader-progress-bar" aria-label={`Story progress ${readerProgressPercent(sentenceIndex, sentenceCount)}%`}>
                <span style={{ width: `${readerProgressPercent(sentenceIndex, sentenceCount)}%` }} />
              </div>
              {storyChunkReceipt ? (
                <section className="story-chunk-receipt" aria-live="polite">
                  <div className="story-chunk-receipt-summary">
                    <strong>{storyChunkReceipt.title}</strong>
                    <span>{storyChunkReceipt.sentencesRead} sentences · {formatDuration(storyChunkReceipt.activeSeconds)}</span>
                    <span className="story-chunk-receipt-words">
                      {storyChunkReceipt.unsavedWordsTapped + storyChunkReceipt.learningWords} new/learning words met
                      {storyChunkReceipt.wordsSaved > 0 ? ` · ${storyChunkReceipt.wordsSaved} saved` : ''}
                    </span>
                  </div>
                  <div className="story-chunk-receipt-actions">
                    <button type="button" className="primary" onClick={() => { onDismissStoryChunkReceipt(); onStartStoryChunk() }}>
                      Continue
                    </button>
                    <button type="button" onClick={onDismissStoryChunkReceipt}>
                      Done
                    </button>
                  </div>
                </section>
              ) : null}
              <div
                className={`reader-swipe-zone${readerBouncing ? ' reader-bounce-down' : ''}`}
                {...readerSwipe.handlers}
              >
                  <div
                    key={`${sentence.id}-${readerSwipe.animKey}`}
                    // eslint-disable-next-line react-hooks/refs -- Passing the swipe hook ref into JSX; this does not read ref.current during render.
                    ref={readerSwipe.cardRef}
                    className={`reader-reading-area card-enter${listening.active ? ' reader-listening-highlight' : ''}${readerSwipe.dismissClass ? ` ${readerSwipe.dismissClass}` : ''}`}
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
                      statusHighlight={statusHighlight}
                      onSelectToken={(token) => {
                        setGrammarSelection(null)
                        onSelectToken(token)
                      }}
                      onGrammarSelect={(matches) => setGrammarSelection(matches)}
                      grammarTokenMap={grammarTokenMap}
                    />
                  </div>
                <p
                  className={`reader-translation ${
                    showEnglish || listening.active ? 'revealed' : 'blur-reveal'
                  }${listening.active ? ' reader-listening-highlight' : ''}`}
                >
                  {sentence.english}
                </p>
              </div>
              {storyChunk && (
                <div className="story-chunk-counter" aria-live="polite">
                  <span className="story-chunk-counter-done">{storyChunk.sentenceIdsRead.length}</span>
                  <span className="story-chunk-counter-sep"> / </span>
                  <span>{storyChunk.endIndex - storyChunk.startIndex + 1}</span>
                  <span className="story-chunk-counter-label"> sentences in chunk</span>
                </div>
              )}
              {nextGlow && <div className="reader-next-glow" aria-hidden="true" />}
              {listening.active ? (
                <div className="reader-listening-dock" aria-live="polite">
                  <div className="reader-listening-controls" aria-label="Reader listening controls">
                    <button
                      type="button"
                      className="sentence-menu-btn reader-listening-icon-btn"
                      onClick={() => setListeningMenuOpen(true)}
                      aria-label={`Listening settings. Repeat ${listening.snapshot.repeatNumber} of ${listeningRepeatTotal}, ${listeningRate.toFixed(1)} times speed, auto-advance ${listeningAutoAdvance ? 'on' : 'off'}.`}
                    >
                      ☰
                    </button>
                    <button
                      type="button"
                      className="sentence-play-pause reader-listening-play-btn"
                      onClick={listening.togglePlayPause}
                      aria-label={listeningPlaying ? 'Pause listening' : 'Play listening'}
                    >
                      {listeningPlaying ? (
                        <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor" aria-hidden="true">
                          <rect x="5" y="4" width="4" height="16" rx="1" />
                          <rect x="15" y="4" width="4" height="16" rx="1" />
                        </svg>
                      ) : (
                        <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor" aria-hidden="true">
                          <polygon points="5,3 19,12 5,21" />
                        </svg>
                      )}
                    </button>
                    <button
                      type="button"
                      className="sentence-end-btn reader-listening-icon-btn reader-listening-stop-btn"
                      onClick={listening.stop}
                      aria-label="Stop listening"
                    >
                      <svg viewBox="0 0 24 24" width="17" height="17" fill="currentColor" aria-hidden="true">
                        <rect x="6" y="6" width="12" height="12" rx="2" />
                      </svg>
                    </button>
                    <button
                      type="button"
                      className="sentence-end-btn reader-listening-icon-btn"
                      onClick={() => { setGrammarSelection(null); triggerNextGlow(); void onNext() }}
                      disabled={sentenceIndex >= sentenceCount - 1}
                      aria-label={`Next sentence. Choice B hotkey: ${choiceB.toUpperCase()}.`}
                    >
                      <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor" aria-hidden="true">
                        <polygon points="5,4 15,12 5,20" />
                        <rect x="17" y="5" width="2" height="14" rx="1" />
                      </svg>
                    </button>
                  </div>
                </div>
              ) : (
                <StudyControls
                  playing={listeningPlaying}
                  onTogglePlay={() => {
                    if (listening.active) listening.togglePlayPause()
                    else listening.playSentenceOnce()
                  }}
                  onPrevious={() => { setGrammarSelection(null); void onPrevious() }}
                  onNext={() => { setGrammarSelection(null); triggerNextGlow(); void onNext() }}
                  prevDisabled={sentenceIndex <= 0}
                  nextDisabled={sentenceIndex >= sentenceCount - 1}
                  prevLabel="Previous sentence"
                  nextLabel={`Next sentence. Hotkey: ${choiceB.toUpperCase()}.`}
                  playLabel={listeningPlaying ? `Pause. Hotkey: ${replayHotkey.toUpperCase()}.` : `Play sentence. Hotkey: ${replayHotkey.toUpperCase()}.`}
                />
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
              {grammarSelection && (
                <GrammarPopover
                  matches={grammarSelection}
                  onClose={() => setGrammarSelection(null)}
                />
              )}
              {grammarMatches.length > 0 && !grammarSelection && !selectedToken && (
                <div className="grammar-hint" aria-label={`${grammarMatches.length} grammar points highlighted`}>
                  {grammarMatches.length} grammar {grammarMatches.length === 1 ? 'point' : 'points'} highlighted
                </div>
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

function ReadingWpmTrendChart({ points }: { points: DashboardStats['readingSeries'] }) {
  const readablePoints = points.filter((point) => point.wordsRead > 0 || point.activeSeconds > 0)
  const latest = [...readablePoints].reverse().find((point) => point.wpm > 0)
  const peakWpm = Math.max(1, ...points.map((point) => point.wpm))
  if (readablePoints.length === 0) {
    return <div className="progress-caption">No reading speed data yet</div>
  }
  return (
    <div className="reading-wpm-trend">
      <div className="reading-wpm-summary">
        <strong>{latest?.wpm ?? 0}</strong>
        <span>latest WPM</span>
      </div>
      <div className="reading-wpm-chart" aria-label="Reading words per minute over the last 12 weeks">
        <ResponsiveContainer width="100%" height="100%" minWidth={0}>
          <LineChart data={points} margin={{ top: 12, right: 16, left: 0, bottom: 4 }}>
            <CartesianGrid strokeDasharray="3 3" opacity={0.18} />
            <XAxis dataKey="date" tickFormatter={shortMonthDay} minTickGap={18} />
            <YAxis width={34} domain={[0, Math.ceil(peakWpm * 1.2)]} />
            <Tooltip
              formatter={(value: unknown, name: unknown) => {
                if (name === 'wpm') return [`${Number(value ?? 0)} WPM`, 'Reading speed']
                return [String(value ?? 0), String(name)]
              }}
              labelFormatter={(label) => friendlyDate(String(label))}
            />
            <Line
              type="monotone"
              dataKey="wpm"
              name="wpm"
              stroke="var(--accent-vibrant)"
              strokeWidth={3}
              dot={{ r: 4, strokeWidth: 2, fill: 'var(--card-solid)' }}
              activeDot={{ r: 7 }}
              connectNulls
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
      <p>Timing pauses after 1 minute without reader activity.</p>
    </div>
  )
}

function ReadingGraduatedCounter({
  current,
  previous,
  allTime,
  rangeLabel,
}: {
  current: number
  previous?: number
  allTime: number
  rangeLabel: string
}) {
  const denominator = Math.max(1, allTime)
  const percent = Math.min(100, Math.round((current / denominator) * 100))
  const delta = previous === undefined ? undefined : current - previous
  return (
    <div className="reading-graduated-counter">
      <div className="reading-graduated-number">
        <strong>{current}</strong>
        <span>{rangeLabel}</span>
      </div>
      <div className="reading-graduated-meter" aria-label={`${current} words saved from reading`}>
        <span style={{ width: `${percent}%` }} />
      </div>
      <p>
        {allTime} total saved from reading
        {delta !== undefined ? ` - ${delta >= 0 ? '+' : ''}${delta} vs previous period` : ''}
      </p>
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
          <Bar dataKey="unknown" name="Unseen" stackId="a" fill="#cbd5e1" />
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

function formatFsrsDelay(intervalDays: number): string {
  if (intervalDays < 1) {
    return `${Math.max(1, Math.round(intervalDays * 24 * 60))}m`
  }
  return `${Math.round(intervalDays)}d`
}

function FlashcardReview({
  word,
  answerShown,
  frontMode = 'text',
  onFlip,
  onReplayAudio,
  onRate,
  onToggleActiveRecallPriority,
  selectedRating,
  externalDismissDir,
  choiceKeys,
}: {
  word: VocabWord
  answerShown: boolean
  frontMode?: FlashcardFrontMode
  onFlip: () => void
  onReplayAudio?: () => void | Promise<void>
  onRate: (rating: FsrsRating) => void | Promise<void>
  onToggleActiveRecallPriority?: () => void | Promise<void>
  selectedRating?: FsrsRating | null
  externalDismissDir?: string | null
  choiceKeys?: HotkeySettings
}) {
  const audioFront = frontMode === 'audio' && !answerShown
  const reverseFront = frontMode === 'reverse' && !answerShown
  const [flipPhase, setFlipPhase] = useState<'idle' | 'out' | 'in'>('idle')

  const FLASHCARD_SWIPE_RATING: Record<SwipeDir, FsrsRating> = {
    left: 'again', up: 'hard', right: 'good', down: 'easy',
  }
  const FLASHCARD_SWIPE_LABEL: Record<SwipeDir, string> = {
    left: 'Again', up: 'Hard', right: 'Good', down: 'Easy',
  }

  const swipe = useSwipeCard({
    enabled: answerShown && !selectedRating && !externalDismissDir,
    onSwipe: (dir) => {
      swipe.dismiss(dir)
      void onRate(FLASHCARD_SWIPE_RATING[dir])
    },
  })
  const { cardRef, swipeDir, dismissDir } = swipe

  useEffect(() => {
    // Reset transient swipe state when the card changes.
    swipe.reset()
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setFlipPhase('idle')
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [word.id])

  const handleCardClick = useCallback(() => {
    if (answerShown || flipPhase !== 'idle' || dismissDir || externalDismissDir) return
    setFlipPhase('out')
    window.setTimeout(() => {
      onFlip()
      setFlipPhase('in')
      window.setTimeout(() => setFlipPhase('idle'), 200)
    }, 200)
  }, [answerShown, dismissDir, externalDismissDir, flipPhase, onFlip])

  return (
    <section
      className="flashcard-review"
      {...swipe.handlers}
    >
      <div
        key={word.id}
        ref={cardRef}
        className={[
          'flashcard',
          answerShown ? 'answer-side' : 'front-side',
          audioFront ? 'audio-front' : '',
          reverseFront ? 'reverse-front' : '',
          (externalDismissDir ?? dismissDir) ? `card-dismiss-${externalDismissDir ?? dismissDir}` : '',
          flipPhase !== 'idle' ? `flashcard-flip-${flipPhase}` : '',
        ].filter(Boolean).join(' ')}
        onClick={!answerShown ? handleCardClick : undefined}
        style={{ cursor: !answerShown ? 'pointer' : undefined }}
        role={!answerShown ? 'button' : undefined}
        tabIndex={!answerShown ? 0 : undefined}
        onKeyDown={!answerShown ? (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); handleCardClick() } } : undefined}
      >
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
        {answerShown && onToggleActiveRecallPriority && (
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
        {answerShown && (() => {
          const previews = previewFsrsRatings(word)
          return (
            <div className="fsrs-interval-preview">
              <span>Again {formatFsrsDelay(previews.again.intervalDays)}</span>
              <span>Hard {formatFsrsDelay(previews.hard.intervalDays)}</span>
              <span>Good {formatFsrsDelay(previews.good.intervalDays)}</span>
              <span>Easy {formatFsrsDelay(previews.easy.intervalDays)}</span>
            </div>
          )
        })()}
      </div>
      {answerShown && swipeDir && (
        <div className={`swipe-indicator swipe-indicator-${swipeDir}`}>
          {FLASHCARD_SWIPE_LABEL[swipeDir]}
        </div>
      )}
      {answerShown && !selectedRating && (
        <div className="swipe-instructions">
          {choiceKeys
            ? `← Again  ↑ Hard  → Good  ↓ Easy  ·  ${choiceKeys.choiceA.toUpperCase()} ${choiceKeys.choiceB.toUpperCase()} ${choiceKeys.choiceC.toUpperCase()} ${choiceKeys.choiceD.toUpperCase()}`
            : '← Again  ↑ Hard  → Good  ↓ Easy'}
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

function getFlashcardFrontMode(word: VocabWord | undefined, sessionId: string | null, audioOnly = false, audioPercent = 40): FlashcardFrontMode {
  if (!word) return 'text'
  if (audioOnly) return 'audio'
  const bucket = stableStringBucket(`${sessionId ?? 'flashcards'}:${word.id}`, 1000) / 1000
  if (bucket < FLASHCARD_REVERSE_RATE) return 'reverse'
  if (bucket < FLASHCARD_REVERSE_RATE + audioPercent / 100) return 'audio'
  return 'text'
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
    'readingAddedAt',
    'archivedAt',
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
      word.readingAddedAt ?? '',
      word.archivedAt ?? '',
    ].map(csvCell).join(','),
  )
  return [columns.join(','), ...rows].join('\n')
}

function csvCell(value: string | number): string {
  const text = String(value)
  return /[",\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text
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
