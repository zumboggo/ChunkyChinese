import type { CSSProperties, KeyboardEventHandler, MouseEventHandler } from 'react'
import { visualNovelAssetSrc } from './loader'
import type { VnAssetManifest, VnSceneCharacter } from './types'
import { defaultCharacterXPercent, spriteDesktopWidth, spriteMobileWidth } from './stageLayout'

export function VisualNovelSprite({
  character,
  manifest,
  animationClass,
  className = '',
  role,
  tabIndex,
  onClick,
  onKeyDown,
}: {
  character: VnSceneCharacter
  manifest: VnAssetManifest
  animationClass?: string
  className?: string
  role?: string
  tabIndex?: number
  onClick?: MouseEventHandler<HTMLDivElement>
  onKeyDown?: KeyboardEventHandler<HTMLDivElement>
}) {
  const sprite = manifest.sprites[character.spriteId]
  if (!sprite || character.visible === false) return null
  const style = {
    '--vn-sprite-width': `${spriteDesktopWidth(sprite, character)}px`,
    '--vn-sprite-mobile-width': `${spriteMobileWidth(sprite, character)}px`,
    '--vn-sprite-flip': character.mirror ? '-1' : '1',
    left: `${character.xPercent ?? defaultCharacterXPercent(character)}%`,
    bottom: character.yPercent === undefined ? undefined : `${character.yPercent}%`,
    zIndex: character.zIndex,
    opacity: character.opacity,
  } as CSSProperties
  return (
    <div
      className={`vn-sprite vn-sprite-${character.position}${character.dimmed ? ' vn-sprite-dimmed' : ''}${animationClass ? ` ${animationClass}` : ''}${className ? ` ${className}` : ''}`}
      style={style}
      data-character-id={character.characterId}
      data-sprite-id={character.spriteId}
      role={role}
      tabIndex={tabIndex}
      onClick={onClick}
      onKeyDown={onKeyDown}
    >
      <img src={visualNovelAssetSrc(sprite.src)} alt={sprite.alt ?? character.characterId} />
    </div>
  )
}
