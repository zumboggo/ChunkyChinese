import { useMemo } from 'react'
import type { VisualNovelWorldSave, VnWorld } from './types'

const DEFAULT_DECK = ['strike', 'strike', 'strike', 'strike', 'defend', 'defend', 'defend', 'bash']

export function WorldStatusPanel({ world, save }: { world: VnWorld; save: VisualNovelWorldSave }) {
  const state = save.state
  const deck = state.playerDeck ?? DEFAULT_DECK
  const hp = state.playerHp

  const deckSummary = useMemo(() => {
    const counts = new Map<string, number>()
    for (const id of deck) counts.set(id, (counts.get(id) ?? 0) + 1)
    return Array.from(counts.entries()).sort((a, b) => b[1] - a[1])
  }, [deck])

  return (
    <aside className="vn-status-panel" aria-label="World status">
      <div className="vn-status-row">
        <span className="vn-status-label"><span className="vn-status-icon">&#x1FA99;</span> Gold</span>
        <strong className="vn-status-value">{state.money}</strong>
      </div>
      {hp !== undefined && (
        <div className="vn-status-row">
          <span className="vn-status-label"><span className="vn-status-icon">&#x2764;&#xFE0F;</span> HP</span>
          <strong className="vn-status-value">{hp} / 50</strong>
        </div>
      )}
      <div className="vn-status-row">
        <span className="vn-status-label"><span className="vn-status-icon">&#x1F528;</span> Sculpting</span>
        <strong className="vn-status-value">{state.skills.sculpting ?? 0}</strong>
      </div>
      <div className="vn-status-row">
        <span className="vn-status-label"><span className="vn-status-icon">&#x2694;&#xFE0F;</span> Swordsmanship</span>
        <strong className="vn-status-value">{state.skills.swordsmanship ?? 0}</strong>
      </div>
      {state.unlockedTitles[0] && (
        <div className="vn-status-title">{state.unlockedTitles[0]}</div>
      )}
      <div className="vn-deck-summary">
        <span className="vn-deck-label">Deck ({deck.length} cards)</span>
        <div className="vn-deck-list">
          {deckSummary.map(([cardId, count]) => (
            <span key={cardId} className="vn-deck-entry">
              {count > 1 && <span className="vn-deck-count">{count}x</span>}
              {cardId}
            </span>
          ))}
        </div>
      </div>
      <p className="vn-quest-note">
        <strong>{world.title}</strong>
        <span>{state.unlockedLocations.length} location{state.unlockedLocations.length !== 1 ? 's' : ''} unlocked</span>
      </p>
    </aside>
  )
}
