import { useEffect, useMemo, useRef, useState } from 'react'
import { pinyin } from 'pinyin-pro'
import {
  MEDITATION_PASSAGES,
  MEDITATION_SOURCE_NOTE,
  type MeditationPassage,
  type MeditationPhrase,
} from './meditations'
import {
  synthesizeMeditationAudio,
  type StoryAudioSettings,
} from './storyAudio'

const PROGRESS_KEY = 'chunky-meditate-progress-v1'
const AUDIO_CACHE = 'chunky-meditation-audio-v1'

interface MeditationProgress {
  passageId: string
  unitIndex: number
}

function loadProgress(): MeditationProgress | null {
  try {
    const parsed = JSON.parse(localStorage.getItem(PROGRESS_KEY) ?? 'null') as MeditationProgress | null
    return parsed && typeof parsed.passageId === 'string' && Number.isInteger(parsed.unitIndex) ? parsed : null
  } catch {
    return null
  }
}

function phrasePinyin(text: string): string {
  return pinyin(text, { toneType: 'symbol', v: true })
}

export function MeditateScreen({
  onBack,
  onSavePhrase,
  audioSettings,
  onOpenSettings,
}: {
  onBack: () => void
  onSavePhrase: (phrase: MeditationPhrase) => void | Promise<void>
  audioSettings: StoryAudioSettings
  onOpenSettings: () => void
}) {
  const savedProgress = useMemo(() => loadProgress(), [])
  const [passage, setPassage] = useState<MeditationPassage | null>(() =>
    MEDITATION_PASSAGES.find((item) => item.id === savedProgress?.passageId) ?? null,
  )
  const [unitIndex, setUnitIndex] = useState(savedProgress?.unitIndex ?? 0)
  const [showEnglish, setShowEnglish] = useState(false)
  const [selectedPhrase, setSelectedPhrase] = useState<MeditationPhrase | null>(null)
  const [savedMessage, setSavedMessage] = useState('')
  const [audioStatus, setAudioStatus] = useState<'idle' | 'loading' | 'playing' | 'error'>('idle')
  const [audioMessage, setAudioMessage] = useState('')
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const objectUrlRef = useRef<string | null>(null)

  const unit = passage?.units[Math.min(unitIndex, Math.max(0, passage.units.length - 1))]

  useEffect(() => {
    if (!passage) return
    localStorage.setItem(PROGRESS_KEY, JSON.stringify({ passageId: passage.id, unitIndex }))
  }, [passage, unitIndex])

  useEffect(() => () => {
    audioRef.current?.pause()
    if (objectUrlRef.current) URL.revokeObjectURL(objectUrlRef.current)
  }, [])

  function choosePassage(next: MeditationPassage) {
    stopAudio()
    setPassage(next)
    setUnitIndex(0)
    setShowEnglish(false)
    setSelectedPhrase(null)
    setSavedMessage('')
  }

  function move(delta: number) {
    if (!passage) return
    stopAudio()
    setUnitIndex((current) => Math.max(0, Math.min(passage.units.length - 1, current + delta)))
    setShowEnglish(false)
    setSelectedPhrase(null)
    setSavedMessage('')
  }

  function stopAudio() {
    audioRef.current?.pause()
    audioRef.current = null
    window.speechSynthesis?.cancel()
    if (objectUrlRef.current) URL.revokeObjectURL(objectUrlRef.current)
    objectUrlRef.current = null
    setAudioStatus('idle')
    setAudioMessage('')
  }

  function speakWithDeviceVoice() {
    if (!unit || !('speechSynthesis' in window)) return
    window.speechSynthesis.cancel()
    const utterance = new SpeechSynthesisUtterance(unit.phrases.map((phrase) => phrase.chinese).join(''))
    utterance.lang = 'zh-CN'
    utterance.rate = 0.62
    utterance.onstart = () => {
      setAudioStatus('playing')
      setAudioMessage('Playing with this device’s Mandarin voice')
    }
    utterance.onend = () => setAudioStatus('idle')
    utterance.onerror = () => {
      setAudioStatus('error')
      setAudioMessage('This device could not play its Mandarin voice.')
    }
    window.speechSynthesis.speak(utterance)
  }

  async function playSpokenChinese() {
    if (!unit || !passage) return
    if (audioStatus === 'playing') {
      stopAudio()
      return
    }
    if (!audioSettings.azureSpeechKey || !audioSettings.azureSpeechRegion) {
      speakWithDeviceVoice()
      return
    }
    setAudioStatus('loading')
    setAudioMessage('Preparing the Azure Mandarin voice…')
    try {
      const path = `${import.meta.env.BASE_URL}meditation-audio/${passage.id}/${unitIndex}-${audioSettings.azureVoice}.mp3`
      const request = new Request(new URL(path, window.location.origin))
      const cache = 'caches' in window ? await caches.open(AUDIO_CACHE) : null
      let response = await cache?.match(request)
      if (!response) {
        const blob = await synthesizeMeditationAudio(
          unit.phrases.map((phrase) => phrase.chinese),
          audioSettings,
        )
        response = new Response(blob, { headers: { 'Content-Type': 'audio/mpeg' } })
        await cache?.put(request, response.clone())
      }
      const blob = await response.blob()
      const objectUrl = URL.createObjectURL(blob)
      objectUrlRef.current = objectUrl
      const audio = new Audio(objectUrl)
      audioRef.current = audio
      audio.onended = () => {
        setAudioStatus('idle')
        setAudioMessage('Cached on this device for next time')
      }
      audio.onerror = () => {
        setAudioStatus('error')
        setAudioMessage('The generated audio could not be played.')
      }
      await audio.play()
      setAudioStatus('playing')
      setAudioMessage('Azure neural voice · slow phrase pacing')
    } catch (error) {
      setAudioStatus('error')
      setAudioMessage(error instanceof Error ? error.message : 'Could not create spoken Chinese audio.')
    }
  }

  if (!passage || !unit) {
    return (
      <section className="screen meditate-library-screen">
        <header className="meditate-heading">
          <button type="button" className="ghost-answer" onClick={onBack}>Back</button>
          <div className="meditate-title-mark" aria-hidden="true">静</div>
          <div>
            <span className="meditate-eyebrow">Meditate · 默想</span>
            <h1>Scripture, one phrase at a time</h1>
            <p>Slow down. Notice each Chinese phrase. Let understanding arrive without hurry.</p>
          </div>
        </header>
        <div className="meditate-passage-grid">
          {MEDITATION_PASSAGES.map((item) => (
            <button type="button" className="meditate-passage-card" key={item.id} onClick={() => choosePassage(item)}>
              <span>{item.theme}</span>
              <strong>{item.chineseTitle}</strong>
              <b>{item.title}</b>
              <small>{item.subtitle} · {item.units.length} movements</small>
              <i aria-hidden="true">→</i>
            </button>
          ))}
        </div>
        <p className="meditate-source-note">{MEDITATION_SOURCE_NOTE}</p>
      </section>
    )
  }

  const progress = Math.round(((unitIndex + 1) / passage.units.length) * 100)
  return (
    <section className="screen meditate-reader-screen">
      <header className="meditate-reader-header">
        <button type="button" className="ghost-answer" onClick={() => setPassage(null)}>All passages</button>
        <div>
          <span>{passage.chineseTitle}</span>
          <strong>{unit.reference}</strong>
        </div>
        <button
          type="button"
          className={`meditate-audio-button${audioStatus === 'playing' ? ' active' : ''}`}
          onClick={() => void playSpokenChinese()}
          disabled={audioStatus === 'loading'}
        >
          {audioStatus === 'loading' ? '准备声音…' : audioStatus === 'playing' ? '停止' : '慢慢听'}
        </button>
      </header>

      <div className="meditate-audio-status" role="status">
        <span>{audioMessage || (audioSettings.azureSpeechKey && audioSettings.azureSpeechRegion
          ? `Azure · ${audioSettings.azureVoice}`
          : 'Device Mandarin voice')}</span>
        {!audioSettings.azureSpeechKey || !audioSettings.azureSpeechRegion ? (
          <button type="button" onClick={onOpenSettings}>Set up Azure voice</button>
        ) : null}
      </div>

      <div className="meditate-progress" aria-label={`${progress}% through ${passage.title}`}>
        <span style={{ width: `${progress}%` }} />
      </div>

      <article className="meditate-page">
        <p className="meditate-breath-cue">安静。呼吸。慢慢读。</p>
        <div className="meditate-phrase-line" lang="zh-CN">
          {unit.phrases.map((phrase, index) => {
            const active = selectedPhrase === phrase
            return (
              <button
                type="button"
                className={`meditate-phrase${active ? ' active' : ''}`}
                key={`${phrase.chinese}-${index}`}
                onClick={() => {
                  setSelectedPhrase(active ? null : phrase)
                  setSavedMessage('')
                }}
                aria-label={`${phrase.chinese}, ${phrasePinyin(phrase.chinese)}, ${phrase.gloss}`}
              >
                <span className="meditate-pinyin">{phrasePinyin(phrase.chinese)}</span>
                <strong>{phrase.chinese}</strong>
                <span className="meditate-gloss">{phrase.gloss}</span>
              </button>
            )
          })}
        </div>

        {selectedPhrase ? (
          <div className="meditate-word-action">
            <span><b>{selectedPhrase.chinese}</b> · {phrasePinyin(selectedPhrase.chinese)} · {selectedPhrase.gloss}</span>
            <button
              type="button"
              onClick={async () => {
                await onSavePhrase(selectedPhrase)
                setSavedMessage(`${selectedPhrase.chinese} saved to flashcards`)
              }}
            >
              Save phrase
            </button>
          </div>
        ) : null}
        {savedMessage ? <p className="meditate-saved-message" role="status">{savedMessage}</p> : null}

        <button
          type="button"
          className={`meditate-english-reveal${showEnglish ? ' revealed' : ''}`}
          onClick={() => setShowEnglish((value) => !value)}
          aria-expanded={showEnglish}
        >
          <span>{showEnglish ? 'Natural English' : 'Tap for the natural English sentence'}</span>
          {showEnglish ? <strong>{unit.english}</strong> : <i aria-hidden="true">＋</i>}
        </button>
      </article>

      <footer className="meditate-controls">
        <button type="button" disabled={unitIndex === 0} onClick={() => move(-1)}>← Previous</button>
        <span>{unitIndex + 1} of {passage.units.length}</span>
        <button type="button" className="primary" disabled={unitIndex === passage.units.length - 1} onClick={() => move(1)}>Next →</button>
      </footer>
    </section>
  )
}
