import type { CSSProperties } from 'react'
import { visualNovelAssetSrc } from './loader'
import type { VnAssetManifest, VnSceneCharacter } from './types'

export function VisualNovelSprite({
  character,
  manifest,
  animationClass,
}: {
  character: VnSceneCharacter
  manifest: VnAssetManifest
  animationClass?: string
}) {
  const sprite = manifest.sprites[character.spriteId]
  if (!sprite || character.visible === false) return null
  const scale = (sprite.defaultScale ?? 0.74) * (character.scale ?? 1)
  const style = {
    '--vn-sprite-width': `${Math.round(sprite.width * scale)}px`,
    '--vn-sprite-flip': character.mirror ? '-1' : '1',
    left: character.xPercent === undefined ? undefined : `${character.xPercent}%`,
    bottom: character.yPercent === undefined ? undefined : `${character.yPercent}%`,
    zIndex: character.zIndex,
    opacity: character.opacity,
  } as CSSProperties
  return (
    <div
      className={`vn-sprite vn-sprite-${character.position}${character.dimmed ? ' vn-sprite-dimmed' : ''}${animationClass ? ` ${animationClass}` : ''}`}
      style={style}
    >
      <img src={visualNovelAssetSrc(sprite.src)} alt={sprite.alt ?? character.characterId} />
    </div>
  )
}
