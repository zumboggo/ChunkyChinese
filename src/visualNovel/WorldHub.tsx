import { useMemo } from 'react'
import { AdaptiveChineseText } from '../AdaptiveChineseText'
import { tokenizeReaderText, type AdaptivePinyinMode } from '../adaptiveText'
import type { ReaderWordToken, VocabWord } from '../types'
import type { VnAssetManifest, VnLocation, VnQuestDefinition, VnWorld, VnWorldAction } from './types'
import {
  availableNpcTalkQuest,
  availableTravelLocations,
  availableWorldActions,
  recommendedWorldAction,
  worldActionBadge,
} from './worldEngine'
import { scopedTokens, getLocationDescription } from './utils'
import type { VisualNovelWorldSave } from './types'

export const MAP_LAYOUT: Record<string, { x: number; y: number; label: string }> = {
  'real-world-apartment': { x: 50, y: 15, label: 'Apartment' },
  'town-square': { x: 50, y: 45, label: 'Town Square' },
  'training-hall': { x: 25, y: 75, label: 'Training Hall' },
  'sculpture-workshop': { x: 75, y: 75, label: 'Workshop' },
}

export const MAP_CONNECTIONS: [string, string][] = [
  ['real-world-apartment', 'town-square'],
  ['town-square', 'training-hall'],
  ['town-square', 'sculpture-workshop'],
  ['training-hall', 'sculpture-workshop'],
]

export function WorldHub({
  world,
  save,
  location,
  manifest: _manifest,
  words,
  selectedToken,
  pinyinMode,
  showEnglish,
  onSelectToken,
  onAction,
}: {
  world: VnWorld
  save: VisualNovelWorldSave
  location?: VnLocation
  manifest: VnAssetManifest
  words: VocabWord[]
  selectedToken: ReaderWordToken | null
  pinyinMode: AdaptivePinyinMode
  showEnglish: boolean
  onSelectToken: (token: ReaderWordToken | null) => void
  onAction: (action: VnWorldAction) => void | Promise<void>
}) {
  const description = getLocationDescription(location, save)
  const descriptionTokens = useMemo(
    () => scopedTokens(tokenizeReaderText(description?.chinese ?? '', words), `location-${location?.id ?? 'unknown'}`),
    [description?.chinese, location?.id, words],
  )
  const actions = availableWorldActions(world, save)
  const travelLocations = availableTravelLocations(world, save)
  const recommended = recommendedWorldAction(world, save)

  return (
    <section className="vn-hub-panel">
      <div className="vn-hub-header">
        <span className="vn-hub-location">{location?.name.english ?? location?.id ?? 'Unknown location'}</span>
        {location?.name.chinese && <span className="vn-hub-location-cn">{location.name.chinese}</span>}
      </div>
      {descriptionTokens.length > 0 && (
        <div className="vn-subtitle-text">
          <AdaptiveChineseText
            tokens={descriptionTokens}
            selectedToken={selectedToken}
            pinyinMode={pinyinMode}
            onSelectToken={onSelectToken}
            className="reader-sentence vn-line"
          />
          {showEnglish && description?.english && <p className="vn-translation-overlay revealed">{description.english}</p>}
        </div>
      )}

      {recommended && recommended.kind !== 'resume' && (
        <button
          type="button"
          className="vn-recommended-action vn-recommended-action-dark"
          onClick={() => void onAction(recommended.action)}
        >
          <span className="vn-recommended-badge">Next · {recommended.badge}</span>
          <strong>{recommended.label.english ?? recommended.label.chinese}</strong>
          {recommended.label.chinese && <small>{recommended.label.chinese}</small>}
          <em>{recommended.reason}</em>
        </button>
      )}

      <div className="vn-hub-actions-row">
        <section>
          <h2>Available</h2>
          <div className="vn-hub-action-list">
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
          <div className="vn-hub-action-list">
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
      </div>
    </section>
  )
}

export interface VnHubCastMember {
  characterId: string
  name: string
  spriteId: string
  talkQuest?: VnQuestDefinition
}

export function getHubCastMembers(
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
