import { pinyin } from 'pinyin-pro'
import { useEffect, useRef, useState } from 'react'
import pilotLessons from './content/listening-pilot.json'
import additionalLessons from './content/listening-additional.json'

import { mergeHeardRanges, heardSeconds, readCourseProgress, completeCourseListen } from './listeningCourseProgress'
import { lessonNumberIndex, nextCourseLesson, wordPinyin } from './listeningCourseControls'
import './listeningCourse.css'

const lessons = [...pilotLessons, ...additionalLessons]

interface CourseRecording {
  id: string
  file: string
  seconds: number
  segments: Array<{ startSeconds: number; text?: string; language?: string; phase: string; kind: string }>
}
interface Props {
  scope: string
  onComplete: (lessonId: string, seconds: number) => Promise<void>
}
const ids = lessons.map(lesson => lesson.id)
const OFFLINE_CACHE = 'chunky-listening-course-v1'
const base = `${import.meta.env.BASE_URL}listening/`
const formatTime = (seconds: number) => `${Math.floor(Math.round(seconds) / 60)}:${String(Math.round(seconds) % 60).padStart(2, '0')}`

export default function ListeningCourse({ scope, onComplete }: Props) {
  const storageKey = `chunky-listening-course-v1:${scope}`
  const [progress, setProgress] = useState(() => readCourseProgress(storageKey, ids))
  const [recordings, setRecordings] = useState<CourseRecording[]>([])
  const [error, setError] = useState('')
  const [offlineMessage, setOfflineMessage] = useState('')
  const [saving, setSaving] = useState(false)
  const [completedNow, setCompletedNow] = useState(false)
  const [playbackRun, setPlaybackRun] = useState(0)
  const [isPlaying, setIsPlaying] = useState(false)
  const [jumpNumber, setJumpNumber] = useState('')
  const [jumpError, setJumpError] = useState('')
  const [autoNext, setAutoNext] = useState(() => {
    try { return localStorage.getItem(`${storageKey}:auto-next`) === 'true' } catch { return false }
  })
  const autoNextRef = useRef(autoNext)
  const pendingPlay = useRef(false)
  const audio = useRef<HTMLAudioElement>(null)
  const progressRef = useRef(progress)
  const completing = useRef(false)
  const lesson = lessons.find(item => item.id === progress.lessonId) ?? lessons[0]
  const index = lessons.indexOf(lesson)
  const recording = recordings.find(item => item.id === lesson.id)
  const src = recording ? `${base}${recording.file}` : undefined

  useEffect(() => {
    let cancelled = false
    fetch(`${base}course-v1.json`).then(response => {
      if (!response.ok) throw new Error('The lesson recordings could not be loaded. Please try again when online.')
      return response.json()
    }).then(data => { if (!cancelled) setRecordings(data.lessons) })
      .catch((reason: Error) => { if (!cancelled) setError(reason.message) })
    return () => { cancelled = true }
  }, [])

  useEffect(() => {
    progressRef.current = progress
    try { localStorage.setItem(storageKey, JSON.stringify(progress)) } catch { /* Playback still works without storage. */ }
  }, [progress, storageKey])

  useEffect(() => {
    const element = audio.current
    return () => { element?.pause() }
  }, [lesson.id, playbackRun])

  useEffect(() => {
    if (!('mediaSession' in navigator)) return
    navigator.mediaSession.metadata = new MediaMetadata({ title: lesson.title, artist: 'Chunky Chinese', album: 'Short listening lessons' })
    const handlers: Array<[MediaSessionAction, MediaSessionActionHandler]> = [
      ['play', () => { void audio.current?.play().catch(() => setError('Tap Play to start the lesson.')) }],
      ['pause', () => audio.current?.pause()],
      ['seekbackward', () => { if (audio.current) audio.current.currentTime = Math.max(0, audio.current.currentTime - 15) }],
      ['seekforward', () => { if (audio.current && recording) audio.current.currentTime = Math.min(recording.seconds, audio.current.currentTime + 15) }],
    ]
    for (const [action, handler] of handlers) { try { navigator.mediaSession.setActionHandler(action, handler) } catch { /* Unsupported action. */ } }
    return () => { for (const [action] of handlers) { try { navigator.mediaSession.setActionHandler(action, null) } catch { /* Unsupported action. */ } } }
  }, [lesson.title, recording])

  function selectLesson(id: string, play = false) {
    pendingPlay.current = play
    audio.current?.pause()
    if (id === progressRef.current.lessonId && audio.current) audio.current.currentTime = 0
    completing.current = false
    setCompletedNow(false); setError(''); setOfflineMessage('')
    setJumpNumber(''); setJumpError(''); setIsPlaying(false)
    const next = { ...progressRef.current, lessonId: id, seconds: 0, ranges: [] }
    progressRef.current = next
    setProgress(next)
    setPlaybackRun(value => value + 1)
  }

  async function finish() {
    const current = capturePlayed()
    if (!recording || completing.current) return
    const finishedId = lesson.id
    completing.current = true
    const qualified = heardSeconds(current.ranges, recording.seconds) >= recording.seconds * 0.9
    if (qualified) {
      const next = completeCourseListen(progressRef.current, finishedId)
      progressRef.current = next
      setProgress(next)
      setCompletedNow(true)
      // A new audio element clears native played ranges: a replay must be heard again.
      setPlaybackRun(value => value + 1)
      try { await onComplete(finishedId, recording.seconds) }
      catch { setError('Your listen is saved on this device, but the activity log could not be updated.') }
    }
    completing.current = false
    // A manual selection while completion is saving takes precedence over auto-next.
    if (progressRef.current.lessonId !== finishedId) return
    const nextId = nextCourseLesson(ids, finishedId, autoNextRef.current)
    if (nextId) selectLesson(nextId, true)
    else if (!qualified) setError('You reached the end. Replay to hear the remaining parts of this lesson.')
  }

  function togglePlayback() {
    const player = audio.current
    if (!player || !src) return
    if (player.paused) void player.play().catch(() => setError('Tap Play to start the lesson.'))
    else player.pause()
  }

  function seek(seconds: number) {
    if (audio.current && recording) audio.current.currentTime = Math.max(0, Math.min(recording.seconds, seconds))
  }

  function setAutoNextPreference(checked: boolean) {
    autoNextRef.current = checked
    setAutoNext(checked)
    try { localStorage.setItem(`${storageKey}:auto-next`, String(checked)) } catch { /* Session preference still works. */ }
  }

  function capturePlayed() {
    const player = audio.current
    if (!player || player.dataset.lessonId !== progressRef.current.lessonId || player.dataset.playbackRun !== String(playbackRun)) return progressRef.current
    const nativeRanges = Array.from({ length: player.played.length }, (_, i): [number, number] => [player.played.start(i), player.played.end(i)])
    const next = { ...progressRef.current, seconds: player.currentTime, ranges: mergeHeardRanges([...progressRef.current.ranges, ...nativeRanges]) }
    progressRef.current = next
    setProgress(next)
    return next
  }

  async function saveOffline() {
    if (!src || !('caches' in window)) return
    setSaving(true); setOfflineMessage('')
    try {
      const cache = await caches.open(OFFLINE_CACHE)
      for (const url of [`${base}course-v1.json`, src]) {
        const response = await fetch(url)
        if (!response.ok) throw new Error('Download failed')
        await cache.put(url, response)
      }
      setOfflineMessage('Saved for offline listening on this device.')
    } catch { setOfflineMessage('Could not save this lesson. Check your connection and available storage.') }
    finally { setSaving(false) }
  }

  const duration = recording?.seconds ?? 0
  const position = Math.min(progress.seconds, duration)

  return <section className="screen listening-course" aria-label="Short listening lessons">
    <div className="listening-course-heading"><span>LISTEN &amp; LEARN</span><span>One small lesson. A little more confidence.</span></div>
    <div className="listening-course-navigation">
      <label className="listening-course-picker">Choose a lesson<select value={lesson.id} onChange={event => selectLesson(event.target.value)}>{lessons.map((item, n) => <option key={item.id} value={item.id}>{n + 1}. {item.title}{progress.completed.includes(item.id) ? ' ✓' : ''}</option>)}</select></label>
      <form className="listening-course-jump" onSubmit={event => {
        event.preventDefault()
        const target = lessonNumberIndex(jumpNumber, lessons.length)
        if (target === null) { setJumpError(`Choose a number from 1 to ${lessons.length}.`); return }
        selectLesson(lessons[target].id)
      }}><label htmlFor="listening-lesson-number">Jump to</label><div><input id="listening-lesson-number" type="number" min="1" max={lessons.length} step="1" inputMode="numeric" placeholder={String(index + 1)} value={jumpNumber} onChange={event => { setJumpNumber(event.target.value); setJumpError('') }} aria-describedby={jumpError ? 'listening-jump-error' : undefined} /><button type="submit" aria-label="Go to lesson number">Go</button></div></form>
    </div>
    {jumpError && <p id="listening-jump-error" role="alert">{jumpError}</p>}
    <div className="listening-course-player">
      <div className="listening-course-meta"><span>LESSON {index + 1} OF {lessons.length}</span><span>{recording ? formatTime(duration) : 'About 4 minutes'}</span></div>
      <p className="listening-course-count" title="Counts when you reach the end after hearing at least 90% of a lesson. Saved on this device.">Listened {progress.listens[lesson.id] ?? 0} {(progress.listens[lesson.id] ?? 0) === 1 ? 'time' : 'times'}</p>
      <h1>{lesson.title}</h1><p className="listening-course-objective">{lesson.objective}</p>
    <audio key={`${lesson.id}:${playbackRun}`} ref={audio} data-lesson-id={lesson.id} data-playback-run={playbackRun} preload="metadata" src={src} aria-label="Lesson audio"
      onLoadedMetadata={() => {
        const player = audio.current
        if (!player || !recording) return
        const saved = Math.min(progressRef.current.seconds, Math.max(0, recording.seconds - 1))
        const phrase = recording.segments.filter(s => s.kind === 'speech' && s.startSeconds <= saved).at(-1)
        player.currentTime = phrase?.startSeconds ?? saved
        if (pendingPlay.current) {
          pendingPlay.current = false
          void player.play().catch(() => setError('Your next lesson is ready. Tap Play to continue.'))
        }
      }}
      onPause={() => { setIsPlaying(false); capturePlayed(); if ('mediaSession' in navigator) navigator.mediaSession.playbackState = 'paused' }}
      onPlay={() => { setIsPlaying(true); setCompletedNow(false); setError(''); if ('mediaSession' in navigator) navigator.mediaSession.playbackState = 'playing' }}
      onTimeUpdate={() => {
        const player = audio.current
        if (!player || player.seeking) return
        capturePlayed()
      }} onEnded={() => void finish()} onError={() => setError('Audio is unavailable. Connect to the internet, then reload this lesson.')} />
      <div className="listening-course-transport">
        <button type="button" className="listening-course-skip" disabled={!src} onClick={() => seek(position - 15)} aria-label="Back 15 seconds"><span aria-hidden="true">↶</span><small>15 sec</small></button>
        <button type="button" className="listening-course-play" disabled={!src} onClick={togglePlayback} aria-label={isPlaying ? 'Pause lesson' : 'Play lesson'}>{isPlaying ? <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 5h3v14H7zm7 0h3v14h-3z" /></svg> : <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m8 4 12 8-12 8z" /></svg>}</button>
        <button type="button" className="listening-course-skip" disabled={!src} onClick={() => seek(position + 15)} aria-label="Forward 15 seconds"><span aria-hidden="true">↷</span><small>15 sec</small></button>
      </div>
      <div className="listening-course-timeline"><input type="range" min="0" max={duration || 1} step="0.1" value={position} disabled={!src} onChange={event => seek(Number(event.target.value))} aria-label="Lesson playback position" aria-valuetext={`${formatTime(position)} of ${formatTime(duration)}`} /><div><span>{formatTime(position)}</span><span>{formatTime(duration)}</span></div></div>
      {error && <p role="alert">{error}</p>}
      {completedNow && <p role="status" className="listening-course-complete">Lesson complete. Well done.</p>}
      <div className="listening-course-player-footer">
        <button type="button" onClick={() => selectLesson(lesson.id, true)}>Replay</button>
        <label className="listening-course-auto"><input type="checkbox" role="switch" checked={autoNext} onChange={event => setAutoNextPreference(event.target.checked)} /><span>Auto-next</span></label>
        <button type="button" disabled={index === lessons.length - 1} onClick={() => selectLesson(lessons[index + 1].id)}>Next lesson <span aria-hidden="true">→</span></button>
      </div>
    </div>
    {index === lessons.length - 1 && <p className="listening-course-last">You have reached the latest lesson. More are on the way.</p>}
    <div className="listening-course-vocabulary-heading"><h2>Words to listen for</h2><span>{lesson.focus.length} familiar pieces</span></div>
    <div className="listening-course-focus" aria-label="Lesson vocabulary">{lesson.focus.map(word => <div key={word.zh}><span lang="zh-CN">{word.zh}</span><span className="listening-course-pinyin">{wordPinyin(word.zh)}</span><small>{word.en}</small></div>)}</div>
    <div className="listening-course-extras">
    {recording && recording.segments.length > 0 ? <details><summary>Transcript</summary><div className="listening-course-transcript">{recording?.segments.filter(s => s.kind === 'speech').map((segment, n) => <p key={n} lang={segment.language === 'zh' ? 'zh-CN' : 'en'}><button type="button" aria-label={`Jump to ${formatTime(segment.startSeconds)}`} onClick={() => { if (audio.current) audio.current.currentTime = segment.startSeconds }}>{formatTime(segment.startSeconds)}</button>{segment.text}{segment.language === 'zh' && segment.text && <span className="listening-phrase-pinyin">{pinyin(segment.text)}</span>}</p>)}</div></details> : <details><summary>Lesson phrases</summary><div className="listening-course-transcript">{[lesson.opening, ...lesson.ladder, ...lesson.transfers, ...lesson.dialogue].map((phrase, n) => <p key={n}><span lang="zh-CN">{phrase.zh}</span><span className="listening-phrase-pinyin">{pinyin(phrase.zh)}</span><small>{phrase.en}</small></p>)}</div></details>}
    <details><summary>Downloads</summary><div className="listening-course-actions"><button type="button" disabled={!src || saving} onClick={() => void saveOffline()}>{saving ? 'Saving…' : 'Save lesson offline'}</button>{src && <a href={src} download={`${lesson.id}.mp3`}>Download MP3</a>}</div><p role="status">{offlineMessage}</p></details>
    </div>
  </section>
}
