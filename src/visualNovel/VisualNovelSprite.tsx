import type { CSSProperties } from 'react'
import { visualNovelAssetSrc } from './loader'
import type { VnAssetManifest, VnSceneCharacter } from './types'

export function VisualNovelSprite({
  character,
  manifest,
}: {
  character: VnSceneCharacter
  manifest: VnAssetManifest
}) {
  const sprite = manifest.sprites[character.spriteId]
  if (!sprite || character.visible === false) return null
  return (
    <div
      className={`vn-sprite vn-sprite-${character.position}`}
      style={{
        '--vn-sprite-width': `${Math.round(sprite.width * (sprite.defaultScale ?? 0.74))}px`,
      } as CSSProperties}
    >
      <img src={visualNovelAssetSrc(sprite.src)} alt={sprite.alt ?? character.characterId} />
    </div>
  )
}
