import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { AdaptiveChineseText } from '../AdaptiveChineseText'
import type { AdaptivePinyinMode } from '../adaptiveText'
import type { HotkeySettings, VocabWord } from '../types'
import type { ReaderWordToken } from '../types'
import type { CardBattlerState } from '../cardBattler/types'
import { CardBattlerMode } from '../cardBattler/CardBattlerMode'
import { createEncounter } from '../cardBattler/engine'
import { visualNovelAssetSrc } from './loader'
import type { VisualNovelSave, VisualNovelWorldSave, VnAssetManifest, VnChoice, VnNode, VnQuestDefinition, VnQuestResult, VnWorld } from './types'
import { getNodeText, VN_DEFAULT_ENCOUNTER_DECK, VN_DEFAULT_ENEMY_MAX_HP, VN_DEFAULT_PLAYER_MAX_HP } from './utils'
import { VisualNovelSprite } from './VisualNovelSprite'
import { WorldStatusPanel } from './WorldStatusPanel'

type Mood = 'neutral' | 'angry' | 'happy' | 'surprised' | 'sad'

function detectMood(chinese: string): Mood {
  if (/[！!]/.test(chinese) && /[杀死打怒恨滚该死可恶]/.test(chinese)) return 'angry'
  if (/[！!]/.test(chinese) && /[哈哈哇太好了真棒厉害好]/.test(chinese)) return 'happy'
  if (/[？?]/.test(chinese) && /[什么怎么为什么哪谁]/.test(chinese)) return 'surprised'
  if (/[哭悲伤痛泪可怜惨]/.test(chinese)) return 'sad'
  if (/[！!]/.test(chinese)) return 'surprised'
  if (/[哈哈哈嘻嘻]/.test(chinese)) return 'happy'
  return 'neutral'
}

const MOOD_SPRITE_SUFFIX: Record<Mood, string> = {
  neutral: '',
  angry: '-angry',
  happy: '-amused',
  surprised: '-startled',
  sad: '-exhausted',
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
  onSelectToken,
  onToggleEnglish,
  onBack,
  onAdvance,
  onCommitResult,
  onAbandon,
  onReplay,
  onBattleStateUpdate,
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
  onSelectToken: (token: ReaderWordToken | null) => void
  onToggleEnglish: () => void
  onBack: () => void | Promise<void>
  onAdvance: (choiceId?: string) => void | Promise<void>
  onCommitResult: (result: VnQuestResult) => void | Promise<void>
  onAbandon: () => void | Promise<void>
  onReplay: () => void | Promise<void>
  onBattleStateUpdate?: (state: CardBattlerState) => void
  hotkeys: HotkeySettings
}) {
  const [showInventory, setShowInventory] = useState(false)
  const [typewriterDone, setTypewriterDone] = useState(false)
  const typewriterRef = useRef<ReturnType<typeof setTimeout> | null>(null)
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

  const moodSprites = useMemo(() => {
    if (node.type !== 'line') return save.scene.characters
    return save.scene.characters.map((char) => {
      const suffix = MOOD_SPRITE_SUFFIX[mood]
      if (!suffix || char.spriteId.includes(suffix)) return char
      const baseSprite = char.spriteId.replace(/-(amused|annoyed|startled|exhausted|commanding|calculating|concerned|negotiating)$/, '')
      const candidateId = baseSprite + suffix
      if (manifest.sprites[candidateId]) return { ...char, spriteId: candidateId }
      return char
    })
  }, [node, save.scene.characters, mood, manifest.sprites])

  useEffect(() => {
    if (node.id !== prevNodeIdRef.current) {
      prevNodeIdRef.current = node.id
      setTypewriterDone(false)
      if (typewriterRef.current) clearTimeout(typewriterRef.current)
      const duration = Math.min(chineseText.length * 60, 3000)
      typewriterRef.current = setTimeout(() => setTypewriterDone(true), duration)
    }
    return () => { if (typewriterRef.current) clearTimeout(typewriterRef.current) }
  }, [node.id, chineseText.length])

  const skipTypewriter = useCallback(() => {
    if (!typewriterDone) {
      if (typewriterRef.current) clearTimeout(typewriterRef.current)
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
    <div className="vn-fullscreen" onClick={skipTypewriter}>
      <div className="vn-fullscreen-stage" aria-label="Quest scene">
        {cinematic ? (
          <img className="vn-cinematic" src={visualNovelAssetSrc(cinematic.src)} alt={cinematic.alt} />
        ) : background ? (
          <img className="vn-background" src={visualNovelAssetSrc(background.src)} alt={background.alt} />
        ) : (
          <div className="vn-background vn-background-fallback" aria-label="Neutral background" />
        )}
        {!cinematic && moodSprites.map((character) => {
          return (
            <VisualNovelSprite
              key={character.slotId ?? `${character.characterId}:${character.position}`}
              character={character}
              manifest={manifest}
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
      </div>

      <div className="vn-bottom-bar">
        <button type="button" className="vn-bar-btn" onClick={(e) => { e.stopPropagation(); onToggleEnglish() }} title="Toggle English">
          <span className="vn-bar-icon">{'\u{1F1EC}\u{1F1E7}'}</span>
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
