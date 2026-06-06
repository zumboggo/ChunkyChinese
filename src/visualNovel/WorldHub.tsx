import { useMemo } from 'react'
import { AdaptiveChineseText } from '../AdaptiveChineseText'
import { tokenizeReaderText, type AdaptivePinyinMode } from '../adaptiveText'
import type { ReaderWordToken, VocabWord } from '../types'
import { visualNovelAssetSrc } from './loader'
import type { VnAssetManifest, VnLocation, VnWorld, VnWorldAction } from './types'
import { activeWorldQuests, availableTravelLocations, availableWorldActions, completedWorldQuests } from './worldEngine'
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

interface VnHubCastMember {
  characterId: string
  name: string
  spriteId: string
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
