import { useEffect, useRef, useState } from 'react'
import lessons from './content/listening-pilot.json'
import { mergeHeardRanges, heardSeconds, readCourseProgress } from './listeningCourseProgress'
import './listeningCourse.css'

interface CourseRecording {
  id: string
  file: string
  seconds: number
  segments: Array<{ startSeconds: number; text?: string; language?: string; phase: string; kind: string }>
}
interface Props {
  scope: string
  onArchive: (mode: 'words' | 'sentences') => void
  onComplete: (lessonId: string, seconds: number) => Promise<void>
}
const ids = lessons.map(lesson => lesson.id)
const OFFLINE_CACHE = 'chunky-listening-course-v1'
const base = `${import.meta.env.BASE_URL}listening/`
const formatTime = (seconds: number) => `${Math.floor(Math.round(seconds) / 60)}:${String(Math.round(seconds) % 60).padStart(2, '0')}`

export default function ListeningCourse({ scope, onArchive, onComplete }: Props) {
  const storageKey = `chunky-listening-course-v1:${scope}`
  const [progress, setProgress] = useState(() => readCourseProgress(storageKey, ids))
  const [recordings, setRecordings] = useState<CourseRecording[]>([])
  const [error, setError] = useState('')
  const [offlineMessage, setOfflineMessage] = useState('')
  const [saving, setSaving] = useState(false)
  const [completedNow, setCompletedNow] = useState(false)
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
  }, [])

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

  function selectLesson(id: string) {
    audio.current?.pause()
    completing.current = false
    setCompletedNow(false); setError(''); setOfflineMessage('')
    setProgress(current => ({ ...current, lessonId: id, seconds: 0, ranges: [] }))
  }

  async function finish() {
    const current = capturePlayed()
    if (!recording || completing.current) return
    if (heardSeconds(current.ranges, recording.seconds) < recording.seconds * 0.9) {
      setError('You reached the end. Replay to hear the remaining parts of this lesson.')
      return
    }
    completing.current = true
    try {
      if (!current.completed.includes(lesson.id)) await onComplete(lesson.id, recording.seconds)
      setProgress(p => ({ ...p, seconds: 0, completed: [...new Set([...p.completed, lesson.id])] }))
      setCompletedNow(true)
    } catch { setError('Your lesson played, but progress could not be saved. Please try again.') }
    finally { completing.current = false }
  }

  function capturePlayed() {
    const player = audio.current
    if (!player) return progressRef.current
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

  return <section className="screen listening-course" aria-label="Short listening lessons">
    <div className="listening-course-heading"><span>LISTENING</span><p>Lesson {index + 1} of {lessons.length} · {recording ? formatTime(recording.seconds) : 'About 4 minutes'}</p></div>
    <h1>{lesson.title}</h1><p className="listening-course-objective">{lesson.objective}</p>
    <div className="listening-course-focus" aria-label="Lesson vocabulary">{lesson.focus.map(word => <span key={word.zh}>{word.zh}<small>{word.en}</small></span>)}</div>
    <audio key={lesson.id} ref={audio} controls preload="metadata" src={src} aria-label="Lesson audio"
      onLoadedMetadata={() => {
        const player = audio.current
        if (!player || !recording) return
        const saved = Math.min(progressRef.current.seconds, Math.max(0, recording.seconds - 1))
        const phrase = recording.segments.filter(s => s.kind === 'speech' && s.startSeconds <= saved).at(-1)
        player.currentTime = phrase?.startSeconds ?? 0
      }}
      onPause={() => { capturePlayed(); if ('mediaSession' in navigator) navigator.mediaSession.playbackState = 'paused' }}
      onPlay={() => { setError(''); if ('mediaSession' in navigator) navigator.mediaSession.playbackState = 'playing' }}
      onTimeUpdate={() => {
        const player = audio.current
        if (!player || player.seeking) return
        capturePlayed()
      }} onEnded={() => void finish()} onError={() => setError('Audio is unavailable. Connect to the internet, then reload this lesson.')} />
    {error && <p role="alert">{error}</p>}
    {completedNow && <p role="status">Lesson complete. Well done.</p>}
    <div className="listening-course-actions">
      <button type="button" onClick={() => { if (audio.current) { audio.current.currentTime = 0; void audio.current.play().catch(() => setError('Tap Play to start.')) } }}>Replay lesson</button>
      <button type="button" disabled={index === lessons.length - 1} onClick={() => selectLesson(lessons[index + 1].id)}>Next lesson →</button>
    </div>
    {index === lessons.length - 1 && <p>These are the first five lessons. More are on the way.</p>}
    <label className="listening-course-picker">Choose a lesson<select value={lesson.id} onChange={event => selectLesson(event.target.value)}>{lessons.map((item, n) => <option key={item.id} value={item.id}>{n + 1}. {item.title}{progress.completed.includes(item.id) ? ' ✓' : ''}</option>)}</select></label>
    <details><summary>Transcript</summary><div className="listening-course-transcript">{recording?.segments.filter(s => s.kind === 'speech').map((segment, n) => <p key={n} lang={segment.language === 'zh' ? 'zh-CN' : 'en'}><button type="button" aria-label={`Jump to ${formatTime(segment.startSeconds)}`} onClick={() => { if (audio.current) audio.current.currentTime = segment.startSeconds }}>{formatTime(segment.startSeconds)}</button>{segment.text}</p>)}</div></details>
    <details><summary>Downloads</summary><div className="listening-course-actions"><button type="button" disabled={!src || saving} onClick={() => void saveOffline()}>{saving ? 'Saving…' : 'Save lesson offline'}</button>{src && <a href={src} download={`${lesson.id}.mp3`}>Download MP3</a>}</div><p role="status">{offlineMessage}</p></details>
    <details><summary>Previous listening modes</summary><p>Your old word sets, sentence collections, and progress are still available.</p><div className="listening-course-actions"><button type="button" onClick={() => onArchive('words')}>Archived word sets</button><button type="button" onClick={() => onArchive('sentences')}>Archived sentences</button></div></details>
  </section>
}
