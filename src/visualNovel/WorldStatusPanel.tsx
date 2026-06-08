import type { VisualNovelWorldSave, VnWorld } from './types'

export function WorldStatusPanel({ world, save }: { world: VnWorld; save: VisualNovelWorldSave }) {
  const state = save.state
  return (
    <aside className="vn-status-panel" aria-label="World status">
      <div className="vn-status-row">
        <span className="vn-status-label"><span className="vn-status-icon">&#x1FA99;</span> Gold</span>
        <strong className="vn-status-value">{state.money}</strong>
      </div>
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
      <p className="vn-quest-note">
        <strong>{world.title}</strong>
        <span>{state.unlockedLocations.length} location{state.unlockedLocations.length !== 1 ? 's' : ''} unlocked</span>
      </p>
    </aside>
  )
}
