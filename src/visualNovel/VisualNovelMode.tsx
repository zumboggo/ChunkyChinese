import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { CSSProperties, MutableRefObject } from 'react'
import { CardBattlerMode } from '../cardBattler/CardBattlerMode'
import { createEncounter } from '../cardBattler/engine'
import type { CardBattlerState } from '../cardBattler/types'
import { AdaptiveChineseText } from '../AdaptiveChineseText'
import { WordInfoPopover } from '../WordInfoPopover'
import { tokenizeReaderText, type AdaptivePinyinMode } from '../adaptiveText'
import { getAudioClip, lookupDictionary, upsertWords } from '../db'
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
  makeVisualNovelSave,
  restartVisualNovel,
} from './engine'
import {
  loadVisualNovelAssetManifest,
  loadVisualNovelIndex,
  loadVisualNovelScript,
  visualNovelAssetSrc,
} from './loader'
import {
  deleteVisualNovelSave,
  getVisualNovelSave,
  saveVisualNovelSave,
} from './storage'
import { validateVisualNovelScript } from './validator'
import type {
  VisualNovelSave,
  VnAssetManifest,
  VnChoice,
  VnIndexEntry,
  VnNode,
  VnSceneCharacter,
  VnScript,
  VnState,
  VnText,
} from './types'

interface VisualNovelModeProps {
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

export function VisualNovelMode({
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
}: VisualNovelModeProps) {
  const [index, setIndex] = useState<VnIndexEntry[]>([])
  const [selectedEntryId, setSelectedEntryId] = useState<string | undefined>()
  const [script, setScript] = useState<VnScript | null>(null)
  const [manifest, setManifest] = useState<VnAssetManifest | null>(null)
  const [save, setSave] = useState<VisualNovelSave | null>(null)
  const [loadState, setLoadState] = useState<'loading' | 'ready' | 'empty' | 'error'>('loading')
  const [message, setMessage] = useState<string | null>(null)
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
        for (const sentence of story.sentences) {
          sentences.set(sentence.id, sentence)
        }
      }
    }
    return sentences
  }, [readerBooks])

  useEffect(() => {
    let cancelled = false
    async function loadIndex() {
      setLoadState('loading')
      const nextIndex = await loadVisualNovelIndex()
      if (cancelled) return
      setIndex(nextIndex)
      setSelectedEntryId((current) => current ?? nextIndex[0]?.id)
      setLoadState(nextIndex.length > 0 ? 'loading' : 'empty')
    }
    void loadIndex()
    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    if (!selectedEntryId) return
    const entry = index.find((item) => item.id === selectedEntryId)
    if (!entry) return
    const storyEntry = entry
    let cancelled = false
    async function loadStory() {
      try {
        setLoadState('loading')
        setMessage(null)
        setSelectedToken(null)
        setDictionaryEntry(null)
        const nextScript = await loadVisualNovelScript(storyEntry)
        const nextManifest = await loadVisualNovelAssetManifest(nextScript)
        const readerIds = new Set(readerSentenceById.keys())
        const validation = validateVisualNovelScript(nextScript, nextManifest, readerIds)
        if (validation.errors.length > 0) {
          throw new Error(validation.errors[0])
        }
        if (validation.warnings.length > 0) {
          console.warn('Visual Novel validation warnings', validation.warnings)
        }
        const existingSave = await getVisualNovelSave(nextScript.packId, nextScript.id)
        const usableSave =
          existingSave &&
          existingSave.contentVersion === nextScript.contentVersion &&
          Boolean(nextScript.nodes[existingSave.currentNodeId])
            ? existingSave
            : makeVisualNovelSave(nextScript)
        if (!existingSave || existingSave !== usableSave) {
          await saveVisualNovelSave(usableSave)
        }
        if (cancelled) return
        setScript(nextScript)
        setManifest(nextManifest)
        setSave(usableSave)
        setShowEnglish(false)
        setLoadState('ready')
      } catch (error) {
        console.error(error)
        if (cancelled) return
        setScript(null)
        setManifest(null)
        setSave(null)
        setLoadState('error')
        setMessage(error instanceof Error ? error.message : 'Visual Novel failed to load.')
      }
    }
    void loadStory()
    return () => {
      cancelled = true
    }
  }, [index, readerSentenceById, selectedEntryId])

  const node = script && save ? currentVisualNovelNode(script, save) : undefined
  const choices = useMemo(
    () => (script && save ? availableChoices(script, save) : []),
    [script, save],
  )
  const displayText = node ? getDisplayText(node) : undefined
  const displayTokens = useMemo(
    () =>
      displayText
        ? scopedTokens(tokenizeReaderText(displayText.chinese, words), `vn-${save?.currentNodeId ?? 'line'}`)
        : [],
    [displayText, save?.currentNodeId, words],
  )

  useEffect(() => {
    if (statusToast === null) return
    const timeout = window.setTimeout(() => setStatusToast(null), 2400)
    return () => window.clearTimeout(timeout)
  }, [statusToast])

  useEffect(
    () => () => {
      stopAudio(audioRef, audioTokenRef)
    },
    [],
  )

  const persistSave = useCallback(async (nextSave: VisualNovelSave, previousState?: VnState) => {
    setSave(nextSave)
    setStatusToast(previousState ? describeStateChange(previousState, nextSave.state) : null)
    await saveVisualNovelSave(nextSave)
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

  const handleAdvance = useCallback(async (choiceId?: string) => {
    if (!script || !save) return
    stopAudio(audioRef, audioTokenRef)
    const previousState = save.state
    const nextSave = advanceVisualNovel(script, save, choiceId)
    if (nextSave !== save) {
      setShowEnglish(false)
      setSelectedToken(null)
      setDictionaryEntry(null)
      await persistSave(nextSave, previousState)
    }
  }, [persistSave, save, script])

  const handleBack = useCallback(async () => {
    if (!save) return
    stopAudio(audioRef, audioTokenRef)
    const nextSave = goBackVisualNovel(save)
    if (nextSave !== save) {
      setShowEnglish(false)
      setSelectedToken(null)
      setDictionaryEntry(null)
      setSave(nextSave)
      setStatusToast(null)
      await saveVisualNovelSave(nextSave)
    }
  }, [save])

  const handleBattleEnd = useCallback(async (battleState: CardBattlerState) => {
    if (!save || !script) return
    const nextSave = advanceVisualNovel(script, save, battleState.status === 'victory' ? 'win' : 'lose')
    nextSave.activeEncounter = undefined
    await persistSave(nextSave, save.state)
  }, [save, script, persistSave])

  const handleRestart = useCallback(async () => {
    if (!script) return
    stopAudio(audioRef, audioTokenRef)
    const nextSave = restartVisualNovel(script)
    setShowEnglish(false)
    setSelectedToken(null)
    setDictionaryEntry(null)
    setSave(nextSave)
    setStatusToast(null)
    await deleteVisualNovelSave(script.packId, script.id)
    await saveVisualNovelSave(nextSave)
  }, [script])

  const playCurrentAudio = useCallback(async () => {
    if (!node) return
    const text = getDisplayText(node)?.chinese ?? ''
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
      if (isTyping || !script || !save || !node) return
      const pressed = event.key.toLocaleLowerCase()
      if (pressed === hotkeys.playPause) {
        event.preventDefault()
        void playCurrentAudio()
        return
      }
      if (node.type === 'choice') {
        const mappedIndex = [hotkeys.choiceA, hotkeys.choiceB].findIndex((key) => key === pressed)
        const choice = choices[mappedIndex]
        if (choice) {
          event.preventDefault()
          void handleAdvance(choice.id)
        }
        return
      }
      if (pressed === hotkeys.choiceA || event.key === 'Enter' || event.key === ' ') {
        event.preventDefault()
        void handleAdvance()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [choices, handleAdvance, hotkeys, node, playCurrentAudio, save, script])

  const scene = save?.scene
  const background = manifest && scene?.backgroundId
    ? manifest.backgrounds[scene.backgroundId]
    : manifest?.fallbackBackgroundId
      ? manifest.backgrounds[manifest.fallbackBackgroundId]
      : undefined
  const cinematic = manifest && scene?.cinematicImageId
    ? manifest.cinematics[scene.cinematicImageId]
    : undefined

  return (
    <section
      className={`screen visual-novel-screen reader-theme-${readerTheme}`}
      style={{
        '--reader-font-scale': readerFontScale,
        '--reader-line-height': readerLineHeight,
      } as CSSProperties}
    >
      <div className="screen-heading compact vn-heading">
        <div>
          <h1>Visual Novel</h1>
          <p>{script?.title ?? 'Interactive story mode with Adaptive Chinese text.'}</p>
        </div>
        <div className="vn-heading-actions">
          {index.length > 1 && (
            <select
              value={selectedEntryId ?? ''}
              onChange={(event) => setSelectedEntryId(event.target.value)}
              aria-label="Visual Novel story"
            >
              {index.map((entry) => (
                <option key={entry.id} value={entry.id}>
                  {entry.title}
                </option>
              ))}
            </select>
          )}
          <button type="button" onClick={onReturnToReader}>
            Return to Reader
          </button>
        </div>
      </div>

      {loadState === 'loading' && <section className="vn-empty">Loading Visual Novel...</section>}
      {loadState === 'empty' && (
        <section className="vn-empty">
          <h2>No Visual Novels yet</h2>
          <p>Published scripts will appear from the reader pack once installed.</p>
        </section>
      )}
      {loadState === 'error' && (
        <section className="vn-empty">
          <h2>Could not load Visual Novel</h2>
          <p>{message}</p>
        </section>
      )}

      {loadState === 'ready' && script && save && node && manifest && (
        <>
          {node.type === 'cardBattle' ? (
            <CardBattlerMode
              initialState={
                save.activeEncounter ?? 
                createEncounter(
                  ['strike', 'strike', 'strike', 'defend', 'defend'], 
                  node.encounterId, 
                  script.enemies?.[node.encounterId]?.maxHp ?? 20, 
                  50
                )
              }
              enemyDef={script.enemies?.[node.encounterId] ?? { id: node.encounterId, name: { chinese: 'Enemy' }, maxHp: 20, intents: [] }}
              cards={script.cards ?? {}}
              words={words}
              pinyinMode={pinyinMode}
              hotkeys={hotkeys}
              onBattleEnd={handleBattleEnd}
              onSelectToken={handleSelectToken}
            />
          ) : (
            <>
              <section className="vn-workspace">
            <div className="vn-stage" aria-label="Visual Novel scene">
              {cinematic ? (
                <img
                  className="vn-cinematic"
                  src={visualNovelAssetSrc(cinematic.src)}
                  alt={node.type === 'cinematic' ? node.description : cinematic.alt}
                />
              ) : background ? (
                <img
                  className="vn-background"
                  src={visualNovelAssetSrc(background.src)}
                  alt={background.alt}
                />
              ) : (
                <div className="vn-background vn-background-fallback" aria-label="Neutral background" />
              )}

              {!cinematic && scene?.characters.map((character) => (
                <VisualNovelSprite
                  key={character.slotId ?? `${character.characterId}:${character.position}`}
                  character={character}
                  manifest={manifest}
                />
              ))}
            </div>

            <aside className="vn-status-panel" aria-label="Visual Novel status">
              <div>
                <span>Money</span>
                <strong>{save.state.money}</strong>
              </div>
              {Object.entries(save.state.skills).map(([skill, value]) => (
                <div key={skill}>
                  <span>{skillLabel(skill)}</span>
                  <strong>{value}</strong>
                </div>
              ))}
              {Object.values(save.state.questNotes).filter((note) => note.status === 'active').slice(0, 1).map((note) => (
                <p key={note.id} className="vn-quest-note">
                  <strong>{note.title}</strong>
                  <span>{note.text}</span>
                </p>
              ))}
            </aside>
          </section>

          <section className="vn-dialogue-panel">
            <div className="vn-node-meta">
              <span>{speakerLabel(script, node)}</span>
              <span>{save.currentNodeId}</span>
            </div>

            {displayTokens.length > 0 && (
              <AdaptiveChineseText
                tokens={displayTokens}
                selectedToken={selectedToken}
                pinyinMode={pinyinMode}
                onSelectToken={handleSelectToken}
                className="reader-sentence vn-line"
              />
            )}

            {displayText?.english && (
              <p
                className={`reader-translation vn-translation ${showEnglish ? 'revealed' : 'blur-reveal'}`}
                onClick={() => setShowEnglish(true)}
              >
                {displayText.english}
              </p>
            )}

            {node.type === 'choice' && (
              <div className="vn-choice-list" aria-label="Choices">
                {choices.map((choice, index) => (
                  <VisualNovelChoiceRow
                    key={choice.id}
                    choice={choice}
                    index={index}
                    words={words}
                    selectedToken={selectedToken}
                    pinyinMode={pinyinMode}
                    hotkeys={hotkeys}
                    onSelectToken={handleSelectToken}
                    onChoose={() => handleAdvance(choice.id)}
                  />
                ))}
                {choices.length === 0 && <small>No available choices for the current state.</small>}
              </div>
            )}

            {statusToast && <div className="vn-status-toast" role="status">{statusToast}</div>}

            <div className="vn-controls">
              <button type="button" onClick={handleBack} disabled={save.history.length <= 1}>
                Back
              </button>
              <button type="button" onClick={playCurrentAudio}>
                Replay
              </button>
              <button type="button" onClick={() => setShowEnglish((value) => !value)}>
                English {showEnglish ? 'sharp' : 'blurred'}
              </button>
              {node.type !== 'choice' && node.type !== 'end' && (
                <button type="button" className="primary" onClick={() => handleAdvance()}>
                  <kbd>{hotkeys.choiceA.toUpperCase()}</kbd>
                  Next
                </button>
              )}
              {node.type === 'end' && (
                <button type="button" className="primary" onClick={handleRestart}>
                  Restart
                </button>
              )}
            </div>
          </section>

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
            </>
          )}
        </>
      )}
    </section>
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
        '--vn-sprite-width': `${Math.round(sprite.width * sprite.defaultScale)}px`,
        '--vn-anchor-x': `${sprite.anchorX}px`,
        '--vn-anchor-y': `${sprite.anchorY}px`,
      } as CSSProperties}
    >
      <img src={visualNovelAssetSrc(sprite.src)} alt={sprite.alt ?? character.characterId} />
    </div>
  )
}

function VisualNovelChoiceRow({
  choice,
  index,
  words,
  selectedToken,
  pinyinMode,
  hotkeys,
  onSelectToken,
  onChoose,
}: {
  choice: VnChoice
  index: number
  words: VocabWord[]
  selectedToken: ReaderWordToken | null
  pinyinMode: AdaptivePinyinMode
  hotkeys: HotkeySettings
  onSelectToken: (token: ReaderWordToken | null) => void
  onChoose: () => void | Promise<void>
}) {
  const tokens = useMemo(
    () => scopedTokens(tokenizeReaderText(choice.label.chinese, words), `choice-${choice.id}`),
    [choice.id, choice.label.chinese, words],
  )
  const keyLabel = index === 0 ? hotkeys.choiceA : index === 1 ? hotkeys.choiceB : undefined
  return (
    <div
      className={`vn-choice-row vn-choice-${choice.kind}`}
      role="button"
      tabIndex={0}
      onClick={onChoose}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault()
          void onChoose()
        }
      }}
    >
      {keyLabel && <kbd>{keyLabel.toUpperCase()}</kbd>}
      <div className="vn-choice-copy" onClick={(event) => event.stopPropagation()}>
        <AdaptiveChineseText
          tokens={tokens}
          selectedToken={selectedToken}
          pinyinMode={pinyinMode}
          onSelectToken={onSelectToken}
          className="reader-sentence vn-choice-text"
        />
        {choice.label.english && <small>{choice.label.english}</small>}
      </div>
      <button
        type="button"
        className="ghost-answer"
        onClick={(event) => {
          event.stopPropagation()
          void onChoose()
        }}
      >
        Choose
      </button>
    </div>
  )
}

function getDisplayText(node: VnNode): VnText | undefined {
  if (node.type === 'line') return node.text
  if (node.type === 'choice') return node.prompt
  if (node.type === 'cinematic') return node.caption
  if (node.type === 'cardBattle') return undefined
  return node.summary
}

function getNodeAudioClipId(
  node: VnNode,
  readerSentenceById: Map<string, ReaderSentence>,
): string | undefined {
  if (node.type === 'line' || node.type === 'cinematic') {
    if (node.audioClipId) return node.audioClipId
  }
  const readerSentenceId = getDisplayText(node)?.readerSentenceId
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

function speakerLabel(script: VnScript, node: VnNode): string {
  if (node.type === 'cinematic') return 'Cinematic'
  if (node.type === 'choice') return 'Choice'
  if (node.type === 'end') return 'Ending'
  if (node.type === 'questResult') return 'Quest Result'
  if (node.type === 'cardBattle') return 'Combat'
  if (!node.speaker) return 'Narration'
  const character = script.characters[node.speaker.characterId]
  const persona = node.speaker.personaId ? character?.personas[node.speaker.personaId] : undefined
  return (
    persona?.displayNames?.english ||
    character?.displayNames.english ||
    persona?.displayNames?.chinese ||
    character?.displayNames.chinese ||
    node.speaker.characterId
  )
}

function skillLabel(skill: string): string {
  return skill
    .split('-')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ')
}

function describeStateChange(previous: VnState, next: VnState): string | null {
  const messages: string[] = []
  const moneyDelta = next.money - previous.money
  if (moneyDelta !== 0) messages.push(`${moneyDelta > 0 ? '+' : ''}${moneyDelta} gold`)
  const skills = new Set([...Object.keys(previous.skills), ...Object.keys(next.skills)])
  for (const skill of skills) {
    const delta = (next.skills[skill] ?? 0) - (previous.skills[skill] ?? 0)
    if (delta !== 0) messages.push(`${skillLabel(skill)} ${delta > 0 ? '+' : ''}${delta}`)
  }
  for (const [id, note] of Object.entries(next.questNotes)) {
    if (!previous.questNotes[id]) messages.push(`Quest: ${note.title}`)
    if (previous.questNotes[id] && previous.questNotes[id].status !== note.status) {
      messages.push(`${note.title}: ${note.status}`)
    }
  }
  return messages.length > 0 ? messages.join(' · ') : null
}

function formatDueDate(value?: string): string {
  if (!value) return 'Unscheduled'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
}
