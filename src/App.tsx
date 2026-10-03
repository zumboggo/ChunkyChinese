import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { lazy, Suspense } from 'react'
import type { CSSProperties, ReactNode } from 'react'
import { motion } from 'framer-motion'
import {
  BarChart,
  Bar,
  ScatterChart,
  Scatter,
  ZAxis,
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
  downloadText,
  exportBackup,
  getAllClipPacks,
  getAllReaderBooks,
  getAllReaderPacks,
  getLatestReaderProgress,
  getAllReaderProgress,
  getReaderQueueState,
  getAllSentences,
  getAllWords,
  getAudioClip,
  getDashboardStats,
  getNewWordsPerDay,
  getHotkeys,
  getPromptAudioClips,
  getHostedClipPackIndex,
  getReaderProgress,
  importAudioFiles,
  importBackup,
  importClipPackFiles,
  importHostedClipPack,
  rateWordFsrs,
  recordEvent,
  repairAudioClipLinksIfNeeded,
  restoreArchivedWord,
  saveNewWordsPerDay,
  setHistoricalStudyMinutes,
  clearStudyTimeAdjustment,
  saveReaderProgress,
  saveReaderQueueState,
  saveGeneratedReaderBook,
  deleteGeneratedReaderBook,
  saveReaderVocabularyWord,
  seedLmsWordsIfEmpty,
  seedCoreWordsIfEmpty,
  seedReaderBooksIfEmpty,
  saveHotkeys,
  archiveWord,
  backfillReadingExposuresFromEvents,
  deleteWordPermanently,
  isActiveVocabWord,
  cleanupAccidentalEnglishOnlyCards,
  startReaderSession,
  updateReaderSession,
  applyReadingExposures,
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
  rebaselineReadingProgress,
} from './db'
import {
  countReadingDifficulty,
  focusedWpm,
  qualifyReadingSession,
  readingChallengePercent,
  shouldCountFocusedReadingSecond,
  READING_MIN_FOCUSED_SECONDS,
  READING_MIN_FOCUSED_WORDS,
} from './readingProgress'
import { generateAiStory, generateStoryCover, AI_STORY_MODELS, AI_STORY_LENGTHS } from './aiStories'
import { parseBilingualReaderText } from './readerTextImport'
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
import {
  filterPoolSentences,
  getSentencePool,
  type SentencePool,
} from './sentenceListening'
import {
  fsrsDueTime,
  isFsrsCardDue,
  isNewFsrsCard,
  previewFsrsRatings,
  masteryForWord,
  fsrsQueueBucket,
  fsrsQueueLabel,
  type FsrsQueueBucket,
} from './scheduler'
import {
  tokenizeReaderText,
  adaptiveReaderPinyinState,
} from './adaptiveText'
import {
  clearLegacyMeditationProgress,
  includeMeditativeScripture,
  MEDITATIVE_SCRIPTURE_BOOK,
  readLegacyMeditationProgress,
} from './meditationReader'
import { WordInfoPopover } from './WordInfoPopover'
import { FlashcardDeckImporter } from './FlashcardDeckImporter'
import { useReaderListeningController } from './useReaderListeningController'
import { shouldCountReaderActiveSecond } from './readerActivity'
import {
  buildReaderQueue,
  promoteLatestReaderBook,
  readingBookCategory,
  reorderReaderQueue,
} from './readerQueue'
import {
  ALL_FLASHCARD_DECK_ID,
  ORIGINAL_DECK_ID,
  effectiveWordDeckIds,
  flashcardDecksForWords,
  wordIsInSelectedFlashcardDecks,
} from './flashcardDecks'
import { cappedFlashcardStudySeconds } from './studyTime'
import type { ReaderListeningController } from './useReaderListeningController'
import { useSwipeCard, SWIPE_NAV_GLOW, type SwipeDir } from './useSwipeCard'
import { StudyMenuPopup, StudyMenuSection, StudyMenuToggle, StudyMenuSelect } from './StudyMenuPopup'
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
  FlashcardDeckId,
  HotkeySettings,
  HostedClipPack,
  ImportSummary,
  LessonPlan,

  LessonStep,
  ReaderBook,
  ReaderPack,
  ReaderSentence,
  ReaderStory,
  ReaderProgress,
  ReaderQueueState,
  ReaderWordToken,
  ReaderSession,
  ReaderSessionStats,
  RenderedLesson,
  Sentence,
  UserSettings,
  VocabWord,
  DictionaryEntry,
} from './types'
import { DeferredTaskCoordinator } from './deferredTasks'
import { clearStartupResumeState, loadStartupResumeState, saveStartupResumeState } from './startupResume'
import { markStartup } from './startupPerformance'
import {
  getCachedReaderComprehensionByBook,
  type ReaderBookComprehension,
  type ReaderComprehensionSummary,
} from './readerLibraryCache'
import {
  downloadReaderBookForOffline,
  getReaderBookOfflineStatus,
  readerBookOfflineAudioUrls,
  removeReaderBookOfflineDownload,
  type ReaderOfflineStatus,
} from './readerOffline'
import { getOfflineReadyAt, markOfflineReady, prepareOfflineAppShell } from './flightOffline'
import { installPrivateSentenceAudio } from './privateContent'
import {
  repairDataHealth,
  runDataHealthCheck,
  type DataHealthReport,
} from './dataHealth'

const UniversalImporter = lazy(() => import('./UniversalImporter').then((module) => ({ default: module.UniversalImporter })))
const ListeningCourse = lazy(() => import('./ListeningCourse'))

type Screen = 'listeningCourse' | 'dashboard' | 'reader' | 'settings' | 'lesson' | 'flashcards' | 'readingTexts' | 'words'
type FlashcardQueueMode = 'mixed' | 'due' | 'new'
type FlashcardFrontMode = 'text' | 'audio' | 'reverse'
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
type ReaderSessionRecap = {
  sentencesRead: number
  wordsRead: number
  exposuresCredited: number
  promoted: VocabWord[]
  activeSeconds: number
  focusedActiveSeconds: number
  focusedWordsRead: number
  focusedWpm: number
  challengePercent: number
  qualified: boolean
}
type StoryChunkSession = {
  id: string
  bookId: string
  packId: string
  startIndex: number
  endIndex: number
  startedActiveSeconds: number
  sentenceIdsRead: string[]
  metrics: StoryChunkMetrics
}
type GeneratedStoryResult = {
  book: ReaderBook
  story: GeneratedStoryPayload
  validation: GeneratedStoryValidation
}
type LmsSeedSentence = { word: string; chinese: string; english: string; topic?: string }

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
  listeningLessonsToday: 0,
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
  readingProgress: { points: [], qualifiedSessions: 0, focusedWordsRead: 0, medianChallenge: 0, bestSustainedPace: 0, baselineCount: 0, status: 'building', message: 'Complete a focused reading session to begin your progress map.' },
}

const FLASHCARD_LEARN_AHEAD_MS = 5 * 60 * 1000
const FLASHCARD_RATING_DISMISS_DIR: Record<FsrsRating, string> = {
  again: 'left',
  hard: 'up',
  good: 'right',
  easy: 'down',
}
const FLASHCARD_REVERSE_RATE = 0.1

const GOAL_RING_COLORS: Record<string, string> = {
  flashcards: '#ec4899',
  listening: '#38bdf8',
  reading: '#22c55e',
}

function useCountUp(value: number, durationMs = 500): number {
  const [displayed, setDisplayed] = useState(0)
  const fromRef = useRef(0)
  useEffect(() => {
    const from = fromRef.current
    if (from === value) return
    let frame = 0
    const startedAt = performance.now()
    const tick = (now: number) => {
      const t = Math.min(1, (now - startedAt) / durationMs)
      const eased = 1 - (1 - t) * (1 - t)
      const next = Math.round(from + (value - from) * eased)
      setDisplayed(next)
      if (t < 1) {
        frame = requestAnimationFrame(tick)
      } else {
        fromRef.current = value
      }
    }
    frame = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frame)
  }, [durationMs, value])
  return displayed
}

function CountUpNumber({ value }: { value: number }) {
  return <>{useCountUp(value)}</>
}

function EmptyPanelPrompt({
  message,
  actionLabel,
  onAction,
}: {
  message: string
  actionLabel: string
  onAction: () => void
}) {
  return (
    <div className="panel-empty">
      <p>{message}</p>
      <button type="button" className="ghost-answer" onClick={onAction}>
        {actionLabel} →
      </button>
    </div>
  )
}

function GoalRing({
  kind,
  title,
  value,
  goal,
  unit,
  onClick,
}: {
  kind: 'flashcards' | 'listening' | 'reading'
  title: string
  value: number
  goal: number
  unit: string
  onClick: () => void
}) {
  const listeningDepth = Math.min(4, Math.max(0, value))
  const listeningColors = ['#7dd3fc', '#38bdf8', '#0284c7', '#0369a1', '#0c4a6e']
  const color = kind === 'listening' ? listeningColors[listeningDepth] : GOAL_RING_COLORS[kind]
  const displayedValue = useCountUp(value)
  const r = 38
  const circumference = 2 * Math.PI * r
  const fillFraction = goal > 0 ? Math.min(1, value / goal) : 0
  const strokeDashoffset = circumference * (1 - fillFraction)
  const complete = goal > 0 && value >= goal
  const ariaLabel = kind === 'listening'
    ? `${title}: ${value} ${value === 1 ? 'lesson' : 'lessons'} today. One lesson completes the daily goal. Tap to start.`
    : `${title}: ${value} of ${goal} ${unit} today. Tap to start.`
  return (
    <button
      type="button"
      className={`sentence-rep-ring-wrap goal-ring${complete ? ' goal-ring-complete' : ''}`}
      onClick={onClick}
      aria-label={ariaLabel}
    >
      <p className="ring-title">{title}</p>
      <svg className="sentence-rep-ring" viewBox="0 0 100 100" aria-hidden="true">
        <circle cx="50" cy="50" r={r} className="sentence-rep-ring-track" />
        <circle
          cx="50" cy="50" r={r}
          className="sentence-rep-ring-fill"
          style={{
            stroke: color,
            strokeDasharray: circumference,
            strokeDashoffset,
            filter: complete ? `drop-shadow(0 0 8px ${color})` : undefined,
          }}
        />
        <text x="50" y="46" className="sentence-rep-ring-count">{displayedValue}</text>
        <text x="50" y="60" className="sentence-rep-ring-label">
          {kind === 'listening' ? 'daily goal: 1' : `of ${goal} ${unit}`}
        </text>
      </svg>
      <p className="sentence-rep-total">
        {kind === 'listening' && complete
          ? `${value} ${value === 1 ? 'lesson' : 'lessons'} today`
          : complete ? 'Goal complete!' : `${Math.round(fillFraction * 100)}% of daily goal`}
      </p>
    </button>
  )
}

const WORD_MILESTONES = Array.from({ length: 14 }, (_, index) => (index + 1) * 250)
const TREE_STAGE_NAMES = [
  'new sprout', 'young sprout', 'small seedling', 'strong seedling', 'young sapling',
  'leafy sapling', 'young tree', 'growing tree', 'branching tree', 'full young tree',
  'strong tree', 'mature tree', 'wide-canopy tree', 'flourishing tree', 'great learning tree',
]

function MasteryMeter({ word }: { word: VocabWord }) {
  const mastery = masteryForWord(word)
  return (
    <span className={`mastery-meter mastery-level-${mastery.level}`} aria-label={`Mastery: ${mastery.label}`}>
      {[1, 2, 3, 4].map((step) => (
        <span key={step} className={`mastery-dot${step <= mastery.level ? ' filled' : ''}`} aria-hidden="true" />
      ))}
      <small>{mastery.label}</small>
    </span>
  )
}

function MilestoneJourney({
  wordsKnown,
  leveledUpThisWeek,
}: {
  wordsKnown: number
  leveledUpThisWeek: number
}) {
  const nextMilestone = WORD_MILESTONES.find((m) => m > wordsKnown) ?? WORD_MILESTONES[WORD_MILESTONES.length - 1]
  const previousMilestone = [...WORD_MILESTONES].reverse().find((m) => m <= wordsKnown) ?? 0
  const span = Math.max(1, nextMilestone - previousMilestone)
  const fillFraction = Math.min(1, Math.max(0, (wordsKnown - previousMilestone) / span))
  const remaining = Math.max(0, nextMilestone - wordsKnown)
  const displayedKnown = useCountUp(wordsKnown)
  const treeStage = Math.min(14, Math.floor(wordsKnown / 250))
  const treeColumn = treeStage % 5
  const treeRow = Math.floor(treeStage / 5)
  return (
    <div className="milestone-journey" aria-label={`${wordsKnown} words known, ${remaining} to reach ${nextMilestone}`}>
      <div className="milestone-journey-headline">
        <strong className="milestone-journey-count">{displayedKnown}</strong>
        <span className="milestone-journey-label">words known</span>
        {leveledUpThisWeek > 0 && (
          <span className="milestone-journey-delta">▲ {leveledUpThisWeek} moved up this week</span>
        )}
      </div>
      <div className="vocab-tree-wrap">
        <div
          className="vocab-tree-stage"
          role="img"
          aria-label={`Vocabulary growth: ${TREE_STAGE_NAMES[treeStage]}`}
          style={{
            backgroundImage: `url(${import.meta.env.BASE_URL}images/vocab-tree-stages.png)`,
            backgroundPosition: `${treeColumn * 25}% ${treeRow * 50}%`,
          }}
        />
        <span>{TREE_STAGE_NAMES[treeStage]} · a new stage every 250 words</span>
      </div>
      <div className="milestone-journey-bar" role="progressbar" aria-valuemin={previousMilestone} aria-valuemax={nextMilestone} aria-valuenow={wordsKnown}>
        <div className="milestone-journey-fill" style={{ width: `${fillFraction * 100}%` }} />
      </div>
      <div className="milestone-journey-legend">
        <span>{previousMilestone}</span>
        <span className="milestone-journey-next">
          {remaining > 0 ? `${remaining} to go` : 'Milestone reached!'}
        </span>
        <span>{nextMilestone}</span>
      </div>
    </div>
  )
}

function App() {
  const startupResume = useMemo(() => loadStartupResumeState(), [])
  const [screen, setScreen] = useState<Screen>(() => {
    if (startupResume?.destination === 'flashcards') return 'flashcards'
    if (startupResume?.destination === 'listeningCourse') return 'listeningCourse'
    if (startupResume?.destination === 'sentenceListening') return 'listeningCourse'
    if (startupResume?.destination === 'reader') return 'reader'
    return 'dashboard'
  })
  const [words, setWords] = useState<VocabWord[]>([])
  const [, setSentences] = useState<Sentence[]>([])
  const [, setAudioClips] = useState<AudioClip[]>([])
  const [clipPacks, setClipPacks] = useState<ClipPack[]>([])
  const [hostedClipPacks, setHostedClipPacks] = useState<HostedClipPack[]>([])
  const [readerPacks, setReaderPacks] = useState<ReaderPack[]>([])
  const [readerBooks, setReaderBooks] = useState<ReaderBook[]>([])
  const [stats, setStats] = useState<DashboardStats>(emptyStats)
  const [dashboardRange, setDashboardRange] = useState<DashboardRange>('today')
  const [userSettings, setUserSettings] = useState(DEFAULT_USER_SETTINGS)
  const activeSentencePool = useMemo(
    () => getSentencePool(userSettings.sentencePoolId),
    [userSettings.sentencePoolId],
  )
  const [newWordsPerDay, setNewWordsPerDay] = useState(15)
  const [historicalStudyMinutesDraft, setHistoricalStudyMinutesDraft] = useState('')
  const [readerOfflineStatuses, setReaderOfflineStatuses] = useState<Map<string, ReaderOfflineStatus>>(new Map())
  const [readerOfflineBusyId, setReaderOfflineBusyId] = useState<string | null>(null)
  const [readerOfflineProgress, setReaderOfflineProgress] = useState('')
  const [flightOfflineBusy, setFlightOfflineBusy] = useState(false)
  const [flightOfflineProgress, setFlightOfflineProgress] = useState('')
  const [flightOfflineReadyAt, setFlightOfflineReadyAt] = useState<string | null>(() => getOfflineReadyAt())
  const [dataHealthReport, setDataHealthReport] = useState<DataHealthReport | null>(null)
  const [dataHealthBusy, setDataHealthBusy] = useState(false)
  const [hotkeysEditing, setHotkeysEditing] = useState(false)
  const [initialDataReady, setInitialDataReady] = useState(false)
  const [lesson, ] = useState<LessonPlan | null>(null)

  const [, setCurrentStepIndex] = useState(0)

  const [renderedLesson, ] = useState<RenderedLesson | null>(null)
  const [renderedUrl, ] = useState('')

  const [, setIsFullscreen] = useState(false)
  const [, setIsPlaying] = useState(false)

  const [flashcardFeedback, ] = useState<FsrsRating | null>(null)

  const [autoAdvance] = useState(true)
  const [hotkeys, setHotkeys] = useState<HotkeySettings>(DEFAULT_HOTKEYS)
  const [playbackRate] = useState(1)
  const [lastSummary, setLastSummary] = useState<string>('Ready.')
  const [seedMessage, setSeedMessage] = useState('Loading LMS vocabulary...')
  const [activeReaderBookId, setActiveReaderBookId] = useState<string | undefined>()
  const [readerSentenceIndex, setReaderSentenceIndex] = useState(0)
  const [readerShowEnglish, setReaderShowEnglish] = useState(DEFAULT_USER_SETTINGS.readerShowEnglish)
  const [selectedReaderToken, setSelectedReaderToken] = useState<ReaderWordToken | null>(null)
  const [readerDictionaryEntry, setReaderDictionaryEntry] = useState<DictionaryEntry | null>(null)
  const [hostedPackDownloadId, setHostedPackDownloadId] = useState<string | null>(null)
  const [hostedPackProgress, setHostedPackProgress] = useState('')
  const [vocabSourceSearch, setVocabSourceSearch] = useState('')
  const [showArchivedVocabSources, setShowArchivedVocabSources] = useState(false)
  const [flashcardQueueIds, setFlashcardQueueIds] = useState<string[]>(() => startupResume?.queueIds ?? [])
  const [flashcardCurrentId, setFlashcardCurrentId] = useState<string | null>(() => startupResume?.currentId ?? null)
  const [flashcardDoneIds, setFlashcardDoneIds] = useState<string[]>(() => startupResume?.completedIds ?? [])
  const [flashcardClock, setFlashcardClock] = useState(() => Date.now())
  const [flashcardAnswerShown, setFlashcardAnswerShown] = useState(false)
  const [, setLmsSentences] = useState<LmsSeedSentence[]>([])
  const [flashcardAudioOnly, setFlashcardAudioOnly] = useState(false)
  const [flashcardSessionFeedback, setFlashcardSessionFeedback] = useState<FsrsRating | null>(null)
  const [flashcardExternalDismissDir, setFlashcardExternalDismissDir] = useState<string | null>(null)
  const [flashcardSessionId, setFlashcardSessionId] = useState<string | null>(() => startupResume?.sessionId ?? null)
  const [flashcardCelebrationId, setFlashcardCelebrationId] = useState(0)
  const [goalCelebrationId, setGoalCelebrationId] = useState(0)
  const goalCelebrationRef = useRef<{ initialized: boolean; fired: Set<string> }>({
    initialized: false,
    fired: new Set(),
  })
  const [flashcardSessionRatingCounts, setFlashcardSessionRatingCounts] = useState<Record<FsrsRating, number>>({ again: 0, hard: 0, good: 0, easy: 0 })
  const [flashcardSessionStudySeconds, setFlashcardSessionStudySeconds] = useState(0)
  const [flashcardSessionLeveledUp, setFlashcardSessionLeveledUp] = useState<VocabWord[]>([])
  // Good/easy ratings this set on words below Known — the recap's "moved closer" chip.
  const [flashcardSessionMovedCloser, setFlashcardSessionMovedCloser] = useState(0)
  const [editingWord, setEditingWord] = useState<CardEditDraft | null>(null)
  const [activeReaderSession, setActiveReaderSession] = useState<ReaderSession | null>(null)
  const [readerRecap, setReaderRecap] = useState<ReaderSessionRecap | null>(null)
  // Words that leveled up from reading credits this session (for the recap).
  const readerSessionPromotedRef = useRef<VocabWord[]>([])
  // Words looked up on the current sentence — they skip passive credit this sentence.
  const readerTappedWordIdsRef = useRef<Set<string>>(new Set())
  // Sentences already credited this session, so back/forward swiping can't farm credit.
  const readerCreditedSentenceIdsRef = useRef<Set<string>>(new Set())
  // Mirrors readerListening.active so credit stays reading-only (see effect below).
  const readerListeningActiveRef = useRef(false)
  const readerOverlayOpenRef = useRef(false)
  const [todayReaderStats, setTodayReaderStats] = useState<ReaderSessionStats | null>(null)
  const [latestReaderProgress, setLatestReaderProgress] = useState<ReaderProgress | undefined>()
  const [readerProgressRows, setReaderProgressRows] = useState<ReaderProgress[]>([])
  const [readerQueueState, setReaderQueueState] = useState<ReaderQueueState>({
    version: 1,
    orderedBookIds: [],
    excludedBookIds: [],
    updatedAt: '',
  })
  const [completedReaderBookId, setCompletedReaderBookId] = useState<string | null>(null)
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

  const [, setSentencePaused] = useState(true)

  const sentenceAudioRef = useRef<HTMLAudioElement | null>(null)
  const lastReaderActivityTimeRef = useRef<number>(0)
  const runToken = useRef(0)
  const startModeLessonRef = useRef<(() => void) | null>(null)
  const runFromRef = useRef<((index: number, plan?: LessonPlan) => void) | null>(null)
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const pocketAudioRef = useRef<HTMLAudioElement | null>(null)
  const playModeRef = useRef<HTMLElement | null>(null)
  const flashcardFeedbackTimeoutRef = useRef<number | null>(null)
  const flashcardUndoTimeoutRef = useRef<number | null>(null)
  const flashcardPresentationStartedAtRef = useRef(Date.now())
  const pendingFlashcardStartRef = useRef(false)
  const [flashcardUndoState, setFlashcardUndoState] = useState<{
    word: VocabWord
    rating: FsrsRating
    prevDoneIds: string[]
    movedCloser: boolean
  } | null>(null)
  const syncTimerRef = useRef<number | null>(null)
  const syncedFlashcardCompletionRef = useRef<string | null>(null)
  const dashboardToastKeyRef = useRef<string | null>(null)
  const bookListenStartRef = useRef<(() => void) | null>(null)
  const readerListeningStartRef = useRef<(() => void) | null>(null)
  const startReaderPlaylistRef = useRef<(() => Promise<void>) | null>(null)
  const pendingReaderAutoStartRef = useRef(false)
  // sentenceStreak removed; badge feature dropped

  const [sentenceQueueOffset, setSentenceQueueOffset] = useState(() => startupResume?.destination === 'sentenceListening' ? startupResume.sentenceIndex ?? 0 : 0)
  const [sentenceRepsToday, setSentenceRepsToday] = useState(0)
  // Total-rep counter still persists in IndexedDB; only daily reps drive the goal ring UI.
  const [, setSentenceTotalReps] = useState(0)
  const [sentenceSubMode] = useState<'sets' | 'books'>('sets')
  const [bookListenBookId] = useState<string | null>(null)
  const [bookListenIndex, setBookListenIndex] = useState(0)
  const [, setBookListenFinished] = useState(false)
  const wakeLockRef = useRef<{ release: () => Promise<void> } | null>(null)
  const previousScreenRef = useRef<Screen>(screen)
  const dashboardToastReadyRef = useRef(false)

  const stopAudioOutputs = useCallback(() => {
    audioRef.current?.pause()
    audioRef.current = null
    pocketAudioRef.current?.pause()
    sentenceAudioRef.current?.pause()
    window.speechSynthesis?.cancel()
    setIsPlaying(false)
  }, [])

  /** Raw seed files keyed by path — topic pools are filtered views of one file. */
  const sentenceSeedCache = useRef<Record<string, LmsSeedSentence[]>>({})

  const loadSentenceSeed = useCallback(async (pool: SentencePool) => {
    let seed = sentenceSeedCache.current[pool.seedPath]
    if (!seed) {
      const response = await fetch(pool.seedPath)
      if (!response.ok) throw new Error('Could not load sentence listening data.')
      seed = (await response.json()) as LmsSeedSentence[]
      sentenceSeedCache.current[pool.seedPath] = seed
    }
    const selected = filterPoolSentences(seed, pool)
    setLmsSentences(selected)
    return selected
  }, [])

  useEffect(() => {
    loadSentenceSeed(activeSentencePool).catch(() => {})
  }, [activeSentencePool, loadSentenceSeed])

  useEffect(() => {
    getSentenceRepData(activeSentencePool.id).then(({ queueOffset, repsToday, totalReps }) => {
      setSentenceQueueOffset(queueOffset)
      setSentenceRepsToday(repsToday)
      setSentenceTotalReps(totalReps)
    }).catch(() => {})
  }, [activeSentencePool.id])

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
      nextAiStorySettings,
      nextReaderProgressRows,
      nextReaderQueueState,
    ] = await Promise.all([
      getAllWords(),
      getAllSentences(),
      getPromptAudioClips(),
      getAllClipPacks(),
      getAllReaderPacks(),
      getAllReaderBooks(),
      getNewWordsPerDay(),
      getUserSettings(),
      getHostedClipPackIndex(),
      getAiStorySettings(),
      getAllReaderProgress(),
      getReaderQueueState(),
    ])
    setWords(nextWords)
    setSentences(nextSentences)
    const nextStats = await getDashboardStats()
    const booksWithScripture = includeMeditativeScripture(nextReaderBooks)
    const nextLatestReaderProgress = await getLatestReaderProgress(booksWithScripture)
    setAudioClips(nextAudio)
    setClipPacks(nextPacks)
    setReaderPacks(nextReaderPacks)
    setReaderBooks(booksWithScripture)
    setLatestReaderProgress(nextLatestReaderProgress)
    setReaderProgressRows(nextReaderProgressRows)
    setReaderQueueState(nextReaderQueueState)
    setNewWordsPerDay(nextNewWordsPerDay)
    setUserSettings(nextUserSettings)
    setReaderShowEnglish(nextUserSettings.readerShowEnglish)
    setHostedClipPacks(nextHostedClipPacks)
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
    let cancelled = false
    const deferred = new DeferredTaskCoordinator()

    async function startCore() {
      markStartup('destination-selected')
      const seeded = await seedCoreWordsIfEmpty()
      const [nextWords, nextHotkeys, nextSettings, nextNewWordsPerDay] = await Promise.all([
        getAllWords(),
        getHotkeys(),
        getUserSettings(),
        getNewWordsPerDay(),
      ])
      if (cancelled) return
      setWords(nextWords)
      setHotkeys(nextHotkeys)
      setUserSettings(nextSettings)
      setReaderShowEnglish(nextSettings.readerShowEnglish)
      setNewWordsPerDay(nextNewWordsPerDay)

      const legacyMeditationIndex = readLegacyMeditationProgress()
      if (legacyMeditationIndex !== undefined) {
        const existing = await getReaderProgress(MEDITATIVE_SCRIPTURE_BOOK.packId, MEDITATIVE_SCRIPTURE_BOOK.id)
        if (!existing) {
          await saveReaderProgress({
            packId: MEDITATIVE_SCRIPTURE_BOOK.packId,
            bookId: MEDITATIVE_SCRIPTURE_BOOK.id,
            sentenceIndex: legacyMeditationIndex,
          })
        }
        clearLegacyMeditationProgress()
      }

      if (screen === 'lesson') {
        const [nextSentences, nextAudio] = await Promise.all([getAllSentences(), getPromptAudioClips()])
        if (!cancelled) {
          setSentences(nextSentences)
          setAudioClips(nextAudio)
        }
      } else if (screen === 'reader') {
        const [nextReaderPacks, nextReaderBooks, nextProgressRows, nextQueueState] = await Promise.all([
          getAllReaderPacks(),
          getAllReaderBooks(),
          getAllReaderProgress(),
          getReaderQueueState(),
        ])
        if (!cancelled) {
          setReaderPacks(nextReaderPacks)
          const booksWithScripture = includeMeditativeScripture(nextReaderBooks)
          setReaderBooks(booksWithScripture)
          setReaderProgressRows(nextProgressRows)
          setReaderQueueState(nextQueueState)
          if (startupResume?.readerBookId && booksWithScripture.some((book) => book.id === startupResume.readerBookId)) {
            setActiveReaderBookId(startupResume.readerBookId)
            setReaderSentenceIndex(startupResume.sentenceIndex ?? 0)
          } else if (startupResume?.destination === 'reader') {
            clearStartupResumeState()
            setScreen('dashboard')
          }
          setLatestReaderProgress(await getLatestReaderProgress(booksWithScripture))
        }
      }

      if (cancelled) return
      setSeedMessage(seeded > 0 ? `Seeded ${seeded} LMS target words.` : 'Ready to learn.')
      setInitialDataReady(true)
      markStartup('essential-data-ready')
      markStartup('study-interactive')

      deferred.enqueue({
        id: 'content-maintenance',
        run: async () => {
          await seedLmsWordsIfEmpty()
          await repairAudioClipLinksIfNeeded()
          await cleanupAccidentalEnglishOnlyCards()
          const backfilled = await backfillReadingExposuresFromEvents()
          if (backfilled > 0) queueCloudSync()
        },
      })
      deferred.enqueue({
        id: 'secondary-data',
        run: async () => {
          await refresh()
          markStartup('background-complete')
        },
      })
    }
    void startCore().catch((error) => {
      console.error('Core startup failed', error)
      setSeedMessage('Local data could not be loaded. Try reloading.')
      setInitialDataReady(true)
    })
    return () => {
      cancelled = true
      deferred.cancel()
    }
  // Startup is intentionally a one-shot pipeline; screen is the synchronously restored destination.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [refresh])

  useEffect(() => {
    document.documentElement.dataset.theme = userSettings.darkMode ? 'dark' : 'light'
  }, [userSettings.darkMode])

  useEffect(() => {
    if (!initialDataReady) return
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
  }, [initialDataReady])

  useEffect(() => {
    if (!cloudUserEmail || !initialDataReady) return
    void installPrivateSentenceAudio((message) => {
      setCloudSync((current) => ({ ...current, status: 'syncing', message }))
    })
      .then(() => seedReaderBooksIfEmpty())
      .then(() => handleCloudSyncNow(true))
      .catch((error) => {
        setCloudSync((current) => ({
          ...current,
          status: 'error',
          message: error instanceof Error ? error.message : 'Could not install private study content.',
        }))
      })
  }, [cloudUserEmail, handleCloudSyncNow, initialDataReady])

  useEffect(() => {
    const needsReaderLibrary = screen === 'readingTexts'
    if (!needsReaderLibrary || readerBooks.length > 0) return
    let cancelled = false
    void (async () => {
      if (cloudUserEmail) await seedReaderBooksIfEmpty()
      const [nextPacks, nextBooks] = await Promise.all([getAllReaderPacks(), getAllReaderBooks()])
      if (cancelled) return
      setReaderPacks(nextPacks)
      const booksWithScripture = includeMeditativeScripture(nextBooks)
      setReaderBooks(booksWithScripture)
      setLatestReaderProgress(await getLatestReaderProgress(booksWithScripture))
    })().catch((error) => {
      if (!cancelled) setLastSummary(error instanceof Error ? error.message : 'Could not load the reading library.')
    })
    return () => { cancelled = true }
  }, [cloudUserEmail, readerBooks.length, screen])

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

  const activeWords = useMemo(() => words.filter(isActiveVocabWord), [words])
  const flashcardDeckOptions = useMemo(() => flashcardDecksForWords(activeWords), [activeWords])
  const selectedFlashcardWords = useMemo(
    () => activeWords.filter((word) => wordIsInSelectedFlashcardDecks(word, userSettings.selectedFlashcardDeckIds)),
    [activeWords, userSettings.selectedFlashcardDeckIds],
  )
  const flashcardDeckCounts = useMemo(() => {
    const counts = new Map<FlashcardDeckId, number>([[ALL_FLASHCARD_DECK_ID, activeWords.length]])
    for (const word of activeWords) {
      for (const deckId of effectiveWordDeckIds(word)) {
        counts.set(deckId, (counts.get(deckId) ?? 0) + 1)
      }
    }
    return counts
  }, [activeWords])
  const wordsKnown = useMemo(
    () => activeWords.filter((word) => masteryForWord(word).level >= 3).length,
    [activeWords],
  )
  // Due words whose next 'good' rating crosses the 14-day Known threshold —
  // the highest-value reviews for growing the words-known count.
  const promotableDueWords = useMemo(() => {
    const now = Date.now()
    return activeWords.filter(
      (word) => isFsrsCardDue(word, now) && canBecomeKnownWithGood(word, now),
    )
  }, [activeWords])
  // Words closest to Known that an AI "finisher story" should weave in for
  // reading exposure (level 1-2, most reading progress first).
  const storyFocusCandidates = useMemo(
    () =>
      activeWords
        .filter((word) => {
          const level = masteryForWord(word).level
          return level >= 1 && level <= 2
        })
        .sort(
          (a, b) =>
            (b.readingExposures ?? 0) - (a.readingExposures ?? 0) ||
            (b.fsrsIntervalDays ?? 0) - (a.fsrsIntervalDays ?? 0),
        )
        .slice(0, 12)
        .map((word) => ({ word: word.word, pinyin: word.pinyin ?? '', meaning: word.meaning })),
    [activeWords],
  )
  const activeReaderBook = useMemo(
    () => readerBooks.find((book) => book.id === activeReaderBookId),
    [activeReaderBookId, readerBooks],
  )

  useEffect(() => {
    if (screen !== 'reader' || !activeReaderBook) return
    saveStartupResumeState({
      destination: 'reader',
      readerPackId: activeReaderBook.packId,
      readerBookId: activeReaderBook.id,
      sentenceIndex: readerSentenceIndex,
    })
  }, [activeReaderBook, readerSentenceIndex, screen])
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
    () => getCachedReaderComprehensionByBook(readerBooks, activeWords),
    [activeWords, readerBooks],
  )
  const readerKnownPercentByBook = useMemo(
    () => new Map([...readerComprehensionByBook].map(([bookId, summary]) => [bookId, summary.knownPercent])),
    [readerComprehensionByBook],
  )
  const readerQueue = useMemo(
    () => buildReaderQueue(readerBooks, readerProgressRows, readerKnownPercentByBook, readerQueueState),
    [readerBooks, readerKnownPercentByBook, readerProgressRows, readerQueueState],
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

  useEffect(() => {
    if (screen !== 'reader' || !activeReaderBook) return
    preloadReaderSentenceAssets(activeReaderBook, readerSentenceIndex)
    preloadReaderSentenceAssets(activeReaderBook, readerSentenceIndex + 1)
  }, [activeReaderBook, readerSentenceIndex, screen])

  useEffect(() => {
    if (screen !== 'readingTexts' || readerBooks.length === 0) return
    let cancelled = false
    void Promise.all(readerBooks.map(async (book) => [book.id, await getReaderBookOfflineStatus(book)] as const))
      .then((entries) => {
        if (!cancelled) setReaderOfflineStatuses(new Map(entries))
      })
      .catch(() => {})
    return () => { cancelled = true }
  }, [readerBooks, screen])
  const selectedRangeStats = stats.ranges[dashboardRange] ?? stats.ranges.today
  const selectedPreviousRangeStats = stats.previousRanges[dashboardRange]
  const leveledUpThisWeek = useMemo(() => {
    const series = stats.retentionSeries
    if (series.length < 2) return 0
    const latest = series[series.length - 1]
    const previous = series[series.length - 2]
    return Math.max(0, latest.familiar + latest.wellKnown - (previous.familiar + previous.wellKnown))
  }, [stats.retentionSeries])
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
  const currentFlashcardWordId = currentFlashcardWord?.id
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
    void recordEvent({
      type: 'complete',
      itemType: 'lesson',
      itemId: flashcardSessionId,
      seconds: flashcardSessionStudySeconds,
      source: 'flashcards',
    })
    setLastSummary(
      isSupabaseConfigured && cloudUserEmail
        ? 'Flashcard set complete. Sync queued.'
        : 'Flashcard set complete.',
    )
    queueCloudSync()
  }, [cloudUserEmail, flashcardSessionComplete, flashcardSessionId, flashcardSessionStudySeconds, queueCloudSync])

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
    const source = selectedFlashcardWords
    const limit = Math.max(1, userSettings.flashcardsPerDay || 50)
    const now = Date.now()
    // Promotable-first so words one good rating from Known survive the
    // per-set limit slice below.
    const due = sortPromotableFirst(
      source.filter(
        (word) =>
          isFsrsCardDue(word, now) ||
          (isFlashcardLearning(word) && fsrsDueTime(word) <= now + FLASHCARD_LEARN_AHEAD_MS),
      ),
      now,
    )
    const fresh = source
      .filter(isNewFsrsCard)
      .sort((a, b) => (a.lessonNumber ?? 9999) - (b.lessonNumber ?? 9999))
    if (mode === 'due') return due.slice(0, limit)
    if (mode === 'new') return fresh.slice(0, limit)
    const mixed = [...due, ...fresh].filter(
      (word, index, all) => all.findIndex((candidate) => candidate.id === word.id) === index,
    )
    return mixed.slice(0, limit)
  }, [selectedFlashcardWords, userSettings.flashcardsPerDay])

  const startFlashcards = useCallback((mode: FlashcardQueueMode = 'mixed', overrideWords?: VocabWord[]) => {
    const queue = overrideWords ?? buildFlashcardQueue(mode)
    const sessionId = `flashcards:${crypto.randomUUID()}`
    const firstCard = selectNextFlashcardWord(queue, new Set())
    setFlashcardQueueIds(queue.map((word) => word.id))
    setFlashcardDoneIds([])
    setFlashcardCurrentId(firstCard?.id ?? null)
    setFlashcardSessionId(sessionId)
    setFlashcardClock(Date.now())
    setFlashcardAnswerShown(false)
    setFlashcardSessionFeedback(null)
    setFlashcardAudioOnly(false)
    setFlashcardSessionRatingCounts({ again: 0, hard: 0, good: 0, easy: 0 })
    setFlashcardSessionStudySeconds(0)
    setFlashcardSessionLeveledUp([])
    setFlashcardSessionMovedCloser(0)
    setScreen('flashcards')
    if (firstCard) saveStartupResumeState({
      destination: 'flashcards',
      sessionId,
      queueIds: queue.map((word) => word.id),
      currentId: firstCard.id,
      completedIds: [],
    })
    setLastSummary(queue.length > 0 ? `Loaded ${queue.length} flashcards.` : 'No flashcards match that queue.')
  }, [buildFlashcardQueue])

  const startSavedFlashcards = useCallback(() => {
    if (!initialDataReady) {
      pendingFlashcardStartRef.current = true
      setScreen('flashcards')
      setLastSummary('Loading flashcards…')
      return
    }
    startFlashcards(userSettings.flashcardQueueMode ?? 'mixed')
  }, [initialDataReady, startFlashcards, userSettings.flashcardQueueMode])

  useEffect(() => {
    if (!initialDataReady || !pendingFlashcardStartRef.current) return
    pendingFlashcardStartRef.current = false
    if (screen === 'flashcards') {
      startFlashcards(userSettings.flashcardQueueMode ?? 'mixed')
    }
  }, [initialDataReady, screen, startFlashcards, userSettings.flashcardQueueMode])

  // A bounded, high-value set: the 10 due words most able to level up.
  // "New set" afterwards intentionally falls back to the full saved-mode
  // queue via refreshFlashcardSession — Quick 10 is an on-ramp, not a mode.
  const startQuickTenFlashcards = useCallback(() => {
    const now = Date.now()
    const due = sortPromotableFirst(
      selectedFlashcardWords.filter((word) => isFsrsCardDue(word, now)),
      now,
    )
    startFlashcards('due', due.slice(0, 10))
  }, [selectedFlashcardWords, startFlashcards])

  // Celebrate a daily goal ring closing, once per goal per session.
  // Goals already met when the app loads are treated as already celebrated.
  useEffect(() => {
    const entries: Array<[string, number, number]> = [
      ['flashcards', stats.ranges.today.cardsReviewed, userSettings.flashcardsPerDay],
      ['listening', stats.listeningLessonsToday, 1],
      ['reading', todayReaderStats?.todayPagesRead ?? 0, userSettings.readingGoalPages],
    ]
    const state = goalCelebrationRef.current
    if (!state.initialized) {
      for (const [key, value, goal] of entries) {
        if (goal > 0 && value >= goal) state.fired.add(key)
      }
      state.initialized = true
      return
    }
    for (const [key, value, goal] of entries) {
      if (goal > 0 && value >= goal && !state.fired.has(key)) {
        state.fired.add(key)
        setGoalCelebrationId((id) => id + 1)
      }
    }
  }, [
    sentenceRepsToday,
    stats.listeningLessonsToday,
    stats.ranges.today.cardsReviewed,
    todayReaderStats?.todayPagesRead,
    userSettings.flashcardsPerDay,
    userSettings.readingGoalPages,
  ])

  async function handleReaderOfflineDownload(book: ReaderBook) {
    setReaderOfflineBusyId(book.id)
    setReaderOfflineProgress('Preparing download…')
    try {
      const result = await downloadReaderBookForOffline(book, (completed, total) => {
        setReaderOfflineProgress(`Downloading ${completed}/${total} files…`)
      })
      setReaderOfflineStatuses((current) => new Map(current).set(book.id, result))
      setLastSummary(result.total === 0
        ? `${book.title} text is already stored locally; it has no downloadable media.`
        : result.failed
        ? `${book.title} downloaded with ${result.failed} missing file${result.failed === 1 ? '' : 's'}.`
        : `${book.title} is available offline.`)
    } catch (error) {
      setLastSummary(error instanceof Error ? error.message : 'Could not download that book.')
    } finally {
      setReaderOfflineBusyId(null)
      setReaderOfflineProgress('')
    }
  }

  async function handleReaderOfflineRemove(book: ReaderBook) {
    setReaderOfflineBusyId(book.id)
    try {
      await removeReaderBookOfflineDownload(book)
      setReaderOfflineStatuses((current) => new Map(current).set(book.id, {
        cached: 0,
        total: current.get(book.id)?.total ?? 0,
        complete: false,
      }))
      setLastSummary(`${book.title} offline download removed.`)
    } finally {
      setReaderOfflineBusyId(null)
    }
  }

  async function handlePrepareForFlight() {
    if (!navigator.onLine) {
      setLastSummary('Connect to the internet before preparing the offline bundle.')
      return
    }
    setFlightOfflineBusy(true)
    setFlightOfflineProgress('Saving the app and dictionary…')
    let failedFiles = 0
    try {
      await navigator.storage?.persist?.()
      const shell = await prepareOfflineAppShell()
      failedFiles += shell.failed

      setFlightOfflineProgress('Saving the reading library…')
      if (!cloudUserEmail) throw new Error('Sign in before preparing private reading content for offline use.')
      await seedReaderBooksIfEmpty()
      const nextBooks = await getAllReaderBooks()
      const lmsBooks = nextBooks.filter((book) => book.packId === 'lms-books')
      if (lmsBooks.length === 0) {
        throw new Error('The LMS Reader library could not be saved. Check your connection and try again.')
      }
      const readerAudioTotal = lmsBooks.reduce(
        (sum, book) => sum + readerBookOfflineAudioUrls(book).length,
        0,
      )
      let readerAudioCompleted = 0
      for (const book of lmsBooks) {
        const result = await downloadReaderBookForOffline(
          book,
          (completed) => {
            setFlightOfflineProgress(
              `Saving LMS Reader audio ${readerAudioCompleted + completed}/${readerAudioTotal}…`,
            )
          },
          { audioOnly: true },
        )
        readerAudioCompleted += result.total
        failedFiles += result.failed
      }

      setFlightOfflineProgress('Saving short listening lessons…')
      const catalogResponse = await fetch(publicAssetPath('listening/course-v1.json'))
      if (!catalogResponse.ok) throw new Error('Could not load listening lessons.')
      const catalog = await catalogResponse.json() as { lessons: Array<{ file: string }> }
      const courseCache = await caches.open('chunky-listening-course-v1')
      for (const [index, recording] of catalog.lessons.entries()) {
        setFlightOfflineProgress(`Saving listening lesson ${index + 1}/${catalog.lessons.length}…`)
        try {
          const url = publicAssetPath(`listening/${recording.file}`)
          const response = await fetch(url)
          if (!response.ok) throw new Error('Audio download failed')
          await courseCache.put(url, response)
        } catch { failedFiles++ }
      }

      const flightClipPacks = hostedClipPacks.length > 0
        ? hostedClipPacks
        : await getHostedClipPackIndex()
      const lmsClipPack = flightClipPacks.find((pack) => pack.id === 'lms-1000-azure')
      if (lmsClipPack) {
        setFlightOfflineProgress('Saving LMS listening clips…')
        let lastShownPercent = -1
        const summary = await importHostedClipPack(
          lmsClipPack.storagePath,
          (completed, total) => {
            const percent = total > 0 ? Math.floor((completed / total) * 100) : 100
            if (percent === lastShownPercent) return
            lastShownPercent = percent
            setFlightOfflineProgress(`Saving LMS listening clips… ${percent}%`)
          },
          lmsClipPack,
        )
        failedFiles += summary.skipped
      } else {
        failedFiles += 1
      }

      await refresh()
      setFlightOfflineProgress('')
      if (failedFiles > 0) {
        setFlightOfflineReadyAt(null)
        setLastSummary(
          `Offline download incomplete: ${failedFiles} file${failedFiles === 1 ? '' : 's'} could not be verified. Keep your connection on and tap Prepare again.`,
        )
      } else {
        const readyAt = markOfflineReady()
        setFlightOfflineReadyAt(readyAt)
        setLastSummary(
          'Ready for your flight. Flashcards, short listening lessons, LMS Reader audio, and the dictionary are verified offline.',
        )
      }
    } catch (error) {
      setLastSummary(error instanceof Error ? error.message : 'Could not finish preparing the offline bundle.')
    } finally {
      setFlightOfflineBusy(false)
      setFlightOfflineProgress('')
    }
  }

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
    setFlashcardAudioOnly(false)
    setScreen('dashboard')
    clearStartupResumeState()
    void refresh()
  }, [refresh])

  useEffect(() => {
    if (screen !== 'flashcards') return
    if (!flashcardSessionId || !flashcardCurrentId || flashcardQueueIds.length === 0) return
    saveStartupResumeState({
      destination: 'flashcards',
      sessionId: flashcardSessionId,
      queueIds: flashcardQueueIds,
      currentId: flashcardCurrentId,
      completedIds: flashcardDoneIds,
    })
  }, [flashcardCurrentId, flashcardDoneIds, flashcardQueueIds, flashcardSessionId, screen])

  const refreshFlashcardSession = useCallback(() => {
    startSavedFlashcards()
    setLastSummary('Loaded a fresh flashcard set.')
  }, [startSavedFlashcards])

  useEffect(() => {
    if (screen !== 'flashcards') return
    const interval = window.setInterval(() => setFlashcardClock(Date.now()), 15_000)
    return () => window.clearInterval(interval)
  }, [screen])

  useEffect(() => {
    if (screen !== 'flashcards' || !currentFlashcardWordId) return
    flashcardPresentationStartedAtRef.current = Date.now()
  }, [currentFlashcardWordId, flashcardSessionId, screen])

  useEffect(() => {
    if (screen !== 'flashcards') return
    window.requestAnimationFrame(() => {
      window.scrollTo({ top: 0, behavior: 'auto' })
    })
  }, [screen, flashcardSessionId])

  const recordReaderInteraction = useCallback(() => {
    lastReaderActivityTimeRef.current = Date.now()
  }, [])
  const handleReaderOverlayOpenChange = useCallback((open: boolean) => {
    readerOverlayOpenRef.current = open
  }, [])

  const recordReaderSentenceView = useCallback(async (sentence: ReaderSentence, session: ReaderSession) => {
    if (session.sentenceIdsRead.includes(sentence.id)) {
      return
    }
    const tokens = tokenizeReaderText(sentence.chinese, activeWords)
    const chineseTokensCount = tokens.filter(t => t.isChinese).length
    const focusedReading = session.measurementVersion === 1 && !readerListeningActiveRef.current
    const difficulty = focusedReading ? countReadingDifficulty(tokens) : { known: 0, learning: 0, fresh: 0, total: 0 }
    const knownTokenCount = (session.knownTokenCount ?? 0) + difficulty.known
    const learningTokenCount = (session.learningTokenCount ?? 0) + difficulty.learning
    const newTokenCount = (session.newTokenCount ?? 0) + difficulty.fresh
    const focusedWordsRead = (session.focusedWordsRead ?? 0) + (focusedReading ? difficulty.total : 0)
    const challengePercent = readingChallengePercent({
      known: knownTokenCount,
      learning: learningTokenCount,
      fresh: newTokenCount,
      total: knownTokenCount + learningTokenCount + newTokenCount,
    })
    const updatedSession: ReaderSession = {
      ...session,
      sentenceIdsRead: [...session.sentenceIdsRead, sentence.id],
      wordsRead: session.wordsRead + chineseTokensCount,
      focusedWordsRead,
      knownTokenCount,
      learningTokenCount,
      newTokenCount,
      challengePercent,
      updatedAt: new Date().toISOString(),
    }
    updatedSession.progressQualified = qualifyReadingSession(updatedSession)
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
      activeSeconds: Math.max(1, (activeReaderSession?.activeSeconds ?? 0) - session.startedActiveSeconds),
      progressPercent: readerProgressPercent(session.endIndex, readerSentences.length),
      knownWords: metrics.knownWords.length,
      learningWords: metrics.learningWords.length,
      unsavedWordsTapped: metrics.tappedUnsavedWords.length,
      wordsSaved: metrics.savedWords.length,
    }
  }, [activeReaderSession?.activeSeconds, readerSentences.length])

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
      startedActiveSeconds: activeReaderSession?.activeSeconds ?? 0,
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
    activeReaderSession?.activeSeconds,
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
      const focused = shouldCountFocusedReadingSecond({
        lastInteractionAt: lastReaderActivityTimeRef.current,
        now,
        documentHidden: document.hidden,
        listening: readerListeningActiveRef.current,
        overlayOpen: readerOverlayOpenRef.current,
      })
      if (shouldCountReaderActiveSecond(lastReaderActivityTimeRef.current, now)) {
        setActiveReaderSession((prev: ReaderSession | null) => {
          if (!prev) return null
          const updated = {
            ...prev,
            activeSeconds: prev.activeSeconds + 1,
            focusedActiveSeconds: (prev.focusedActiveSeconds ?? 0) + (focused ? 1 : 0),
            updatedAt: new Date().toISOString(),
          }
          updated.progressQualified = qualifyReadingSession(updated)
          void updateReaderSession(updated)
          return updated
        })
      }
    }, 1000)
    return () => {
      window.clearInterval(interval)
    }
  }, [screen, activeReaderSession])

  // Safety net: leaving the reader by any path that skips endReaderSession
  // (e.g. bottom nav) still stamps endedAt and resets per-session tracking.
  useEffect(() => {
    if (screen === 'reader' || !activeReaderSession) return
    const ended: ReaderSession = {
      ...activeReaderSession,
      endedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }
    void updateReaderSession(ended)
    queueCloudSync()
    setActiveReaderSession(null)
    setReaderRecap(null)
    readerSessionPromotedRef.current = []
    readerTappedWordIdsRef.current.clear()
    readerCreditedSentenceIdsRef.current.clear()
  }, [screen, activeReaderSession, queueCloudSync])

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

  const openReaderBook = useCallback(async (book: ReaderBook, action: 'resume' | 'start' = 'resume') => {
    const sentenceCount = book.stories.reduce((sum, story) => sum + story.sentences.length, 0)
    const readerSentencesForBook = book.stories.flatMap((story) => story.sentences)
    const cachedProgress = latestReaderProgress?.packId === book.packId && latestReaderProgress.bookId === book.id
      ? latestReaderProgress
      : undefined
    const initialIndex = action === 'start' ? 0 : cachedProgress?.sentenceIndex ?? 0
    const boundedInitialIndex = Math.min(Math.max(0, initialIndex), Math.max(0, sentenceCount - 1))
    setActiveReaderBookId(book.id)
    setReaderSentenceIndex(boundedInitialIndex)
    setSelectedReaderToken(null)
    setReaderDictionaryEntry(null)
    setStoryChunkSession(null)
    setStoryChunkReceipt(null)
    setReaderRecap(null)
    setCompletedReaderBookId(null)
    pendingReaderAutoStartRef.current = true
    readerSessionPromotedRef.current = []
    readerTappedWordIdsRef.current.clear()
    readerCreditedSentenceIdsRef.current.clear()
    setScreen('reader')
    recordReaderInteraction()
    try {
      let boundedIndex = boundedInitialIndex
      if (action === 'resume' && !cachedProgress) {
        const progress = await getReaderProgress(book.packId, book.id)
        boundedIndex = Math.min(
          Math.max(0, progress?.sentenceIndex ?? 0),
          Math.max(0, sentenceCount - 1),
        )
        setReaderSentenceIndex(boundedIndex)
      }
      const session = await startReaderSession(book.packId, book.id)
      setActiveReaderSession(session)
      const firstSentence = readerSentencesForBook[boundedIndex]
      if (firstSentence) await recordReaderSentenceView(firstSentence, session)
      if (action === 'start') {
        await saveReaderProgress({
          packId: book.packId,
          bookId: book.id,
          sentenceIndex: 0,
          completedAt: undefined,
        })
        const nextProgressRows = await getAllReaderProgress()
        setReaderProgressRows(nextProgressRows)
        setLatestReaderProgress(await getLatestReaderProgress(readerBooks))
        queueCloudSync()
      }
    } catch (error) {
      setLastSummary(error instanceof Error ? error.message : 'Reader progress could not be saved.')
    }
  }, [latestReaderProgress, queueCloudSync, readerBooks, recordReaderInteraction, recordReaderSentenceView])

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

  // Passive reading credit for the sentence being left: every saved word the
  // user didn't look up counts as a successful FSRS exposure (throttled in
  // applyReadingExposures), so reading moves words toward "known".
  const creditReaderSentence = useCallback(async (
    sentence: ReaderSentence,
    tokens: ReaderWordToken[],
    session: ReaderSession,
  ): Promise<ReaderSession> => {
    // Reading-only: skip crediting while a listening session is auto-advancing.
    if (readerListeningActiveRef.current) return session
    if (readerCreditedSentenceIdsRef.current.has(sentence.id)) return session
    readerCreditedSentenceIdsRef.current.add(sentence.id)
    const tapped = readerTappedWordIdsRef.current
    const savedWordIds = [...new Set(
      tokens.filter((token) => token.word).map((token) => token.word!.id),
    )]
    if (savedWordIds.length === 0) return session
    const result = await applyReadingExposures(
      savedWordIds.map((wordId) => ({ wordId, tapped: tapped.has(wordId) })),
    )
    if (result.updatedWords.length > 0) {
      const byId = new Map(result.updatedWords.map((word) => [word.id, word]))
      setWords((currentWords) => currentWords.map((word) => byId.get(word.id) ?? word))
    }
    if (result.promotedWords.length > 0) {
      const seen = new Set(readerSessionPromotedRef.current.map((word) => word.id))
      readerSessionPromotedRef.current = [
        ...readerSessionPromotedRef.current,
        ...result.promotedWords.filter((word) => !seen.has(word.id)),
      ]
    }
    if (result.creditedWordIds.length === 0) return session
    const updatedSession: ReaderSession = {
      ...session,
      exposuresCredited: (session.exposuresCredited ?? 0) + result.creditedWordIds.length,
      promotedWordIds: [...new Set([
        ...(session.promotedWordIds ?? []),
        ...result.promotedWords.map((word) => word.id),
      ])],
      updatedAt: new Date().toISOString(),
    }
    await updateReaderSession(updatedSession)
    setActiveReaderSession(updatedSession)
    return updatedSession
  }, [])

  const moveReaderSentence = useCallback(async (delta: number) => {
    if (!activeReaderBook || readerSentences.length === 0) return
    const leavingSentence = readerSentences[readerSentenceIndex]
    const leavingTokens = readerTokens
    const nextIndex = Math.min(
      Math.max(readerSentenceIndex + delta, 0),
      readerSentences.length - 1,
    )
    recordReaderInteraction()
    setReaderSentenceIndex(nextIndex)
    setSelectedReaderToken(null)
    setReaderDictionaryEntry(null)
    let sessionForView = activeReaderSession
    if (delta > 0 && leavingSentence && sessionForView) {
      sessionForView = await creditReaderSentence(leavingSentence, leavingTokens, sessionForView)
    }
    readerTappedWordIdsRef.current.clear()
    await saveReaderProgress({
      packId: activeReaderBook.packId,
      bookId: activeReaderBook.id,
      sentenceIndex: nextIndex,
    })
    setReaderProgressRows(await getAllReaderProgress())
    setLatestReaderProgress(await getLatestReaderProgress(readerBooks))
    queueCloudSync()
    const nextSentence = readerSentences[nextIndex]
    if (nextSentence && sessionForView) {
      await recordReaderSentenceView(nextSentence, sessionForView)
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
    creditReaderSentence,
    readerSentenceIndex,
    readerBooks,
    readerSentences,
    readerTokens,
    queueCloudSync,
    recordReaderInteraction,
    recordReaderSentenceView,
    recordStoryChunkSentence,
    sentenceQueueOffset,
  ])

  const handleReaderBookComplete = useCallback(async () => {
    if (!activeReaderBook || readerSentences.length === 0) return
    const completedAt = new Date().toISOString()
    await saveReaderProgress({
      packId: activeReaderBook.packId,
      bookId: activeReaderBook.id,
      sentenceIndex: readerSentences.length - 1,
      completedAt,
    })
    if (activeReaderSession) {
      await updateReaderSession({
        ...activeReaderSession,
        endedAt: completedAt,
        updatedAt: completedAt,
      })
      setActiveReaderSession(null)
    }
    const nextProgressRows = await getAllReaderProgress()
    setReaderProgressRows(nextProgressRows)
    setLatestReaderProgress(await getLatestReaderProgress(readerBooks))
    setCompletedReaderBookId(activeReaderBook.id)
    queueCloudSync()
    playGentleCelebration()
  }, [activeReaderBook, activeReaderSession, queueCloudSync, readerBooks, readerSentences.length])

  const readerListening = useReaderListeningController({
    sentence: currentReaderSentence,
    sentenceIndex: readerSentenceIndex,
    sentenceCount: readerSentences.length,
    rate: userSettings.readerListeningRate,
    repeatCount: userSettings.readerListeningRepeats,
    pauseFactor: userSettings.readerListeningPauseFactor,
    autoAdvance: userSettings.readerListeningAutoAdvance,
    mediaSessionEnabled: screen === 'reader',
    onNext: () => moveReaderSentence(1),
    onPrevious: () => moveReaderSentence(-1),
    onComplete: handleReaderBookComplete,
  })
  readerListeningStartRef.current = readerListening.startListening

  useEffect(() => {
    if (screen !== 'reader' || !currentReaderSentence || !pendingReaderAutoStartRef.current) return
    pendingReaderAutoStartRef.current = false
    const timer = window.setTimeout(() => readerListeningStartRef.current?.(), 50)
    return () => window.clearTimeout(timer)
  }, [activeReaderBookId, currentReaderSentence, screen])
  const readerListeningActive = readerListening.active
  const stopReaderListening = readerListening.stop
  useEffect(() => {
    readerListeningActiveRef.current = readerListeningActive
  }, [readerListeningActive])

  const startReaderPlaylist = useCallback(async () => {
    let books = readerBooks
    if (books.length === 0 && cloudUserEmail) {
      await seedReaderBooksIfEmpty()
      const [nextPacks, nextBooks] = await Promise.all([getAllReaderPacks(), getAllReaderBooks()])
      books = includeMeditativeScripture(nextBooks)
      setReaderPacks(nextPacks)
      setReaderBooks(books)
    }
    const [progressRows, queueState] = await Promise.all([getAllReaderProgress(), getReaderQueueState()])
    const comprehension = getCachedReaderComprehensionByBook(books, activeWords)
    const knownPercent = new Map([...comprehension].map(([bookId, summary]) => [bookId, summary.knownPercent]))
    const queue = promoteLatestReaderBook(
      buildReaderQueue(books, progressRows, knownPercent, queueState),
      progressRows,
    )
    setReaderProgressRows(progressRows)
    setReaderQueueState(queueState)
    if (queue.length === 0) {
      setScreen('readingTexts')
      return
    }
    if (queue[0]?.id !== queueState.orderedBookIds[0]) {
      const saved = await saveReaderQueueState({
        orderedBookIds: queue.map((book) => book.id),
        excludedBookIds: queueState.excludedBookIds,
      })
      setReaderQueueState(saved)
    }
    await openReaderBook(queue[0], 'resume')
  }, [activeWords, cloudUserEmail, openReaderBook, readerBooks])
  startReaderPlaylistRef.current = startReaderPlaylist

  const moveReaderQueueBook = useCallback(async (bookId: string, delta: -1 | 1) => {
    const saved = await saveReaderQueueState({
      orderedBookIds: reorderReaderQueue(readerQueue, bookId, delta),
      excludedBookIds: readerQueueState.excludedBookIds,
    })
    setReaderQueueState(saved)
  }, [readerQueue, readerQueueState.excludedBookIds])

  const removeReaderQueueBook = useCallback(async (bookId: string) => {
    const saved = await saveReaderQueueState({
      orderedBookIds: readerQueueState.orderedBookIds.filter((id) => id !== bookId),
      excludedBookIds: [...new Set([...readerQueueState.excludedBookIds, bookId])],
    })
    setReaderQueueState(saved)
  }, [readerQueueState.excludedBookIds, readerQueueState.orderedBookIds])

  const addReaderQueueBook = useCallback(async (bookId: string) => {
    const saved = await saveReaderQueueState({
      orderedBookIds: [...readerQueue.map((book) => book.id), bookId],
      excludedBookIds: readerQueueState.excludedBookIds.filter((id) => id !== bookId),
    })
    setReaderQueueState(saved)
  }, [readerQueue, readerQueueState.excludedBookIds])

  const resetReaderQueue = useCallback(async () => {
    const saved = await saveReaderQueueState({ orderedBookIds: [], excludedBookIds: [] })
    setReaderQueueState(saved)
  }, [])

  const toggleReaderEnglish = useCallback(() => {
    setReaderShowEnglish((current) => {
      const readerShowEnglish = !current
      setUserSettings((settings) => {
        const next = { ...settings, readerShowEnglish }
        void saveUserSettings(next)
        return next
      })
      return readerShowEnglish
    })
  }, [])

  // Close out the reading session: credit the sentence currently on screen,
  // stamp endedAt, and show a recap when the session had real activity.
  const endReaderSession = useCallback(async () => {
    readerListening.stop()
    let session = activeReaderSession
    if (session && currentReaderSentence) {
      session = await creditReaderSentence(currentReaderSentence, readerTokens, session)
    }
    readerTappedWordIdsRef.current.clear()
    setActiveReaderSession(null)
    if (session) {
      const ended: ReaderSession = {
        ...session,
        endedAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }
      await updateReaderSession(ended)
      queueCloudSync()
      const hadActivity =
        ended.sentenceIdsRead.length > 1 || (ended.exposuresCredited ?? 0) > 0
      if (hadActivity) {
        setReaderRecap({
          sentencesRead: ended.sentenceIdsRead.length,
          wordsRead: ended.wordsRead,
          exposuresCredited: ended.exposuresCredited ?? 0,
          promoted: readerSessionPromotedRef.current,
          activeSeconds: ended.activeSeconds,
          focusedActiveSeconds: ended.focusedActiveSeconds ?? 0,
          focusedWordsRead: ended.focusedWordsRead ?? 0,
          focusedWpm: focusedWpm(ended),
          challengePercent: ended.challengePercent ?? 0,
          qualified: qualifyReadingSession(ended),
        })
        playGentleCelebration()
        return
      }
    }
    setScreen('readingTexts')
  }, [activeReaderSession, creditReaderSentence, currentReaderSentence, queueCloudSync, readerListening, readerTokens])

  const dismissReaderRecap = useCallback(() => {
    setReaderRecap(null)
    readerSessionPromotedRef.current = []
    readerCreditedSentenceIdsRef.current.clear()
    setScreen('readingTexts')
  }, [])

  const bookListening = useReaderListeningController({
    sentence: bookListenSentence ?? undefined,
    sentenceIndex: bookListenIndex,
    sentenceCount: bookListenSentences.length,
    rate: userSettings.readerListeningRate,
    repeatCount: userSettings.readerListeningRepeats,
    pauseFactor: userSettings.readerListeningPauseFactor,
    autoAdvance: true,
    mediaSessionEnabled: screen === 'lesson' && sentenceSubMode === 'books',
    onNext: bookListenAdvance,
    onPrevious: bookListenGoBack,
  })

  // Keep audio alive when the browser/app is merely backgrounded, but stop it
  // when the learner deliberately navigates away from Listening inside the app.
  useEffect(() => {
    const previousScreen = previousScreenRef.current
    previousScreenRef.current = screen
    if (previousScreen !== 'lesson' || screen === 'lesson') return
    runToken.current += 1
    stopAudioOutputs()
    bookListening.stop()
    setSentencePaused(true)
    setIsPlaying(false)
  }, [bookListening, screen, stopAudioOutputs])

  // Keep a stable ref to startListening so auto-start effect doesn't need it as a dep
  bookListenStartRef.current = bookListening.startListening

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

  // Autoplay a freshly rendered sentence session and keep its speed in sync.

  useEffect(() => {
    const audio = sentenceAudioRef.current
    if (audio) audio.playbackRate = playbackRate
  }, [playbackRate])

  // Media Session: expose sentence-mode controls to lock screen / headphones

  const handleStandaloneFlashcardRate = useCallback((rating: FsrsRating) => {
    if (!currentFlashcardWord || flashcardSessionFeedback) return
    const wordId = currentFlashcardWord.id
    const studySeconds = cappedFlashcardStudySeconds(flashcardPresentationStartedAtRef.current, Date.now())
    const preRatingWord = currentFlashcardWord
    const preRatingDoneIds = flashcardDoneIds
    const movedCloser =
      (rating === 'good' || rating === 'easy') && masteryForWord(preRatingWord).level < 3
    setFlashcardSessionFeedback(rating)
    setFlashcardExternalDismissDir(FLASHCARD_RATING_DISMISS_DIR[rating])
    setFlashcardSessionRatingCounts((prev) => ({ ...prev, [rating]: prev[rating] + 1 }))
    if (movedCloser) setFlashcardSessionMovedCloser((prev) => prev + 1)
    window.setTimeout(() => {
      void (async () => {
        try {
          const updatedWord = await rateWordFsrs(wordId, rating, {
            source: 'flashcards',
            sessionId: flashcardSessionId ?? undefined,
            seconds: studySeconds,
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
            if (masteryForWord(updatedWord).level > masteryForWord(preRatingWord).level) {
              setFlashcardSessionLeveledUp((prev) =>
                prev.some((w) => w.id === wordId) ? prev : [...prev, updatedWord],
              )
            }
          }
          setFlashcardSessionStudySeconds((seconds) => seconds + studySeconds)
          setFlashcardDoneIds(nextDoneIds)
          setFlashcardClock(now)
          setFlashcardCurrentId(nextWord?.id ?? null)
          setFlashcardExternalDismissDir(null)
          void refresh()
          queueCloudSync()
          setLastSummary(`Rated ${preRatingWord.word} ${fsrsLabel(rating)}.`)
          setFlashcardAnswerShown(false)
          setFlashcardSessionFeedback(null)
          if (flashcardUndoTimeoutRef.current !== null) window.clearTimeout(flashcardUndoTimeoutRef.current)
          setFlashcardUndoState({ word: preRatingWord, rating, prevDoneIds: preRatingDoneIds, movedCloser })
          flashcardUndoTimeoutRef.current = window.setTimeout(() => {
            setFlashcardUndoState(null)
            flashcardUndoTimeoutRef.current = null
          }, 5000)
        } catch (error) {
          setFlashcardExternalDismissDir(null)
          setFlashcardSessionFeedback(null)
          setFlashcardSessionRatingCounts((prev) => ({
            ...prev,
            [rating]: Math.max(0, prev[rating] - 1),
          }))
          if (movedCloser) setFlashcardSessionMovedCloser((prev) => Math.max(0, prev - 1))
          setLastSummary(error instanceof Error ? `Could not save rating: ${error.message}` : 'Could not save rating. Try again.')
        }
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
    setFlashcardSessionLeveledUp((prev) => prev.filter((w) => w.id !== flashcardUndoState.word.id))
    if (flashcardUndoState.movedCloser) {
      setFlashcardSessionMovedCloser((prev) => Math.max(0, prev - 1))
    }
    setFlashcardDoneIds(flashcardUndoState.prevDoneIds)
    setFlashcardCurrentId(flashcardUndoState.word.id)
    flashcardPresentationStartedAtRef.current = Date.now()
    setFlashcardAnswerShown(true)
    setFlashcardSessionFeedback(null)
    setFlashcardUndoState(null)
    setLastSummary(`Undid rating for ${flashcardUndoState.word.word}.`)
  }, [flashcardUndoState])

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
    if (screen !== 'flashcards') return
    if (!currentFlashcardWord || flashcardAnswerShown || currentFlashcardFrontMode !== 'audio') return
    void playFlashcardWordTwice(currentFlashcardWord)
  }, [
    currentFlashcardFrontMode,
    currentFlashcardWord,
    flashcardAnswerShown,
    playFlashcardWordTwice,
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
          readerListening.startListening()
        } else if (mappedIndex === 1) {
          event.preventDefault()
          void moveReaderSentence(1)
        } else if (mappedIndex === 2) {
          event.preventDefault()
          void moveReaderSentence(-1)
        } else if (mappedIndex === 3) {
          event.preventDefault()
          toggleReaderEnglish()
        }
        return
      }
      if (screen === 'dashboard') {
        if (mappedIndex === 0) {
          event.preventDefault()
          startSavedFlashcards()
        } else if (mappedIndex === 1) {
          event.preventDefault()
          void startReaderPlaylistRef.current?.()
        } else if (mappedIndex === 2) {
          event.preventDefault()
          startModeLessonRef.current?.()
        } else if (mappedIndex === 3) {
          event.preventDefault()
          startModeLessonRef.current?.()
        }
        return
      }
      if (screen === 'flashcards') {
        if (pressed === hotkeys.choiceF && currentFlashcardWord) {
          event.preventDefault()
          void playFlashcardWordTwice(currentFlashcardWord)
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
        const rating = hotkeyToStandaloneFlashcardRating(pressed, hotkeys)
        if (rating && flashcardAnswerShown) {
          event.preventDefault()
          handleStandaloneFlashcardRate(rating)
        }
        return
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [
    finishFlashcardSession,
    flashcardFeedback,
    flashcardSessionComplete,
    hotkeys,
    currentFlashcardWord,
    currentReaderSentence,
    flashcardAnswerShown,
    handleStandaloneFlashcardRate,
    refreshFlashcardSession,
    moveReaderSentence,
    playFlashcardWordTwice,
    readerListening,
    screen,
    startSavedFlashcards,
    toggleReaderEnglish,
  ])

  async function startModeLesson() {
    stopAudioOutputs()
    saveStartupResumeState({ destination: 'listeningCourse' })
    setScreen('listeningCourse')
  }

  useEffect(() => {
    startModeLessonRef.current = () => {
      void startModeLesson()
    }
  })

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
      .slice(0, 3500)
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
    const treatAsKnown = generateOptions.focusWords
      ? new Set(generateOptions.focusWords.map((w) => w.word))
      : undefined
    let story = await generateAiStory(generateOptions)
    let validation = validateGeneratedStoryCoverage(story, activeWords, treatAsKnown)
    if (
      validation.knownCoveragePercent < GENERATED_STORY_TARGET_COVERAGE ||
      validation.unavoidableNewWords.length > 5
    ) {
      setAiStoryMessage('First draft was too spicy. Retrying with simpler known words...')
      story = await generateAiStory({ ...generateOptions, strictRetry: true })
      validation = validateGeneratedStoryCoverage(story, activeWords, treatAsKnown)
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
    options: {
      sentenceCount: number
      model: string
      cover: boolean
      audio: boolean
      world?: StoryWorldSelection
      focusWords?: Array<{ word: string; pinyin: string; meaning: string }>
    },
  ): Promise<GeneratedStoryResult> => {
    const apiKey = requireOpenRouterKey()
    const knownWords = collectKnownWords()
    // Focus candidates exclude level-3 words by construction, but dedupe
    // defensively against the known list to avoid double instructions.
    const knownSet = new Set(knownWords.map((w) => w.word))
    const focusWords = options.focusWords?.filter((w) => !knownSet.has(w.word))

    const generateOptions = {
      prompt,
      knownWords,
      apiKey,
      model: options.model,
      sentenceCount: options.sentenceCount,
      worldContext: options.world ? buildStoryWorldContext(options.world) : undefined,
      focusWords: focusWords && focusWords.length > 0 ? focusWords : undefined,
    }
    // Remember the last-used choices as the new defaults.
    const nextSettings = {
      ...aiStorySettings,
      model: options.model,
      defaultSentenceCount: options.sentenceCount,
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

  const handleImportReaderText = useCallback(async (file: File): Promise<GeneratedStoryResult> => {
    const story = parseBilingualReaderText(await file.text(), file.name)
    const validation = validateGeneratedStoryCoverage(story, activeWords)
    const book = generatedStoryToReaderBook(story, validation)
    await saveGeneratedReaderBook(book)
    await refresh()
    setAiStoryMessage(`${book.title} added to Reading with ${story.sentences.length} sentence pairs.`)
    return { book, story, validation }
  }, [activeWords, refresh])

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
        sentenceCount: aiStorySettings.defaultSentenceCount,
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
        pack.storagePath,
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

  async function handleDeleteVocabularyWord(word: VocabWord) {
    if (!window.confirm(`Permanently delete “${word.word}” and its review history? This cannot be undone.`)) return
    await deleteWordPermanently(word.id)
    setLastSummary(`Deleted ${word.word} permanently.`)
    await refresh()
    queueCloudSync()
  }

  async function handleHotkeyChange(name: keyof HotkeySettings, value: string) {
    const next = { ...hotkeys, [name]: value.trim().toLocaleLowerCase() }
    setHotkeys(next)
    await saveHotkeys(next)
    setLastSummary('Hotkeys saved.')
  }

  function saveFlashcardDeckSelection(deckId: FlashcardDeckId, checked: boolean) {
    let selected = userSettings.selectedFlashcardDeckIds
    if (deckId === ALL_FLASHCARD_DECK_ID) {
      selected = checked ? [ALL_FLASHCARD_DECK_ID] : [ORIGINAL_DECK_ID]
    } else {
      const individual = selected.filter((id) => id !== ALL_FLASHCARD_DECK_ID)
      selected = checked
        ? Array.from(new Set([...individual, deckId]))
        : individual.filter((id) => id !== deckId)
      if (selected.length === 0) selected = [deckId]
    }
    const next = { ...userSettings, selectedFlashcardDeckIds: selected }
    setUserSettings(next)
    void saveUserSettings(next)
    setLastSummary('Flashcard decks saved.')
  }

  async function handleHistoricalStudyTimeApply() {
    const targetMinutes = Number(historicalStudyMinutesDraft)
    if (!Number.isFinite(targetMinutes) || targetMinutes < 0) {
      setLastSummary('Enter a historical study total of zero minutes or more.')
      return
    }
    await setHistoricalStudyMinutes(targetMinutes)
    await refresh()
    setHistoricalStudyMinutesDraft(String(Math.round(targetMinutes)))
    setLastSummary(`Historical study time adjusted to ${Math.round(targetMinutes).toLocaleString()} minutes.`)
  }

  async function handleHistoricalStudyTimeClear() {
    await clearStudyTimeAdjustment()
    await refresh()
    setHistoricalStudyMinutesDraft('')
    setLastSummary('Historical study-time adjustment removed.')
  }

  async function handleDataHealthCheck() {
    setDataHealthBusy(true)
    try {
      const report = await runDataHealthCheck()
      setDataHealthReport(report)
      setLastSummary(report.healthy ? 'Data health check passed.' : `Data health found ${report.issueCount} issue${report.issueCount === 1 ? '' : 's'}.`)
    } catch (error) {
      setLastSummary(error instanceof Error ? error.message : 'Could not check local data.')
    } finally {
      setDataHealthBusy(false)
    }
  }

  async function handleDataHealthRepair() {
    if (!dataHealthReport || dataHealthReport.healthy) return
    setDataHealthBusy(true)
    try {
      const backup = await exportBackup()
      downloadText(`chunky-chinese-before-repair-${new Date().toISOString().slice(0, 10)}.json`, backup)
      const result = await repairDataHealth()
      await refresh()
      const report = await runDataHealthCheck()
      setDataHealthReport(report)
      setLastSummary(
        `Repair complete: ${result.repairedStudyEvents + result.removedDuplicateEvents + result.repairedReaderSessions + result.repairedReaderProgress} records fixed. Backup downloaded first.`,
      )
    } catch (error) {
      setLastSummary(error instanceof Error ? error.message : 'Could not repair local data.')
    } finally {
      setDataHealthBusy(false)
    }
  }

  function saveReaderSettings(patch: Partial<Pick<
    UserSettings,
    | 'readerPinyinMode'
    | 'readerTheme'
    | 'readerFontScale'
    | 'readerLineHeight'
    | 'readerListeningRate'
    | 'readerListeningRepeats'
    | 'readerListeningPauseFactor'
    | 'readerListeningAutoAdvance'
    | 'readerShowEnglish'
    | 'readerStatusHighlight'
  >>) {
    const next = { ...userSettings, ...patch }
    setUserSettings(next)
    void saveUserSettings(next)
    setLastSummary('Reader settings saved.')
  }

  useEffect(() => {
    if (screen === 'settings' && historicalStudyMinutesDraft === '') {
      setHistoricalStudyMinutesDraft(String(Math.round(stats.ranges.allTime.studyMinutes)))
    }
  }, [historicalStudyMinutesDraft, screen, stats.ranges.allTime.studyMinutes])

  return (
    <main className={`app-shell app-screen-${screen}`}>
      <Suspense fallback={<section className="screen-loading" aria-live="polite">Loading this feature…</section>}>
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
            <button className="topbar-settings-btn" type="button" onClick={() => setScreen('settings')}>Settings</button>
          </div>
        </div>
        <div className="topbar-streak-badge" aria-label={`${stats.currentStreak} day streak`} title="Current streak">
          🔥 {stats.currentStreak}
        </div>
      </header>

      {goalCelebrationId > 0 && <FlashcardCelebration key={`goal-${goalCelebrationId}`} />}

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
              <MilestoneJourney wordsKnown={wordsKnown} leveledUpThisWeek={leveledUpThisWeek} />
            </div>
          </div>

          <div className="rep-rings-row" aria-label="Daily goals">
            <GoalRing
              kind="flashcards"
              title="Flashcards"
              value={stats.ranges.today.cardsReviewed}
              goal={userSettings.flashcardsPerDay}
              unit="cards"
              onClick={startSavedFlashcards}
            />
            <GoalRing
              kind="listening"
              title="Listening"
              value={stats.listeningLessonsToday}
              goal={1}
              unit="lesson"
              onClick={() => void startModeLesson()}
            />
            <GoalRing
              kind="reading"
              title="Reading"
              value={todayReaderStats?.todayPagesRead ?? 0}
              goal={userSettings.readingGoalPages}
              unit="pages"
              onClick={() => void startReaderPlaylistRef.current?.()}
            />
          </div>

          <div className="mode-start-grid mode-start-grid-three dashboard-mode-list" aria-label="Choose study mode">
            <div className="mode-start-stack">
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
                  <span>{promotableDueWords.length > 0 ? 'Can become Known' : 'Due now'}</span>
                  <strong>
                    <CountUpNumber value={promotableDueWords.length > 0 ? promotableDueWords.length : stats.dueNow} />
                  </strong>
                </span>
                <span className="mode-start-arrow" aria-hidden="true">→</span>
              </button>
              {stats.dueNow > 0 && (
                <button type="button" className="quick-ten-button" onClick={startQuickTenFlashcards}>
                  Quick 10 · {Math.min(10, stats.dueNow)} high-value cards
                </button>
              )}
            </div>
            <button className="mode-start dashboard-mode-card listen-start" type="button" onClick={() => void startModeLesson()}>
              <span className="mode-start-logo" aria-hidden="true">
                <span className="nav-icon nav-listen" />
              </span>
              <span className="mode-start-copy">
                <strong>Listening</strong>
                <span>Understand a short conversation in about four minutes.</span>
              </span>
              <kbd>{hotkeys.choiceB.toUpperCase()}</kbd>
              <span className="mode-start-metric">
                <span>Lessons today</span>
                <strong><CountUpNumber value={stats.listeningLessonsToday} /></strong>
              </span>
              <span className="mode-start-arrow" aria-hidden="true">→</span>
            </button>
            <button className="mode-start dashboard-mode-card reading-texts-start" type="button" onClick={() => void startReaderPlaylistRef.current?.()}>
              <span className="mode-start-logo" aria-hidden="true">
                <span className="nav-icon nav-reading" />
              </span>
              <span className="mode-start-copy">
                <strong>Reading</strong>
                <span>Novels, short texts, and generated stories.</span>
              </span>
              <kbd>{hotkeys.choiceC.toUpperCase()}</kbd>
              <span className="mode-start-metric">
                <span>In progress</span>
                <strong>{readerResumeLocation ? 1 : 0}</strong>
              </span>
              <span className="mode-start-arrow" aria-hidden="true">→</span>
            </button>
          </div>

          <section className="dashboard-today-panel" aria-label="Today">
            <div className="dashboard-today-heading">
              <strong>{dashboardRangeLabel(dashboardRange)}</strong>
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
            {selectedRangeStats.cardsReviewed === 0 &&
            selectedRangeStats.successfulRecalls === 0 &&
            selectedRangeStats.studyMinutes === 0 &&
            selectedRangeStats.newWords === 0 &&
            selectedRangeStats.readingGraduatedWords === 0 ? (
              <EmptyPanelPrompt
                message={`Nothing yet ${dashboardRangeLabel(dashboardRange).toLowerCase()} — warm up with a quick set.`}
                actionLabel="Start flashcards"
                onAction={startSavedFlashcards}
              />
            ) : (
            <>
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
            </>
            )}
          </section>

          {dashboardToast && (
            <div className="dashboard-toast" role="status">
              {dashboardToast}
            </div>
          )}

          <div className="dashboard-progress-grid" id="dashboard-progress">
            <InfoPanel title="Review heatmap">
              {stats.studyHeatmap.some((day) => day.activityCount > 0) ? (
                <ProgressHeatmap days={stats.studyHeatmap} />
              ) : (
                <EmptyPanelPrompt
                  message="Your first study session lights this up."
                  actionLabel="Start flashcards"
                  onAction={startSavedFlashcards}
                />
              )}
            </InfoPanel>
            <InfoPanel title="Vocab Growth" className="vocab-growth-panel">
              <VocabGrowthChart points={stats.retentionSeries} />
            </InfoPanel>
            <InfoPanel title="Reading Progress" className="reading-progress-panel">
              <ReadingProgressPanel
                summary={stats.readingProgress}
                onRebaseline={async () => {
                  const count = await rebaselineReadingProgress()
                  if (count > 0) {
                    await refresh()
                    queueCloudSync()
                    setLastSummary('A new reading baseline phase now uses your latest 12 qualified sessions.')
                  }
                }}
              />
            </InfoPanel>
          </div>

          <details className="dashboard-all-stats">
            <summary>All stats</summary>
            <div className="dashboard-progress-grid">
              <InfoPanel title="Learning process" className="process-chart-panel">
                <LearningProcessChart points={stats.learningProcessSeries} />
              </InfoPanel>
              <InfoPanel title="Reading WPM Trend" className="reading-wpm-trend-panel">
                {stats.readingSeries.some((point) => point.wpm > 0) ? (
                  <ReadingWpmTrendChart points={stats.readingSeries} />
                ) : (
                  <EmptyPanelPrompt
                    message="Read for a few minutes to start your speed trend."
                    actionLabel="Open reading"
                    onAction={() => void startReaderPlaylistRef.current?.()}
                  />
                )}
              </InfoPanel>
              <InfoPanel title="Words Graduated From Reading" className="reading-graduated-panel">
                <ReadingGraduatedCounter
                  current={selectedRangeStats.readingGraduatedWords}
                  previous={selectedPreviousRangeStats?.readingGraduatedWords}
                  allTime={stats.ranges.allTime.readingGraduatedWords}
                  rangeLabel={dashboardRangeLabel(dashboardRange)}
                />
              </InfoPanel>
              <InfoPanel title="Study details" className="study-details-panel">
                <dl className="stat-list">
                  <div>
                    <dt>Study minutes</dt>
                    <dd>{stats.minutesToday.toFixed(1)}</dd>
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
                    <dt>Pages read</dt>
                    <dd>{todayReaderStats?.todayPagesRead ?? 0} / {userSettings.readingGoalPages}</dd>
                  </div>
                  <div>
                    <dt>WPM</dt>
                    <dd>{todayReaderStats?.todayWpm ?? 0}</dd>
                  </div>
                  <div>
                    <dt>Longest streak</dt>
                    <dd>{stats.longestStreak}</dd>
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
                    <dt>Reading time</dt>
                    <dd>{formatDuration(todayReaderStats?.todayActiveSeconds ?? 0)}</dd>
                  </div>
                  <div>
                    <dt>Words read</dt>
                    <dd>{todayReaderStats?.todayWordsRead ?? 0}</dd>
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
              </InfoPanel>
            </div>
          </details>

        </motion.section>
      )}

      <nav className="app-bottom-nav" aria-label="Main navigation">
        <button
          type="button"
          className={screen === 'dashboard' ? 'active' : ''}
          onClick={() => setScreen('dashboard')}
          aria-label="Home"
          title="Home"
        >
          <span className="dashboard-bottom-icon dashboard-bottom-home" aria-hidden="true" />
          <span className="nav-label">Home</span>
        </button>
        <button
          type="button"
          className={screen === 'flashcards' ? 'active' : ''}
          onClick={startSavedFlashcards}
          aria-label="Flashcards"
          title="Flashcards"
        >
          <span className="nav-icon nav-flashcards" aria-hidden="true" />
          <span className="nav-label">Review</span>
        </button>
        <button
          type="button"
          className={screen === 'lesson' || screen === 'listeningCourse' ? 'active' : ''}
          onClick={() => void startModeLesson()}
          aria-label="Listening"
          title="Listening"
        >
          <span className="nav-icon nav-listen" aria-hidden="true" />
          <span className="nav-label">Listen</span>
        </button>
        <button
          type="button"
          className={['readingTexts', 'reader'].includes(screen) ? 'active' : ''}
          onClick={() => void startReaderPlaylistRef.current?.()}
          aria-label="Reading"
          title="Reading"
        >
          <span className="nav-icon nav-reading" aria-hidden="true" />
          <span className="nav-label">Reader</span>
        </button>
        <button
          type="button"
          className={screen === 'settings' ? 'active' : ''}
          onClick={() => setScreen('settings')}
          aria-label="Settings"
          title="Settings"
        >
          <span className="dashboard-bottom-icon dashboard-bottom-settings" aria-hidden="true" />
          <span className="nav-label">Settings</span>
        </button>
      </nav>

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
          <div className="flashcard-session-header">
            <div>
              <h1>Flashcards</h1>
              <p>{Math.max(0, flashcardSessionCounts.total - flashcardSessionCounts.done)} cards remaining</p>
            </div>
            <span className="flashcard-session-streak" aria-label={`${stats.currentStreak} day streak`}>
              <span aria-hidden="true">🔥</span> {stats.currentStreak}
            </span>
          </div>

          <section className="flashcards-workspace">
            <div className="flashcards-meta">
              <div className="flashcard-mode-buttons">
                <button
                  type="button"
                  className="flashcard-action-pill flashcard-edit-action"
                  onClick={() => currentFlashcardWord && openCardEditor(currentFlashcardWord)}
                  disabled={!currentFlashcardWord}
                >
                  <span className="flashcard-action-icon flashcard-edit-icon" aria-hidden="true" />
                  Edit
                </button>
                <button
                  type="button"
                  className={`flashcard-action-pill flashcard-audio-action${flashcardAudioOnly ? ' active' : ''}`}
                  onClick={() => setFlashcardAudioOnly((v) => !v)}
                  aria-pressed={flashcardAudioOnly}
                >
                  <span className="flashcard-action-icon flashcard-audio-icon" aria-hidden="true" />
                  Audio only
                </button>
              </div>
            </div>
            <FlashcardQueueCounters counts={flashcardSessionCounts} />

            {currentFlashcardWord ? (
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
                selectedRating={flashcardSessionFeedback}
                externalDismissDir={flashcardExternalDismissDir}
                choiceKeys={hotkeys}
              />
            ) : (
              <div className="review-complete flashcards-complete">
                <strong>
                  {!initialDataReady
                    ? 'Loading flashcards…'
                    : flashcardSessionComplete
                    ? 'Set complete — nice work!'
                    : flashcardQueue.length > 0
                      ? 'Short-step cards are waiting.'
                      : 'Choose a flashcard queue.'}
                </strong>
                <span>
                  {!initialDataReady
                    ? 'Your saved vocabulary is still loading.'
                    : flashcardSessionComplete
                    ? 'Every card in this set is scheduled for tomorrow or later.'
                    : flashcardQueue.length > 0
                      ? 'Learning cards will come back within the 5-minute learn-ahead window.'
                      : 'Choose at least one flashcard deck and queue in Settings.'}
                </span>
                {flashcardSessionComplete && (
                  <>
                    <div className="flashcard-session-summary">
                      {(() => {
                        const totalRated =
                          flashcardSessionRatingCounts.again +
                          flashcardSessionRatingCounts.hard +
                          flashcardSessionRatingCounts.good +
                          flashcardSessionRatingCounts.easy
                        const accuracy = totalRated > 0
                          ? Math.round(((flashcardSessionRatingCounts.good + flashcardSessionRatingCounts.easy) / totalRated) * 100)
                          : 0
                        const goal = userSettings.flashcardsPerDay
                        const reviewedToday = stats.ranges.today.cardsReviewed
                        const goalFraction = goal > 0 ? Math.min(1, reviewedToday / goal) : 0
                        return (
                          <div className="session-recap-highlights">
                            <span className="session-recap-chip">
                              <strong>{accuracy}%</strong> recalled
                            </span>
                            <span className="session-recap-chip">
                              <strong>🔥 {stats.currentStreak}</strong> day streak
                            </span>
                            {(() => {
                              const becameKnown = flashcardSessionLeveledUp.filter(
                                (word) => masteryForWord(word).level >= 3,
                              ).length
                              if (becameKnown > 0) {
                                return (
                                  <span className="session-recap-chip">
                                    <strong>{becameKnown}</strong> became Known
                                  </span>
                                )
                              }
                              if (flashcardSessionMovedCloser > 0) {
                                return (
                                  <span className="session-recap-chip">
                                    <strong>{flashcardSessionMovedCloser}</strong> moved closer to Known
                                  </span>
                                )
                              }
                              return null
                            })()}
                            <div className="session-recap-goal" aria-label={`Daily goal: ${reviewedToday} of ${goal} cards`}>
                              <span>Daily goal {reviewedToday} / {goal}{goalFraction >= 1 ? ' — complete! 🎉' : ''}</span>
                              <div className="session-recap-goal-bar">
                                <div className="session-recap-goal-fill" style={{ width: `${goalFraction * 100}%` }} />
                              </div>
                            </div>
                          </div>
                        )
                      })()}
                      {flashcardSessionLeveledUp.length > 0 && (
                        <div className="session-leveled-words">
                          <span className="struggled-label">Leveled up this set:</span>
                          {flashcardSessionLeveledUp.slice(0, 10).map((word) => (
                            <span key={word.id} className="session-leveled-word">
                              {word.word} → {masteryForWord(word).label}
                            </span>
                          ))}
                          {flashcardSessionLeveledUp.length > 10 && (
                            <span className="struggled-label">+{flashcardSessionLeveledUp.length - 10} more</span>
                          )}
                        </div>
                      )}
                      <div className="session-summary-stats">
                        <span><strong>{formatDuration(flashcardSessionStudySeconds)}</strong> study time</span>
                        {fsrsRatingsForUi.map((r) => (
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
                  </>
                )}
              </div>
            )}
          </section>
        </motion.section>
      )}

      {screen === 'flashcards' && flashcardUndoState && (
        <div className="flashcard-undo-toast">
          <span>Rated <strong>{flashcardUndoState.word.word}</strong> as {fsrsLabel(flashcardUndoState.rating)}</span>
          <button type="button" onClick={() => void handleFlashcardUndo()}>Undo</button>
        </div>
      )}

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
          listeningPauseFactor={userSettings.readerListeningPauseFactor}
          listeningAutoAdvance={userSettings.readerListeningAutoAdvance}
          readerQueue={readerQueue}
          excludedQueueBooks={readerBooks.filter((book) => readerQueueState.excludedBookIds.includes(book.id) && !readerProgressRows.find((row) => row.bookId === book.id)?.completedAt)}
          completedBook={completedReaderBookId === activeReaderBook?.id ? activeReaderBook : undefined}
          onContinueQueue={() => {
            const nextBook = readerQueue[0]
            if (!nextBook) {
              setScreen('readingTexts')
              return
            }
            readerListening.stop()
            void openReaderBook(nextBook, 'resume')
          }}
          onReplayBook={() => {
            if (!activeReaderBook) return
            readerListening.stop()
            void openReaderBook(activeReaderBook, 'start')
          }}
          onMoveQueueBook={(bookId, delta) => void moveReaderQueueBook(bookId, delta)}
          onRemoveQueueBook={(bookId) => void removeReaderQueueBook(bookId)}
          onAddQueueBook={(bookId) => void addReaderQueueBook(bookId)}
          onResetQueue={() => void resetReaderQueue()}
          onChooseBook={openReaderBook}
          onChooseChapter={(sentenceIndex) => {
            readerListening.stop()
            return moveReaderSentence(sentenceIndex - readerSentenceIndex)
          }}
          onOpenLibrary={() => {
            void endReaderSession()
          }}
          sessionRecap={readerRecap}
          onDismissRecap={dismissReaderRecap}
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
            if (token?.word) {
              readerTappedWordIdsRef.current.add(token.word.id)
            }
            if (token && !token.word && token.isChinese) {
              updateStoryChunkMetrics({ tappedUnsavedWords: [token.text] })
              lookupDictionary(token.text).then((entry) => setReaderDictionaryEntry(entry ?? null)).catch(console.error)
            }
          }}
          onSaveWord={async (text, pinyin, meaning) => {
            const saved = await saveReaderVocabularyWord(text, pinyin, meaning)
            readerTappedWordIdsRef.current.add(saved.id)
            updateStoryChunkMetrics({ savedWords: [text] })
            await refresh()
          }}
          onEditWord={openCardEditor}
          onToggleEnglish={() => {
            recordReaderInteraction()
            toggleReaderEnglish()
          }}
          onOverlayOpenChange={handleReaderOverlayOpenChange}
          readerDictionaryEntry={readerDictionaryEntry}
        />
      )}

      {screen === 'readingTexts' && (
        <ReadingTextsLibrary
          readerBooks={readerBooks}
          comprehensionByBook={readerComprehensionByBook}
          resumeLocation={readerResumeLocation}
          offlineStatuses={readerOfflineStatuses}
          offlineBusyId={readerOfflineBusyId}
          offlineProgress={readerOfflineProgress}
          onBack={() => setScreen('dashboard')}
          onChooseBook={openReaderBook}
          onPreloadBook={(book) => preloadReaderSentenceAssets(book, 0)}
          onDownloadOffline={(book) => void handleReaderOfflineDownload(book)}
          onRemoveOffline={(book) => void handleReaderOfflineRemove(book)}
          onBrowseNovels={() => {
            setActiveReaderBookId(undefined)
            setScreen('reader')
          }}
          onGenerateStory={handleGenerateStory}
          onImportReaderText={handleImportReaderText}
          onContinueStory={handleContinueStory}
          onDeleteStory={handleDeleteGeneratedStory}
          aiStoryBusy={aiStoryBusy}
          aiStoryMessage={aiStoryMessage}
          canGenerateAiStories={aiStorySettings.openRouterApiKey.length > 0}
          storyFocusCandidates={storyFocusCandidates}
          aiStoryDefaults={{
            model: aiStorySettings.model,
            sentenceCount: aiStorySettings.defaultSentenceCount,
            generateCover: aiStorySettings.generateCover,
            generateAudio: aiStorySettings.generateAudio,
            azureConfigured: Boolean(aiStorySettings.azureSpeechKey && aiStorySettings.azureSpeechRegion),
          }}
        />
      )}

      {screen === 'words' && (
        <WordsManagerScreen
          words={words}
          onBack={() => setScreen('settings')}
          onEdit={openCardEditor}
          onArchive={(wordId) => void handleArchiveVocabularyWord(wordId)}
          onRestore={(wordId) => void handleRestoreVocabularyWord(wordId)}
          onDelete={(word) => void handleDeleteVocabularyWord(word)}
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
            <details className="settings-group" open>
              <summary className="settings-group-summary">Flight mode</summary>
              <div className="import-grid">
                <section className="panel offline-flight-panel">
                  <div className="panel-title-row">
                    <div>
                      <h2>Prepare for offline use</h2>
                      <p>
                        Saves the app, LMS flashcards and listening clips, all LMS Reader text and
                        narration, and the Chinese dictionary on this phone.
                      </p>
                    </div>
                    <span className={`sync-pill ${flightOfflineReadyAt ? 'sync-synced' : 'sync-idle'}`}>
                      {flightOfflineReadyAt ? 'Ready' : 'Not saved'}
                    </span>
                  </div>
                  <div className="offline-flight-copy">
                    <strong>About 115–125 MB · keep this screen open until it finishes.</strong>
                    <small>
                      Progress and settings already live on this device. Cloud sync, AI story
                      generation, and packs you have not downloaded still need internet.
                    </small>
                    {flightOfflineReadyAt ? (
                      <small>Last prepared {formatRelativeTime(flightOfflineReadyAt)}.</small>
                    ) : null}
                  </div>
                  <div className="button-row">
                    <button
                      type="button"
                      className="primary"
                      disabled={flightOfflineBusy}
                      onClick={() => void handlePrepareForFlight()}
                    >
                      {flightOfflineBusy ? 'Preparing…' : flightOfflineReadyAt ? 'Refresh offline bundle' : 'Prepare for flight'}
                    </button>
                  </div>
                  {flightOfflineProgress ? (
                    <div className="offline-flight-progress" role="status" aria-live="polite">
                      <span className="offline-flight-spinner" aria-hidden="true" />
                      <strong>{flightOfflineProgress}</strong>
                    </div>
                  ) : null}
                </section>
              </div>
            </details>

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
                    (IndexedDB) and sent only to openrouter.ai. Use only your own personal key,
                    never a shared app-wide key. Get one at openrouter.ai/keys.
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
                  <h2>Azure Speech (story and Scripture narration)</h2>
                  <p>
                    Adds real narration audio to generated stories. Stored only on this device;
                    sent only to {aiStorySettings.azureSpeechRegion || 'your-region'}.tts.speech.microsoft.com.
                    Use only your own personal key, never a shared app-wide key. Azure's free tier
                    covers about 500k characters per month.
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
              <GenerateStoryPanel
                disabled={!aiStorySettings.openRouterApiKey}
                busy={aiStoryBusy}
                message={aiStoryMessage}
                onGenerate={handleGenerateStory}
                onImportText={handleImportReaderText}
                onOpenGenerated={(book) => void openReaderBook(book, 'start')}
                defaults={{
                  model: aiStorySettings.model,
                  sentenceCount: aiStorySettings.defaultSentenceCount,
                  generateCover: aiStorySettings.generateCover,
                  generateAudio: aiStorySettings.generateAudio,
                  azureConfigured: Boolean(aiStorySettings.azureSpeechKey && aiStorySettings.azureSpeechRegion),
                }}
                focusCandidates={storyFocusCandidates}
              />
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
                <section className="panel">
                  <h2>Words</h2>
                  <p>Browse the whole deck in one table — edit cards, filter by mastery, and archive words.</p>
                  <div className="button-row">
                    <button type="button" className="primary" onClick={() => setScreen('words')}>
                      Open word manager
                    </button>
                  </div>
                </section>
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
                    <div className="settings-goal-note">
                      <span>Listening / Day</span>
                      <strong>1 four-minute lesson</strong>
                      <small>Additional lessons deepen the dashboard ring color.</small>
                    </div>
                  </div>
                </section>
                <section className="panel historical-study-time-panel">
                  <h2>Historical study time</h2>
                  <p>
                    Correct an inflated total without deleting study history. Existing days keep their
                    relative shape; activity after the correction counts normally.
                  </p>
                  <div className="hotkey-grid">
                    <label>
                      <span>Corrected total minutes</span>
                      <input
                        type="number"
                        min={0}
                        step={10}
                        inputMode="numeric"
                        value={historicalStudyMinutesDraft}
                        onChange={(event) => setHistoricalStudyMinutesDraft(event.target.value)}
                      />
                      <small>
                        Dashboard now shows {Math.round(stats.ranges.allTime.studyMinutes).toLocaleString()} total minutes.
                      </small>
                    </label>
                  </div>
                  <div className="button-row">
                    <button type="button" className="primary" onClick={() => void handleHistoricalStudyTimeApply()}>
                      Apply correction
                    </button>
                    <button type="button" onClick={() => void handleHistoricalStudyTimeClear()}>
                      Remove correction
                    </button>
                  </div>
                </section>
              </div>
            </details>

            <details className="settings-group">
              <summary className="settings-group-summary">Data Health</summary>
              <div className="import-grid">
                <section className="panel data-health-panel">
                  <div className="panel-title-row">
                    <div>
                      <h2>Local data check</h2>
                      <p>Checks study timing, duplicate events, Reader sessions, and saved book positions.</p>
                    </div>
                    {dataHealthReport && (
                      <span className={`sync-pill ${dataHealthReport.healthy ? 'sync-synced' : 'sync-error'}`}>
                        {dataHealthReport.healthy ? 'Healthy' : `${dataHealthReport.issueCount} issues`}
                      </span>
                    )}
                  </div>
                  {dataHealthReport ? (
                    <div className="data-health-results" aria-live="polite">
                      {dataHealthReport.details.map((detail) => <span key={detail}>{detail}</span>)}
                      <small>Checked {formatRelativeTime(dataHealthReport.checkedAt)}.</small>
                    </div>
                  ) : (
                    <small>No check has been run on this device yet.</small>
                  )}
                  <div className="button-row">
                    <button type="button" className="primary" disabled={dataHealthBusy} onClick={() => void handleDataHealthCheck()}>
                      {dataHealthBusy ? 'Checking…' : 'Run data check'}
                    </button>
                    {dataHealthReport && !dataHealthReport.healthy && (
                      <button type="button" disabled={dataHealthBusy} onClick={() => void handleDataHealthRepair()}>
                        Download backup &amp; repair
                      </button>
                    )}
                  </div>
                  <small>Repairs always download a full backup before changing local records.</small>
                </section>
              </div>
            </details>

            <details className="settings-group">
              <summary className="settings-group-summary">Flashcards</summary>
              <div className="import-grid">
                <section className="panel">
                  <h2>Flashcard settings</h2>
                  <p>Choose which decks feed one combined FSRS queue. Mastery and overall metrics remain shared across all words.</p>
                  <div className="flashcard-deck-settings" aria-label="Flashcard decks">
                    {flashcardDeckOptions.map((deck) => {
                      const allSelected = userSettings.selectedFlashcardDeckIds.includes(ALL_FLASHCARD_DECK_ID)
                      const checked = userSettings.selectedFlashcardDeckIds.includes(deck.id)
                      return (
                        <label key={deck.id} className="toggle-row flashcard-deck-option">
                          <span>
                            <strong>{deck.name}</strong>
                            <small>{deck.description} · {flashcardDeckCounts.get(deck.id) ?? 0} words</small>
                          </span>
                          <input
                            type="checkbox"
                            checked={checked}
                            disabled={deck.id !== ALL_FLASHCARD_DECK_ID && allSelected}
                            onChange={(event) => saveFlashcardDeckSelection(deck.id, event.target.checked)}
                          />
                        </label>
                      )
                    })}
                  </div>
                  <FlashcardDeckImporter
                    decks={flashcardDeckOptions
                      .filter((deck) => deck.id !== ALL_FLASHCARD_DECK_ID)
                      .map((deck) => ({ id: deck.id, name: deck.name }))}
                    onComplete={async (message, selectedDeckId) => {
                      if (selectedDeckId) {
                        const next = { ...userSettings, selectedFlashcardDeckIds: [selectedDeckId] }
                        setUserSettings(next)
                        await saveUserSettings(next)
                      }
                      setLastSummary(message)
                      await refresh()
                      queueCloudSync()
                    }}
                  />
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
                  <p>Shape Reader into a calm interlinear book view.</p>
                  <div className="hotkey-grid">
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
                  <button
                    type="button"
                    className="reader-library-settings-link"
                    onClick={() => setScreen('readingTexts')}
                  >
                    Browse book library
                    <span aria-hidden="true">→</span>
                  </button>
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

      {screen === 'listeningCourse' && (
        <Suspense fallback={<section className="screen"><p>Loading listening lessons…</p></section>}>
          <ListeningCourse key={cloudUserEmail || 'device'} scope={cloudUserEmail || 'device'}
            onComplete={async (lessonId, seconds) => {
              await recordEvent({ type: 'complete', itemType: 'lesson', itemId: lessonId, source: 'listening-set', seconds })
              queueCloudSync()
              await refresh()
            }} />
        </Suspense>
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
      </Suspense>
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

const WORDS_PAGE_SIZE = 100
const WORDS_MASTERY_OPTIONS = [
  { value: 'all', label: 'All mastery' },
  { value: '0', label: 'New' },
  { value: '1', label: 'Seedling' },
  { value: '2', label: 'Growing' },
  { value: '3', label: 'Strong' },
  { value: '4', label: 'Mastered' },
] as const
const WORDS_BUCKET_OPTIONS = [
  { value: 'all', label: 'All statuses' },
  { value: 'new', label: 'Unseen' },
  { value: 'learning', label: 'Learning' },
  { value: 'due', label: 'Due' },
  { value: 'scheduled', label: 'Scheduled' },
] as const

function WordsManagerScreen({
  words,
  onBack,
  onEdit,
  onArchive,
  onRestore,
  onDelete,
}: {
  words: VocabWord[]
  onBack: () => void
  onEdit: (word: VocabWord) => void
  onArchive: (wordId: string) => void
  onRestore: (wordId: string) => void
  onDelete: (word: VocabWord) => void
}) {
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(0)
  const [masteryFilter, setMasteryFilter] = useState<'all' | '0' | '1' | '2' | '3' | '4'>('all')
  const [bucketFilter, setBucketFilter] = useState<'all' | FsrsQueueBucket>('all')
  const [showArchived, setShowArchived] = useState(false)
  // Snapshot per mount so due/scheduled bucketing stays stable while browsing.
  const [now] = useState(() => Date.now())

  const filtered = useMemo(() => {
    const query = search.trim().toLocaleLowerCase()
    return words.filter((word) => {
      if (!showArchived && word.archivedAt) return false
      if (masteryFilter !== 'all' && masteryForWord(word).level !== Number(masteryFilter)) return false
      if (bucketFilter !== 'all' && fsrsQueueBucket(word, now) !== bucketFilter) return false
      if (!query) return true
      return (
        word.word.includes(query) ||
        (word.pinyin ?? '').toLocaleLowerCase().includes(query) ||
        word.meaning.toLocaleLowerCase().includes(query)
      )
    })
  }, [words, search, masteryFilter, bucketFilter, showArchived, now])

  const pageCount = Math.max(1, Math.ceil(filtered.length / WORDS_PAGE_SIZE))
  const clampedPage = Math.min(page, pageCount - 1)
  const pageWords = filtered.slice(clampedPage * WORDS_PAGE_SIZE, (clampedPage + 1) * WORDS_PAGE_SIZE)

  return (
    <section className="screen">
      <div className="screen-heading compact">
        <div>
          <h1>Words</h1>
          <p>
            {filtered.length.toLocaleString()} {filtered.length === 1 ? 'word' : 'words'}
            {pageCount > 1 ? ` · page ${clampedPage + 1} of ${pageCount}` : ''}
          </p>
        </div>
        <button type="button" className="ghost-answer reading-back-button" onClick={onBack}>
          Back to Settings
        </button>
      </div>

      <section className="panel words-manager-panel">
        <div className="words-manager-toolbar">
          <input
            type="search"
            placeholder="Search hanzi, pinyin, or meaning"
            value={search}
            onChange={(event) => {
              setSearch(event.target.value)
              setPage(0)
            }}
          />
          <select
            value={masteryFilter}
            aria-label="Filter by mastery"
            onChange={(event) => {
              setMasteryFilter(event.target.value as typeof masteryFilter)
              setPage(0)
            }}
          >
            {WORDS_MASTERY_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>{option.label}</option>
            ))}
          </select>
          <select
            value={bucketFilter}
            aria-label="Filter by study status"
            onChange={(event) => {
              setBucketFilter(event.target.value as typeof bucketFilter)
              setPage(0)
            }}
          >
            {WORDS_BUCKET_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>{option.label}</option>
            ))}
          </select>
          <label className="words-archived-toggle">
            <input
              type="checkbox"
              checked={showArchived}
              onChange={(event) => {
                setShowArchived(event.target.checked)
                setPage(0)
              }}
            />
            <span>Show archived</span>
          </label>
        </div>

        <div className="words-table">
          {pageWords.map((word) => (
            <div key={word.id} className={`words-row${word.archivedAt ? ' archived' : ''}`}>
              <span className="words-row-hanzi">{word.word}</span>
              <span className="words-row-pinyin">{word.pinyin}</span>
              <span className="words-row-meaning">{word.meaning}</span>
              <MasteryMeter word={word} />
              <span className="queue-pill">{word.archivedAt ? 'Archived' : fsrsQueueLabel(word, now)}</span>
              <span className="words-row-actions">
                <button type="button" className="ghost-answer" onClick={() => onEdit(word)}>
                  Edit
                </button>
                {word.archivedAt ? (
                  <>
                    <button type="button" className="ghost-answer" onClick={() => onRestore(word.id)}>
                      Restore
                    </button>
                    <button type="button" className="ghost-answer danger" onClick={() => onDelete(word)}>
                      Delete
                    </button>
                  </>
                ) : (
                  <button type="button" className="ghost-answer danger" onClick={() => onArchive(word.id)}>
                    Archive
                  </button>
                )}
              </span>
            </div>
          ))}
          {pageWords.length === 0 && <p className="words-empty">No words match this filter.</p>}
        </div>

        {pageCount > 1 && (
          <div className="words-pagination">
            <button
              type="button"
              className="ghost-answer"
              disabled={clampedPage === 0}
              onClick={() => setPage(clampedPage - 1)}
            >
              Prev
            </button>
            <span>Page {clampedPage + 1} of {pageCount}</span>
            <button
              type="button"
              className="ghost-answer"
              disabled={clampedPage >= pageCount - 1}
              onClick={() => setPage(clampedPage + 1)}
            >
              Next
            </button>
          </div>
        )}
      </section>
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
  return `${base.replace(/\/$/u, '')}/private-content/${book.packId}/${path.replace(/^\//u, '')}`
}

type ReadingCategoryView = null | 'novels' | 'stories'

function ReadingTextsLibrary({
  readerBooks,
  comprehensionByBook,
  resumeLocation,
  offlineStatuses,
  offlineBusyId,
  offlineProgress,
  onBack,
  onChooseBook,
  onPreloadBook,
  onDownloadOffline,
  onRemoveOffline,
  onBrowseNovels,
  onGenerateStory,
  onImportReaderText,
  onContinueStory,
  onDeleteStory,
  aiStoryBusy,
  aiStoryMessage,
  canGenerateAiStories,
  aiStoryDefaults,
  storyFocusCandidates,
}: {
  readerBooks: ReaderBook[]
  comprehensionByBook: Map<string, ReaderBookComprehension>
  resumeLocation?: ReaderResumeLocation
  offlineStatuses: Map<string, ReaderOfflineStatus>
  offlineBusyId: string | null
  offlineProgress: string
  onBack: () => void
  onChooseBook: (book: ReaderBook, action?: 'resume' | 'start') => void | Promise<void>
  onPreloadBook: (book: ReaderBook) => void
  onDownloadOffline: (book: ReaderBook) => void
  onRemoveOffline: (book: ReaderBook) => void
  onBrowseNovels: () => void
  onGenerateStory: (prompt: string, options: { sentenceCount: number; model: string; cover: boolean; audio: boolean; world?: StoryWorldSelection; focusWords?: Array<{ word: string; pinyin: string; meaning: string }> }) => Promise<GeneratedStoryResult>
  onImportReaderText: (file: File) => Promise<GeneratedStoryResult>
  onContinueStory: (book: ReaderBook) => Promise<GeneratedStoryResult>
  onDeleteStory: (book: ReaderBook) => Promise<void>
  aiStoryBusy: boolean
  aiStoryMessage: string | null
  canGenerateAiStories: boolean
  aiStoryDefaults: { model: string; sentenceCount: number; generateCover: boolean; generateAudio: boolean; azureConfigured: boolean }
  storyFocusCandidates: Array<{ word: string; pinyin: string; meaning: string }>
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
            const offlineStatus = offlineStatuses.get(book.id)
            const offlineBusy = offlineBusyId === book.id
            return (
              <article className="reading-library-book" key={book.id}>
                <button
                  type="button"
                  className={`reading-book-cover reading-book-cover-${index % 4}`}
                  onClick={() => void onChooseBook(book, isResumeBook ? 'resume' : 'start')}
                  onMouseEnter={() => onPreloadBook(book)}
                  onFocus={() => onPreloadBook(book)}
                  aria-label={`${isResumeBook ? 'Resume' : 'Start'} ${book.title}`}
                >
                  {book.coverImage ? (
                    <img src={readerBookCoverSrc(book)} alt="" />
                  ) : null}
                  <span>{book.title}</span>
                </button>
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
                    <button
                      type="button"
                      className={offlineStatus?.complete ? 'offline-ready' : ''}
                      disabled={offlineBusy || offlineStatus?.total === 0}
                      onClick={() => offlineStatus?.complete ? onRemoveOffline(book) : onDownloadOffline(book)}
                    >
                      {offlineBusy
                        ? offlineProgress || 'Working…'
                        : offlineStatus?.complete
                          ? 'Offline ✓'
                          : offlineStatus?.total === 0
                            ? 'Text already local'
                          : offlineStatus?.cached
                            ? `Resume download (${offlineStatus.cached}/${offlineStatus.total})`
                            : 'Download offline'}
                    </button>
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
              onImportText={onImportReaderText}
              onOpenGenerated={(book) => void onChooseBook(book, 'start')}
              defaults={aiStoryDefaults}
              focusCandidates={storyFocusCandidates}
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

  // ── Hub ──
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
          <button type="button" className="reading-format reading-format-novels" onClick={() => setCategory('stories')}>
            <span className="reading-format-icon" aria-hidden="true">事</span>
            <span>
              <strong>Stories</strong>
              <small>{stories.length} short reads and standalone texts.</small>
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
  onImportText,
  onOpenGenerated,
  defaults,
  focusCandidates,
}: {
  disabled: boolean
  busy: boolean
  message: string | null
  onGenerate: (prompt: string, options: { sentenceCount: number; model: string; cover: boolean; audio: boolean; world?: StoryWorldSelection; focusWords?: Array<{ word: string; pinyin: string; meaning: string }> }) => Promise<GeneratedStoryResult>
  onImportText: (file: File) => Promise<GeneratedStoryResult>
  onOpenGenerated: (book: ReaderBook) => void
  defaults: { model: string; sentenceCount: number; generateCover: boolean; generateAudio: boolean; azureConfigured: boolean }
  focusCandidates: Array<{ word: string; pinyin: string; meaning: string }>
}) {
  const [prompt, setPrompt] = useState('')
  const [sentenceCount, setSentenceCount] = useState(defaults.sentenceCount)
  const [model, setModel] = useState(defaults.model)
  const [cover, setCover] = useState(defaults.generateCover)
  const [audio, setAudio] = useState(defaults.generateAudio && defaults.azureConfigured)
  const [focusAlmostKnown, setFocusAlmostKnown] = useState(() => focusCandidates.length >= 3)
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
      const result = await onGenerate(prompt, {
        sentenceCount,
        model,
        cover,
        audio,
        world,
        focusWords: focusAlmostKnown && focusCandidates.length > 0 ? focusCandidates : undefined,
      })
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
        <p>Pick a story world, write an optional prompt, and the app will create a Reader-ready bilingual book using at least 95% words you already know.</p>
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
            value={sentenceCount}
            onChange={(event) => setSentenceCount(Number(event.target.value))}
            disabled={disabled || busy}
          >
            {AI_STORY_LENGTHS.map((length) => (
              <option key={length} value={length}>≈ {length} sentences</option>
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
        {focusCandidates.length > 0 && (
          <label className="generate-story-check" title="Weave in the words closest to becoming Known, so reading this story counts where it matters most.">
            <input
              type="checkbox"
              checked={focusAlmostKnown}
              onChange={(event) => setFocusAlmostKnown(event.target.checked)}
              disabled={disabled || busy}
            />
            <span>Focus almost-known words ({focusCandidates.length})</span>
          </label>
        )}
      </div>
      {focusAlmostKnown && focusCandidates.length > 0 && (
        <div className="focus-word-row" aria-label="Almost-known words this story will practice">
          {focusCandidates.map((candidate) => (
            <span key={candidate.word} className="focus-word-chip" title={`${candidate.pinyin} — ${candidate.meaning}`}>
              {candidate.word}
            </span>
          ))}
          <small>These will each appear at least twice.</small>
        </div>
      )}
      <div className="reader-text-import">
        <div>
          <strong>Or add your own paired text</strong>
          <small>Upload a .txt file with one Chinese line, then its English translation, repeated throughout.</small>
          <details className="reader-text-format-example">
            <summary>See a Chinese and English example</summary>
            <div>
              <strong>Chinese followed by English</strong>
              <pre>{`今天阳光很好。
The sunlight is lovely today.
我们慢慢走回家。
We walk home slowly.`}</pre>
              <small>Use one Chinese line followed by one English line. Blank lines are optional.</small>
            </div>
          </details>
        </div>
        <label className="reader-text-upload">
          <span>Upload bilingual TXT</span>
          <input
            type="file"
            accept=".txt,text/plain"
            disabled={busy}
            onChange={(event) => {
              const file = event.target.files?.[0]
              event.currentTarget.value = ''
              if (!file) return
              setLocalMessage(null)
              void onImportText(file)
                .then((result) => {
                  setLastResult(result)
                  setLocalMessage(`${result.book.title} is ready in Reading.`)
                })
                .catch((error) => setLocalMessage(error instanceof Error ? error.message : 'Could not import this text.'))
            }}
          />
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
  readerTheme,
  readerFontScale,
  readerLineHeight,
  replayHotkey,
  choiceB,
  showEnglish,
  storyChunk,
  storyChunkReceipt,
  sessionRecap,
  onDismissRecap,
  listening,
  listeningRate,
  listeningRepeats,
  listeningPauseFactor,
  listeningAutoAdvance,
  readerQueue,
  excludedQueueBooks,
  completedBook,
  onContinueQueue,
  onReplayBook,
  onMoveQueueBook,
  onRemoveQueueBook,
  onAddQueueBook,
  onResetQueue,
  onChooseBook,
  onChooseChapter,
  onOpenLibrary,
  onResume,
  onPrevious,
  onNext,
  onListeningSettingsChange,
  onStartStoryChunk,
  onDismissStoryChunkReceipt,
  onSelectToken,
  onEditWord,
  onToggleEnglish,
  onOverlayOpenChange,
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
  readerTheme: ReaderTheme
  readerFontScale: number
  readerLineHeight: number
  replayHotkey: string
  choiceB: string
  showEnglish: boolean
  storyChunk: StoryChunkSession | null
  storyChunkReceipt: StoryChunkReceipt | null
  sessionRecap: ReaderSessionRecap | null
  onDismissRecap: () => void
  listening: ReaderListeningController
  listeningRate: number
  listeningRepeats: number
  listeningPauseFactor: number
  listeningAutoAdvance: boolean
  readerQueue: ReaderBook[]
  excludedQueueBooks: ReaderBook[]
  completedBook?: ReaderBook
  onContinueQueue: () => void
  onReplayBook: () => void
  onMoveQueueBook: (bookId: string, delta: -1 | 1) => void
  onRemoveQueueBook: (bookId: string) => void
  onAddQueueBook: (bookId: string) => void
  onResetQueue: () => void
  onChooseBook: (book: ReaderBook, action?: 'resume' | 'start') => void | Promise<void>
  onChooseChapter: (sentenceIndex: number) => void | Promise<void>
  onOpenLibrary: () => void
  onResume: () => void
  onPrevious: () => void | Promise<void>
  onNext: () => void | Promise<void>
  onListeningSettingsChange: (patch: Partial<Pick<
    UserSettings,
    'readerListeningRate' | 'readerListeningRepeats' | 'readerListeningPauseFactor' | 'readerListeningAutoAdvance' | 'readerStatusHighlight'
  >>) => void
  onStartStoryChunk: () => void
  onDismissStoryChunkReceipt: () => void
  onSelectToken: (token: ReaderWordToken | null) => void
  onEditWord: (word: VocabWord) => void
  onToggleEnglish: () => void
  onOverlayOpenChange: (open: boolean) => void
  readerDictionaryEntry: DictionaryEntry | null
  onSaveWord: (text: string, pinyin: string, meaning: string) => void | Promise<void>
}) {
  const [readerMenuOpen, setReaderMenuOpen] = useState(false)
  const [bookPickerOpen, setBookPickerOpen] = useState(false)
  const [chapterPickerOpen, setChapterPickerOpen] = useState(false)

  useEffect(() => {
    onOverlayOpenChange(readerMenuOpen || Boolean(selectedToken))
    return () => onOverlayOpenChange(false)
  }, [onOverlayOpenChange, readerMenuOpen, selectedToken])

  const readerSwipe = useSwipeCard({
    directions: ['left', 'right'],
    allowVerticalScroll: true,
    threshold: 54,
    glowColors: SWIPE_NAV_GLOW,
    onSwipe: (direction) => {
      if (direction === 'left' && sentenceIndex < sentenceCount - 1) void onNext()
      if (direction === 'right' && sentenceIndex > 0) void onPrevious()
    },
  })

  const listeningPlaying =
    ['playing', 'loading', 'shadowing'].includes(listening.snapshot.status)
  const sortedReaderBooks = useMemo(
    () => sortReaderBooksByKnownPercent(readerBooks, comprehensionByBook, activeBook?.id),
    [activeBook?.id, comprehensionByBook, readerBooks],
  )
  const chapterOptions = useMemo(() => {
    return (activeBook?.stories ?? []).reduce<Array<{
      story: ReaderStory
      sentenceStart: number
      sentenceEnd: number
    }>>((options, story) => {
      const sentenceStart = options.at(-1)?.sentenceEnd !== undefined
        ? (options.at(-1)?.sentenceEnd ?? -1) + 1
        : 0
      return [...options, {
        story,
        sentenceStart,
        sentenceEnd: sentenceStart + story.sentences.length - 1,
      }]
    }, [])
  }, [activeBook])
  const activeChapter = chapterOptions.find(
    ({ sentenceStart, sentenceEnd }) => sentenceIndex >= sentenceStart && sentenceIndex <= sentenceEnd,
  ) ?? chapterOptions[0]

  return (
    <section className={`screen reader-screen reader-playlist-screen reader-theme-${readerTheme}`}>
      {!(activeBook && sentence) && (
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
            <button type="button" className={showEnglish ? 'active' : ''} onClick={onToggleEnglish}>
              English {showEnglish ? 'sharp' : 'blurred'}
            </button>
          </div>
        </div>
      )}

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
                <div className="reader-meta-primary">
                  <div className="reader-quick-selectors" aria-label="Choose reading text and chapter">
                    <div className="reader-quick-picker">
                      <button type="button" className="reader-quick-picker-button" aria-haspopup="menu" aria-expanded={bookPickerOpen} onClick={() => { setBookPickerOpen((open) => !open); setChapterPickerOpen(false) }}>
                        <span aria-hidden="true">▥</span>
                        <span className="reader-quick-picker-copy"><small>Text</small><strong>{activeBook.title}</strong></span>
                        <span className="reader-picker-chevron" aria-hidden="true">⌄</span>
                      </button>
                      {bookPickerOpen && (
                        <>
                          <button type="button" className="reader-picker-backdrop" aria-label="Close text menu" onClick={() => setBookPickerOpen(false)} />
                          <div className="reader-picker-menu" role="menu" aria-label="Reading texts">
                            {sortedReaderBooks.map((book) => (
                              <button type="button" role="menuitemradio" aria-checked={book.id === activeBook.id} className={book.id === activeBook.id ? 'active' : ''} key={book.id} onClick={() => { setBookPickerOpen(false); if (book.id !== activeBook.id) void onChooseBook(book, 'resume') }}>
                                <span>{book.title}</span>
                                <small>{book.stories.length} {book.stories.length === 1 ? 'chapter' : 'chapters'}</small>
                              </button>
                            ))}
                            <button type="button" className="reader-picker-library-link" onClick={() => { setBookPickerOpen(false); onOpenLibrary() }}>Browse the full library →</button>
                          </div>
                        </>
                      )}
                    </div>
                    <div className="reader-quick-picker">
                      <button type="button" className="reader-quick-picker-button chapter" aria-haspopup="menu" aria-expanded={chapterPickerOpen} onClick={() => { setChapterPickerOpen((open) => !open); setBookPickerOpen(false) }}>
                        <span aria-hidden="true">§</span>
                        <span className="reader-quick-picker-copy"><small>Chapter</small><strong>{activeChapter?.story.chapter ?? 1}</strong></span>
                        <span className="reader-picker-chevron" aria-hidden="true">⌄</span>
                      </button>
                      {chapterPickerOpen && (
                        <>
                          <button type="button" className="reader-picker-backdrop" aria-label="Close chapter menu" onClick={() => setChapterPickerOpen(false)} />
                          <div className="reader-picker-menu reader-chapter-picker-menu" role="menu" aria-label="Chapters">
                            {chapterOptions.map(({ story, sentenceStart }) => (
                              <button type="button" role="menuitemradio" aria-checked={story.id === activeChapter?.story.id} className={story.id === activeChapter?.story.id ? 'active' : ''} key={story.id} onClick={() => { setChapterPickerOpen(false); if (sentenceStart !== sentenceIndex) void onChooseChapter(sentenceStart) }}>
                                <span>Chapter {story.chapter}</span>
                                <small>{story.title}</small>
                              </button>
                            ))}
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                  <span className="reader-meta-title">{activeBook.title}</span>
                </div>
                <strong className="reader-sentence-count">
                  Sentence {sentenceIndex + 1} / {sentenceCount}
                </strong>
              </div>
              <div className="reader-progress-bar" aria-label={`Story progress ${readerProgressPercent(sentenceIndex, sentenceCount)}%`}>
                <span style={{ width: `${readerProgressPercent(sentenceIndex, sentenceCount)}%` }} />
              </div>
              {completedBook && (
                <section className="reader-book-complete" aria-live="polite">
                  <span className="reader-complete-mark" aria-hidden="true">✓</span>
                  <small>Book complete</small>
                  <h2>{completedBook.title}</h2>
                  <p>
                    {readerQueue[0]
                      ? `Up next: ${readerQueue[0].title}`
                      : 'Your reading queue is complete.'}
                  </p>
                  <div className="reader-complete-actions">
                    {readerQueue[0] && (
                      <button type="button" className="primary" onClick={onContinueQueue}>
                        Continue to next book
                      </button>
                    )}
                    <button type="button" onClick={onReplayBook}>Read again</button>
                    <button type="button" onClick={onOpenLibrary}>Library</button>
                  </div>
                </section>
              )}
              {sessionRecap ? (
                <section className="story-chunk-receipt" aria-live="polite">
                  <div className="story-chunk-receipt-summary">
                    <strong>Reading session complete</strong>
                    <span>
                      {sessionRecap.sentencesRead} sentences · {sessionRecap.wordsRead} words · {formatDuration(sessionRecap.activeSeconds)}
                    </span>
                    <div className="session-recap-highlights">
                      <span className="session-recap-chip reading-recap-primary">
                        <strong>{sessionRecap.focusedWpm}</strong> focused WPM
                      </span>
                      <span className="session-recap-chip reading-recap-primary">
                        <strong>{sessionRecap.challengePercent.toFixed(1)}%</strong> challenge
                      </span>
                      <span className="session-recap-chip">
                        <strong>{sessionRecap.exposuresCredited}</strong> words practiced
                      </span>
                      <span className="session-recap-chip">
                        <strong>{sessionRecap.promoted.length}</strong> leveled up
                      </span>
                    </div>
                    <p className="reading-recap-qualification">
                      {sessionRecap.qualified
                        ? 'This session was added to your Reading Progress chart.'
                        : `Progress measurement needs ${Math.max(0, READING_MIN_FOCUSED_WORDS - sessionRecap.focusedWordsRead)} more words and ${Math.max(0, Math.ceil((READING_MIN_FOCUSED_SECONDS - sessionRecap.focusedActiveSeconds) / 60))} more focused minutes.`}
                    </p>
                    {sessionRecap.promoted.length > 0 && (
                      <div className="session-leveled-words">
                        <span className="struggled-label">Leveled up by reading:</span>
                        {sessionRecap.promoted.slice(0, 10).map((word) => (
                          <span key={word.id} className="session-leveled-word">
                            {word.word} → {masteryForWord(word).label}
                          </span>
                        ))}
                        {sessionRecap.promoted.length > 10 && (
                          <span className="struggled-label">+{sessionRecap.promoted.length - 10} more</span>
                        )}
                      </div>
                    )}
                  </div>
                  <div className="story-chunk-receipt-actions">
                    <button type="button" className="primary" onClick={onDismissRecap}>
                      Done
                    </button>
                  </div>
                </section>
              ) : storyChunkReceipt ? (
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
              {/* eslint-disable-next-line react-hooks/refs -- The swipe hook exposes stable JSX event handlers. */}
              <div className="reader-swipe-zone" {...readerSwipe.handlers}>
                  <div
                    key={sentence.id}
                    // eslint-disable-next-line react-hooks/refs -- Passing the swipe hook ref into JSX does not read ref.current.
                    ref={readerSwipe.cardRef}
                    className="reader-reading-area reader-listening-highlight card-enter"
                  >
                    <div className="reader-interlinear" lang="zh-CN">
                      {(sentence.interlinear ?? tokens.map((token) => ({
                        chinese: token.text,
                        pinyin: token.pinyin,
                        gloss: token.isChinese ? token.word?.meaning ?? 'tap for meaning' : '',
                      }))).map((chunk, index) => (
                        <button
                          type="button"
                          className="reader-interlinear-chunk"
                          key={`${chunk.chinese}-${index}`}
                          onClick={() => {
                            const token = tokens.find((item) => item.text === chunk.chinese)
                            onSelectToken(token ?? {
                              id: `interlinear-${index}`,
                              text: chunk.chinese,
                              index,
                              isChinese: true,
                              pinyin: chunk.pinyin,
                            })
                          }}
                        >
                          <span className="reader-interlinear-pinyin">{chunk.pinyin}</span>
                          <strong>{chunk.chinese}</strong>
                          <span className="reader-interlinear-gloss">{chunk.gloss}</span>
                        </button>
                      ))}
                    </div>
                    <p
                      className={`reader-translation ${
                        showEnglish || listening.active ? 'revealed' : 'blur-reveal'
                      } reader-listening-highlight`}
                    >
                      {sentence.english}
                    </p>
                  </div>
              </div>
              {storyChunk && (
                <div className="story-chunk-counter" aria-live="polite">
                  <span className="story-chunk-counter-done">{storyChunk.sentenceIdsRead.length}</span>
                  <span className="story-chunk-counter-sep"> / </span>
                  <span>{storyChunk.endIndex - storyChunk.startIndex + 1}</span>
                  <span className="story-chunk-counter-label"> sentences in chunk</span>
                </div>
              )}
              <div className="reader-bottom-bar">
                <div className="sentence-menu-wrap">
                  <button
                    type="button"
                    className="sentence-menu-btn"
                    onClick={() => setReaderMenuOpen(o => !o)}
                    aria-label="Reader menu"
                  >
                    <span className="reader-control-icon" aria-hidden="true">☰</span>
                    <span className="reader-control-label">Menu</span>
                  </button>
                  <StudyMenuPopup
                    open={readerMenuOpen}
                    onClose={() => setReaderMenuOpen(false)}
                    className="popup-up"
                  >
                    <StudyMenuSection label="Display">
                      <StudyMenuToggle label="English" checked={showEnglish} onChange={() => onToggleEnglish()} />
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
                      <StudyMenuSelect
                        label="Speak pause"
                        value={listeningPauseFactor}
                        options={[
                          { value: 0, label: 'Off' },
                          { value: 0.5, label: 'Short (½× sentence)' },
                          { value: 1, label: 'Normal (1× sentence)' },
                          { value: 1.5, label: 'Long (1½× sentence)' },
                        ]}
                        onChange={value => onListeningSettingsChange({ readerListeningPauseFactor: value })}
                      />
                      <StudyMenuToggle
                        label="Auto-advance"
                        checked={listeningAutoAdvance}
                        onChange={checked => onListeningSettingsChange({ readerListeningAutoAdvance: checked })}
                      />
                    </StudyMenuSection>
                    <StudyMenuSection label={`Queue · ${readerQueue.length} books`}>
                      <div className="reader-queue-list">
                        {readerQueue.map((book, index) => (
                          <div className={`reader-queue-row${book.id === activeBook?.id ? ' active' : ''}`} key={book.id}>
                            <span>
                              <small>{book.id === activeBook?.id ? 'Now playing' : index === 0 ? 'Up next' : `#${index + 1}`}</small>
                              <strong>{book.title}</strong>
                            </span>
                            <div>
                              <button type="button" disabled={index === 0} onClick={() => onMoveQueueBook(book.id, -1)} aria-label={`Move ${book.title} up`}>↑</button>
                              <button type="button" disabled={index === readerQueue.length - 1} onClick={() => onMoveQueueBook(book.id, 1)} aria-label={`Move ${book.title} down`}>↓</button>
                              <button type="button" disabled={book.id === activeBook?.id} onClick={() => onRemoveQueueBook(book.id)} aria-label={`Remove ${book.title} from queue`}>×</button>
                            </div>
                          </div>
                        ))}
                        {excludedQueueBooks.map((book) => (
                          <button type="button" className="reader-queue-add" key={book.id} onClick={() => onAddQueueBook(book.id)}>
                            Add {book.title}
                          </button>
                        ))}
                        <button type="button" className="reader-queue-reset" onClick={onResetQueue}>Reset to automatic</button>
                      </div>
                    </StudyMenuSection>
                    <p className="sentence-menu-label">Session</p>
                    <div className="sentence-menu-modes">
                      <button
                        type="button"
                        className={listening.active ? 'active' : ''}
                        onClick={() => {
                          if (listening.active) listening.stop()
                          else listening.startListening()
                          setReaderMenuOpen(false)
                        }}
                      >
                        {listening.active ? 'Stop Listening Mode' : `Listen from sentence ${sentenceIndex + 1}`}
                      </button>
                      <button
                        type="button"
                        className={storyChunk ? 'active' : ''}
                        disabled={Boolean(storyChunk) || sentenceIndex >= sentenceCount}
                        onClick={() => {
                          onStartStoryChunk()
                          setReaderMenuOpen(false)
                        }}
                      >
                        {storyChunk ? 'Story chunk running' : 'Start story chunk'}
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setReaderMenuOpen(false)
                          onOpenLibrary()
                        }}
                      >
                        Back to library
                      </button>
                    </div>
                  </StudyMenuPopup>
                </div>
                {listening.active ? (
                  <div className="reader-listening-controls" aria-label="Reader listening controls">
                    <button
                      type="button"
                      className="sentence-play-pause reader-listening-play-btn"
                      onClick={listening.togglePlayPause}
                      aria-label={listeningPlaying ? 'Pause listening' : 'Play listening'}
                    >
                      <span className="reader-control-icon" aria-hidden="true">
                        {listeningPlaying ? (
                          <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor">
                            <rect x="5" y="4" width="4" height="16" rx="1" />
                            <rect x="15" y="4" width="4" height="16" rx="1" />
                          </svg>
                        ) : (
                          <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor">
                            <polygon points="5,3 19,12 5,21" />
                          </svg>
                        )}
                      </span>
                      <span className="reader-control-label">{listeningPlaying ? 'Pause' : 'Play'}</span>
                    </button>
                    <button
                      type="button"
                      className="sentence-end-btn reader-listening-icon-btn reader-listening-stop-btn"
                      onClick={listening.stop}
                      aria-label="Stop listening"
                    >
                      <span className="reader-control-icon" aria-hidden="true">
                        <svg viewBox="0 0 24 24" width="17" height="17" fill="currentColor">
                          <rect x="6" y="6" width="12" height="12" rx="2" />
                        </svg>
                      </span>
                      <span className="reader-control-label">Stop</span>
                    </button>
                    <button
                      type="button"
                      className="sentence-end-btn reader-listening-icon-btn"
                      onClick={() => { void onNext() }}
                      disabled={sentenceIndex >= sentenceCount - 1}
                      aria-label={`Next sentence. Choice B hotkey: ${choiceB.toUpperCase()}.`}
                    >
                      <span className="reader-control-icon" aria-hidden="true">
                        <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor">
                          <polygon points="5,4 15,12 5,20" />
                          <rect x="17" y="5" width="2" height="14" rx="1" />
                        </svg>
                      </span>
                      <span className="reader-control-label">Next</span>
                    </button>
                  </div>
                ) : (
                  <div className="reader-listening-controls" aria-label="Reader controls">
                    <button
                      type="button"
                      className="sentence-play-pause reader-listening-play-btn"
                      onClick={listening.startListening}
                      aria-label={`Play sentence. Hotkey: ${replayHotkey.toUpperCase()}.`}
                    >
                      <span className="reader-control-icon" aria-hidden="true">
                        <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor">
                          <polygon points="5,3 19,12 5,21" />
                        </svg>
                      </span>
                      <span className="reader-control-label">Play</span>
                    </button>
                    <button
                      type="button"
                      className="sentence-end-btn reader-listening-icon-btn"
                      onClick={() => { void onPrevious() }}
                      disabled={sentenceIndex <= 0}
                      aria-label="Previous sentence"
                    >
                      <span className="reader-control-icon" aria-hidden="true">
                        <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor">
                          <rect x="5" y="5" width="2" height="14" rx="1" />
                          <polygon points="19,4 9,12 19,20" />
                        </svg>
                      </span>
                      <span className="reader-control-label">Previous</span>
                    </button>
                    <button
                      type="button"
                      className="sentence-end-btn reader-listening-icon-btn"
                      onClick={() => { void onNext() }}
                      disabled={sentenceIndex >= sentenceCount - 1}
                      aria-label={`Next sentence. Hotkey: ${choiceB.toUpperCase()}.`}
                    >
                      <span className="reader-control-icon" aria-hidden="true">
                        <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor">
                          <polygon points="5,4 15,12 5,20" />
                          <rect x="17" y="5" width="2" height="14" rx="1" />
                        </svg>
                      </span>
                      <span className="reader-control-label">Next</span>
                    </button>
                  </div>
                )}
              </div>
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

function ReadingProgressPanel({ summary, onRebaseline }: {
  summary: DashboardStats['readingProgress']
  onRebaseline: () => void | Promise<void>
}) {
  const [view, setView] = useState<'map' | 'process'>('map')
  const recent = summary.points.slice(-24)
  const latestPhase = recent.at(-1)?.phase ?? 1
  const processPoints = summary.points.filter(point => point.phase === latestPhase && point.paceIndex !== null)
  const limit = processPoints.at(-1)
  const statusLabel = { building: 'Building baseline', stable: 'Stable range', positive: 'Positive shift', watch: 'Possible downward shift', unusual: 'Unusual session' }[summary.status]
  if (summary.points.length === 0) return (
    <div className="reading-progress-empty">
      <p>Complete 3 focused minutes and 75 Chinese words to place your first point.</p>
      <span>Audio, menus, word lookups, and inactive time are excluded.</span>
    </div>
  )
  return (
    <div className="reading-progress-wrap">
      <div className="reading-progress-header">
        <div>
          <span className={`process-status process-status-${summary.status === 'positive' ? 'high' : summary.status === 'stable' ? 'normal' : summary.status === 'building' ? 'neutral' : 'low'}`}>{statusLabel}</span>
          <p>{summary.message}</p>
        </div>
        <div className="segmented-control" aria-label="Reading progress chart">
          <button type="button" className={view === 'map' ? 'active' : ''} onClick={() => setView('map')}>Progress map</button>
          <button type="button" className={view === 'process' ? 'active' : ''} onClick={() => setView('process')}>Process</button>
        </div>
      </div>
      <dl className="reading-progress-stats">
        <div><dt>Sessions</dt><dd>{summary.qualifiedSessions}</dd></div>
        <div><dt>Focused words</dt><dd>{summary.focusedWordsRead.toLocaleString()}</dd></div>
        <div><dt>Median challenge</dt><dd>{summary.medianChallenge.toFixed(1)}%</dd></div>
        <div><dt>Best sustained</dt><dd>{summary.bestSustainedPace.toFixed(1)} WPM</dd></div>
      </dl>
      <div className="reading-progress-chart">
        {view === 'map' ? (
          <ResponsiveContainer width="100%" height="100%" minWidth={0}>
            <ScatterChart margin={{ top: 14, right: 18, bottom: 10, left: 0 }}>
              <CartesianGrid strokeDasharray="3 3" opacity={0.16} />
              <XAxis type="number" dataKey="challengePercent" name="Challenge" unit="%" domain={[0, 'dataMax + 5']} />
              <YAxis type="number" dataKey="wpm" name="Focused pace" unit=" WPM" width={42} domain={[0, 'dataMax + 5']} />
              <ZAxis type="number" dataKey="wordsRead" range={[70, 260]} />
              <Tooltip cursor={{ strokeDasharray: '3 3' }} formatter={(value: unknown, name: unknown) => [Number(value).toFixed(1), String(name)]} />
              <Scatter data={recent} fill="var(--study-indigo)" line={{ stroke: 'var(--study-sage)', strokeWidth: 2 }} />
            </ScatterChart>
          </ResponsiveContainer>
        ) : processPoints.length > 0 ? (
          <ResponsiveContainer width="100%" height="100%" minWidth={0}>
            <LineChart data={processPoints} margin={{ top: 14, right: 18, bottom: 10, left: 0 }}>
              <CartesianGrid strokeDasharray="3 3" opacity={0.16} />
              {limit?.upperLimit != null && <ReferenceLine y={limit.upperLimit} stroke="#9b6a4d" strokeDasharray="5 5" />}
              {limit?.center != null && <ReferenceLine y={limit.center} stroke="var(--study-muted)" strokeDasharray="6 4" />}
              {limit?.lowerLimit != null && <ReferenceLine y={limit.lowerLimit} stroke="#9b6a4d" strokeDasharray="5 5" />}
              <XAxis dataKey="date" tickFormatter={shortMonthDay} minTickGap={18} />
              <YAxis width={38} domain={['auto', 'auto']} />
              <Tooltip formatter={(value: unknown) => [`${Number(value).toFixed(1)}`, 'Difficulty-adjusted pace']} labelFormatter={label => friendlyDate(String(label))} />
              <Line type="linear" dataKey="paceIndex" stroke="var(--study-indigo)" strokeWidth={3} dot={{ r: 4 }} />
            </LineChart>
          </ResponsiveContainer>
        ) : <div className="reading-progress-building">{summary.baselineCount} / 12 qualified sessions collected for control limits.</div>}
      </div>
      <p className="reading-progress-note">Control limits describe your normal process; they are not targets.</p>
      {summary.status === 'positive' && summary.qualifiedSessions >= 12 && (
        <button type="button" className="reading-rebaseline" onClick={() => void onRebaseline()}>Start a new baseline from the latest 12</button>
      )}
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
      <p>Focused timing excludes narration, lookups, menus, hidden tabs, and inactivity.</p>
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
          <Bar dataKey="wellKnown" name="Mature FSRS" stackId="a" fill="var(--accent-vibrant)" />
          <Bar dataKey="familiar" name="Growing FSRS" stackId="a" fill="#10b981" />
          <Bar dataKey="barelyKnown" name="Early FSRS" stackId="a" fill="#ef4444" />
          <Bar dataKey="unknown" name="Unseen" stackId="a" fill="#cbd5e1" />
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

function FlashcardReview({
  word,
  answerShown,
  frontMode = 'text',
  onFlip,
  onReplayAudio,
  onRate,
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
    <section className="flashcard-review">
      <div
        key={word.id}
        ref={cardRef}
        {...swipe.handlers}
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
        <span className="flashcard-face-label">{answerShown ? 'Answer' : audioFront ? 'Audio front' : reverseFront ? 'Reverse front' : 'Front'}</span>
        {answerShown ? (
          reverseFront ? (
            <>
              <strong className="flashcard-reverse-meaning">{word.meaning}</strong>
              <p className="flashcard-answer-text">{word.word}</p>
              {word.pinyin && <p className="flashcard-pinyin">{word.pinyin}</p>}
            </>
          ) : (
            <>
              <strong className="flashcard-word">{word.word}</strong>
              {word.pinyin && <p className="flashcard-pinyin">{word.pinyin}</p>}
              <p className="flashcard-answer-text">{word.meaning}</p>
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
              <strong className="flashcard-reverse-meaning">{word.meaning}</strong>
            ) : (
              <strong className="flashcard-word">{word.word}</strong>
            )}
          </>
        )}
        {onReplayAudio && (
          <button
            type="button"
            className="flashcard-play-audio"
            onClick={(event) => {
              event.stopPropagation()
              void onReplayAudio()
            }}
          >
            {choiceKeys?.choiceF && <kbd>{choiceKeys.choiceF.toUpperCase()}</kbd>}
            <span className="flashcard-play-audio-icon" aria-hidden="true" />
            Play audio
          </button>
        )}
        {answerShown && <MasteryMeter word={word} />}
      </div>
      {answerShown && swipeDir && (
        <div className={`swipe-indicator swipe-indicator-${swipeDir}`}>
          {FLASHCARD_SWIPE_LABEL[swipeDir]}
        </div>
      )}
      {answerShown && !selectedRating && (
        <div className="swipe-instructions" aria-label="Swipe left for Again, up for Hard, right for Good, or down for Easy">
          <span><b aria-hidden="true">←</b> Again{choiceKeys && <kbd>{choiceKeys.choiceA.toUpperCase()}</kbd>}</span>
          <span><b aria-hidden="true">↑</b> Hard{choiceKeys && <kbd>{choiceKeys.choiceB.toUpperCase()}</kbd>}</span>
          <span><b aria-hidden="true">→</b> Good{choiceKeys && <kbd>{choiceKeys.choiceC.toUpperCase()}</kbd>}</span>
          <span><b aria-hidden="true">↓</b> Easy{choiceKeys && <kbd>{choiceKeys.choiceD.toUpperCase()}</kbd>}</span>
        </div>
      )}
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

function formatCloudSyncResult(result: CloudSyncResult): string {
  const parts = [
    `${result.pushedWords} word updates sent`,
    `${result.pulledWords} word updates received`,
    `${result.pushedEvents} events sent`,
    `${result.pulledEvents} events received`,
    `${result.pushedReaderProgress} reader bookmarks sent`,
    `${result.pulledReaderProgress} reader bookmarks received`,
    `${result.pushedReaderSessions} reading sessions sent`,
    `${result.pulledReaderSessions} reading sessions received`,
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

// One 'good' tap away from Known (mastery level 3 = interval >= 14 days).
// previewFsrsRatings rounds intervals the same way applyFsrsRating does, so
// this exactly predicts the post-rating mastery level.
function canBecomeKnownWithGood(word: VocabWord, now = Date.now()): boolean {
  if (masteryForWord(word).level >= 3) return false
  return previewFsrsRatings(word, new Date(now)).good.intervalDays >= 14
}

function sortPromotableFirst(words: VocabWord[], now: number): VocabWord[] {
  const promotable = new Set(
    words.filter((word) => canBecomeKnownWithGood(word, now)).map((word) => word.id),
  )
  return [...words].sort(
    (a, b) =>
      Number(promotable.has(b.id)) - Number(promotable.has(a.id)) ||
      sortFlashcardByDueThenLesson(a, b),
  )
}

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
    // Review-due cards: words one good rating from Known come first — they are
    // the reviews that directly grow the words-known count.
    sortPromotableFirst(
      pending.filter(
        (word) => !isFlashcardLearning(word) && !isNewFsrsCard(word) && isFsrsCardDue(word, now),
      ),
      now,
    ),
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

function preloadReaderSentenceAssets(book: ReaderBook, sentenceIndex: number): void {
  const sentences = book.stories.flatMap((story) => story.sentences)
  const sentence = sentences[sentenceIndex]
  if (!sentence) return
  const illustration = getReaderIllustration(book, sentenceIndex)
  if (illustration) {
    const image = new Image()
    image.src = publicAssetPath(illustration.imageFilename)
  }
  if (sentence.audioFilename) {
    void fetch(publicAssetPath(sentence.audioFilename), { cache: 'force-cache' }).catch(() => {})
  }
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

function hotkeyToStandaloneFlashcardRating(key: string, hotkeys: HotkeySettings): FsrsRating | undefined {
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
    choiceE: 'Choice E / Bonus action',
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
    'deckIds',
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
      effectiveWordDeckIds(word).join(';'),
    ].map(csvCell).join(','),
  )
  return [columns.join(','), ...rows].join('\n')
}

function csvCell(value: string | number): string {
  const text = String(value)
  return /[",\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text
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

export default App

function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return `${m}m ${s}s`
}
