import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { CSSProperties } from 'react'
import { WordInfoPopover } from '../WordInfoPopover'
import { tokenizeReaderText, type AdaptivePinyinMode } from '../adaptiveText'
import type { CardBattlerState } from '../cardBattler/types'
import {
  deleteVisualNovelSave,
  getAudioClip,
  lookupDictionary,
  upsertWords,
  getVisualNovelSave,
  getVisualNovelWorldSave,
  saveVisualNovelSave,
  saveVisualNovelWorldSave,
  deleteVisualNovelWorldSave,
} from '../db'
import type {
  DictionaryEntry,
  HotkeySettings,
  ReaderBook,
  ReaderSentence,
  ReaderWordToken,
  UserSettings,
  VocabWord,
} from '../types'
import {
  advanceVisualNovel,
  availableChoices,
  currentVisualNovelNode,
  goBackVisualNovel,
  visualNovelQuestResult,
} from './engine'
import {
  loadVisualNovelQuestScript,
  loadVisualNovelWorld,
  loadVisualNovelWorldAssetManifest,
  loadVisualNovelWorldIndex,
  visualNovelAssetSrc,
} from './loader'
import { validateVisualNovelWorld } from './worldValidator'
import {
  abandonWorldQuest,
  activeWorldQuests,
  commitQuestResult,
  completedWorldQuests,
  currentWorldLocation,
  makeVisualNovelWorldSave,
  nextEncounterQuest,
  restartWorldWithStats,
  startWorldQuest,
} from './worldEngine'
import type {
  VisualNovelSave,
  VisualNovelWorldSave,
  VnAssetManifest,
  VnQuestDefinition,
  VnQuestResult,
  VnScript,
  VnWorld,
  VnWorldAction,
  VnWorldIndexEntry,
} from './types'
import { getNodeText, getNodeAudioClipId, scopedTokens, stopAudio, speakUtterance, formatDueDate, getLocationBackgroundId } from './utils'
import { QuestPlayer, type VnTextSpeed } from './QuestPlayer'
import { WorldHub } from './WorldHub'
import { getHubCastMembers, MAP_LAYOUT, MAP_CONNECTIONS } from './WorldHubData'
import { WorldStatusPanel } from './WorldStatusPanel'

interface VisualNovelWorldModeProps {
  words: VocabWord[]
  readerBooks: ReaderBook[]
  pinyinMode: AdaptivePinyinMode
  readerTheme: UserSettings['readerTheme']
  readerFontScale: number
  readerLineHeight: number
  playbackRate: number
  hotkeys: HotkeySettings
  onEditWord: (word: VocabWord) => void
  onWordsChanged: () => void | Promise<void>
  onReturnToReader: () => void
  initialWorldId?: string
}

export function VisualNovelWorldMode({
  words,
  readerBooks,
  pinyinMode,
  readerTheme,
  playbackRate,
  hotkeys,
  onEditWord,
  onWordsChanged,
  onReturnToReader,
  initialWorldId,
}: VisualNovelWorldModeProps) {
  const [worldIndex, setWorldIndex] = useState<VnWorldIndexEntry[]>([])
  const [selectedWorldId, setSelectedWorldId] = useState<string | undefined>()
  const [world, setWorld] = useState<VnWorld | null>(null)
  const [manifest, setManifest] = useState<VnAssetManifest | null>(null)
  const [scripts, setScripts] = useState<Record<string, VnScript>>({})
  const [worldSave, setWorldSave] = useState<VisualNovelWorldSave | null>(null)
  const [activeQuestId, setActiveQuestId] = useState<string | null>(null)
  const [questSave, setQuestSave] = useState<VisualNovelSave | null>(null)
  const [loadState, setLoadState] = useState<'loading' | 'ready' | 'empty' | 'error'>('loading')
  const [message, setMessage] = useState<string | null>(null)
  const [loadingSlow, setLoadingSlow] = useState(false)
  const [loadingStep, setLoadingStep] = useState('Starting...')
  const [reloadKey, setReloadKey] = useState(0)
  const [showEnglish, setShowEnglish] = useState(false)
  const [showMap, setShowMap] = useState(false)
  const [showInventory, setShowInventory] = useState(false)
  const [selectedToken, setSelectedToken] = useState<ReaderWordToken | null>(null)
  const [dictionaryEntry, setDictionaryEntry] = useState<DictionaryEntry | null>(null)
  const [statusToast, setStatusToast] = useState<string | null>(null)
  const [showRestartConfirm, setShowRestartConfirm] = useState(false)
  const [showSettings, setShowSettings] = useState(false)
  const [showJournal, setShowJournal] = useState(false)
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle')
  const [textSpeed, setTextSpeed] = useState<VnTextSpeed>(() => {
    const saved = localStorage.getItem('vnTextSpeed')
    return (saved === 'slow' || saved === 'normal' || saved === 'fast' || saved === 'instant') ? saved : 'normal'
  })
  const [autoAdvance, setAutoAdvance] = useState(() => localStorage.getItem('vnAutoAdvance') === 'true')
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const audioTokenRef = useRef(0)
  const audioBlobUrlRef = useRef<string | null>(null)
  const ambientAudioRef = useRef<HTMLAudioElement | null>(null)
  const ambientMusicIdRef = useRef<string | null>(null)

  const readerSentenceById = useMemo(() => {
    const sentences = new Map<string, ReaderSentence>()
    for (const book of readerBooks) {
      for (const story of book.stories) {
        for (const sentence of story.sentences) sentences.set(sentence.id, sentence)
      }
    }
    return sentences
  }, [readerBooks])

  useEffect(() => {
    let cancelled = false
    async function loadIndex() {
      try {
        setLoadState('loading')
        setLoadingStep('Loading world index...')
        setMessage(null)
        const nextIndex = await loadVisualNovelWorldIndex()
        if (cancelled) return
        setWorldIndex(nextIndex)
        setSelectedWorldId(
          initialWorldId && nextIndex.some((entry) => entry.id === initialWorldId)
            ? initialWorldId
            : nextIndex[0]?.id,
        )
        setLoadState(nextIndex.length > 0 ? 'loading' : 'empty')
        setLoadingStep(nextIndex.length > 0 ? 'Loading selected world...' : 'No worlds found.')
      } catch (error) {
        console.error(error)
        if (cancelled) return
        setLoadState('error')
        setMessage(error instanceof Error ? error.message : 'Visual Novel world index failed to load.')
      }
    }
    void loadIndex()
    return () => {
      cancelled = true
    }
  }, [initialWorldId, reloadKey])

  useEffect(() => {
    if (!selectedWorldId) return
    const entry = worldIndex.find((item) => item.id === selectedWorldId)
    if (!entry) return
    const selectedEntry = entry
    let cancelled = false
    async function loadWorld() {
      try {
        setLoadState('loading')
        setMessage(null)
        setSelectedToken(null)
        setDictionaryEntry(null)
        setActiveQuestId(null)
        setQuestSave(null)
        setLoadingStep(`Loading ${selectedEntry.title}...`)
        const nextWorld = await loadVisualNovelWorld(selectedEntry)
        setLoadingStep('Loading visual assets...')
        const nextManifest = await loadVisualNovelWorldAssetManifest(nextWorld)
        const nextScripts: Record<string, VnScript> = {}
        const quests = Object.values(nextWorld.quests)
        for (const quest of quests) {
          setLoadingStep(`Loading quest: ${quest.title.english ?? quest.id}...`)
          nextScripts[quest.scriptId] = await loadVisualNovelQuestScript(nextWorld, quest.scriptPath)
        }
        setLoadingStep('Validating world...')
        const validation = validateVisualNovelWorld(nextWorld, nextScripts, nextManifest)
        if (validation.errors.length > 0) throw new Error(validation.errors[0])
        if (validation.warnings.length > 0) console.info('Visual Novel world validation warnings', validation.warnings)
        setLoadingStep('Opening local world save...')
        const existingSave = await withTimeout(
          getVisualNovelWorldSave(nextWorld.id),
          5000,
          'Local Visual Novel save took too long to open.',
        ).catch((error) => {
          console.warn(error)
          return undefined
        })
        const usableSave =
          existingSave &&
          existingSave.contentVersion === nextWorld.contentVersion &&
          Boolean(nextWorld.locations[existingSave.state.currentLocationId])
            ? existingSave
            : makeVisualNovelWorldSave(nextWorld)
        if (!existingSave || existingSave !== usableSave) {
          setLoadingStep('Saving fresh world state...')
          await withTimeout(
            saveVisualNovelWorldSave(usableSave),
            5000,
            'Local Visual Novel save took too long to write.',
          ).catch((error) => {
            console.warn(error)
          })
        }
        if (cancelled) return
        setWorld(nextWorld)
        setManifest(nextManifest)
        setScripts(nextScripts)
        setWorldSave(usableSave)
        setLoadingStep('Ready.')
        setLoadState('ready')
      } catch (error) {
        console.error(error)
        if (cancelled) return
        setLoadState('error')
        setMessage(error instanceof Error ? error.message : 'Visual Novel world failed to load.')
      }
    }
    void loadWorld()
    return () => {
      cancelled = true
    }
  }, [selectedWorldId, worldIndex, reloadKey])

  const location = world && worldSave ? currentWorldLocation(world, worldSave) : undefined

  useEffect(() => {
    const musicId = location?.musicId
    if (!musicId || activeQuestId) {
      if (ambientAudioRef.current) {
        ambientAudioRef.current.pause()
        ambientAudioRef.current = null
        ambientMusicIdRef.current = null
      }
      return
    }
    if (musicId === ambientMusicIdRef.current) return
    let cancelled = false
    void (async () => {
      const clip = await getAudioClip(musicId)
      if (cancelled || !clip) return
      if (ambientAudioRef.current) ambientAudioRef.current.pause()
      const url = URL.createObjectURL(clip.blob)
      const audio = new Audio(url)
      audio.loop = true
      audio.volume = 0.3
      ambientAudioRef.current = audio
      ambientMusicIdRef.current = musicId
      audio.addEventListener('ended', () => URL.revokeObjectURL(url), { once: true })
      audio.play().catch(() => {})
    })()
    return () => { cancelled = true }
  }, [location?.musicId, activeQuestId])

  useEffect(() => {
    return () => {
      if (ambientAudioRef.current) {
        ambientAudioRef.current.pause()
        ambientAudioRef.current = null
      }
    }
  }, [])

  const castMembers = useMemo(
    () => (world && worldSave && manifest ? getHubCastMembers(world, worldSave, location, manifest) : []),
    [location, manifest, worldSave, world],
  )
  const activeQuest = world && activeQuestId ? world.quests[activeQuestId] : undefined
  const activeScript = activeQuest ? scripts[activeQuest.scriptId] : undefined
  const node = activeScript && questSave ? currentVisualNovelNode(activeScript, questSave) : undefined
  const result = visualNovelQuestResult(node)
  const choices = useMemo(
    () => (activeScript && questSave ? availableChoices(activeScript, questSave) : []),
    [activeScript, questSave],
  )
  const displayText = node ? getNodeText(node) : undefined
  const displayTokens = useMemo(
    () =>
      displayText
        ? scopedTokens(tokenizeReaderText(displayText.chinese, words), `world-vn-${questSave?.currentNodeId ?? 'line'}`)
        : [],
    [displayText, questSave?.currentNodeId, words],
  )

  useEffect(() => {
    if (statusToast === null) return
    const timeout = window.setTimeout(() => setStatusToast(null), 2600)
    return () => window.clearTimeout(timeout)
  }, [statusToast])

  useEffect(() => {
    if (saveStatus !== 'saved') return
    const timeout = window.setTimeout(() => setSaveStatus('idle'), 1800)
    return () => window.clearTimeout(timeout)
  }, [saveStatus])

  useEffect(() => { localStorage.setItem('vnTextSpeed', textSpeed) }, [textSpeed])
  useEffect(() => { localStorage.setItem('vnAutoAdvance', String(autoAdvance)) }, [autoAdvance])

  useEffect(() => () => {
    stopAudio(audioRef, audioTokenRef)
    if (audioBlobUrlRef.current) {
      URL.revokeObjectURL(audioBlobUrlRef.current)
      audioBlobUrlRef.current = null
    }
  }, [])

  useEffect(() => {
    if (loadState !== 'loading') return
    const timeout = window.setTimeout(() => setLoadingSlow(true), 6000)
    return () => {
      window.clearTimeout(timeout)
    }
  }, [loadState])

  const persistWorldSave = useCallback(async (nextSave: VisualNovelWorldSave) => {
    setWorldSave(nextSave)
    setSaveStatus('saving')
    await saveVisualNovelWorldSave(nextSave)
    setSaveStatus('saved')
  }, [])

  const handleSelectToken = useCallback((token: ReaderWordToken | null) => {
    setSelectedToken(token)
    setDictionaryEntry(null)
    if (token && !token.word && token.isChinese) {
      lookupDictionary(token.text).then((entry) => setDictionaryEntry(entry ?? null)).catch(console.error)
    }
  }, [])

  const handleSaveWord = useCallback(async (text: string, pinyin: string, meaning: string) => {
    const now = new Date().toISOString()
    await upsertWords([
      {
        id: crypto.randomUUID(),
        word: text,
        meaning,
        pinyin,
        status: 'learning',
        seenCount: 0,
        correctCount: 0,
        wrongCount: 0,
        listenedSeconds: 0,
        createdAt: now,
        updatedAt: now,
      },
    ])
    await onWordsChanged()
  }, [onWordsChanged])

  const startQuest = useCallback(async (quest: VnQuestDefinition) => {
    if (!world || !worldSave) return
    const script = scripts[quest.scriptId]
    if (!script) return
    stopAudio(audioRef, audioTokenRef)
    const { worldSave: nextWorldSave, questSave: nextQuestSave } = startWorldQuest(world, worldSave, quest, script)
    await saveVisualNovelSave(nextQuestSave)
    await persistWorldSave(nextWorldSave)
    setActiveQuestId(quest.id)
    setQuestSave(nextQuestSave)
    setShowEnglish(false)
    setSelectedToken(null)
    setDictionaryEntry(null)
  }, [persistWorldSave, scripts, world, worldSave])

  const resumeInterruptedQuest = useCallback(async () => {
    if (!world || !worldSave?.interruptedQuest) return
    const quest = world.quests[worldSave.interruptedQuest.questId]
    if (!quest) return
    const script = scripts[quest.scriptId]
    const save = script ? await getVisualNovelSave(script.packId, script.id) : undefined
    if (save) {
      setActiveQuestId(quest.id)
      setQuestSave(save)
      return
    }
    await startQuest(quest)
  }, [scripts, startQuest, world, worldSave])

  const handleWorldAction = useCallback(async (action: VnWorldAction) => {
    if (!world || !worldSave) return
    if (action.kind === 'travel') {
      if (!world.locations[action.targetId] || !worldSave.state.unlockedLocations.includes(action.targetId)) return
      await persistWorldSave({
        ...worldSave,
        state: { ...worldSave.state, currentLocationId: action.targetId },
        updatedAt: new Date().toISOString(),
      })
      return
    }
    if (action.kind === 'quest') {
      const quest = world.quests[action.targetId]
      if (quest) await startQuest(quest)
      return
    }
    if (action.kind === 'encounterPool') {
      const pool = world.encounterPools?.[action.targetId]
      const quest = pool ? nextEncounterQuest(world, worldSave, pool) : undefined
      if (quest) await startQuest(quest)
    }
  }, [persistWorldSave, startQuest, world, worldSave])

  const handleQuestAdvance = useCallback(async (choiceId?: string) => {
    if (!activeScript || !questSave || result) return
    stopAudio(audioRef, audioTokenRef)
    const nextSave = advanceVisualNovel(activeScript, questSave, choiceId)
    if (nextSave !== questSave) {
      setShowEnglish(false)
      setSelectedToken(null)
      setDictionaryEntry(null)
      setQuestSave(nextSave)
      await saveVisualNovelSave(nextSave)
    }
  }, [activeScript, questSave, result])

  const handleQuestBack = useCallback(async () => {
    if (!questSave) return
    stopAudio(audioRef, audioTokenRef)
    const nextSave = goBackVisualNovel(questSave)
    if (nextSave !== questSave) {
      setShowEnglish(false)
      setSelectedToken(null)
      setDictionaryEntry(null)
      setQuestSave(nextSave)
      await saveVisualNovelSave(nextSave)
    }
  }, [questSave])

  const handleAbandonQuest = useCallback(async () => {
    if (!worldSave) return
    stopAudio(audioRef, audioTokenRef)
    await persistWorldSave(abandonWorldQuest(worldSave))
    setActiveQuestId(null)
    setQuestSave(null)
    setStatusToast('Quest paused without rewards.')
  }, [persistWorldSave, worldSave])

  const handleCommitResult = useCallback(async (questResult: VnQuestResult) => {
    if (!world || !worldSave || !activeQuest || !activeScript) return
    let nextWorldSave = commitQuestResult(world, worldSave, activeQuest, questResult)
    const encounter = questSave?.activeEncounter
    if (encounter && encounter.status === 'victory') {
      nextWorldSave = {
        ...nextWorldSave,
        state: {
          ...nextWorldSave.state,
          playerHp: encounter.playerHp,
          playerDeck: encounter.deck,
        },
      }
    }
    await persistWorldSave(nextWorldSave)
    await deleteVisualNovelSave(activeScript.packId, activeScript.id)
    setActiveQuestId(null)
    setQuestSave(null)
    setStatusToast(questResult.completed ? 'Quest result committed.' : 'Quest can be recovered.')
  }, [activeQuest, activeScript, persistWorldSave, questSave, world, worldSave])

  const handleBattleStateUpdate = useCallback(async (battleState: CardBattlerState) => {
    if (!questSave) return
    const nextSave: VisualNovelSave = { ...questSave, activeEncounter: battleState, updatedAt: new Date().toISOString() }
    setQuestSave(nextSave)
    await saveVisualNovelSave(nextSave)
  }, [questSave])

  const handleRestartConfirm = useCallback(async () => {
    if (!world || !worldSave) return
    setShowRestartConfirm(false)
    stopAudio(audioRef, audioTokenRef)
    if (worldSave.interruptedQuest) {
      const quest = world.quests[worldSave.interruptedQuest.questId]
      if (quest) {
        const script = scripts[quest.scriptId]
        if (script) await deleteVisualNovelSave(script.packId, script.id).catch(() => {})
      }
    }
    const freshSave = restartWorldWithStats(world, worldSave)
    await persistWorldSave(freshSave)
    setActiveQuestId(null)
    setQuestSave(null)
    setStatusToast('Story restarted. Stats preserved.')
  }, [persistWorldSave, scripts, world, worldSave])

  const playCurrentAudio = useCallback(async () => {
    if (!node) return
    const text = getNodeText(node)?.chinese ?? ''
    const audioClipId = getNodeAudioClipId(node, readerSentenceById)
    const token = audioTokenRef.current + 1
    audioTokenRef.current = token
    stopAudio(audioRef, audioTokenRef, token)
    if (audioBlobUrlRef.current) {
      URL.revokeObjectURL(audioBlobUrlRef.current)
      audioBlobUrlRef.current = null
    }
    if (audioClipId) {
      const clip = await getAudioClip(audioClipId)
      if (clip && audioTokenRef.current === token) {
        const url = URL.createObjectURL(clip.blob)
        audioBlobUrlRef.current = url
        const audio = new Audio(url)
        audio.playbackRate = playbackRate
        audioRef.current = audio
        await new Promise<void>((resolve) => {
          audio.addEventListener('ended', () => resolve(), { once: true })
          audio.addEventListener('error', () => resolve(), { once: true })
          audio.play().catch(() => resolve())
        })
        URL.revokeObjectURL(url)
        audioBlobUrlRef.current = null
        if (audioRef.current === audio) audioRef.current = null
        return
      }
    }
    if (text && 'speechSynthesis' in window && audioTokenRef.current === token) {
      await speakUtterance(text, playbackRate)
    }
  }, [node, playbackRate, readerSentenceById])

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      const target = event.target
      const isTyping =
        target instanceof HTMLInputElement ||
        target instanceof HTMLSelectElement ||
        target instanceof HTMLTextAreaElement
      if (isTyping) return
      const pressed = event.key.toLocaleLowerCase()
      if (pressed === hotkeys.playPause && node) {
        event.preventDefault()
        void playCurrentAudio()
        return
      }
      if (!node) return
      if (node.type === 'choice') {
        let mappedIndex = [hotkeys.choiceA, hotkeys.choiceB].findIndex((key) => key === pressed)
        if (mappedIndex === -1 && pressed === 'arrowright') mappedIndex = 0
        const choice = choices[mappedIndex]
        if (choice) {
          event.preventDefault()
          void handleQuestAdvance(choice.id)
        }
      } else if (!result && (pressed === hotkeys.choiceA || pressed === 'arrowright' || event.key === 'Enter' || event.key === ' ')) {
        event.preventDefault()
        void handleQuestAdvance()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [choices, handleQuestAdvance, hotkeys, node, playCurrentAudio, result])

  const backgroundId = getLocationBackgroundId(location, worldSave)
  const background = manifest && backgroundId ? manifest.backgrounds[backgroundId] : undefined

  return (
    <section
      className={`screen visual-novel-screen vn-world-screen reader-theme-${readerTheme}`}
      style={{
        '--reader-font-scale': 1,
        '--reader-line-height': 1.5,
      } as CSSProperties}
    >
      <div className="screen-heading compact vn-heading">
        <div>
          <h1>{world?.title ?? 'Visual Novel World'}</h1>
          <p>{world?.description?.english ?? 'Persistent story world with Adaptive Chinese text.'}</p>
        </div>
        <div className="vn-heading-actions">
          {worldIndex.length > 1 && (
            <select value={selectedWorldId ?? ''} onChange={(event) => setSelectedWorldId(event.target.value)}>
              {worldIndex.map((entry) => (
                <option key={entry.id} value={entry.id}>{entry.title}</option>
              ))}
            </select>
          )}
          <button type="button" onClick={onReturnToReader}>Return to Reader</button>
        </div>
      </div>

      {loadState === 'loading' && (
        <section className="vn-empty">
          <h2>Loading world...</h2>
          <p>{loadingStep}</p>
          {loadingSlow && (
            <>
              <p>
                This is taking longer than expected. The installed PWA may still have stale story
                cache data.
              </p>
              <div className="button-group">
                <button type="button" onClick={() => setReloadKey((key) => key + 1)}>
                  Try again
                </button>
                <button type="button" onClick={resetPwaShell}>
                  Reset app shell cache
                </button>
                <button type="button" onClick={() => window.location.reload()}>
                  Reload
                </button>
              </div>
            </>
          )}
        </section>
      )}
      {loadState === 'empty' && <section className="vn-empty">No Visual Novel worlds are published yet.</section>}
      {loadState === 'error' && (
        <section className="vn-empty">
          <h2>Visual Novel world could not load.</h2>
          <p>{message}</p>
          <div className="button-group">
            <button type="button" onClick={() => setReloadKey((key) => key + 1)}>
              Try again
            </button>
            <button type="button" onClick={async () => {
              if (selectedWorldId) await deleteVisualNovelWorldSave(selectedWorldId).catch(console.warn)
              setReloadKey((key) => key + 1)
            }}>
              Clear VN save
            </button>
            <button type="button" onClick={resetPwaShell}>
              Reset app shell cache
            </button>
          </div>
        </section>
      )}

      {loadState === 'ready' && world && worldSave && manifest && (
        activeQuest && activeScript && questSave && node ? (
          <QuestPlayer
            world={world}
            quest={activeQuest}
            save={questSave}
            node={node}
            result={result}
            choices={choices}
            manifest={manifest}
            worldSave={worldSave}
            words={words}
            displayTokens={displayTokens}
            selectedToken={selectedToken}
            pinyinMode={pinyinMode}
            showEnglish={showEnglish}
            textSpeed={textSpeed}
            autoAdvance={autoAdvance}
            onSelectToken={handleSelectToken}
            onToggleEnglish={() => setShowEnglish((value) => !value)}
            onBack={handleQuestBack}
            onAdvance={handleQuestAdvance}
            onCommitResult={handleCommitResult}
            onAbandon={handleAbandonQuest}
            onReplay={playCurrentAudio}
            onBattleStateUpdate={handleBattleStateUpdate}
            onShowMap={() => setShowMap(true)}
            onShowSettings={() => setShowSettings(true)}
            hotkeys={hotkeys}
          />
        ) : (
          <div className="vn-fullscreen">
            <div className="vn-fullscreen-stage" aria-label="World location">
              {background ? (
                <img className="vn-background" src={visualNovelAssetSrc(background.src)} alt={background.alt} />
              ) : (
                <div className="vn-background vn-background-fallback" aria-label="Neutral background" />
              )}
              {castMembers.map((member) => {
                const sprite = manifest.sprites[member.spriteId]
                if (!sprite) return null
                const index = castMembers.indexOf(member)
                const positions = ['vn-sprite-left', 'vn-sprite-center', 'vn-sprite-right'] as const
                const posClass = positions[index % positions.length]
                const spriteScale = sprite.defaultScale ?? 0.74
                const spriteWidth = `${Math.round(sprite.width * spriteScale)}px`
                return (
                  <div
                    key={`${member.characterId}:${member.spriteId}`}
                    className={`vn-sprite ${posClass}${member.talkQuest ? ' vn-sprite-interactive' : ''}`}
                    style={{ '--vn-sprite-width': spriteWidth } as React.CSSProperties}
                    role={member.talkQuest ? 'button' : undefined}
                    tabIndex={member.talkQuest ? 0 : undefined}
                    onClick={member.talkQuest ? () => handleWorldAction({
                      id: `talk-${member.talkQuest!.id}`,
                      kind: 'quest',
                      targetId: member.talkQuest!.id,
                      label: member.talkQuest!.hubLabel ?? member.talkQuest!.title,
                    }) : undefined}
                    onKeyDown={member.talkQuest ? (e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault()
                        handleWorldAction({
                          id: `talk-${member.talkQuest!.id}`,
                          kind: 'quest',
                          targetId: member.talkQuest!.id,
                          label: member.talkQuest!.hubLabel ?? member.talkQuest!.title,
                        })
                      }
                    } : undefined}
                  >
                    <img src={visualNovelAssetSrc(sprite.src)} alt={sprite.alt ?? member.name} />
                  </div>
                )
              })}
            </div>
            <div className="vn-subtitle-overlay">
              <WorldHub
                world={world}
                save={worldSave}
                location={location}
                manifest={manifest}
                words={words}
                selectedToken={selectedToken}
                pinyinMode={pinyinMode}
                showEnglish={showEnglish}
                onSelectToken={handleSelectToken}
                onAction={handleWorldAction}
              />
            </div>
            <div className="vn-bottom-bar">
              <button type="button" className={`vn-bar-btn vn-bar-btn-english${showEnglish ? ' vn-bar-btn-active' : ''}`} onClick={() => setShowEnglish((v) => !v)} title="Toggle English">
                <span className="vn-bar-icon-text">E</span>
              </button>
              <button type="button" className="vn-bar-btn" onClick={() => setShowMap(true)} title="Map">
                <span className="vn-bar-icon">{'\u{1F5FA}\uFE0F'}</span>
              </button>
              <button type="button" className="vn-bar-btn" onClick={() => setShowInventory(true)} title="Inventory">
                <span className="vn-bar-icon">{'\u{1F6E1}\uFE0F'}</span>
              </button>
              <button type="button" className="vn-bar-btn" onClick={() => setShowJournal(true)} title="Journal">
                <span className="vn-bar-icon">{'\u{1F4D6}'}</span>
              </button>
              {worldSave.interruptedQuest && (
                <button type="button" className="vn-bar-btn vn-bar-btn-primary" onClick={() => void resumeInterruptedQuest()} title="Resume quest">
                  <span className="vn-bar-label">Resume</span>
                </button>
              )}
              <button type="button" className="vn-bar-btn vn-bar-btn-ghost" onClick={onReturnToReader} title="Return to Reader">
                <span className="vn-bar-icon">{'\u25C0\uFE0F'}</span>
              </button>
              <button type="button" className="vn-bar-btn vn-bar-btn-gear" onClick={() => setShowSettings(true)} title="Settings">
                <span className="vn-bar-icon">{'\u2699\uFE0F'}</span>
              </button>
            </div>
          </div>
        )
      )}

      {statusToast && <div className="vn-status-toast" role="status">{statusToast}</div>}

      {showMap && world && worldSave && (
        <div className="vn-map-overlay" onClick={() => setShowMap(false)}>
          <div className="vn-map-overlay-panel" onClick={(e) => e.stopPropagation()}>
            <div className="vn-map-overlay-header">
              <h3>World Map</h3>
              <button type="button" onClick={() => setShowMap(false)}>Close</button>
            </div>
            <div className="vn-map-overlay-body">
              <svg className="vn-map-svg vn-map-svg-large" viewBox="0 0 100 100" preserveAspectRatio="xMidYMid meet">
                {MAP_CONNECTIONS.map(([a, b]) => {
                  const la = MAP_LAYOUT[a]
                  const lb = MAP_LAYOUT[b]
                  if (!la || !lb) return null
                  const bothUnlocked = worldSave.state.unlockedLocations.includes(a) && worldSave.state.unlockedLocations.includes(b)
                  return (
                    <line
                      key={`${a}-${b}`}
                      x1={la.x} y1={la.y} x2={lb.x} y2={lb.y}
                      className={`vn-map-path ${bothUnlocked ? 'vn-map-path-unlocked' : ''}`}
                    />
                  )
                })}
                {Object.entries(MAP_LAYOUT).map(([locId, pos]) => {
                  const isUnlocked = worldSave.state.unlockedLocations.includes(locId)
                  const isCurrent = location?.id === locId
                  const canTravel = isUnlocked && !isCurrent
                  return (
                    <g key={locId} className={`vn-map-node ${isCurrent ? 'vn-map-current' : ''} ${isUnlocked ? 'vn-map-unlocked' : 'vn-map-locked'}`}>
                      <circle cx={pos.x} cy={pos.y} r={isCurrent ? 6 : 4} />
                      <text x={pos.x} y={pos.y - 8} textAnchor="middle" className="vn-map-label">{pos.label}</text>
                      {canTravel && (
                        <rect
                          x={pos.x - 12} y={pos.y - 3} width={24} height={6} rx={3}
                          className="vn-map-travel-btn"
                          onClick={() => {
                            void handleWorldAction({ id: `travel-${locId}`, kind: 'travel', targetId: locId, label: world.locations[locId]?.name ?? { chinese: locId } })
                            setShowMap(false)
                          }}
                          style={{ cursor: 'pointer' }}
                        />
                      )}
                      {canTravel && (
                        <text x={pos.x} y={pos.y + 1.5} textAnchor="middle" className="vn-map-travel-label">Go</text>
                      )}
                    </g>
                  )
                })}
              </svg>
            </div>
          </div>
        </div>
      )}

      {showInventory && world && worldSave && (
        <div className="vn-inventory-overlay" onClick={() => setShowInventory(false)}>
          <div className="vn-inventory-panel" onClick={(e) => e.stopPropagation()}>
            <div className="vn-inventory-header">
              <h3>Status & Inventory</h3>
              <button type="button" onClick={() => setShowInventory(false)}>Close</button>
            </div>
            <WorldStatusPanel world={world} save={worldSave} onRestart={() => { setShowInventory(false); setShowRestartConfirm(true) }} />
          </div>
        </div>
      )}

      {showRestartConfirm && (
        <div className="vn-inventory-overlay" onClick={() => setShowRestartConfirm(false)}>
          <div className="vn-confirm-dialog" onClick={(e) => e.stopPropagation()}>
            <h3>Restart Story?</h3>
            <p>All quest progress will reset to the beginning. Your gold, skills, HP, and deck will be kept.</p>
            <div className="vn-confirm-actions">
              <button type="button" className="vn-confirm-cancel" onClick={() => setShowRestartConfirm(false)}>Cancel</button>
              <button type="button" className="vn-confirm-restart" onClick={() => void handleRestartConfirm()}>Restart</button>
            </div>
          </div>
        </div>
      )}

      {showSettings && (
        <div className="vn-inventory-overlay" onClick={() => setShowSettings(false)}>
          <div className="vn-settings-panel" onClick={(e) => e.stopPropagation()}>
            <div className="vn-inventory-header">
              <h3>Settings</h3>
              <button type="button" onClick={() => setShowSettings(false)}>Close</button>
            </div>
            <div className="vn-settings-body">
              <label className="vn-setting-row">
                <span className="vn-setting-label">Text Speed</span>
                <select
                  value={textSpeed}
                  onChange={(e) => setTextSpeed(e.target.value as VnTextSpeed)}
                >
                  <option value="slow">Slow</option>
                  <option value="normal">Normal</option>
                  <option value="fast">Fast</option>
                  <option value="instant">Instant</option>
                </select>
              </label>
              <label className="vn-setting-row">
                <span className="vn-setting-label">Auto-Advance</span>
                <input
                  type="checkbox"
                  checked={autoAdvance}
                  onChange={(e) => setAutoAdvance(e.target.checked)}
                />
              </label>
            </div>
          </div>
        </div>
      )}

      {showJournal && world && worldSave && (
        <div className="vn-inventory-overlay" onClick={() => setShowJournal(false)}>
          <div className="vn-journal-panel" onClick={(e) => e.stopPropagation()}>
            <div className="vn-inventory-header">
              <h3>Quest Journal</h3>
              <button type="button" onClick={() => setShowJournal(false)}>Close</button>
            </div>
            <div className="vn-journal-body">
              {(() => {
                const active = activeWorldQuests(world, worldSave).filter((q) => q.category !== 'rumour')
                const completed = completedWorldQuests(world, worldSave).filter((q) => q.category !== 'rumour')
                return (
                  <>
                    {active.length > 0 && (
                      <section className="vn-journal-section">
                        <h4>Active Quests</h4>
                        {active.map((quest) => (
                          <div key={quest.id} className="vn-journal-entry">
                            <strong>{quest.title.english ?? quest.id}</strong>
                            {quest.title.chinese && <span className="vn-journal-cn">{quest.title.chinese}</span>}
                            {quest.objective?.english && <p>{quest.objective.english}</p>}
                            {quest.description?.english && <small>{quest.description.english}</small>}
                          </div>
                        ))}
                      </section>
                    )}
                    {completed.length > 0 && (
                      <section className="vn-journal-section">
                        <h4>Completed</h4>
                        {completed.map((quest) => (
                          <div key={quest.id} className="vn-journal-entry vn-journal-completed">
                            <strong>{quest.title.english ?? quest.id}</strong>
                            {quest.title.chinese && <span className="vn-journal-cn">{quest.title.chinese}</span>}
                          </div>
                        ))}
                      </section>
                    )}
                    {active.length === 0 && completed.length === 0 && (
                      <p className="vn-journal-empty">No quests discovered yet.</p>
                    )}
                  </>
                )
              })()}
            </div>
          </div>
        </div>
      )}

      {saveStatus !== 'idle' && (
        <div className={`vn-save-indicator ${saveStatus === 'saved' ? 'vn-save-saved' : ''}`} role="status">
          {saveStatus === 'saving' ? 'Saving...' : 'Saved'}
        </div>
      )}

      {selectedToken && (
        <WordInfoPopover
          selectedToken={selectedToken}
          dictionaryEntry={dictionaryEntry}
          onClose={() => handleSelectToken(null)}
          onEditWord={onEditWord}
          onSaveWord={handleSaveWord}
          formatDueDate={formatDueDate}
        />
      )}
    </section>
  )
}

function resetPwaShell() {
  const url = new URL(window.location.href)
  url.searchParams.set('resetPwa', '1')
  window.location.assign(url.toString())
}

function withTimeout<T>(promise: Promise<T>, timeoutMs: number, message: string): Promise<T> {
  return new Promise((resolve, reject) => {
    const timeout = window.setTimeout(() => reject(new Error(message)), timeoutMs)
    promise
      .then(resolve)
      .catch(reject)
      .finally(() => window.clearTimeout(timeout))
  })
}
