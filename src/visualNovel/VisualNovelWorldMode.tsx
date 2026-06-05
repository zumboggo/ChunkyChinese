import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { CSSProperties, MutableRefObject } from 'react'
import { AdaptiveChineseText } from '../AdaptiveChineseText'
import { WordInfoPopover } from '../WordInfoPopover'
import { tokenizeReaderText, type AdaptivePinyinMode } from '../adaptiveText'
import {
  deleteVisualNovelSave,
  getAudioClip,
  lookupDictionary,
  upsertWords,
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
import {
  getVisualNovelSave,
  getVisualNovelWorldSave,
  saveVisualNovelSave,
  saveVisualNovelWorldSave,
} from './storage'
import { validateVisualNovelWorld } from './worldValidator'
import { CardBattlerMode } from '../cardBattler/CardBattlerMode'
import { createEncounter } from '../cardBattler/engine'
import {
  abandonWorldQuest,
  activeWorldQuests,
  availableTravelLocations,
  availableWorldActions,
  commitQuestResult,
  completedWorldQuests,
  currentWorldLocation,
  makeVisualNovelWorldSave,
  nextEncounterQuest,
  startWorldQuest,
} from './worldEngine'
import type {
  VisualNovelSave,
  VisualNovelWorldSave,
  VnAssetManifest,
  VnChoice,
  VnLocation,
  VnNode,
  VnQuestDefinition,
  VnQuestResult,
  VnSceneCharacter,
  VnScript,
  VnText,
  VnWorld,
  VnWorldAction,
  VnWorldIndexEntry,
} from './types'

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
}

interface VnHubCastMember {
  characterId: string
  name: string
  spriteId: string
}

export function VisualNovelWorldMode({
  words,
  readerBooks,
  pinyinMode,
  readerTheme,
  readerFontScale,
  readerLineHeight,
  playbackRate,
  hotkeys,
  onEditWord,
  onWordsChanged,
  onReturnToReader,
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
  const [showEnglish, setShowEnglish] = useState(false)
  const [selectedToken, setSelectedToken] = useState<ReaderWordToken | null>(null)
  const [dictionaryEntry, setDictionaryEntry] = useState<DictionaryEntry | null>(null)
  const [statusToast, setStatusToast] = useState<string | null>(null)
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const audioTokenRef = useRef(0)

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
      setLoadState('loading')
      const nextIndex = await loadVisualNovelWorldIndex()
      if (cancelled) return
      setWorldIndex(nextIndex)
      setSelectedWorldId((current) => current ?? nextIndex[0]?.id)
      setLoadState(nextIndex.length > 0 ? 'loading' : 'empty')
    }
    void loadIndex()
    return () => {
      cancelled = true
    }
  }, [])

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
        const nextWorld = await loadVisualNovelWorld(selectedEntry)
        const nextManifest = await loadVisualNovelWorldAssetManifest(nextWorld)
        const nextScripts: Record<string, VnScript> = {}
        await Promise.all(
          Object.values(nextWorld.quests).map(async (quest) => {
            nextScripts[quest.scriptId] = await loadVisualNovelQuestScript(nextWorld, quest.scriptPath)
          }),
        )
        const validation = validateVisualNovelWorld(nextWorld, nextScripts, nextManifest)
        if (validation.errors.length > 0) throw new Error(validation.errors[0])
        if (validation.warnings.length > 0) console.info('Visual Novel world validation warnings', validation.warnings)
        const existingSave = await getVisualNovelWorldSave(nextWorld.id)
        const usableSave =
          existingSave &&
          existingSave.contentVersion === nextWorld.contentVersion &&
          Boolean(nextWorld.locations[existingSave.state.currentLocationId])
            ? existingSave
            : makeVisualNovelWorldSave(nextWorld)
        if (!existingSave || existingSave !== usableSave) await saveVisualNovelWorldSave(usableSave)
        if (cancelled) return
        setWorld(nextWorld)
        setManifest(nextManifest)
        setScripts(nextScripts)
        setWorldSave(usableSave)
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
  }, [selectedWorldId, worldIndex])

  const location = world && worldSave ? currentWorldLocation(world, worldSave) : undefined
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

  useEffect(
    () => () => {
      stopAudio(audioRef, audioTokenRef)
    },
    [],
  )

  useEffect(() => {
    if (loadState !== 'loading') return
    const resetTimeout = window.setTimeout(() => setLoadingSlow(false), 0)
    const timeout = window.setTimeout(() => setLoadingSlow(true), 6000)
    return () => {
      window.clearTimeout(resetTimeout)
      window.clearTimeout(timeout)
    }
  }, [loadState])

  const persistWorldSave = useCallback(async (nextSave: VisualNovelWorldSave) => {
    setWorldSave(nextSave)
    await saveVisualNovelWorldSave(nextSave)
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
    const nextWorldSave = commitQuestResult(world, worldSave, activeQuest, questResult)
    await persistWorldSave(nextWorldSave)
    await deleteVisualNovelSave(activeScript.packId, activeScript.id)
    setActiveQuestId(null)
    setQuestSave(null)
    setStatusToast(questResult.completed ? 'Quest result committed.' : 'Quest can be recovered.')
  }, [activeQuest, activeScript, persistWorldSave, world, worldSave])

  const playCurrentAudio = useCallback(async () => {
    if (!node) return
    const text = getNodeText(node)?.chinese ?? ''
    const audioClipId = getNodeAudioClipId(node, readerSentenceById)
    const token = audioTokenRef.current + 1
    audioTokenRef.current = token
    stopAudio(audioRef, audioTokenRef, token)
    if (audioClipId) {
      const clip = await getAudioClip(audioClipId)
      if (clip && audioTokenRef.current === token) {
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
        const mappedIndex = [hotkeys.choiceA, hotkeys.choiceB].findIndex((key) => key === pressed)
        const choice = choices[mappedIndex]
        if (choice) {
          event.preventDefault()
          void handleQuestAdvance(choice.id)
        }
      } else if (!result && (pressed === hotkeys.choiceA || event.key === 'Enter' || event.key === ' ')) {
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
        '--reader-font-scale': readerFontScale,
        '--reader-line-height': readerLineHeight,
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
          {loadingSlow && (
            <>
              <p>
                This is taking longer than expected. The installed PWA may still have stale story
                cache data.
              </p>
              <div className="button-group">
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
      {loadState === 'error' && <section className="vn-empty">{message}</section>}

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
            onSelectToken={handleSelectToken}
            onToggleEnglish={() => setShowEnglish((value) => !value)}
            onBack={handleQuestBack}
            onAdvance={handleQuestAdvance}
            onCommitResult={handleCommitResult}
            onAbandon={handleAbandonQuest}
            onReplay={playCurrentAudio}
            hotkeys={hotkeys}
          />
        ) : (
          <>
            <section className="vn-workspace vn-world-workspace">
              <div className="vn-stage" aria-label="World location">
                {background ? (
                  <img className="vn-background" src={visualNovelAssetSrc(background.src)} alt={background.alt} />
                ) : (
                  <div className="vn-background vn-background-fallback" aria-label="Neutral background" />
                )}
              </div>
              <WorldStatusPanel world={world} save={worldSave} />
            </section>
              <WorldHub
                world={world}
                save={worldSave}
                location={location}
                manifest={manifest}
                words={words}
                selectedToken={selectedToken}
                pinyinMode={pinyinMode}
              onSelectToken={handleSelectToken}
              onAction={handleWorldAction}
              onResume={resumeInterruptedQuest}
            />
          </>
        )
      )}

      {statusToast && <div className="vn-status-toast" role="status">{statusToast}</div>}

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

function WorldHub({
  world,
  save,
  location,
  manifest,
  words,
  selectedToken,
  pinyinMode,
  onSelectToken,
  onAction,
  onResume,
}: {
  world: VnWorld
  save: VisualNovelWorldSave
  location?: VnLocation
  manifest: VnAssetManifest
  words: VocabWord[]
  selectedToken: ReaderWordToken | null
  pinyinMode: AdaptivePinyinMode
  onSelectToken: (token: ReaderWordToken | null) => void
  onAction: (action: VnWorldAction) => void | Promise<void>
  onResume: () => void | Promise<void>
}) {
  const description = getLocationDescription(location, save)
  const descriptionTokens = useMemo(
    () => scopedTokens(tokenizeReaderText(description?.chinese ?? '', words), `location-${location?.id ?? 'unknown'}`),
    [description?.chinese, location?.id, words],
  )
  const actions = availableWorldActions(world, save)
  const travelLocations = availableTravelLocations(world, save)
  const activeQuests = activeWorldQuests(world, save)
  const completedQuests = completedWorldQuests(world, save)
  const castMembers = useMemo(
    () => getHubCastMembers(world, location, manifest),
    [location, manifest, world],
  )

  return (
    <section className="vn-dialogue-panel vn-world-panel">
      <div className="vn-node-meta">
        <span>{location?.name.english ?? location?.id ?? 'Unknown location'}</span>
        <span>{location?.name.chinese}</span>
      </div>
      {descriptionTokens.length > 0 && (
        <AdaptiveChineseText
          tokens={descriptionTokens}
          selectedToken={selectedToken}
          pinyinMode={pinyinMode}
          onSelectToken={onSelectToken}
          className="reader-sentence vn-line"
        />
      )}
      {description?.english && <p className="reader-translation vn-translation revealed">{description.english}</p>}

      {castMembers.length > 0 && (
        <div className="vn-location-cast" aria-label="People here">
          {castMembers.map((member) => {
            const sprite = manifest.sprites[member.spriteId]
            if (!sprite) return null
            return (
              <figure key={`${member.characterId}:${member.spriteId}`}>
                <img src={visualNovelAssetSrc(sprite.src)} alt={sprite.alt ?? member.name} />
                <figcaption>{member.name}</figcaption>
              </figure>
            )
          })}
        </div>
      )}

      {save.interruptedQuest && (
        <button type="button" className="primary" onClick={onResume}>
          Resume interrupted quest
        </button>
      )}

      <div className="vn-world-grid">
        <section>
          <h2>Available</h2>
          <div className="vn-world-action-list">
            {actions.map((action) => (
              <button key={action.id} type="button" onClick={() => onAction(action)}>
                <strong>{action.label.english}</strong>
                <span>{action.label.chinese}</span>
              </button>
            ))}
            {actions.length === 0 && <small>No actions here yet.</small>}
          </div>
        </section>
        <section>
          <h2>Travel</h2>
          <div className="vn-world-action-list">
            {travelLocations.map((destination) => (
              <button
                key={destination.id}
                type="button"
                onClick={() => onAction({ id: `travel-${destination.id}`, kind: 'travel', targetId: destination.id, label: destination.name })}
              >
                <strong>{destination.name.english}</strong>
                <span>{destination.name.chinese}</span>
              </button>
            ))}
            {travelLocations.length === 0 && <small>No unlocked destinations.</small>}
          </div>
        </section>
        <section>
          <h2>Journal</h2>
          <div className="vn-journal-list">
            {activeQuests.map((quest) => (
              <p key={quest.id}>
                <strong>{quest.title.english}</strong>
                <span>{quest.objective?.english ?? quest.description?.english}</span>
              </p>
            ))}
            {completedQuests.slice(-3).map((quest) => (
              <p key={quest.id} className="completed">
                <strong>{quest.title.english}</strong>
                <span>Completed</span>
              </p>
            ))}
            {activeQuests.length === 0 && completedQuests.length === 0 && <small>No journal entries yet.</small>}
          </div>
        </section>
      </div>
    </section>
  )
}

function QuestPlayer({
  world,
  quest,
  save,
  node,
  result,
  choices,
  manifest,
  worldSave,
  words,
  displayTokens,
  selectedToken,
  pinyinMode,
  showEnglish,
  onSelectToken,
  onToggleEnglish,
  onBack,
  onAdvance,
  onCommitResult,
  onAbandon,
  onReplay,
  hotkeys,
}: {
  world: VnWorld
  quest: VnQuestDefinition
  save: VisualNovelSave
  node: VnNode
  result?: VnQuestResult
  choices: VnChoice[]
  manifest: VnAssetManifest
  worldSave: VisualNovelWorldSave
  words: VocabWord[]
  displayTokens: ReaderWordToken[]
  selectedToken: ReaderWordToken | null
  pinyinMode: AdaptivePinyinMode
  showEnglish: boolean
  onSelectToken: (token: ReaderWordToken | null) => void
  onToggleEnglish: () => void
  onBack: () => void | Promise<void>
  onAdvance: (choiceId?: string) => void | Promise<void>
  onCommitResult: (result: VnQuestResult) => void | Promise<void>
  onAbandon: () => void | Promise<void>
  onReplay: () => void | Promise<void>
  hotkeys: HotkeySettings
}) {
  const text = getNodeText(node)
  const background = save.scene.cinematicImageId
    ? undefined
    : save.scene.backgroundId
      ? manifest.backgrounds[save.scene.backgroundId]
      : undefined
  const cinematic = save.scene.cinematicImageId ? manifest.cinematics[save.scene.cinematicImageId] : undefined

  if (node.type === 'cardBattle') {
    return (
      <CardBattlerMode
        initialState={
          save.activeEncounter ?? 
          createEncounter(
            ['strike', 'strike', 'strike', 'defend', 'defend'], 
            node.encounterId, 
            world.enemies?.[node.encounterId]?.maxHp ?? 20, 
            50
          )
        }
        enemyDef={world.enemies?.[node.encounterId] ?? { id: node.encounterId, name: { chinese: 'Enemy' }, maxHp: 20, intents: [] }}
        cards={world.cards ?? {}}
        words={words}
        pinyinMode={pinyinMode}
        hotkeys={hotkeys}
        onBattleEnd={(state) => onAdvance(state.status === 'victory' ? 'win' : 'lose')}
        onSelectToken={onSelectToken}
      />
    )
  }

  return (
    <>
      <section className="vn-workspace">
        <div className="vn-stage" aria-label="Quest scene">
          {cinematic ? (
            <img className="vn-cinematic" src={visualNovelAssetSrc(cinematic.src)} alt={cinematic.alt} />
          ) : background ? (
            <img className="vn-background" src={visualNovelAssetSrc(background.src)} alt={background.alt} />
          ) : (
            <div className="vn-background vn-background-fallback" aria-label="Neutral background" />
          )}
          {!cinematic && save.scene.characters.map((character) => {
            return (
              <VisualNovelSprite
                key={character.slotId ?? `${character.characterId}:${character.position}`}
                character={character}
                manifest={manifest}
              />
            )
          })}
        </div>
        <WorldStatusPanel world={world} save={worldSave} />
      </section>
      <section className="vn-dialogue-panel">
        <div className="vn-node-meta">
          <span>{quest.title.english}</span>
          <span>{node.id}</span>
        </div>
        {displayTokens.length > 0 && (
          <AdaptiveChineseText
            tokens={displayTokens}
            selectedToken={selectedToken}
            pinyinMode={pinyinMode}
            onSelectToken={onSelectToken}
            className="reader-sentence vn-line"
          />
        )}
        {text?.english && (
          <p className={`reader-translation vn-translation ${showEnglish ? 'revealed' : 'blur-reveal'}`} onClick={onToggleEnglish}>
            {text.english}
          </p>
        )}
        {node.type === 'choice' && (
          <div className="vn-choice-list">
            {choices.map((choice, index) => (
              <button key={choice.id} type="button" className={`vn-world-choice vn-choice-${choice.kind}`} onClick={() => onAdvance(choice.id)}>
                {index < 2 && <kbd>{(index === 0 ? hotkeys.choiceA : hotkeys.choiceB).toUpperCase()}</kbd>}
                <span>{choice.label.chinese}</span>
                <small>{choice.label.english}</small>
              </button>
            ))}
          </div>
        )}
        {result && (
          <div className="vn-result-panel">
            <strong>{result.completed ? 'Quest complete' : 'Quest unresolved'}</strong>
            <button type="button" className="primary" onClick={() => onCommitResult(result)}>
              Return to world
            </button>
          </div>
        )}
        <div className="vn-controls">
          <button type="button" onClick={onBack} disabled={save.history.length <= 1 || Boolean(result)}>Back</button>
          <button type="button" onClick={onReplay}>Replay</button>
          <button type="button" onClick={onToggleEnglish}>English {showEnglish ? 'sharp' : 'blurred'}</button>
          {!result && node.type !== 'choice' && (
            <button type="button" className="primary" onClick={() => onAdvance()}>
              <kbd>{hotkeys.choiceA.toUpperCase()}</kbd>
              Next
            </button>
          )}
          <button type="button" className="ghost-answer" onClick={onAbandon}>Pause quest</button>
        </div>
      </section>
    </>
  )
}

function VisualNovelSprite({
  character,
  manifest,
}: {
  character: VnSceneCharacter
  manifest: VnAssetManifest
}) {
  const sprite = manifest.sprites[character.spriteId]
  if (!sprite || character.visible === false) return null
  return (
    <div
      className={`vn-sprite vn-sprite-${character.position}`}
      style={{
        '--vn-sprite-width': `${Math.round(sprite.width * (sprite.defaultScale ?? 0.74))}px`,
      } as CSSProperties}
    >
      <img src={visualNovelAssetSrc(sprite.src)} alt={sprite.alt ?? character.characterId} />
    </div>
  )
}

function getHubCastMembers(world: VnWorld, location: VnLocation | undefined, manifest: VnAssetManifest): VnHubCastMember[] {
  const characterIds = location?.npcIds ?? []
  return characterIds.flatMap((characterId) => {
    const character = world.characters?.[characterId]
    if (!character) return []
    const persona = Object.values(character.personas)[0]
    const spriteId = persona?.defaultSpriteId
    if (!spriteId || !manifest.sprites[spriteId]) return []
    return [{
      characterId,
      name: character.displayNames.english ?? character.displayNames.chinese ?? characterId,
      spriteId,
    }]
  })
}

function WorldStatusPanel({ world, save }: { world: VnWorld; save: VisualNovelWorldSave }) {
  const state = save.state
  return (
    <aside className="vn-status-panel" aria-label="World status">
      <div><span>Gold</span><strong>{state.money}</strong></div>
      <div><span>Sculpting</span><strong>{state.skills.sculpting ?? 0}</strong></div>
      <div><span>Swordsmanship</span><strong>{state.skills.swordsmanship ?? 0}</strong></div>
      {state.unlockedTitles[0] && <p className="vn-quest-note"><strong>Title</strong><span>{state.unlockedTitles[0]}</span></p>}
      <p className="vn-quest-note">
        <strong>{world.title}</strong>
        <span>{state.unlockedLocations.length} locations unlocked</span>
      </p>
    </aside>
  )
}

function getLocationBackgroundId(location: VnLocation | undefined, save: VisualNovelWorldSave | null): string | undefined {
  if (!location) return undefined
  if (location.restoredBackgroundId && save?.state.flags[`${location.id}-restored`] === true) {
    return location.restoredBackgroundId
  }
  return location.backgroundId
}

function getLocationDescription(location: VnLocation | undefined, save: VisualNovelWorldSave): VnText | undefined {
  if (!location) return undefined
  if (location.restoredDescription && save.state.flags[`${location.id}-restored`] === true) {
    return location.restoredDescription
  }
  return location.description
}

function getNodeText(node: VnNode): VnText | undefined {
  if (node.type === 'line') return node.text
  if (node.type === 'choice') return node.prompt
  if (node.type === 'cinematic') return node.caption
  if (node.type === 'questResult') return node.summary
  if (node.type === 'cardBattle') return undefined
  return node.summary
}

function getNodeAudioClipId(node: VnNode, readerSentenceById: Map<string, ReaderSentence>): string | undefined {
  if ((node.type === 'line' || node.type === 'cinematic') && node.audioClipId) return node.audioClipId
  const readerSentenceId = getNodeText(node)?.readerSentenceId
  return readerSentenceId ? readerSentenceById.get(readerSentenceId)?.audioClipId : undefined
}

function scopedTokens(tokens: ReaderWordToken[], prefix: string): ReaderWordToken[] {
  return tokens.map((token) => ({ ...token, id: `${prefix}-${token.id}` }))
}

function stopAudio(
  audioRef: MutableRefObject<HTMLAudioElement | null>,
  tokenRef: MutableRefObject<number>,
  nextToken = tokenRef.current + 1,
) {
  tokenRef.current = nextToken
  audioRef.current?.pause()
  audioRef.current = null
  window.speechSynthesis?.cancel()
}

function speakUtterance(text: string, rate: number): Promise<void> {
  return new Promise((resolve) => {
    const utterance = new SpeechSynthesisUtterance(text)
    utterance.rate = rate
    utterance.lang = /[\u3400-\u9fff]/u.test(text) ? 'zh-CN' : 'en-US'
    utterance.onend = () => resolve()
    utterance.onerror = () => resolve()
    window.speechSynthesis.speak(utterance)
  })
}

function formatDueDate(value?: string): string {
  if (!value) return 'Unscheduled'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
}
