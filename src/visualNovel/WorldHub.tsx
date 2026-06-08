import { useMemo, useState } from 'react'
import { AdaptiveChineseText } from '../AdaptiveChineseText'
import { tokenizeReaderText, type AdaptivePinyinMode } from '../adaptiveText'
import type { ReaderWordToken, VocabWord } from '../types'
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

const MAP_LAYOUT: Record<string, { x: number; y: number; label: string }> = {
  'real-world-apartment': { x: 50, y: 15, label: 'Apartment' },
  'town-square': { x: 50, y: 45, label: 'Town Square' },
  'training-hall': { x: 25, y: 75, label: 'Training Hall' },
  'sculpture-workshop': { x: 75, y: 75, label: 'Workshop' },
}

const MAP_CONNECTIONS: [string, string][] = [
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
  const [showMap, setShowMap] = useState(false)
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
  const unlockedLocations = save.state.unlockedLocations

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
          <button type="button" className="vn-map-toggle" onClick={() => setShowMap((v) => !v)}>
            {showMap ? 'Hide map' : 'Show map'}
          </button>
          {showMap && (
            <div className="vn-travel-map">
              <svg className="vn-map-svg" viewBox="0 0 100 100" preserveAspectRatio="xMidYMid meet">
                {MAP_CONNECTIONS.map(([a, b]) => {
                  const la = MAP_LAYOUT[a]
                  const lb = MAP_LAYOUT[b]
                  if (!la || !lb) return null
                  const bothUnlocked = unlockedLocations.includes(a) && unlockedLocations.includes(b)
                  return (
                    <line
                      key={`${a}-${b}`}
                      x1={la.x} y1={la.y} x2={lb.x} y2={lb.y}
                      className={`vn-map-path ${bothUnlocked ? 'vn-map-path-unlocked' : ''}`}
                    />
                  )
                })}
                {Object.entries(MAP_LAYOUT).map(([locId, pos]) => {
                  const isUnlocked = unlockedLocations.includes(locId)
                  const isCurrent = location?.id === locId
                  const canTravel = travelLocations.some((t) => t.id === locId)
                  return (
                    <g key={locId} className={`vn-map-node ${isCurrent ? 'vn-map-current' : ''} ${isUnlocked ? 'vn-map-unlocked' : 'vn-map-locked'}`}>
                      <circle cx={pos.x} cy={pos.y} r={isCurrent ? 6 : 4} />
                      <text x={pos.x} y={pos.y - 8} textAnchor="middle" className="vn-map-label">{pos.label}</text>
                      {canTravel && (
                        <rect
                          x={pos.x - 12} y={pos.y - 3} width={24} height={6} rx={3}
                          className="vn-map-travel-btn"
                          onClick={() => onAction({ id: `travel-${locId}`, kind: 'travel', targetId: locId, label: world.locations[locId]?.name ?? { chinese: locId } })}
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
          )}
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

function JournalQuest({ quest, completed = false }: { quest: VnQuestDefinition; completed?: boolean }) {
  return (
    <p className={completed ? 'completed' : undefined}>
      <strong>{quest.title.english}</strong>
      <span>{completed ? 'Completed' : quest.objective?.english ?? quest.description?.english}</span>
    </p>
  )
}
