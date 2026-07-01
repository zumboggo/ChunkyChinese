import type { VnAssetManifest, VnSceneCharacter, VnSpriteAsset } from './types'

export const VN_POSITION_PERCENT: Record<VnSceneCharacter['position'], number> = {
  farLeft: 10,
  left: 28,
  center: 50,
  right: 72,
  farRight: 90,
}

export function visibleSceneCharacters(characters: VnSceneCharacter[]): VnSceneCharacter[] {
  return characters.filter((character) => character.visible !== false)
}

export function vnSceneLayoutClass(characters: VnSceneCharacter[], cinematic = false): string {
  if (cinematic) return 'vn-scene-cinematic'
  const count = visibleSceneCharacters(characters).length
  if (count <= 0) return 'vn-scene-empty'
  if (count === 1) return 'vn-scene-single'
  if (count === 2) return 'vn-scene-duo'
  if (count === 3) return 'vn-scene-trio'
  return 'vn-scene-group'
}

export function defaultCharacterXPercent(character: VnSceneCharacter): number {
  return VN_POSITION_PERCENT[character.position] ?? VN_POSITION_PERCENT.center
}

export function spriteDesktopWidth(sprite: VnSpriteAsset, character: VnSceneCharacter): number {
  return Math.round(sprite.width * (sprite.defaultScale ?? 0.74) * (character.scale ?? 1))
}

export function spriteMobileWidth(sprite: VnSpriteAsset, character: VnSceneCharacter): number {
  return Math.round(sprite.width * (sprite.mobileScale ?? sprite.defaultScale ?? 0.74) * (character.scale ?? 1))
}

export function resolveExpressionSpriteId(
  manifest: VnAssetManifest,
  character: Pick<VnSceneCharacter, 'characterId' | 'personaId'>,
  expressionId: string,
): string | undefined {
  for (const [id, sprite] of Object.entries(manifest.sprites)) {
    if (
      sprite.characterId === character.characterId &&
      sprite.personaId === character.personaId &&
      sprite.expressionId === expressionId
    ) {
      return id
    }
  }
  for (const [id, sprite] of Object.entries(manifest.sprites)) {
    if (sprite.characterId === character.characterId && sprite.expressionId === expressionId) return id
  }
  return undefined
}

export function resolveSpriteReference(
  manifest: VnAssetManifest,
  character: Pick<VnSceneCharacter, 'characterId' | 'personaId'>,
  spriteOrExpressionId: string | undefined,
): string | undefined {
  if (!spriteOrExpressionId) return undefined
  const direct = manifest.sprites[spriteOrExpressionId]
  if (direct?.characterId === character.characterId) return spriteOrExpressionId
  return resolveExpressionSpriteId(manifest, character, spriteOrExpressionId)
}
