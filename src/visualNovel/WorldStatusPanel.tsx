import type { VisualNovelWorldSave, VnWorld } from './types'

export function WorldStatusPanel({ world, save }: { world: VnWorld; save: VisualNovelWorldSave }) {
  const state = save.state
  return (
    <aside className="vn-status-panel" aria-label="World status">
      <div><span>Gold</span><strong>{state.money}</strong></div>
      <div><span>Sculpting</span><strong>{state.skills.sculpting ?? 0}</strong></div>
      <div><span>Swordsmanship</span><strong>{state.skills.swordsmanship ?? 0}</strong></div>
      {state.unlockedTitles[0] && <p className="vn-quest-note"><strong>Title</strong><span>{state.unlockedTitles[0]}</span></p>}
      <p className="vn-quest-note">
        <strong>{world.title}</strong>
        <span>{state.unlockedLocations.length} locations unlocked</span>
      </p>
    </aside>
  )
}
