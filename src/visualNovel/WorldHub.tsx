import { useMemo, useState } from 'react'
import { AdaptiveChineseText } from '../AdaptiveChineseText'
import { tokenizeReaderText, type AdaptivePinyinMode } from '../adaptiveText'
import type { ReaderWordToken, VocabWord } from '../types'
import type { VnAssetManifest, VnLocation, VnWorld, VnWorldAction } from './types'
import {
  availableTravelLocations,
  availableWorldActions,
  recommendedWorldAction,
  worldActionBadge,
} from './worldEngine'
import { scopedTokens, getLocationDescription } from './utils'
import type { VisualNovelWorldSave } from './types'

export function WorldHub({
  world,
  save,
  location,
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
  const [expanded, setExpanded] = useState(false)
  const description = getLocationDescription(location, save)
  const descriptionTokens = useMemo(
    () => scopedTokens(tokenizeReaderText(description?.chinese ?? '', words), `location-${location?.id ?? 'unknown'}`),
    [description?.chinese, location?.id, words],
  )
  const actions = availableWorldActions(world, save)
  const travelLocations = availableTravelLocations(world, save)
  const recommended = recommendedWorldAction(world, save)
  const totalOptions = actions.length + travelLocations.length

  return (
    <section className={`vn-hub-panel${expanded ? ' vn-hub-expanded' : ''}`}>
      <div className="vn-hub-header">
        <span className="vn-hub-location">{location?.name.english ?? location?.id ?? 'Unknown location'}</span>
        {location?.name.chinese && <span className="vn-hub-location-cn">{location.name.chinese}</span>}
      </div>

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

      {expanded && (
        <>
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

          <div className="vn-hub-actions-row">
            {actions.length > 0 && (
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
                </div>
              </section>
            )}
            {travelLocations.length > 0 && (
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
                </div>
              </section>
            )}
          </div>
        </>
      )}

      <button
        type="button"
        className="vn-explore-btn"
        onClick={() => setExpanded((v) => !v)}
      >
        {expanded ? 'Collapse' : `Explore${totalOptions > 0 ? ` (${totalOptions})` : ''}`}
      </button>
    </section>
  )
}
