import { useMemo } from 'react'
import { AdaptiveChineseText } from '../AdaptiveChineseText'
import type { AdaptivePinyinMode } from '../adaptiveText'
import type { HotkeySettings, VocabWord } from '../types'
import type { ReaderWordToken } from '../types'
import { CardBattlerMode } from '../cardBattler/CardBattlerMode'
import { createEncounter } from '../cardBattler/engine'
import { visualNovelAssetSrc } from './loader'
import type { VisualNovelSave, VisualNovelWorldSave, VnAssetManifest, VnChoice, VnNode, VnQuestDefinition, VnQuestResult, VnWorld } from './types'
import { getNodeText, VN_DEFAULT_ENCOUNTER_DECK, VN_DEFAULT_ENEMY_MAX_HP, VN_DEFAULT_PLAYER_MAX_HP } from './utils'
import { VisualNovelSprite } from './VisualNovelSprite'
import { WorldStatusPanel } from './WorldStatusPanel'

export function QuestPlayer({
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

  const speaker = useMemo(() => {
    if (node.type !== 'line' || !node.speaker) return undefined
    const character = world.characters?.[node.speaker.characterId]
    if (!character) return undefined
    return {
      english: character.displayNames.english ?? character.displayNames.chinese ?? node.speaker.characterId,
      chinese: character.displayNames.chinese,
    }
  }, [node, world.characters])

  if (node.type === 'cardBattle') {
    return (
      <CardBattlerMode
        initialState={
          save.activeEncounter ?? 
          createEncounter(
            VN_DEFAULT_ENCOUNTER_DECK, 
            node.encounterId, 
            world.enemies?.[node.encounterId]?.maxHp ?? VN_DEFAULT_ENEMY_MAX_HP, 
            VN_DEFAULT_PLAYER_MAX_HP
          )
        }
        enemyDef={world.enemies?.[node.encounterId] ?? { id: node.encounterId, name: { chinese: 'Enemy' }, maxHp: VN_DEFAULT_ENEMY_MAX_HP, intents: [] }}
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
        {speaker && (
          <div className="vn-speaker-plate">
            <span>{speaker.english}</span>
            {speaker.chinese && <span className="vn-speaker-chinese">{speaker.chinese}</span>}
          </div>
        )}
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
                <span className={`vn-choice-kind vn-choice-kind-${choice.kind}`}>
                  {choice.kind === 'memory' ? 'Memory' : choice.kind === 'consequential' ? 'Story' : 'Express'}
                </span>
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
