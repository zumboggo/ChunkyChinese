import { useEffect, useMemo, useRef, useState, type CSSProperties } from 'react'
import type { HotkeySettings, VocabWord } from '../types'
import catalog from './catalog.json'
import worldSource from './world.json'
import { applyAction, changePreferences, emptyJournal, friendshipLevel, journalKey, readJournal, recordKey, startEpisode, totalXP, writeJournal } from './journal'
import type { Journal } from './journal'
import { bank, flags, shuffled, selectCoverage, validMessage } from './model'
import type { Attempt, Episode, World, Action } from './model'
import './game.css'

const episodes = catalog as unknown as Episode[]
const base = import.meta.env.BASE_URL
const world = worldSource as World
const GAME_CACHE = 'chunky-game-v1'
function load(identity: string) { try { return { journal: readJournal(localStorage,identity,episodes,world), error:'' } } catch(e) { return {journal:emptyJournal(),error:e instanceof Error?e.message:'Local progress unavailable.'} } }
export default function GamePage({ identity, words, hotkeys }: { identity: string; words: VocabWord[]; hotkeys: HotkeySettings }) {
  const [initial] = useState(() => load(identity))
  const [progress, setProgress] = useState(initial.journal)
  const journal = useRef(initial.journal)
  const preferences = progress.preferences
  const saved = Object.fromEntries(episodes.flatMap(ep => { const a=progress.records[recordKey(ep)]?.current;return a?[[ep.id,a]]:[] }))
  const completed = Object.fromEntries(episodes.map(ep => [ep.id, Boolean(progress.events[`complete:${ep.id}`])]))
  const profiles = useMemo(() => Object.fromEntries(episodes.map(ep => [ep.id, selectCoverage(ep, words)])), [words])
  const [selected, setSelected] = useState<Episode | null>(null)
  const [playing, setPlaying] = useState(false)
  const [attempt, setAttempt] = useState<Attempt | undefined>()
  const [settingsBusy,setSettingsBusy]=useState(false)
  const [error, setError] = useState(initial.error)
  const [offline, setOffline] = useState('')
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
          if (!response.ok || response.status === 206 || (path.endsWith('.m4a') && !(response.headers.get('content-type') ?? '').startsWith('audio/'))) throw new Error(path)
          await cache.put(url, response)
        }))
        if (!cancelled) setOffline(results.some(r => r.status === 'rejected') ? 'Some files could not be downloaded. Reopen online to finish offline preparation.' : 'Episode downloaded · available offline on this device')
      } catch { if (!cancelled) setOffline('Offline downloads are unavailable in this browser. Text remains playable while online.') }
    })()
    return () => { cancelled = true }
  }, [playing, selected])

  async function persist(next: Journal, previous = journal.current) {
    const save = () => { writeJournal(localStorage,identity,previous,next);journal.current=next;setProgress(next) }
    if(navigator.locks)await navigator.locks.request(journalKey(identity),save)
    else save()
  }
  function playback(speaker: string | null) {
    frame.current?.contentWindow?.postMessage({protocol:'chunky-game-v1',channel,type:'playback',speaker,attemptId:current.current?.attemptId,step:current.current?.step},location.origin)
  }
  function postState(state = current.current) {
    if (!state) return
    const scene = selected?.scenes[state.step]
    const answer = scene?.choices.find(c => c.id === state.choiceId)?.[state.variant]
    frame.current?.contentWindow?.postMessage({ protocol: 'chunky-game-v1', channel, type: 'state', state, progress: { xp: totalXP(journal.current), friendships: journal.current.friendships, facts: journal.current.facts, milestones: journal.current.milestones, unlocked: journal.current.unlocked, events: journal.current.events }, order: shuffled(scene?.kind === 'choice' ? scene.options?.length ?? 0 : answer ? bank(answer).length : 0, `${state.attemptId}:${state.step}`),
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
    async function commitAction(action: Action) {
      const prev=current.current
      if(!prev)return
      const before=journal.current,next=applyAction(before,selected!,world,action)
      if(next===before){postState(prev);return}
      try { await persist(next,before) } catch(e) {setError(e instanceof Error?e.message:'Your action could not be saved. Please retry.');postState(prev);return}
      audio.current?.pause();playback(null)
      current.current=next.records[recordKey(selected!)]?.current;setAttempt(current.current);postState()
    }
    function receive(event: MessageEvent) {
      if (!validMessage(event, frame.current?.contentWindow ?? null, location.origin, channel)) return
      const m = event.data
      if (m.type === 'ready') { postState(); return }
      if (m.type === 'exit') { leave(); return }
      if (m.type === 'audio') {
        if (typeof m.audio !== 'string' || !selected!.resources?.includes(m.audio) || !m.audio.startsWith('game/audio/')) return
        audio.current?.pause()
        const sound = new Audio(`${base}${m.audio}`); audio.current = sound
        const started = current.current
        const scene=started&&selected!.scenes[started.step]
        const bonus=started?.bonusId?world.bonuses[started.bonusId]:undefined
        const check=selected!.memoryCheck
        const npcSpeaker = m.role==='npc' ? (bonus && bonus.line.audio===m.audio ? bonus.character : scene && (scene.line.audio===m.audio || scene.choices.some(c=>c.responseLine?.audio===m.audio)) ? scene.speaker : started?.step===selected!.scenes.length && check && [check.question.audio,check.introduction.audio].includes(m.audio) ? check.speaker : null) : null
        const isPrompt = started && selected!.scenes[started.step]?.promptMode === 'listen' && selected!.scenes[started.step].line.audio === m.audio
        const stillCurrent = () => audio.current === sound && current.current?.attemptId === started?.attemptId && current.current?.step === started?.step && current.current?.bonusId === started?.bonusId
        sound.onplaying=()=>{if(stillCurrent())playback(npcSpeaker)}
        sound.onpause=()=>{if(audio.current===sound)playback(null)}
        sound.onended = () => { if(stillCurrent()){playback(null);if(isPrompt)void commitAction({ type: 'heard' })} }
        let failed=false
        const unavailable = () => {
          if (failed || !stillCurrent()) return
          failed=true
          playback(null)
          if (isPrompt) void commitAction({ type: 'transcript' })
          setError(isPrompt ? 'This question’s audio is unavailable. The transcript is available for supported play.' : 'This audio clip is unavailable. You can continue using the text.')
        }
        sound.onerror = unavailable
        void sound.play().catch(e => {
          if (!stillCurrent() || e?.name === 'AbortError') return
          if (e?.name === 'NotAllowedError') setError('Tap Listen again to allow audio, or choose Show transcript for supported play.')
          else unavailable()
        })
        return
      }
      if (m.type !== 'action' || !current.current) return
      if (m.revision !== current.current.revision || m.action?.type === 'heard') { postState(); return }
      void commitAction(m.action)
    }
    window.addEventListener('message', receive)
    return () => window.removeEventListener('message', receive)
    // postState/leave deliberately capture this mounted identity and launch channel.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [playing, selected, identity, channel, hotkeys])

  async function launch(ep: Episode, replay = false) {
    setError('');setOffline('Preparing this episode for offline play…')
    try {
      const previous=journal.current,next=startEpisode(previous,ep,profiles[ep.id],replay,episodes.flatMap(other=>flags(other,previous.records[recordKey(other)]?.completed)))
      await persist(next,previous)
      const a=next.records[recordKey(ep)].current!
      setWindowed(false);current.current=a;setAttempt(a);setSelected(ep);setChannel(crypto.randomUUID());setPlaying(true)
    } catch(e) {setError(e instanceof Error?e.message:'Could not start this episode.')}
  }

  return <section className={`game-page ${playing ? 'game-playing' : ''} ${playing && !windowed ? 'game-expanded' : ''}`} ref={library} style={{ '--game-background': `url("${base}${world.locations[episodes[0].location].background}")` } as CSSProperties} aria-label="Game">
    <header className="game-heading"><div><p className="game-kicker">SMALL ADVENTURES · CHENGDU</p><h1>{playing ? selected?.title : 'Become a familiar face'}</h1></div>
      {playing && <div className="game-toolbar"><button onClick={leave}>← Game library</button><button onClick={() => {
        if (document.fullscreenElement === library.current) { void document.exitFullscreen().catch(() => {}); setWindowed(true) }
        else { setWindowed(w => !w); if (windowed) void library.current?.requestFullscreen?.().catch(() => {}) }
        frame.current?.contentWindow?.focus()
      }}>{windowed ? 'Expand' : 'Window'}</button></div>}
    </header>
    {error && <p className="game-notice" role="alert">{error}</p>}
    {playing && selected && attempt ? <>
      <p className="game-save-status">Saved on this device · {offline}</p>
      <iframe key={`${selected.id}:${channel}`} ref={frame} title={`${selected.title} — playable Twine episode`} src={`${base}${selected.document}#channel=${channel}`} onLoad={() => { postState(); frame.current?.contentWindow?.focus() }} />
    </> : <>
      <details className="game-settings"><summary>Game settings</summary><p>These defaults apply to all episodes on this device for this account. You can also change them during a conversation.</p>{(['pinyin', 'clues', 'motion'] as const).map(key => <label key={key}><input type="checkbox" disabled={settingsBusy} checked={preferences[key]} onChange={event => {
        const next = { ...preferences, [key]: event.target.checked }
        setSettingsBusy(true);setProgress(p=>({...p,preferences:next}))
        void persist(changePreferences(journal.current,next)).catch(e=>{setProgress(journal.current);setError(e instanceof Error?e.message:'Could not save settings.')}).finally(()=>setSettingsBusy(false))
      }} /> {key === 'pinyin' ? 'Show pinyin by default' : key === 'clues' ? 'Show English goal clues by default' : 'Animate portraits and scene fades (respects reduced motion)'}</label>)}<p role="status">{settingsBusy?'Saving settings…':'Settings saved on this device.'}</p></details>
      {progress.legacyNotice && <p className="game-small">Earlier completions have been credited. Updated episodes start fresh; unfinished earlier attempts remain saved separately.</p>}
      <section className="game-journey" aria-label="Neighbourhood progress"><h2>{world.goal.title}</h2><p><strong>{totalXP(progress)} Language XP</strong> · {progress.milestones.filter(id=>world.goal.milestones.includes(id)).length} / {world.goal.milestones.length} Belonging milestones</p>{world.goal.milestones.map(id=><p key={id}>{progress.milestones.includes(id)?'✓':'○'} {world.milestones[id].title}</p>)}{progress.milestones.includes(world.goal.id)&&<strong>✦ Familiar face earned</strong>}</section>
      <details className="game-notebook"><summary>People I know</summary>{Object.entries(world.characters).map(([id,c])=><article key={id}><h3>{c.name} · {progress.friendships[id]??0} Friendship</h3><p>{friendshipLevel(progress.friendships[id]??0)} · {c.role}</p>{progress.facts.filter(f=>world.facts[f]?.character===id).map(f=><p key={f}><span lang="zh-CN">{world.facts[f].line.zh}</span> — {world.facts[f].line.english}</p>)}{!progress.facts.some(f=>world.facts[f]?.character===id)&&<p>Personal details will appear here as you encounter them.</p>}{Object.entries(world.bonuses).filter(([bid,b])=>b.character===id&&progress.unlocked.includes(bid)).map(([bid,b])=><p key={bid}>Unlocked: {b.title} · revisit an episode with {c.name} to enjoy this moment.</p>)}</article>)}</details>
      <div className="game-world"><nav className="game-map" aria-label="People in the neighbourhood">
        {episodes.map(ep => <button key={ep.id} disabled={!storageOkay} onClick={() => setSelected(ep)}>{ep.mapLabel}<small>{ep.place}</small></button>)}
      </nav><div><span>Small conversations. One neighbourhood.</span><p>Meet someone. Find the words. See where the afternoon goes.</p></div></div>
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
          {saved[selected.id]?.step === selected.scenes.length && <button disabled={!storageOkay} onClick={() => launch(selected)}>Return to the ending and friendship moments</button>}
          {saved[selected.id] && <button disabled={!storageOkay} onClick={() => launch(selected, true)}>{saved[selected.id].step === selected.scenes.length ? 'Replay from the beginning' : 'Restart this episode'}</button>}
          <button onClick={() => setSelected(null)}>Close preview</button>
        </section>
      })()}
      <p className="game-small">Replay as often as you like. Your first completion is preserved. Nothing here changes your flashcard schedule.</p>
    </>}
  </section>
}
