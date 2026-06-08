import { useMemo } from 'react'
import { AdaptiveChineseText } from '../AdaptiveChineseText'
import { tokenizeReaderText, type AdaptivePinyinMode } from '../adaptiveText'
import type { ReaderWordToken, VocabWord } from '../types'
import { visualNovelAssetSrc } from './loader'
import type { VnAssetManifest, VnLocation, VnQuestDefinition, VnWorld, VnWorldAction } from './types'
import {
  activeWorldQuests,
  availableNpcTalkQuest,
  availableTravelLocations,
  availableWorldActions,
  completedWorldQuests,
  recommendedWorldAction,
  worldActionBadge,
} from './worldEngine'
import { scopedTokens, getLocationDescription } from './utils'
import type { VisualNovelWorldSave } from './types'

export function WorldHub({
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
  const activeQuests = activeWorldQuests(world, save).filter((quest) => quest.category !== 'rumour')
  const completedQuests = completedWorldQuests(world, save).filter((quest) => quest.category !== 'rumour')
  const recommended = recommendedWorldAction(world, save)
  const castMembers = useMemo(
    () => getHubCastMembers(world, save, location, manifest),
    [location, manifest, save, world],
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
            const content = (
              <>
                <img src={visualNovelAssetSrc(sprite.src)} alt={sprite.alt ?? member.name} />
                <span>{member.name}</span>
                {member.talkQuest && <small>{member.talkQuest.hubLabel?.english ?? 'Talk'}</small>}
              </>
            )
            if (member.talkQuest) {
              return (
                <button
                  key={`${member.characterId}:${member.spriteId}`}
                  type="button"
                  className="vn-cast-card vn-cast-card-interactive"
                  onClick={() => onAction({
                    id: `talk-${member.talkQuest!.id}`,
                    kind: 'quest',
                    targetId: member.talkQuest!.id,
                    label: member.talkQuest!.hubLabel ?? member.talkQuest!.title,
                  })}
                >
                  {content}
                </button>
              )
            }
            return (
              <div key={`${member.characterId}:${member.spriteId}`} className="vn-cast-card">
                {content}
              </div>
            )
          })}
        </div>
      )}

      {recommended && (
        <button
          type="button"
          className="vn-recommended-action"
          onClick={() => {
            if (recommended.kind === 'resume') {
              void onResume()
            } else {
              void onAction(recommended.action)
            }
          }}
        >
          <span>Next · {recommended.badge}</span>
          <strong>{recommended.label.english ?? recommended.label.chinese}</strong>
          {recommended.label.chinese && <small>{recommended.label.chinese}</small>}
          <em>{recommended.reason}</em>
        </button>
      )}

      <div className="vn-world-grid">
        <section>
          <h2>Available</h2>
          <div className="vn-world-action-list">
            {actions.map((action) => (
              <button key={action.id} type="button" onClick={() => onAction(action)}>
                <span className="vn-world-badge">{worldActionBadge(world, action)}</span>
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
                <span className="vn-world-badge">Travel</span>
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
            {activeQuests.length > 0 && <small>Active</small>}
            {activeQuests.map((quest) => <JournalQuest key={quest.id} quest={quest} />)}
            {completedQuests.length > 0 && <small>Recently completed</small>}
            {completedQuests.slice(-3).map((quest) => <JournalQuest key={quest.id} quest={quest} completed />)}
            {activeQuests.length === 0 && completedQuests.length === 0 && <small>No journal entries yet.</small>}
          </div>
        </section>
      </div>
    </section>
  )
}

interface VnHubCastMember {
  characterId: string
  name: string
  spriteId: string
  talkQuest?: VnQuestDefinition
}

function getHubCastMembers(
  world: VnWorld,
  save: VisualNovelWorldSave,
  location: VnLocation | undefined,
  manifest: VnAssetManifest,
): VnHubCastMember[] {
  const characterIds = location?.npcIds ?? []
  return characterIds.filter((characterId) => characterId !== 'lee-hyun' && characterId !== 'protagonist').flatMap((characterId) => {
    const character = world.characters?.[characterId]
    if (!character) return []
    const persona = Object.values(character.personas)[0]
    const spriteId = persona?.defaultSpriteId
    if (!spriteId || !manifest.sprites[spriteId]) return []
    const talkQuest = availableNpcTalkQuest(world, save, location, characterId)
    return [{
      characterId,
      name: character.displayNames.english ?? character.displayNames.chinese ?? characterId,
      spriteId,
      talkQuest,
    }]
  })
}

function JournalQuest({ quest, completed = false }: { quest: VnQuestDefinition; completed?: boolean }) {
  return (
    <p className={completed ? 'completed' : undefined}>
      <strong>{quest.title.english}</strong>
      <span>{completed ? 'Completed' : quest.objective?.english ?? quest.description?.english}</span>
    </p>
  )
}
