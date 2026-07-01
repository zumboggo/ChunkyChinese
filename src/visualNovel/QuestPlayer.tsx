import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { AdaptiveChineseText } from '../AdaptiveChineseText'
import type { AdaptivePinyinMode } from '../adaptiveText'
import type { HotkeySettings, VocabWord } from '../types'
import type { ReaderWordToken } from '../types'
import type { CardBattlerState } from '../cardBattler/types'
import { CardBattlerMode } from '../cardBattler/CardBattlerMode'
import { createEncounter } from '../cardBattler/engine'
import { visualNovelAssetSrc } from './loader'
import type { VisualNovelSave, VisualNovelWorldSave, VnAssetManifest, VnAnimCommand, VnChoice, VnNode, VnQuestDefinition, VnQuestResult, VnSceneCharacter, VnWorld } from './types'
import { getNodeText, VN_DEFAULT_ENCOUNTER_DECK, VN_DEFAULT_ENEMY_MAX_HP, VN_DEFAULT_PLAYER_MAX_HP } from './utils'
import { VisualNovelSprite } from './VisualNovelSprite'
import { WorldStatusPanel } from './WorldStatusPanel'
import { resolveSpriteReference, visibleSceneCharacters, vnSceneLayoutClass } from './stageLayout'

type Mood = 'neutral' | 'angry' | 'happy' | 'surprised' | 'sad'

function detectMood(chinese: string): Mood {
  if (/[\uFF01!]/.test(chinese) && /[\u6740\u6B7B\u6253\u6012\u6068\u6EDA\u8BE5\u6076]/.test(chinese)) return 'angry'
  if (/[\uFF01!]/.test(chinese) && /[\u54C8\u54C7\u68D2\u597D\u5F00\u9AD8\u559C\u7B11]/.test(chinese)) return 'happy'
  if (/[\uFF1F?]/.test(chinese) && /[\u4EC0\u600E\u4E3A\u54EA\u8C01]/.test(chinese)) return 'surprised'
  if (/[\u54ED\u60B2\u4F24\u75DB\u6CEA\u60E8\u96BE]/.test(chinese)) return 'sad'
  if (/[\uFF01!]/.test(chinese)) return 'surprised'
  if (/[\u54C8\u563B\u7B11]/.test(chinese)) return 'happy'
  return 'neutral'
}

const MOOD_EXPRESSION_PREFERENCES: Record<Mood, string[]> = {
  neutral: [],
  angry: ['angry', 'annoyed', 'commanding', 'fierce-smile', 'stern', 'determined'],
  happy: ['smile', 'amused', 'relieved', 'gentle-smile', 'approving', 'cheerful', 'warm', 'confident', 'bright', 'energetic'],
  surprised: ['startled', 'alert', 'concerned', 'worried'],
  sad: ['worried', 'sick', 'exhausted', 'tired', 'concerned'],
}

const ANIM_DURATIONS: Record<string, number> = {
  bounce: 350, shake: 400, nod: 400, recoil: 450, leanIn: 500, squash: 350,
  enterLeft: 500, enterRight: 500, exitLeft: 400, exitRight: 400, fadeIn: 300, fadeOut: 300,
}

function animCommandCharId(cmd: VnAnimCommand, firstSceneChar?: string): string | undefined {
  return cmd.character ?? cmd.speaker ?? firstSceneChar
}

function resolveMoodSpriteId(
  manifest: VnAssetManifest,
  character: VnSceneCharacter,
  mood: Mood,
): string | undefined {
  for (const expressionId of MOOD_EXPRESSION_PREFERENCES[mood]) {
    const spriteId = resolveSpriteReference(manifest, character, expressionId)
    if (spriteId) return spriteId
  }
  return undefined
}

export type VnTextSpeed = 'slow' | 'normal' | 'fast' | 'instant'

const TEXT_SPEED_MS: Record<VnTextSpeed, number> = {
  slow: 120,
  normal: 60,
  fast: 30,
  instant: 0,
}

export function QuestPlayer({
  world,
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
  textSpeed,
  autoAdvance,
  onSelectToken,
  onToggleEnglish,
  onBack,
  onAdvance,
  onCommitResult,
  onAbandon,
  onReplay,
  onBattleStateUpdate,
  onShowMap,
  onShowSettings,
  hotkeys,
}: {
  world: VnWorld
  quest?: VnQuestDefinition
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
  textSpeed: VnTextSpeed
  autoAdvance: boolean
  onSelectToken: (token: ReaderWordToken | null) => void
  onToggleEnglish: () => void
  onBack: () => void | Promise<void>
  onAdvance: (choiceId?: string) => void | Promise<void>
  onCommitResult: (result: VnQuestResult) => void | Promise<void>
  onAbandon: () => void | Promise<void>
  onReplay: () => void | Promise<void>
  onBattleStateUpdate?: (state: CardBattlerState) => void
  onShowMap: () => void
  onShowSettings: () => void
  hotkeys: HotkeySettings
}) {
  const [showInventory, setShowInventory] = useState(false)
  const [visibleTokenCount, setVisibleTokenCount] = useState<number | undefined>(undefined)
  const [typewriterDone, setTypewriterDone] = useState(false)
  const typewriterTimersRef = useRef<ReturnType<typeof setTimeout>[]>([])
  const autoAdvanceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const prevNodeIdRef = useRef<string | null>(null)

  const text = getNodeText(node)
  const chineseText = text?.chinese ?? ''
  const background = save.scene.cinematicImageId
    ? undefined
    : save.scene.backgroundId
      ? manifest.backgrounds[save.scene.backgroundId]
      : undefined
  const cinematic = save.scene.cinematicImageId ? manifest.cinematics[save.scene.cinematicImageId] : undefined

  const speaker = useMemo(() => {
    if (node.type !== 'line' || !node.speaker) return undefined
    const character = world.characters?.[node.speaker.characterId]
    if (!character) return undefined
    return {
      english: character.displayNames.english ?? character.displayNames.chinese ?? node.speaker.characterId,
      chinese: character.displayNames.chinese,
    }
  }, [node, world.characters])

  const mood = useMemo(() => detectMood(chineseText), [chineseText])

  const animOverride = useMemo(() => {
    if (node.type !== 'line' || !node.animCommands?.length) return null
    const firstCharId = save.scene.characters[0]?.characterId
    let overrideSprite: string | undefined
    let overrideCharId: string | undefined
    for (const cmd of node.animCommands) {
      const charId = animCommandCharId(cmd, firstCharId)
      if (!charId) continue
      if ((cmd.type === 'expression' && cmd.value) || (cmd.type === 'dialogue' && cmd.expression)) {
        overrideSprite = cmd.value ?? cmd.expression
        overrideCharId = charId
      }
    }
    return overrideSprite && overrideCharId ? { spriteId: overrideSprite, charId: overrideCharId } : null
  }, [node, save.scene.characters])

  const moodSprites = useMemo(() => {
    if (node.type !== 'line') return save.scene.characters
    const moodTargetCharacterId = node.speaker?.characterId ?? save.scene.characters[0]?.characterId
    return save.scene.characters.map((char) => {
      let spriteId = char.spriteId
      if (animOverride?.spriteId && char.characterId === animOverride.charId) {
        spriteId = resolveSpriteReference(manifest, char, animOverride.spriteId) ?? spriteId
      } else if (char.characterId === moodTargetCharacterId) {
        spriteId = resolveMoodSpriteId(manifest, char, mood) ?? spriteId
      }
      return { ...char, spriteId }
    })
  }, [node, save.scene.characters, mood, manifest.sprites, animOverride])

  const sceneLayoutClass = useMemo(
    () => vnSceneLayoutClass(moodSprites, Boolean(cinematic)),
    [cinematic, moodSprites],
  )
  const visibleCharacterCount = visibleSceneCharacters(moodSprites).length

  const animClassMap = useMemo(() => {
    if (node.type !== 'line' || !node.animCommands?.length) return {}
    const firstCharId = save.scene.characters[0]?.characterId
    const map: Record<string, string> = {}
    for (const cmd of node.animCommands) {
      if (cmd.type !== 'animate' || !cmd.animation) continue
      const charId = animCommandCharId(cmd, firstCharId)
      if (!charId) continue
      const n = cmd.animation
      if (n in ANIM_DURATIONS || n.startsWith('enter') || n.startsWith('exit') || n.startsWith('fade')) {
        map[charId] = `vn-anim-${n}`
      }
    }
    return map
  }, [node, save.scene.characters])

  useEffect(() => {
    if (node.id !== prevNodeIdRef.current) {
      prevNodeIdRef.current = node.id
      for (const t of typewriterTimersRef.current) clearTimeout(t)
      typewriterTimersRef.current = []
      if (autoAdvanceRef.current) { clearTimeout(autoAdvanceRef.current); autoAdvanceRef.current = null }

      const msPerToken = TEXT_SPEED_MS[textSpeed]
      const totalTokens = displayTokens.length

      const setupTimer = setTimeout(() => {
        if (msPerToken === 0 || totalTokens === 0) {
          setVisibleTokenCount(undefined)
          setTypewriterDone(true)
        } else {
          setVisibleTokenCount(0)
          setTypewriterDone(false)
          for (let i = 1; i <= totalTokens; i++) {
            const t = setTimeout(() => setVisibleTokenCount(i), i * msPerToken)
            typewriterTimersRef.current.push(t)
          }
          const doneT = setTimeout(() => setTypewriterDone(true), totalTokens * msPerToken + 100)
          typewriterTimersRef.current.push(doneT)
        }
      }, 0)
      typewriterTimersRef.current.push(setupTimer)
    }
    return () => {
      for (const t of typewriterTimersRef.current) clearTimeout(t)
      typewriterTimersRef.current = []
      if (autoAdvanceRef.current) { clearTimeout(autoAdvanceRef.current); autoAdvanceRef.current = null }
    }
  }, [node.id, displayTokens.length, textSpeed])

  useEffect(() => {
    if (autoAdvance && typewriterDone && !result && node.type !== 'choice' && node.type !== 'cardBattle') {
      autoAdvanceRef.current = setTimeout(() => { void onAdvance() }, 1200)
      return () => { if (autoAdvanceRef.current) { clearTimeout(autoAdvanceRef.current); autoAdvanceRef.current = null } }
    }
  }, [autoAdvance, typewriterDone, result, node.type, onAdvance])

  const skipTypewriter = useCallback(() => {
    if (!typewriterDone) {
      for (const t of typewriterTimersRef.current) clearTimeout(t)
      typewriterTimersRef.current = []
      setVisibleTokenCount(undefined)
      setTypewriterDone(true)
    }
  }, [typewriterDone])

  if (node.type === 'cardBattle') {
    const savedHp = worldSave.state.playerHp
    const encounterState = save.activeEncounter ?? 
      createEncounter(
        worldSave.state.playerDeck ?? VN_DEFAULT_ENCOUNTER_DECK, 
        node.encounterId, 
        world.enemies?.[node.encounterId]?.maxHp ?? VN_DEFAULT_ENEMY_MAX_HP, 
        VN_DEFAULT_PLAYER_MAX_HP,
        savedHp,
      )
    return (
      <CardBattlerMode
        initialState={encounterState}
        enemyDef={world.enemies?.[node.encounterId] ?? { id: node.encounterId, name: { chinese: 'Enemy' }, maxHp: VN_DEFAULT_ENEMY_MAX_HP, intents: [] }}
        cards={world.cards ?? {}}
        words={words}
        pinyinMode={pinyinMode}
        hotkeys={hotkeys}
        deck={encounterState.deck}
        onBattleEnd={(state) => {
          onBattleStateUpdate?.(state)
          onAdvance(state.status === 'victory' ? 'win' : 'lose')
        }}
        onSelectToken={onSelectToken}
      />
    )
  }

  return (
    <div className={`vn-fullscreen ${sceneLayoutClass}`} onClick={skipTypewriter}>
      <div className={`vn-fullscreen-stage ${sceneLayoutClass}`} aria-label="Quest scene" data-scene-character-count={visibleCharacterCount}>
        {cinematic ? (
          <img className="vn-cinematic" src={visualNovelAssetSrc(cinematic.src)} alt={cinematic.alt} />
        ) : background ? (
          <img className="vn-background" src={visualNovelAssetSrc(background.src)} alt={background.alt} />
        ) : (
          <div className="vn-background vn-background-fallback" aria-label="Neutral background" />
        )}
        {!cinematic && moodSprites.map((character) => {
          const animClass = animClassMap[character.characterId]
          return (
            <VisualNovelSprite
              key={character.slotId ?? `${character.characterId}:${character.position}`}
              character={character}
              manifest={manifest}
              animationClass={animClass}
            />
          )
        })}
      </div>

      <div className="vn-subtitle-overlay">
        {speaker && (
          <div className="vn-speaker-plate">
            <span>{speaker.english}</span>
            {speaker.chinese && <span className="vn-speaker-chinese">{speaker.chinese}</span>}
          </div>
        )}
        <div className={`vn-subtitle-text ${typewriterDone ? 'vn-typewriter-done' : 'vn-typewriter-active'}`}>
          {displayTokens.length > 0 && (
            <AdaptiveChineseText
              tokens={displayTokens}
              selectedToken={selectedToken}
              pinyinMode={pinyinMode}
              onSelectToken={onSelectToken}
              className="reader-sentence vn-line"
              visibleCount={visibleTokenCount}
            />
          )}
          {showEnglish && text?.english && (
            <p className={`vn-translation-overlay ${typewriterDone ? 'revealed' : 'vn-translation-hidden'}`}>{text.english}</p>
          )}
        </div>
        {node.type === 'choice' && typewriterDone && (
          <div className="vn-choice-list vn-subtitle-choices">
            {choices.map((choice, index) => (
              <button key={choice.id} type="button" className={`vn-world-choice vn-choice-${choice.kind}`} onClick={() => onAdvance(choice.id)}>
                {index < 2 && <kbd>{(index === 0 ? hotkeys.choiceA : hotkeys.choiceB).toUpperCase()}</kbd>}
                <span className={`vn-choice-kind vn-choice-kind-${choice.kind}`}>
                  {choice.kind === 'memory' ? 'Memory' : choice.kind === 'consequential' ? 'Story' : 'Express'}
                </span>
                <span>{choice.label.chinese}</span>
                <small>{choice.label.english}</small>
              </button>
            ))}
          </div>
        )}
        {result && typewriterDone && (
          <div className="vn-result-panel vn-subtitle-result">
            <strong>{result.completed ? 'Quest complete' : 'Quest unresolved'}</strong>
            <button type="button" className="primary" onClick={() => onCommitResult(result)}>
              Return to world
            </button>
          </div>
        )}
        {typewriterDone && !result && node.type !== 'choice' && (
          <div className="vn-advance-indicator" aria-hidden="true" />
        )}
      </div>

      <div className="vn-bottom-bar">
        <button type="button" className={`vn-bar-btn vn-bar-btn-english${showEnglish ? ' vn-bar-btn-active' : ''}`} onClick={(e) => { e.stopPropagation(); onToggleEnglish() }} title="Toggle English">
          <span className="vn-bar-icon-text">E</span>
        </button>
        <button type="button" className="vn-bar-btn" onClick={(e) => { e.stopPropagation(); onShowMap() }} title="Map">
          <span className="vn-bar-icon">{'\u{1F5FA}\uFE0F'}</span>
        </button>
        <button type="button" className="vn-bar-btn" onClick={(e) => { e.stopPropagation(); setShowInventory((v) => !v) }} title="Inventory">
          <span className="vn-bar-icon">{'\u{1F6E1}\uFE0F'}</span>
        </button>
        <button type="button" className="vn-bar-btn" onClick={(e) => { e.stopPropagation(); onReplay() }} title="Replay audio">
          <span className="vn-bar-icon">{'\u{1F50A}'}</span>
        </button>
        {!result && node.type !== 'choice' && (
          <button type="button" className="vn-bar-btn vn-bar-btn-primary" onClick={(e) => { e.stopPropagation(); onAdvance() }} title="Next">
            <span className="vn-bar-icon">{'\u25B6\uFE0F'}</span>
          </button>
        )}
        <button type="button" className="vn-bar-btn" onClick={(e) => { e.stopPropagation(); onBack() }} disabled={save.history.length <= 1 || Boolean(result)} title="Back">
          <span className="vn-bar-icon">{'\u25C0\uFE0F'}</span>
        </button>
        <button type="button" className="vn-bar-btn vn-bar-btn-ghost" onClick={(e) => { e.stopPropagation(); onAbandon() }} title="Pause quest">
          <span className="vn-bar-icon">{'\u23F8\uFE0F'}</span>
        </button>
        <button type="button" className="vn-bar-btn vn-bar-btn-gear" onClick={(e) => { e.stopPropagation(); onShowSettings() }} title="Settings">
          <span className="vn-bar-icon">{'\u2699\uFE0F'}</span>
        </button>
      </div>

      {showInventory && (
        <div className="vn-inventory-overlay" onClick={(e) => { e.stopPropagation(); setShowInventory(false) }}>
          <div className="vn-inventory-panel" onClick={(e) => e.stopPropagation()}>
            <div className="vn-inventory-header">
              <h3>Status & Inventory</h3>
              <button type="button" onClick={() => setShowInventory(false)}>Close</button>
            </div>
            <WorldStatusPanel world={world} save={worldSave} />
          </div>
        </div>
      )}
    </div>
  )
}
