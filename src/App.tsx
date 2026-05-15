import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import {
  completeWordExposure,
  downloadText,
  exportBackup,
  getAllAudioClips,
  getAllSentences,
  getAllWords,
  getAudioClip,
  getDashboardStats,
  importAudioFiles,
  importBackup,
  importClipPackFiles,
  importHostedClipPack,
  importSentencesCsv,
  importVocabCsv,
  rateWordFsrs,
  recordEvent,
  recordQuizAnswer,
  saveRenderedLesson,
  seedLmsWordsIfEmpty,
  updateWordStatus,
} from './db'
import { createPocketLesson } from './lesson'
import { renderLessonToWav } from './renderAudio'
import type {
  AudioClip,
  DashboardStats,
  FsrsRating,
  ImportSummary,
  LessonPlan,
  LessonStep,
  RenderedLesson,
  RenderedLessonSegment,
  Sentence,
  VocabWord,
  WordStatus,
} from './types'

type Screen = 'dashboard' | 'words' | 'import' | 'lesson'
type LessonStartOptions = { randomize?: boolean; playAfterRender?: boolean }
type AttentionMode = 'listening' | 'active'
type QuizKind = 'zh-en' | 'en-zh' | 'contrast'

interface ActiveQuiz {
  id: string
  kind: QuizKind
  prompt: string
  wordId: string
  correctValue: string
  options: Array<{ value: string; label: string }>
}

interface QuizResponse {
  selected?: string
  correct: boolean
  skipped?: boolean
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

const HOSTED_CLIP_PACK_URL = `${import.meta.env.BASE_URL}clip-packs/lms-188-azure`

function App() {
  const [screen, setScreen] = useState<Screen>('dashboard')
  const [words, setWords] = useState<VocabWord[]>([])
  const [sentences, setSentences] = useState<Sentence[]>([])
  const [audioClips, setAudioClips] = useState<AudioClip[]>([])
  const [stats, setStats] = useState<DashboardStats>(emptyStats)
  const [statusFilter, setStatusFilter] = useState<WordStatus | 'all'>('all')
  const [search, setSearch] = useState('')
  const [lessonFilter, setLessonFilter] = useState('')
  const [tagFilter, setTagFilter] = useState('')
  const [selectedWordIds, setSelectedWordIds] = useState<string[]>([])
  const [lesson, setLesson] = useState<LessonPlan | null>(null)
  const [currentStepIndex, setCurrentStepIndex] = useState(0)
  const [lessonMode, setLessonMode] = useState<'pocket' | 'live'>('pocket')
  const [renderedLesson, setRenderedLesson] = useState<RenderedLesson | null>(null)
  const [renderedUrl, setRenderedUrl] = useState('')
  const [rendering, setRendering] = useState(false)
  const [pocketProgress, setPocketProgress] = useState({ current: 0, duration: 0 })
  const [showPinyin, setShowPinyin] = useState(false)
  const [showEnglish, setShowEnglish] = useState(true)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [isPlaying, setIsPlaying] = useState(false)
  const [attentionMode, setAttentionMode] = useState<AttentionMode>('listening')
  const [quizResponses, setQuizResponses] = useState<Record<string, QuizResponse>>({})
  const [fsrsRatings, setFsrsRatings] = useState<Record<string, FsrsRating>>({})
  const [showReviewPrompt, setShowReviewPrompt] = useState(false)
  const [autoNextLesson, setAutoNextLesson] = useState(false)
  const [autoAdvance, setAutoAdvance] = useState(true)
  const [playbackRate, setPlaybackRate] = useState(1)
  const [lastSummary, setLastSummary] = useState<string>('Ready.')
  const [seedMessage, setSeedMessage] = useState('Loading LMS vocabulary...')
  const [hostedImporting, setHostedImporting] = useState(false)
  const [hostedProgress, setHostedProgress] = useState('')
  const runToken = useRef(0)
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const pocketAudioRef = useRef<HTMLAudioElement | null>(null)
  const playModeRef = useRef<HTMLElement | null>(null)

  const refresh = useCallback(async () => {
    const [nextWords, nextSentences, nextAudio, nextStats] = await Promise.all([
      getAllWords(),
      getAllSentences(),
      getAllAudioClips(),
      getDashboardStats(),
    ])
    setWords(nextWords)
    setSentences(nextSentences)
    setAudioClips(nextAudio)
    setStats(nextStats)
  }, [])

  useEffect(() => {
    async function start() {
      const seeded = await seedLmsWordsIfEmpty()
      setSeedMessage(
        seeded > 0 ? `Seeded ${seeded} LMS target words.` : 'LMS vocabulary loaded.',
      )
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
  const coverage = useMemo(() => getAudioCoverage(words, sentences, audioClips), [
    audioClips,
    sentences,
    words,
  ])
  const lessonWords = useMemo(
    () =>
      lesson?.targetWords
        .map((target) => words.find((word) => word.id === target.id) ?? target) ?? [],
    [lesson, words],
  )
  const currentQuiz = useMemo(
    () => buildActiveQuiz(currentSegment, renderedLesson, lessonWords, words),
    [currentSegment, lessonWords, renderedLesson, words],
  )
  const currentQuizResponse = currentQuiz ? quizResponses[currentQuiz.id] : undefined
  const answeredQuizStats = useMemo(() => getAnsweredQuizStats(quizResponses), [quizResponses])
  const activeRecallSupportHidden =
    attentionMode === 'active' && hasPassedInitialVocabSection(currentSegment)
  const effectiveShowPinyin = showPinyin && !activeRecallSupportHidden
  const effectiveShowEnglish = showEnglish && !activeRecallSupportHidden
  const allLessonWordsRated =
    lessonWords.length > 0 && lessonWords.every((word) => fsrsRatings[word.id])

  const handleStatus = useCallback(async (ids: string[], status: WordStatus) => {
    if (ids.length === 0) return
    await updateWordStatus(ids, status)
    setLastSummary(`Marked ${ids.length} word${ids.length === 1 ? '' : 's'} ${status}.`)
    await refresh()
  }, [refresh])

  useEffect(() => {
    if (attentionMode !== 'active' || !currentQuiz || currentQuizResponse) return
    if (!pocketAudioRef.current || pocketAudioRef.current.paused) return
    pocketAudioRef.current.pause()
  }, [attentionMode, currentQuiz, currentQuizResponse])

  const handleQuizAnswer = useCallback(async (value: string) => {
    if (!currentQuiz || quizResponses[currentQuiz.id]) return
    const correct = value === currentQuiz.correctValue
    setQuizResponses((responses) => ({
      ...responses,
      [currentQuiz.id]: { selected: value, correct },
    }))
    await recordQuizAnswer(currentQuiz.wordId, correct)
    setLastSummary(correct ? 'Correct.' : 'Not quite.')
    await refresh()
    if (attentionMode === 'active') {
      window.setTimeout(() => {
        void pocketAudioRef.current?.play()
      }, 350)
    }
  }, [attentionMode, currentQuiz, quizResponses, refresh])

  async function handleFsrsRating(wordId: string, rating: FsrsRating) {
    await rateWordFsrs(wordId, rating)
    const nextRatings = { ...fsrsRatings, [wordId]: rating }
    setFsrsRatings(nextRatings)
    setLastSummary(`Rated ${fsrsLabel(rating)}.`)
    await refresh()
    const completeSet =
      lessonWords.length > 0 && lessonWords.every((word) => nextRatings[word.id])
    if (autoNextLesson && completeSet) {
      window.setTimeout(() => {
        setShowReviewPrompt(false)
        void startPocketLesson([], { randomize: true, playAfterRender: true })
      }, 600)
    }
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
      if (
        currentQuiz &&
        optionIndex >= 0 &&
        optionIndex < currentQuiz.options.length &&
        !currentQuizResponse
      ) {
        event.preventDefault()
        void handleQuizAnswer(currentQuiz.options[optionIndex].value)
      } else if (event.key.toLocaleLowerCase() === 'k') {
        event.preventDefault()
        void handleStatus([studyWord.id], 'known')
      } else if (event.key.toLocaleLowerCase() === 'f') {
        event.preventDefault()
        void handleStatus([studyWord.id], 'familiar')
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [currentQuiz, currentQuizResponse, handleQuizAnswer, handleStatus, screen, studyWord])

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

  async function startPocketLesson(
    manualIds: string[] = [],
    options: LessonStartOptions = { randomize: true },
  ) {
    setLessonMode('pocket')
    setRendering(true)
    setScreen('lesson')
    try {
      const { playAfterRender = false, ...selectionOptions } = options
      const nextLesson = createPocketLesson(words, sentences, audioClips, manualIds, selectionOptions)
      setLesson(nextLesson)
      setCurrentStepIndex(0)
      setQuizResponses({})
      setFsrsRatings({})
      setShowReviewPrompt(false)
      if (nextLesson.steps.filter((step) => step.kind === 'audio').length === 0) {
        setLastSummary('No local clips are linked yet. Import a clip pack first.')
        return
      }
      const rendered = await renderLessonToWav(nextLesson, getAudioClip)
      await saveRenderedLesson(rendered)
      if (renderedUrl) URL.revokeObjectURL(renderedUrl)
      const url = URL.createObjectURL(rendered.blob)
      setRenderedLesson(rendered)
      setRenderedUrl(url)
      setPocketProgress({ current: 0, duration: rendered.durationSeconds })
      if (playAfterRender) {
        window.setTimeout(() => {
          void pocketAudioRef.current?.play()
        }, 120)
      }
      setLastSummary(
        rendered.warnings.length > 0
          ? `5 word lesson rendered with ${rendered.warnings.length} warning(s).`
          : '5 word lesson rendered and ready for background-style playback.',
      )
    } catch (error) {
      setLastSummary(error instanceof Error ? error.message : 'Could not render 5 word lesson.')
    } finally {
      setRendering(false)
    }
  }

  async function runFrom(index: number) {
    if (!lesson || lesson.steps.length === 0) return
    const token = runToken.current + 1
    runToken.current = token
    setIsPlaying(true)

    for (let stepIndex = index; stepIndex < lesson.steps.length; stepIndex += 1) {
      if (runToken.current !== token) break
      setCurrentStepIndex(stepIndex)
      const step = lesson.steps[stepIndex]
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

  async function handleHostedClipPackImport() {
    setHostedImporting(true)
    setHostedProgress('Starting hosted clip pack download...')
    try {
      const summary = await importHostedClipPack(HOSTED_CLIP_PACK_URL, (completed, total, label) => {
        setHostedProgress(`${completed} / ${total}: ${label}`)
      })
      setLastSummary(formatSummary(summary))
      setHostedProgress('Hosted clip pack is ready offline in this browser.')
      await refresh()
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Could not download hosted clip pack.'
      setLastSummary(message)
      setHostedProgress(message)
    } finally {
      setHostedImporting(false)
    }
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
            Dashboard
          </button>
          <button className={screen === 'words' ? 'active' : ''} onClick={() => setScreen('words')}>
            Words
          </button>
          <button className={screen === 'import' ? 'active' : ''} onClick={() => setScreen('import')}>
            Import
          </button>
          <button className={screen === 'lesson' ? 'active' : ''} onClick={() => setScreen('lesson')}>
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
            <button className="primary" type="button" onClick={() => startPocketLesson()}>
              Start today's 5
            </button>
          </div>

          <div className="metric-grid today-grid">
            <button
              type="button"
              className="metric hero-metric"
              onClick={() => startPocketLesson()}
            >
              <span>Due now</span>
              <strong>{stats.dueNow}</strong>
            </button>
            <button type="button" className="metric" onClick={() => startPocketLesson()}>
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
                  <dt>Mark familiar</dt>
                  <dd>F</dd>
                </div>
                <div>
                  <dt>Mark known</dt>
                  <dd>K</dd>
                </div>
                <div>
                  <dt>Tap lesson words</dt>
                  <dd>Cycle</dd>
                </div>
                <div>
                  <dt>End rating</dt>
                  <dd>Again / Good / Easy</dd>
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
            <FilePanel
              title="Clip pack folder"
              help="Select the whole generated clip-pack folder: clips_manifest.json, vocab.csv, sentences.csv, and audio/."
              accept=".json,.csv,.mp3,audio/mpeg"
              multiple
              webkitdirectory
              onChange={handleClipPackImport}
            />
            <section className="panel hosted-pack">
              <h2>Hosted LMS clip pack</h2>
              <p>Download the Azure LMS 188 audio pack from GitHub into this browser for offline lessons.</p>
              <button
                className="primary"
                type="button"
                onClick={handleHostedClipPackImport}
                disabled={hostedImporting}
              >
                {hostedImporting ? 'Downloading...' : 'Download hosted clip pack'}
              </button>
              {hostedProgress && <small>{hostedProgress}</small>}
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
                <section className="study-player" ref={playModeRef}>
                  <div className="study-stage">
                    <div className="study-meta">
                      <span>{rendering ? 'Rendering local audio...' : renderedLesson?.title ?? lesson.title}</span>
                      <div className="study-toggles">
                        <button type="button" onClick={() => setShowPinyin((value) => !value)}>
                          Pinyin {showPinyin ? 'on' : 'off'}
                        </button>
                        <button type="button" onClick={() => setShowEnglish((value) => !value)}>
                          English {showEnglish ? 'on' : 'off'}
                        </button>
                        <button
                          type="button"
                          className={attentionMode === 'active' ? 'active' : ''}
                          onClick={() =>
                            setAttentionMode((mode) =>
                              mode === 'active' ? 'listening' : 'active',
                            )
                          }
                        >
                          {attentionMode === 'active' ? 'Active' : 'Listening'}
                        </button>
                      </div>
                    </div>
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
                    {lessonWords.length > 0 && (
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
                            <small>{word.meaning}</small>
                          </button>
                        ))}
                      </div>
                    )}
                    {showReviewPrompt && lessonWords.length > 0 && (
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
                          {lessonWords.map((word) => (
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
                      </div>
                    )}
                    {currentQuiz && !currentQuizResponse?.skipped && (
                      <div className="quiz-panel" aria-live="polite">
                        <div className="quiz-copy">
                          <strong>{currentQuiz.prompt}</strong>
                          <span>{attentionMode === 'active' ? 'Keys 1-4' : 'Optional keys 1-4'}</span>
                        </div>
                        <div className="quiz-options">
                          {currentQuiz.options.slice(0, 4).map((option, index) => {
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

                  <div className="play-hover-menu">
                    {renderedUrl ? (
                      <audio
                        ref={pocketAudioRef}
                        src={renderedUrl}
                        controls
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
                            setShowReviewPrompt(true)
                          }
                        }}
                      />
                    ) : (
                      <div className="audio-placeholder">Render a lesson to create the audio track.</div>
                    )}
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
                      <button type="button" onClick={toggleFullscreen}>
                        {isFullscreen ? 'Exit full screen' : 'Full screen'}
                      </button>
                    </div>
                    <div className="coverage-grid">
                      <span>Ready words: {coverage.readyWords}</span>
                      <span>Prompt clips: {coverage.promptClips}</span>
                      <span>Rendered warnings: {renderedLesson?.warnings.length ?? 0}</span>
                    </div>
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

function buildActiveQuiz(
  segment: RenderedLessonSegment | undefined,
  renderedLesson: RenderedLesson | null,
  lessonWords: VocabWord[],
  allWords: VocabWord[],
): ActiveQuiz | undefined {
  if (!segment || segment.kind !== 'pause' || !segment.wordId || segment.sentenceId) return undefined
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
      prompt: `Which means ${word.meaning}?`,
      wordId: word.id,
      correctValue: word.id,
      options: limitQuizOptions(orderOptions(
        [
          { value: word.id, label: word.word },
          { value: other.id, label: other.word },
        ],
        segment.stepId,
      )),
    }
  }

  if (segment.stepId.includes('-zh-en-') && !segment.stepId.startsWith('quick-')) {
    return {
      id: segment.stepId,
      kind: 'zh-en',
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

  return limitQuizOptions(
    orderOptions([{ value: word.meaning, label: word.meaning }, ...distractors], quizId),
  )
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

  return limitQuizOptions(orderOptions([{ value: word.id, label: word.word }, ...distractors], quizId))
}

function orderOptions(options: ActiveQuiz['options'], seed: string): ActiveQuiz['options'] {
  return [...options].sort(
    (a, b) => stableSortValue(`${seed}:${a.value}`) - stableSortValue(`${seed}:${b.value}`),
  )
}

function limitQuizOptions(options: ActiveQuiz['options']): ActiveQuiz['options'] {
  return options.slice(0, 4)
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
