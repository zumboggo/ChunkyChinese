import { useEffect, useMemo, useRef, useState, type CSSProperties } from 'react'
import type { HotkeySettings, VocabWord } from '../types'
import catalog from './catalog.json'
import { bank, shuffled, flags, freshAttempt, selectCoverage, storageKey, transition, validAttempt, validMessage } from './model'
import type { Attempt, Episode, Preferences } from './model'
import './game.css'

const episodes = catalog as Episode[]
const base = `${import.meta.env.BASE_URL}game/v2/`
const GAME_CACHE = 'chunky-game-v1'
function readPreferences(identity: string): Preferences {
  try { const value = JSON.parse(localStorage.getItem(`chunky-game:preferences:${encodeURIComponent(identity)}`) ?? '{}'); return { pinyin: value.pinyin !== false, clues: value.clues !== false } } catch { return { pinyin: true, clues: true } }
}
function readAttempt(identity: string, ep: Episode, suffix = ''): Attempt | undefined {
  const raw = localStorage.getItem(storageKey(identity, ep) + suffix)
  if (!raw) return undefined
  const value: unknown = JSON.parse(raw)
  if (!validAttempt(ep, value)) throw new Error('Saved game data is incompatible. It has not been changed.')
  return value
}
function loadLibrary(identity: string) {
  const saved: Record<string, Attempt> = {}, completed: Record<string, Attempt> = {}
  try {
    for (const ep of episodes) {
      const a = readAttempt(identity, ep), done = readAttempt(identity, ep, ':complete')
      if (a) saved[ep.id] = a
      if (done) completed[ep.id] = done
    }
    return { saved, completed, error: '' }
  } catch (e) { return { saved, completed, error: e instanceof Error ? e.message : 'Local game saves are unavailable.' } }
}
export default function GamePage({ identity, words, hotkeys }: { identity: string; words: VocabWord[]; hotkeys: HotkeySettings }) {
  const [preferences, setPreferences] = useState(() => readPreferences(identity))
  const [initial] = useState(() => loadLibrary(identity))
  const profiles = useMemo(() => Object.fromEntries(episodes.map(ep => [ep.id, selectCoverage(ep, words)])), [words])
  const [selected, setSelected] = useState<Episode | null>(null)
  const [playing, setPlaying] = useState(false)
  const [attempt, setAttempt] = useState<Attempt | undefined>()
  const [error, setError] = useState(initial.error)
  const [offline, setOffline] = useState('')
  const [saved, setSaved] = useState<Record<string, Attempt>>(initial.saved)
  const [completed, setCompleted] = useState<Record<string, Attempt>>(initial.completed)
  const frame = useRef<HTMLIFrameElement>(null)
  const audio = useRef<HTMLAudioElement | null>(null)
  const current = useRef<Attempt | undefined>(undefined)
  const [channel, setChannel] = useState(() => crypto.randomUUID())
  const library = useRef<HTMLElement>(null)
  const preview = useRef<HTMLElement>(null)
  const [windowed, setWindowed] = useState(true)
  const storageOkay = !initial.error

  useEffect(() => () => { audio.current?.pause() }, [])
  useEffect(() => { if (selected && !playing) preview.current?.scrollIntoView({ block: 'start' }) }, [selected, playing])
  useEffect(() => {
    if (!playing || windowed) return
    const previous = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = previous }
  }, [playing, windowed])

  useEffect(() => {
    if (!playing || !selected) return
    let cancelled = false
    void (async () => {
      try {
        const cache = await caches.open(GAME_CACHE)
        const results = await Promise.allSettled((selected.resources ?? []).map(async path => {
          const url = `${base}${path}`
          if (await cache.match(url)) return
          const response = await fetch(url)
          if (!response.ok || (path.endsWith('.m4a') && !(response.headers.get('content-type') ?? '').startsWith('audio/'))) throw new Error(path)
          await cache.put(url, response)
        }))
        if (!cancelled) setOffline(results.some(r => r.status === 'rejected') ? 'Some files could not be downloaded. Reopen online to finish offline preparation.' : 'Episode downloaded · available offline on this device')
      } catch { if (!cancelled) setOffline('Offline downloads are unavailable in this browser. Text remains playable while online.') }
    })()
    return () => { cancelled = true }
  }, [playing, selected])

  function postState(state = current.current) {
    if (!state) return
    const scene = selected?.scenes[state.step]
    const answer = scene?.choices.find(c => c.id === state.choiceId)?.[state.variant]
    frame.current?.contentWindow?.postMessage({ protocol: 'chunky-game-v1', channel, type: 'state', state, order: shuffled(scene?.kind === 'choice' ? scene.options?.length ?? 0 : answer ? bank(answer).length : 0, `${state.attemptId}:${state.step}`),
      hotkeys: [hotkeys.choiceA, hotkeys.choiceB, hotkeys.choiceC, hotkeys.choiceD, hotkeys.choiceE, hotkeys.choiceF], playKey: hotkeys.playPause }, location.origin)
  }
  function leave() {
    audio.current?.pause()
    setPlaying(false)
    if (document.fullscreenElement === library.current) void document.exitFullscreen().catch(() => {})
    setWindowed(true)
  }
  useEffect(() => {
    if (!playing || !selected) return
    function receive(event: MessageEvent) {
      if (!validMessage(event, frame.current?.contentWindow ?? null, location.origin, channel)) return
      const m = event.data
      if (m.type === 'ready') { postState(); return }
      if (m.type === 'exit') { leave(); return }
      if (m.type === 'audio') {
        if (typeof m.audio !== 'string' || !selected!.resources?.includes(m.audio) || !m.audio.startsWith('audio/')) return
        audio.current?.pause()
        const sound = new Audio(`${base}${m.audio}`); audio.current = sound
        sound.onerror = () => setError('This audio clip is unavailable. You can continue using the text.')
        void sound.play().catch(() => setError('Audio could not play. Tap Hear Mandarin to retry; the text is still available.'))
        return
      }
      const prev = current.current
      if (m.type !== 'action' || !prev) return
      if (m.revision !== prev.revision) { postState(prev); return }
      const next = transition(selected!, prev, m.action)
      if (next === prev) { postState(prev); return }
      try {
        const stored = readAttempt(identity, selected!)
        if (stored && (stored.attemptId !== prev.attemptId || stored.revision > prev.revision)) {
          setError('Progress changed in another tab. Return to Game and reload the page to continue safely.'); postState(prev); return
        }
        if (m.action?.type === 'pinyin' || m.action?.type === 'clues') {
          const value = { pinyin: next.pinyin, clues: next.clues }
          localStorage.setItem(`chunky-game:preferences:${encodeURIComponent(identity)}`, JSON.stringify(value)); setPreferences(value)
        }
        localStorage.setItem(storageKey(identity, selected!), JSON.stringify(next))
        if (next.step === selected!.scenes.length) {
          const key = storageKey(identity, selected!)
          if (!localStorage.getItem(`${key}:first`)) localStorage.setItem(`${key}:first`, JSON.stringify(next))
          localStorage.setItem(`${key}:complete`, JSON.stringify(next))
          setCompleted(c => ({ ...c, [selected!.id]: next }))
        }
      } catch { setError('Your latest action could not be saved. Free some device storage, then try that action again.'); postState(prev); return }
      audio.current?.pause()
      current.current = next; setAttempt(next); setSaved(s => ({ ...s, [selected!.id]: next })); postState(next)
    }
    window.addEventListener('message', receive)
    return () => window.removeEventListener('message', receive)
    // postState/leave deliberately capture this mounted identity and launch channel.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [playing, selected, identity, channel, hotkeys])

  function launch(ep: Episode, replay = false) {
    setError('')
    setOffline('Preparing this episode for offline play…')
    try {
      const previous = readAttempt(identity, ep)
      const callbacks = episodes.filter(e => e.id !== ep.id).flatMap(e => flags(e, readAttempt(identity, e, ':complete')))
      const a = !replay && previous ? { ...previous, ...preferences } : freshAttempt(ep, profiles[ep.id], callbacks, preferences)
      localStorage.setItem(storageKey(identity, ep), JSON.stringify(a))
      setWindowed(false); current.current = a; setAttempt(a); setSelected(ep); setChannel(crypto.randomUUID()); setPlaying(true); setSaved(s => ({ ...s, [ep.id]: a }))
    } catch (e) { setError(e instanceof Error ? e.message : 'Could not start a saved game.') }
  }

  return <section className={`game-page ${playing ? 'game-playing' : ''} ${playing && !windowed ? 'game-expanded' : ''}`} ref={library} style={{ '--game-background': `url("${base}courtyard.webp")` } as CSSProperties} aria-label="Game">
    <header className="game-heading"><div><p className="game-kicker">SMALL ADVENTURES · CHENGDU</p><h1>{playing ? selected?.title : 'A little more at home'}</h1></div>
      {playing && <div className="game-toolbar"><button onClick={leave}>← Game library</button><button onClick={() => {
        if (document.fullscreenElement === library.current) { void document.exitFullscreen().catch(() => {}); setWindowed(true) }
        else { setWindowed(w => !w); if (windowed) void library.current?.requestFullscreen?.().catch(() => {}) }
        frame.current?.contentWindow?.focus()
      }}>{windowed ? 'Expand' : 'Window'}</button></div>}
    </header>
    {error && <p className="game-notice" role="alert">{error}</p>}
    {playing && selected && attempt ? <>
      <p className="game-save-status">Saved on this device · {offline}</p>
      <iframe key={`${selected.id}:${channel}`} ref={frame} title={`${selected.title} — playable Twine episode`} src={`${base}${selected.id}.html#channel=${channel}`} onLoad={() => { postState(); frame.current?.contentWindow?.focus() }} />
    </> : <>
      <details className="game-settings"><summary>Game settings</summary><p>These defaults apply to all episodes on this device for this account. You can also change them during a conversation.</p>{(['pinyin', 'clues'] as const).map(key => <label key={key}><input type="checkbox" checked={preferences[key]} onChange={event => {
        const next = { ...preferences, [key]: event.target.checked }
        try { localStorage.setItem(`chunky-game:preferences:${encodeURIComponent(identity)}`, JSON.stringify(next)); setPreferences(next) } catch { setError('Could not save your Game settings on this device.') }
      }} /> {key === 'pinyin' ? 'Show pinyin by default' : 'Show English goal clues by default'}</label>)}</details>
      <p className="game-small">Revised lessons start fresh; earlier episode progress is preserved separately.</p>
      <div className="game-world"><nav className="game-map" aria-label="People in the neighbourhood">
        {episodes.map((ep, i) => <button key={ep.id} disabled={!storageOkay} onClick={() => setSelected(ep)}>{['Talk to Ms Lin', 'Meet Chen', 'Visit Ms Zhou'][i]}<small>{ep.place}</small></button>)}
      </nav><div><span>Three conversations. One neighbourhood.</span><p>Meet someone. Find the words. See where the afternoon goes.</p></div></div>
      <p className="game-intro">Play as yourself, an English teacher learning Chinese in Chengdu. Read and listen to three conversations, choosing the reply that fits. Then build a longer sentence from a mixed word bank. There is time to think, ask again, and try another way.</p>
      <p className="game-small">Fictional neighbours and places · Mandarin dialogue · no music · local progress only</p>
      <div className="game-episodes">{episodes.map((ep, index) => {
        const a = saved[ep.id], done = completed[ep.id], coverage = profiles[ep.id]
        return <article key={ep.id} className="game-card">
          <div className="game-card-top"><span>0{index + 1} / {ep.place}</span><span>{done ? '✓ Completed' : a ? `${a.step} / ${ep.scenes.length} exchanges` : '4 conversations'}</span></div>
          <h2>{ep.title}</h2><p>{ep.subtitle}</p>
          <p className="game-small">{coverage.percent}% familiar language · {coverage.answerPercent}% familiar reply vocabulary · {Math.ceil((ep.bytes ?? 0) / 1024)} KB download</p>
          <button disabled={!storageOkay} onClick={() => setSelected(ep)}>{a && a.step < ep.scenes.length ? 'Continue' : done ? 'Revisit episode' : index === 0 ? 'Start here' : 'Explore episode'} →</button>
        </article>
      })}</div>
      {selected && (() => {
        const coverage = saved[selected.id]?.coverage ?? profiles[selected.id]
        return <section ref={preview} className="game-preview" aria-label="Episode preview">
          <h2>{selected.title}</h2><p>{selected.subtitle}</p>
          <p>{coverage.supported ? 'Supported play: some language is still unfamiliar. Pinyin, meanings, hints, and worked answers are available throughout.' : 'This episode meets the 95% familiar-language target for both dialogue and replies.'}</p>
          <p>Focus words: {selected.newWords.join(' · ')}</p>
          {coverage.unknown.length > 0 && <details><summary>Preview unfamiliar language ({coverage.unknown.length} items)</summary><div className="game-vocabulary">{coverage.unknown.map(term => {
            const word = words.find(w => w.word === term)
            return <span key={term}><strong lang="zh-CN">{term}</strong>{word ? ` · ${word.pinyin} · ${word.meaning}` : ' · meaning available in the conversation'}</span>
          })}</div></details>}
          <p className="game-small">These are fictional people. Your choices are private and saved only in this browser. Reading familiarity is a starting point, not a speaking score.</p>
          {saved[selected.id]?.step !== selected.scenes.length && <button disabled={!storageOkay} onClick={() => launch(selected)}>{saved[selected.id] ? 'Continue conversation' : 'Enter the neighbourhood'}</button>}
          {saved[selected.id] && <button disabled={!storageOkay} onClick={() => launch(selected, true)}>{saved[selected.id].step === selected.scenes.length ? 'Replay from the beginning' : 'Restart this episode'}</button>}
          <button onClick={() => setSelected(null)}>Close preview</button>
        </section>
      })()}
      <p className="game-small">Replay as often as you like. Your first completion is preserved. Nothing here changes your flashcard schedule.</p>
    </>}
  </section>
}
