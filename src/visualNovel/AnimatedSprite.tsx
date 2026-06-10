import { useEffect, useRef } from 'react'
import type { CSSProperties } from 'react'
import { visualNovelAssetSrc } from './loader'
import type { VnAssetManifest } from './types'
import type { CharacterAnimationState, StagePosition } from './animationTypes'
import { STAGE_POSITION_PERCENT } from './animationTypes'

interface AnimatedSpriteProps {
  character: CharacterAnimationState
  manifest: VnAssetManifest
  onDomReady: (characterId: string, element: HTMLElement | null) => void
}

export function AnimatedVisualNovelSprite({ character, manifest, onDomReady }: AnimatedSpriteProps) {
  const rootRef = useRef<HTMLDivElement>(null)
  const sprite = manifest.sprites[character.sceneCharacter.spriteId]
  const posPct = STAGE_POSITION_PERCENT[character.position as StagePosition] ?? STAGE_POSITION_PERCENT.center

  useEffect(() => {
    onDomReady(character.characterId, rootRef.current)
    return () => onDomReady(character.characterId, null)
  }, [character.characterId, onDomReady])

  if (!sprite || !character.visible) return null

  const scale = (sprite.defaultScale ?? 0.74) * (character.scale ?? 1)
  const style = {
    '--vn-sprite-width': `${Math.round(sprite.width * scale)}px`,
    '--vn-sprite-flip': character.facing === 'left' ? '-1' : '1',
    left: `${posPct}%`,
    zIndex: character.zIndex,
  } as CSSProperties

  return (
    <div
      ref={rootRef}
      className="vn-sprite vn-sprite-anim-root"
      style={style}
    >
      <div className="vn-position-layer">
        <div className="vn-anim-layer">
          <div
            className={`vn-sprite-inner${character.sceneCharacter.dimmed ? ' vn-sprite-dimmed' : ''}`}
          >
            <img src={visualNovelAssetSrc(sprite.src)} alt={sprite.alt ?? character.characterId} />
          </div>
        </div>
      </div>
    </div>
  )
}

interface AnimatedStageProps {
  characters: Record<string, CharacterAnimationState>
  manifest: VnAssetManifest
  stageRef: React.RefObject<HTMLDivElement | null>
  onDomReady: (characterId: string, element: HTMLElement | null) => void
}

export function AnimatedStage({ characters, manifest, stageRef, onDomReady }: AnimatedStageProps) {
  const entries = Object.values(characters).filter((c) => c.visible)

  return (
    <div ref={stageRef} className="vn-animated-stage">
      {entries.map((char) => (
        <AnimatedVisualNovelSprite
          key={char.characterId}
          character={char}
          manifest={manifest}
          onDomReady={onDomReady}
        />
      ))}
    </div>
  )
}
