export type WordStatus = 'new' | 'learning' | 'familiar' | 'known' | 'review'

export interface DictionaryEntry {
  traditional: string
  simplified: string
  pinyin: string
  english: string
}

export type AudioClipType =
  | 'word'
  | 'meaning'
  | 'sentence'
  | 'sentenceMeaning'
  | 'prompt'
  | 'fullLesson'
  | 'combined'

export type ListeningEventType =
  | 'play'
  | 'complete'
  | 'skip'
  | 'mark_known'
  | 'mark_familiar'
  | 'mark_learning'
  | 'mark_review'
  | 'quiz_answer'
  | 'quiz_prompt'
  | 'fsrs_rating'

export type FsrsRating = 'again' | 'hard' | 'good' | 'easy'

export type VocabDeckId = 'original' | 'saved-from-reading'
export type FlashcardDeckId = 'all' | VocabDeckId

export type StudyMode = 'listeningMode' | 'sentenceMode'

export type FsrsStateName = 'New' | 'Learning' | 'Review' | 'Relearning'

export type FsrsDashboardBucket = 'new' | 'learning' | 'due' | 'scheduled'

export type LessonQuizKind = 'zh-en' | 'en-zh' | 'audio-zh' | 'contrast' | 'sentence-zh-en'

export interface LessonQuizMetadata {
  kind: LessonQuizKind
  otherWordId?: string
}

export interface HotkeySettings {
  choiceA: string
  choiceB: string
  choiceC: string
  choiceD: string
  choiceE: string
  choiceF: string
  playPause: string
}

export interface UserSettings {
  readingGoalWords: number
  readingGoalPages: number
  listeningGoalHours: number
  lingqCreatedGoal: number
  lingqLearnedGoal: number
  flashcardsPerDay: number
  listeningRepsGoal: number
  flashcardQueueMode: 'mixed' | 'due' | 'new'
  selectedFlashcardDeckIds: FlashcardDeckId[]
  flashcardAudioFrontPercent: number
  darkMode: boolean
  readerPinyinMode: 'adaptive' | 'all' | 'none'
  readerTheme: 'light' | 'sepia' | 'dark'
  readerFontScale: number
  readerLineHeight: number
  readerListeningRate: number
  readerListeningRepeats: number
  readerListeningPauseFactor: number
  readerListeningAutoAdvance: boolean
  readerShowEnglish: boolean
  readerStatusHighlight: boolean
  sentenceRepeats: number
  sentenceIncludeEnglish: boolean
  sentencePauseFactor: number
  sentenceSessionSize: number
  sentenceRounds: number
  sentenceShuffle: boolean
}

export type DashboardRange = 'today' | 'week' | 'month' | 'allTime'

export interface ClipPack {
  id: string
  name: string
  source: 'hosted' | 'folder' | 'csv'
  language?: string
  description?: string
  baseUrl?: string
  browserTts?: boolean
  installedAt?: string
  createdAt: string
  updatedAt: string
  wordCount: number
  sentenceCount: number
  audioCount: number
}

export interface HostedClipPack {
  id: string
  name: string
  description?: string
  baseUrl: string
  language?: string
}

export interface HostedReaderPack {
  id: string
  name: string
  description?: string
  baseUrl: string
  language?: string
}

export interface HostedComicPack {
  id: string
  name: string
  description?: string
  baseUrl: string
  language?: string
}

export interface ReaderPack {
  packId: string
  name: string
  description?: string
  sourcePath?: string
  baseUrl?: string
  language?: string
  createdAt: string
  installedAt?: string
  voice?: string
  rate?: string
  audioAvailable: boolean
  synthesizedAudioCount: number
  storyCount: number
  sentenceCount: number
  books: ReaderBookSummary[]
}

export interface ReaderBookSummary {
  id: string
  title: string
  book: number
  chapterStart: number
  chapterEnd: number
  storyCount: number
  sentenceCount: number
  path: string
  coverImage?: string
  visualNovelWorldId?: string
}

export interface ReaderBook {
  id: string
  packId: string
  title: string
  book: number
  chapterStart: number
  chapterEnd: number
  path?: string
  coverImage?: string
  visualNovelWorldId?: string
  illustrations?: ReaderIllustration[]
  stories: ReaderStory[]
}

export interface ReaderIllustration {
  id: string
  imageFilename: string
  fallbackImageFilename?: string
  alt: string
  prompt?: string
  sentenceStart: number
  sentenceEnd: number
}

export interface ReaderStory {
  id: string
  title: string
  book: number
  chapter: number
  sourceInspiration?: string
  newWords: Array<{ word: string; pinyin?: string; meaning: string }>
  sentences: ReaderSentence[]
}

export interface ReaderSentence {
  id: string
  storyId: string
  index: number
  chinese: string
  pinyin: string
  english: string
  targetWords: string[]
  audioClipId: string
  audioFilename: string
  ssmlFilename: string
  wordTimings?: ReaderWordTiming[]
}

export interface ReaderWordTiming {
  text: string
  startSeconds: number
  endSeconds: number
}

export interface ReaderProgress {
  id: string
  packId: string
  bookId: string
  sentenceIndex: number
  completedAt?: string
  updatedAt: string
}

export interface ReaderQueueState {
  version: 1
  orderedBookIds: string[]
  excludedBookIds: string[]
  updatedAt: string
}

export interface SentenceSrsRecord {
  id: string
  fsrsDueAt?: string
  fsrsIntervalDays: number
  fsrsStability: number
  fsrsDifficulty: number
  fsrsState: FsrsStateName
  fsrsLapses: number
  fsrsRepetitions: number
  seenCount: number
  lastReviewedAt?: string
}

export interface ReaderWordToken {
  id: string
  text: string
  index: number
  isChinese: boolean
  pinyin?: string
  word?: VocabWord
}

export interface ReaderSession {
  id: string
  bookId: string
  packId: string
  startedAt: string
  endedAt?: string
  activeSeconds: number
  wordsRead: number
  sentenceIdsRead: string[]
  exposuresCredited?: number
  promotedWordIds?: string[]
  updatedAt: string
}

export interface ReaderSessionStats {
  todayActiveSeconds: number
  todayWordsRead: number
  todayPagesRead: number
  todayWpm: number
  totalSessions: number
}

export type ComicBubbleType = 'dialogue' | 'narration' | 'thought' | 'sfx'

export type ComicTranslationMode = 'hidden' | 'tap' | 'visible'

export interface ComicPackManifest {
  format: 'chunky-comic-pack'
  formatVersion: 1
  id: string
  title: string
  titleChinese?: string
  author?: string
  description?: string
  language: 'zh-CN' | 'zh-TW'
  coverImage?: string
  chapters: ComicChapterReference[]
}

export interface ComicChapterReference {
  id: string
  title: string
  titleChinese?: string
  file: string
}

export interface ComicChapter {
  id: string
  title: string
  titleChinese?: string
  pages: ComicPage[]
}

export interface ComicPage {
  id: string
  image: string
  width?: number
  height?: number
  bubbles: ComicBubble[]
}

export interface ComicBubble {
  id: string
  order: number
  chinese: string
  english?: string
  type: ComicBubbleType
  box?: {
    x: number
    y: number
    width: number
    height: number
  }
}

export interface ComicPackRecord extends ComicPackManifest {
  importedAt: string
  updatedAt: string
  source: 'sample' | 'imported' | 'hosted'
  chapterCount: number
  pageCount: number
  imageCount: number
}

export interface ComicChapterRecord extends ComicChapter {
  recordId: string
  packId: string
  chapterIndex: number
  updatedAt: string
}

export interface ComicImageRecord {
  id: string
  packId: string
  path: string
  blob: Blob
  contentType?: string
  updatedAt: string
}

export interface ComicProgress {
  id: string
  packId: string
  chapterId: string
  pageIndex: number
  updatedAt: string
  translationMode: ComicTranslationMode
  showSoundEffects: boolean
}

export interface ComicPackSummary {
  id: string
  title: string
  titleChinese?: string
  author?: string
  description?: string
  language: 'zh-CN' | 'zh-TW'
  source: 'sample' | 'imported' | 'hosted'
  coverImage?: string
  chapterCount: number
  pageCount: number
  imageCount: number
  progress?: ComicProgress
}

export interface ComicImportSummary {
  packId: string
  title: string
  chapters: number
  pages: number
  images: number
  warnings: string[]
  replaced: boolean
}

export interface ComicCoverageSummary {
  totalOccurrences: number
  uniqueWords: number
  knownOccurrences: number
  familiarOccurrences: number
  learningOccurrences: number
  unknownOccurrences: number
  knownPercent: number
  uniqueUnknownWords: number
}


export interface VocabWord {
  id: string
  word: string
  meaning: string
  status: WordStatus
  lessonNumber?: number
  tags?: string[]
  partOfSpeech?: string
  audioWordId?: string
  audioMeaningId?: string
  audioWordFilename?: string
  audioMeaningFilename?: string
  pinyin?: string
  source?: string
  notes?: string
  fsrsDueAt?: string
  fsrsIntervalDays?: number
  fsrsEase?: number
  fsrsRepetitions?: number
  fsrsLapses?: number
  fsrsState?: FsrsStateName
  fsrsStability?: number
  fsrsDifficulty?: number
  fsrsLearningSteps?: number
  activeRecallPriorityAt?: string
  packIds?: string[]
  deckIds?: VocabDeckId[]
  createdAt: string
  updatedAt: string
  userEditedAt?: string
  readingAddedAt?: string
  lastReadingCreditAt?: string
  readingExposures?: number
  archivedAt?: string
  lastReviewedAt?: string
  seenCount: number
  correctCount: number
  wrongCount: number
  listenedSeconds: number
}

export interface Sentence {
  id: string
  chinese: string
  english: string
  targetWords: string[]
  difficulty?: number
  audioSentenceId?: string
  audioEnglishId?: string
  audioSentenceFilename?: string
  audioEnglishFilename?: string
  packIds?: string[]
  tags?: string[]
  createdAt: string
  updatedAt: string
}

export interface AudioClip {
  id: string
  type: AudioClipType
  label: string
  filename: string
  path?: string
  blob: Blob
  durationSeconds?: number
  linkedWordIds?: string[]
  linkedSentenceId?: string
  manifestId?: string
  text?: string
  language?: 'zh-CN' | 'en-US' | string
  provider?: string
  voice?: string
  packId?: string
  createdAt: string
}

export interface ClipManifestEntry {
  id: string
  type: AudioClipType
  text: string
  language: 'zh-CN' | 'en-US' | string
  path: string
  label?: string
  linkedWordIds?: string[]
  linkedSentenceId?: string
  provider?: string
  voice?: string
}

export interface ClipPackManifest {
  packName: string
  createdAt: string
  vocabCsvPath?: string
  sentencesCsvPath?: string
  clips: ClipManifestEntry[]
}

export interface RenderedLesson {
  id: string
  title: string
  createdAt: string
  targetWordIds: string[]
  durationSeconds: number
  blob: Blob
  warnings: string[]
  segments?: RenderedLessonSegment[]
}

export interface RenderedLessonSegment {
  stepId: string
  startSeconds: number
  endSeconds: number
  wordId?: string
  sentenceId?: string
  label: string
  kind: LessonStep['kind']
  quiz?: LessonQuizMetadata
}

export interface ListeningEvent {
  id: string
  timestamp: string
  type: ListeningEventType
  itemType: 'word' | 'sentence' | 'lesson' | 'quiz' | 'audio'
  itemId: string
  seconds?: number
  correct?: boolean
  rating?: FsrsRating
  source?: 'flashcards' | 'lesson-review' | 'active-recall' | 'reading'
  sessionId?: string
}

export interface ImportSummary {
  created: number
  updated: number
  skipped: number
  linkedAudio?: number
  importedWords?: number
  importedSentences?: number
  warnings: string[]
}

export type LessonStep =
  | {
      id: string
      kind: 'speech'
      text: string
      label: string
      wordId?: string
      sentenceId?: string
      quiz?: LessonQuizMetadata
    }
  | {
      id: string
      kind: 'audio'
      audioId: string
      label: string
      wordId?: string
      sentenceId?: string
      quiz?: LessonQuizMetadata
    }
  | {
      id: string
      kind: 'pause'
      seconds: number
      label: string
      wordId?: string
      sentenceId?: string
      quiz?: LessonQuizMetadata
    }
  | {
      id: string
      kind: 'display'
      text: string
      label: string
      wordId?: string
      sentenceId?: string
      quiz?: LessonQuizMetadata
    }
  | {
      id: string
      kind: 'ding'
      label: string
      wordId?: string
      sentenceId?: string
      quiz?: LessonQuizMetadata
    }

export interface LessonPlan {
  id: string
  title: string
  targetWords: VocabWord[]
  steps: LessonStep[]
  warnings?: string[]
}

export interface DashboardStats {
  counts: Record<FsrsDashboardBucket, number>
  dueNow: number
  dueSoon: number
  scheduled: number
  minutesToday: number
  clipsCompletedToday: number
  knownToday: number
  lingqsCreatedToday: number
  lingqsLearnedToday: number
  newWordsToday: number
  ranges: Record<DashboardRange, DashboardRangeStats>
  previousRanges: Partial<Record<DashboardRange, DashboardRangeStats>>
  currentStreak: number
  longestStreak: number
  avgFlashcardSetSeconds: number
  lastFlashcardSetSeconds: number
  learningProcessSeries: LearningProcessPoint[]
  studyHeatmap: StudyDayStat[]
  retentionSeries: RetentionPoint[]
  readingSeries: ReadingDayStat[]
}

export interface DashboardRangeStats {
  cardsReviewed: number
  successfulRecalls: number
  studyMinutes: number
  newWords: number
  readingGraduatedWords: number
}

export interface StudyDayStat {
  date: string
  studySeconds: number
  activityCount: number
}

export interface StudyTimeAdjustment {
  cutoffAt: string
  scale: number
  targetMinutes: number
  rawSeconds: number
}

export interface RetentionPoint {
  date: string
  unknown: number
  barelyKnown: number
  familiar: number
  wellKnown: number
}

export interface ReadingDayStat {
  date: string
  wpm: number
  wordsRead: number
  activeSeconds: number
}

export interface LearningProcessPoint {
  date: string
  value: number | null
  center: number | null
  upperLimit: number | null
  lowerLimit: number | null
  successfulRecalls: number
  recallAttempts: number
  studyMinutes: number
  signal?: 'high' | 'low'
}
