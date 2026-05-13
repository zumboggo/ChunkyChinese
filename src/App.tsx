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
  importSentencesCsv,
  importVocabCsv,
  recordEvent,
  saveRenderedLesson,
  seedLmsWordsIfEmpty,
  updateWordStatus,
} from './db'
import { createLesson, createPocketLesson } from './lesson'
import { renderLessonToWav } from './renderAudio'
import type {
  AudioClip,
  DashboardStats,
  ImportSummary,
  LessonPlan,
  LessonStep,
  RenderedLesson,
  Sentence,
  VocabWord,
  WordStatus,
} from './types'

type Screen = 'dashboard' | 'words' | 'import' | 'lesson'

const emptyStats: DashboardStats = {
  counts: { new: 0, learning: 0, familiar: 0, known: 0, review: 0 },
  minutesToday: 0,
  clipsCompletedToday: 0,
  knownToday: 0,
}

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
  const [isPlaying, setIsPlaying] = useState(false)
  const [autoAdvance, setAutoAdvance] = useState(true)
  const [playbackRate, setPlaybackRate] = useState(1)
  const [lastSummary, setLastSummary] = useState<string>('Ready.')
  const [seedMessage, setSeedMessage] = useState('Loading LMS vocabulary...')
  const runToken = useRef(0)
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const pocketAudioRef = useRef<HTMLAudioElement | null>(null)

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
    if (!renderedLesson || !('mediaSession' in navigator)) return
    navigator.mediaSession.metadata = new MediaMetadata({
      title: renderedLesson.title,
      artist: 'Chunky Chinese Vocab',
      album: 'Pocket Lesson',
      artwork: [
        { src: '/pwa-192.svg', sizes: '192x192', type: 'image/svg+xml' },
        { src: '/pwa-512.svg', sizes: '512x512', type: 'image/svg+xml' },
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
  const targetWord = currentStep?.wordId
    ? words.find((word) => word.id === currentStep.wordId)
    : undefined
  const coverage = useMemo(() => getAudioCoverage(words, sentences, audioClips), [
    audioClips,
    sentences,
    words,
  ])

  async function handleStatus(ids: string[], status: WordStatus) {
    if (ids.length === 0) return
    await updateWordStatus(ids, status)
    setLastSummary(`Marked ${ids.length} word${ids.length === 1 ? '' : 's'} ${status}.`)
    await refresh()
  }

  function startLesson(manualIds: string[] = []) {
    setLessonMode('live')
    const nextLesson = createLesson(words, sentences, manualIds)
    setLesson(nextLesson)
    setCurrentStepIndex(0)
    setScreen('lesson')
    setLastSummary(
      nextLesson.targetWords.length > 0
        ? `Lesson ready: ${nextLesson.targetWords.map((word) => word.word).join(', ')}`
        : 'No non-known target words are available.',
    )
  }

  async function startPocketLesson(manualIds: string[] = []) {
    setLessonMode('pocket')
    setRendering(true)
    setScreen('lesson')
    try {
      const nextLesson = createPocketLesson(words, sentences, audioClips, manualIds)
      setLesson(nextLesson)
      setCurrentStepIndex(0)
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
      setLastSummary(
        rendered.warnings.length > 0
          ? `Pocket lesson rendered with ${rendered.warnings.length} warning(s).`
          : 'Pocket lesson rendered and ready for background-style playback.',
      )
    } catch (error) {
      setLastSummary(error instanceof Error ? error.message : 'Could not render pocket lesson.')
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

  return (
    <main className="app-shell">
      <header className="topbar">
        <button className="brand-button" type="button" onClick={() => setScreen('dashboard')}>
          <span className="brand-mark">中</span>
          <span>
            <strong>Chunky Chinese Vocab</strong>
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
              <p>Hands-free active recall from your LMS target words.</p>
            </div>
            <button className="primary" type="button" onClick={() => startPocketLesson()}>
              Start pocket lesson
            </button>
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
            <button type="button" onClick={() => startLesson()}>
              Live mode lesson
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
            <button
              className="primary"
              type="button"
              onClick={() => startPocketLesson(selectedWordIds)}
              disabled={selectedWordIds.length === 0}
            >
              Pocket lesson from selected
            </button>
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
              <article className="word-row" key={word.id}>
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
                <div className="word-main">
                  <strong>{word.word}</strong>
                  <span>{word.meaning}</span>
                  <small>
                    {word.pinyin ? `${word.pinyin} · ` : ''}
                    Lesson {word.lessonNumber ?? '-'} · seen {word.seenCount}
                  </small>
                </div>
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
        </section>
      )}

      {screen === 'import' && (
        <section className="screen">
          <div className="screen-heading compact">
            <div>
              <h1>Import and Backup</h1>
              <p>Everything stays in this browser's local IndexedDB.</p>
            </div>
            <a className="ghost-link" href="/seed/lms-vocab-188.csv" download>
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
          <div className="screen-heading compact">
            <div>
              <h1>Micro Lesson Player</h1>
              <p>
                Pocket Mode renders one local audio track from imported clips.
              </p>
            </div>
            <button className="primary" type="button" onClick={() => startPocketLesson()}>
              Render pocket lesson
            </button>
          </div>

          {lesson ? (
            <>
              <div className="mode-row">
                <button
                  type="button"
                  className={lessonMode === 'pocket' ? 'active' : ''}
                  onClick={() => setLessonMode('pocket')}
                >
                  Pocket Mode
                </button>
                <button
                  type="button"
                  className={lessonMode === 'live' ? 'active' : ''}
                  onClick={() => setLessonMode('live')}
                >
                  Live Debug Mode
                </button>
              </div>

              {lessonMode === 'pocket' && (
                <section className="lesson-card pocket-player">
                  <div className="lesson-now">
                    <span>{rendering ? 'Rendering local audio...' : 'Pocket audio track'}</span>
                    <h2>{renderedLesson?.title ?? lesson.title}</h2>
                    <p>
                      {renderedLesson
                        ? `${formatTime(pocketProgress.current)} / ${formatTime(pocketProgress.duration)}`
                        : 'Import a clip pack, then render a lesson for phone-style playback.'}
                    </p>
                  </div>
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
                        setPocketProgress({
                          current: audio.currentTime,
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
                        }
                      }}
                    />
                  ) : (
                    <div className="audio-placeholder">Render a lesson to create the pocket audio track.</div>
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
                    <button type="button" onClick={() => startPocketLesson(selectedWordIds)}>
                      Re-render
                    </button>
                  </div>
                  <div className="coverage-grid">
                    <span>Ready words: {coverage.readyWords}</span>
                    <span>Prompt clips: {coverage.promptClips}</span>
                    <span>Rendered warnings: {renderedLesson?.warnings.length ?? 0}</span>
                  </div>
                </section>
              )}

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
            </>
          ) : (
            <section className="panel empty-state">
              <h2>No lesson loaded</h2>
              <p>Start a lesson from Dashboard or select up to five words in Word Manager.</p>
              <button className="primary" type="button" onClick={() => startPocketLesson()}>
                Start pocket lesson
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
