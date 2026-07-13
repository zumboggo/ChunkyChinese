import { useCallback, useEffect, useRef, useState } from 'react'
import { getAudioClip } from './db'
import {
  IDLE_READER_LISTENING_SNAPSHOT,
  isCredibleSpeechCompletion,
  nextReaderListeningCompletion,
  type ReaderListeningMode,
  type ReaderListeningSnapshot,
} from './readerListening'
import type { ReaderSentence } from './types'

function configureAudioElement(
  audio: HTMLAudioElement,
  rate: number,
  restart: boolean,
  onEnded: () => void,
  onError: () => void,
) {
  audio.playbackRate = rate
  if (restart) audio.currentTime = 0
  audio.onended = onEnded
  audio.onerror = onError
}

function loadAudioSource(audio: HTMLAudioElement, url: string) {
  audio.src = url
  audio.load()
}

interface ReaderListeningControllerOptions {
  sentence?: ReaderSentence
  sentenceIndex: number
  sentenceCount: number
  rate: number
  repeatCount: number
  autoAdvance: boolean
  mediaSessionEnabled: boolean
  onNext: () => void | Promise<void>
  onPrevious: () => void | Promise<void>
}

export interface ReaderListeningController {
  snapshot: ReaderListeningSnapshot
  active: boolean
  startListening: () => void
  playSentenceOnce: () => void
  pause: () => void
  resume: () => void
  togglePlayPause: () => void
  next: () => Promise<void>
  previous: () => Promise<void>
  stop: () => void
}

export function useReaderListeningController({
  sentence,
  sentenceIndex,
  sentenceCount,
  rate,
  repeatCount,
  autoAdvance,
  mediaSessionEnabled,
  onNext,
  onPrevious,
}: ReaderListeningControllerOptions): ReaderListeningController {
  const [snapshot, setSnapshot] = useState<ReaderListeningSnapshot>(IDLE_READER_LISTENING_SNAPSHOT)
  const snapshotRef = useRef(snapshot)
  const sentenceRef = useRef(sentence)
  const sentenceIndexRef = useRef(sentenceIndex)
  const sentenceCountRef = useRef(sentenceCount)
  const rateRef = useRef(rate)
  const repeatCountRef = useRef(repeatCount)
  const autoAdvanceRef = useRef(autoAdvance)
  const onNextRef = useRef(onNext)
  const onPreviousRef = useRef(onPrevious)
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const audioUrlRef = useRef<string | null>(null)
  const audioSentenceIdRef = useRef<string | null>(null)
  const runTokenRef = useRef(0)
  const lastSentenceIdRef = useRef(sentence?.id)
  const playCurrentRef = useRef<(restart: boolean) => void>(() => undefined)

  useEffect(() => {
    sentenceRef.current = sentence
    sentenceIndexRef.current = sentenceIndex
    sentenceCountRef.current = sentenceCount
    rateRef.current = rate
    repeatCountRef.current = repeatCount
    autoAdvanceRef.current = autoAdvance
    onNextRef.current = onNext
    onPreviousRef.current = onPrevious
  }, [
    autoAdvance,
    onNext,
    onPrevious,
    rate,
    repeatCount,
    sentence,
    sentenceCount,
    sentenceIndex,
  ])

  const updateSnapshot = useCallback((
    next: ReaderListeningSnapshot | ((current: ReaderListeningSnapshot) => ReaderListeningSnapshot),
  ) => {
    const value = typeof next === 'function' ? next(snapshotRef.current) : next
    snapshotRef.current = value
    setSnapshot(value)
  }, [])

  const setMediaPlaybackState = useCallback((state: MediaSessionPlaybackState) => {
    if ('mediaSession' in navigator) navigator.mediaSession.playbackState = state
  }, [])

  const discardAudio = useCallback(() => {
    const audio = audioRef.current
    if (audio) {
      audio.onended = null
      audio.onerror = null
      audio.pause()
      audio.removeAttribute('src')
      audio.load()
    }
    audioRef.current = null
    audioSentenceIdRef.current = null
    if (audioUrlRef.current) URL.revokeObjectURL(audioUrlRef.current)
    audioUrlRef.current = null
  }, [])

  const clearAudioSource = useCallback(() => {
    const audio = audioRef.current
    if (audio) {
      audio.onended = null
      audio.onerror = null
      audio.pause()
      audio.removeAttribute('src')
    }
    audioSentenceIdRef.current = null
    if (audioUrlRef.current) URL.revokeObjectURL(audioUrlRef.current)
    audioUrlRef.current = null
  }, [])

  const invalidatePlayback = useCallback((discard = false) => {
    runTokenRef.current += 1
    window.speechSynthesis?.cancel()
    const audio = audioRef.current
    if (audio) {
      audio.onended = null
      audio.onerror = null
      audio.pause()
    }
    if (discard) discardAudio()
    setMediaPlaybackState('paused')
  }, [discardAudio, setMediaPlaybackState])

  const finishRepetition = useCallback(async (token: number) => {
    if (runTokenRef.current !== token) return
    const current = snapshotRef.current
    const completion = nextReaderListeningCompletion({
      mode: current.mode,
      repeatNumber: current.repeatNumber,
      repeatCount: repeatCountRef.current,
      autoAdvance: autoAdvanceRef.current,
      hasNextSentence: sentenceIndexRef.current < sentenceCountRef.current - 1,
    })
    if (completion.kind === 'repeat') {
      updateSnapshot({
        ...current,
        status: 'loading',
        repeatNumber: completion.repeatNumber,
      })
      playCurrentRef.current(true)
      return
    }
    if (completion.kind === 'advance') {
      updateSnapshot({
        ...current,
        status: 'loading',
        repeatNumber: 1,
      })
      await onNextRef.current()
      return
    }
    updateSnapshot({
      ...current,
      status: 'completed',
    })
    setMediaPlaybackState('paused')
  }, [setMediaPlaybackState, updateSnapshot])

  const failPlayback = useCallback((token: number) => {
    if (runTokenRef.current !== token) return
    updateSnapshot((current) => ({ ...current, status: 'completed' }))
    setMediaPlaybackState('paused')
  }, [setMediaPlaybackState, updateSnapshot])

  const playWithSpeechSynthesis = useCallback((text: string, token: number) => {
    if (!('speechSynthesis' in window) || runTokenRef.current !== token) {
      failPlayback(token)
      return
    }
    discardAudio()
    window.speechSynthesis.cancel()
    const utterance = new SpeechSynthesisUtterance(text)
    let startedAt = 0
    utterance.rate = rateRef.current
    utterance.lang = 'zh-CN'
    utterance.onstart = () => {
      if (runTokenRef.current !== token) return
      startedAt = Date.now()
      updateSnapshot((current) => ({ ...current, status: 'playing', source: 'tts' }))
      setMediaPlaybackState('playing')
    }
    utterance.onend = () => {
      if (isCredibleSpeechCompletion(startedAt, Date.now())) {
        void finishRepetition(token)
      } else {
        failPlayback(token)
      }
    }
    utterance.onerror = () => failPlayback(token)
    window.speechSynthesis.speak(utterance)
  }, [discardAudio, failPlayback, finishRepetition, setMediaPlaybackState, updateSnapshot])

  const playCurrent = useCallback(async (restart: boolean) => {
    const currentSentence = sentenceRef.current
    if (!currentSentence) return
    const token = ++runTokenRef.current
    window.speechSynthesis?.cancel()
    updateSnapshot((current) => ({ ...current, status: 'loading' }))

    let audio = audioRef.current
    if (!audio || audioSentenceIdRef.current !== currentSentence.id) {
      // Keep the same media element for the entire listening session. Mobile
      // browsers unlock the element that was started by the user's tap; making
      // a new Audio after every IndexedDB lookup can make auto-advance look like
      // a fresh autoplay request and get blocked.
      clearAudioSource()
      const clip = await getAudioClip(currentSentence.audioClipId)
      if (runTokenRef.current !== token) return
      if (!clip) {
        playWithSpeechSynthesis(currentSentence.chinese, token)
        return
      }
      const url = URL.createObjectURL(clip.blob)
      audioUrlRef.current = url
      if (!audio) {
        audio = new Audio()
        audioRef.current = audio
      }
      loadAudioSource(audio, url)
      audioSentenceIdRef.current = currentSentence.id
    }

    configureAudioElement(
      audio,
      rateRef.current,
      restart,
      () => void finishRepetition(token),
      () => {
        if (runTokenRef.current !== token) return
        playWithSpeechSynthesis(currentSentence.chinese, token)
      },
    )
    try {
      await audio.play()
      if (runTokenRef.current !== token) {
        audio.pause()
        return
      }
      updateSnapshot((current) => ({ ...current, status: 'playing', source: 'audio' }))
      setMediaPlaybackState('playing')
    } catch {
      if (runTokenRef.current === token) playWithSpeechSynthesis(currentSentence.chinese, token)
    }
  }, [
    clearAudioSource,
    finishRepetition,
    playWithSpeechSynthesis,
    setMediaPlaybackState,
    updateSnapshot,
  ])

  useEffect(() => {
    playCurrentRef.current = (restart) => {
      void playCurrent(restart)
    }
  }, [playCurrent])

  const start = useCallback((mode: ReaderListeningMode) => {
    if (!sentenceRef.current) return
    invalidatePlayback(false)
    updateSnapshot({
      status: 'loading',
      mode,
      repeatNumber: 1,
      source: null,
    })
    void playCurrent(true)
  }, [invalidatePlayback, playCurrent, updateSnapshot])

  const pause = useCallback(() => {
    if (!['loading', 'playing'].includes(snapshotRef.current.status)) return
    invalidatePlayback(false)
    updateSnapshot((current) => ({ ...current, status: 'paused' }))
  }, [invalidatePlayback, updateSnapshot])

  const resume = useCallback(() => {
    if (!['paused', 'completed'].includes(snapshotRef.current.status)) return
    const restart = snapshotRef.current.source !== 'audio' || snapshotRef.current.status === 'completed'
    if (snapshotRef.current.status === 'completed') {
      updateSnapshot((current) => ({ ...current, repeatNumber: 1 }))
    }
    void playCurrent(restart)
  }, [playCurrent, updateSnapshot])

  const stop = useCallback(() => {
    invalidatePlayback(true)
    updateSnapshot(IDLE_READER_LISTENING_SNAPSHOT)
  }, [invalidatePlayback, updateSnapshot])

  const navigate = useCallback(async (direction: 'next' | 'previous') => {
    const active = snapshotRef.current.status !== 'idle'
    invalidatePlayback(false)
    if (active) {
      updateSnapshot((current) => ({
        ...current,
        status: 'loading',
        repeatNumber: 1,
        source: null,
      }))
    }
    await (direction === 'next' ? onNextRef.current() : onPreviousRef.current())
  }, [invalidatePlayback, updateSnapshot])

  useEffect(() => {
    const nextSentenceId = sentence?.id
    if (lastSentenceIdRef.current === nextSentenceId) return
    lastSentenceIdRef.current = nextSentenceId
    clearAudioSource()
    if (snapshotRef.current.status === 'idle' || !nextSentenceId) return
    updateSnapshot((current) => ({
      ...current,
      status: 'loading',
      repeatNumber: 1,
      source: null,
    }))
    void playCurrent(true)
  }, [clearAudioSource, playCurrent, sentence?.id, updateSnapshot])

  useEffect(() => {
    const audio = audioRef.current
    if (audio) audio.playbackRate = rate
    if (snapshotRef.current.status === 'playing' && snapshotRef.current.source === 'tts') {
      invalidatePlayback(false)
      void playCurrent(true)
    }
  }, [invalidatePlayback, playCurrent, rate])

  useEffect(() => {
    if (!mediaSessionEnabled || snapshot.status === 'idle' || !('mediaSession' in navigator)) return
    const currentSentence = sentenceRef.current
    navigator.mediaSession.metadata = new MediaMetadata({
      title: currentSentence?.chinese ?? 'Reader Listening Mode',
      artist: currentSentence?.english ?? 'Chunky Chinese',
      album: 'Reader Listening Mode',
      artwork: [
        {
          src: `${import.meta.env.BASE_URL}icons/icon-192.png`,
          sizes: '192x192',
          type: 'image/png',
        },
      ],
    })
    navigator.mediaSession.setActionHandler('play', () => resume())
    navigator.mediaSession.setActionHandler('pause', () => pause())
    navigator.mediaSession.setActionHandler('nexttrack', () => void navigate('next'))
    navigator.mediaSession.setActionHandler('previoustrack', () => void navigate('previous'))
    return () => {
      navigator.mediaSession.setActionHandler('play', null)
      navigator.mediaSession.setActionHandler('pause', null)
      navigator.mediaSession.setActionHandler('nexttrack', null)
      navigator.mediaSession.setActionHandler('previoustrack', null)
    }
  }, [mediaSessionEnabled, navigate, pause, resume, sentence?.id, snapshot.status])

  useEffect(() => () => {
    runTokenRef.current += 1
    window.speechSynthesis?.cancel()
    discardAudio()
  }, [discardAudio])

  return {
    snapshot,
    active: snapshot.status !== 'idle',
    startListening: () => start('continuous'),
    playSentenceOnce: () => start('single'),
    pause,
    resume,
    togglePlayPause: snapshot.status === 'playing' || snapshot.status === 'loading' ? pause : resume,
    next: () => navigate('next'),
    previous: () => navigate('previous'),
    stop,
  }
}
