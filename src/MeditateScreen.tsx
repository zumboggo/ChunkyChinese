import { useEffect, useMemo, useState } from 'react'
import { pinyin } from 'pinyin-pro'
import {
  MEDITATION_PASSAGES,
  MEDITATION_SOURCE_NOTE,
  type MeditationPassage,
  type MeditationPhrase,
} from './meditations'

const PROGRESS_KEY = 'chunky-meditate-progress-v1'

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
}: {
  onBack: () => void
  onSavePhrase: (phrase: MeditationPhrase) => void | Promise<void>
}) {
  const savedProgress = useMemo(() => loadProgress(), [])
  const [passage, setPassage] = useState<MeditationPassage | null>(() =>
    MEDITATION_PASSAGES.find((item) => item.id === savedProgress?.passageId) ?? null,
  )
  const [unitIndex, setUnitIndex] = useState(savedProgress?.unitIndex ?? 0)
  const [showEnglish, setShowEnglish] = useState(false)
  const [selectedPhrase, setSelectedPhrase] = useState<MeditationPhrase | null>(null)
  const [savedMessage, setSavedMessage] = useState('')

  const unit = passage?.units[Math.min(unitIndex, Math.max(0, passage.units.length - 1))]

  useEffect(() => {
    if (!passage) return
    localStorage.setItem(PROGRESS_KEY, JSON.stringify({ passageId: passage.id, unitIndex }))
  }, [passage, unitIndex])

  function choosePassage(next: MeditationPassage) {
    setPassage(next)
    setUnitIndex(0)
    setShowEnglish(false)
    setSelectedPhrase(null)
    setSavedMessage('')
  }

  function move(delta: number) {
    if (!passage) return
    setUnitIndex((current) => Math.max(0, Math.min(passage.units.length - 1, current + delta)))
    setShowEnglish(false)
    setSelectedPhrase(null)
    setSavedMessage('')
  }

  function speakSlowly() {
    if (!unit || !('speechSynthesis' in window)) return
    window.speechSynthesis.cancel()
    const utterance = new SpeechSynthesisUtterance(unit.phrases.map((phrase) => phrase.chinese).join(''))
    utterance.lang = 'zh-CN'
    utterance.rate = 0.62
    window.speechSynthesis.speak(utterance)
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
        <button type="button" className="meditate-audio-button" onClick={speakSlowly}>慢慢听</button>
      </header>

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
