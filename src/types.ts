export type WordStatus = 'new' | 'learning' | 'familiar' | 'known' | 'review'

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
  | 'quiz_prompt'

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
  createdAt: string
  updatedAt: string
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
}

export interface ListeningEvent {
  id: string
  timestamp: string
  type: ListeningEventType
  itemType: 'word' | 'sentence' | 'lesson' | 'quiz' | 'audio'
  itemId: string
  seconds?: number
  correct?: boolean
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
    }
  | {
      id: string
      kind: 'audio'
      audioId: string
      label: string
      wordId?: string
      sentenceId?: string
    }
  | {
      id: string
      kind: 'pause'
      seconds: number
      label: string
      wordId?: string
      sentenceId?: string
    }
  | {
      id: string
      kind: 'display'
      text: string
      label: string
      wordId?: string
      sentenceId?: string
    }
  | {
      id: string
      kind: 'ding'
      label: string
      wordId?: string
      sentenceId?: string
    }

export interface LessonPlan {
  id: string
  title: string
  targetWords: VocabWord[]
  steps: LessonStep[]
}

export interface DashboardStats {
  counts: Record<WordStatus, number>
  minutesToday: number
  clipsCompletedToday: number
  knownToday: number
}
