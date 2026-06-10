import type { VnAssetManifest } from './types'
import type { ExpressionAssetResolver, ResolvedExpressionAsset } from './animationTypes'

function findSpriteForCharacter(
  characterId: string,
  expressionId: string,
  manifest: VnAssetManifest,
): string | undefined {
  for (const [id, sprite] of Object.entries(manifest.sprites)) {
    if (sprite.characterId === characterId && sprite.expressionId === expressionId) return id
  }
  return undefined
}

function findSpriteSrc(
  characterId: string,
  expressionId: string,
  manifest: VnAssetManifest,
): string | undefined {
  const spriteId = findSpriteForCharacter(characterId, expressionId, manifest)
  return spriteId ? manifest.sprites[spriteId]?.src : undefined
}

export const expressionAssetResolver: ExpressionAssetResolver = {
  resolve(characterId: string, expression: string, manifest: VnAssetManifest): ResolvedExpressionAsset {
    const spriteId = findSpriteForCharacter(characterId, expression, manifest)
    if (spriteId) return { spriteId, src: manifest.sprites[spriteId]?.src }

    const neutralId = findSpriteForCharacter(characterId, 'neutral', manifest)
    if (neutralId) return { spriteId: neutralId, src: manifest.sprites[neutralId]?.src }

    return { spriteId: undefined, src: undefined }
  },

  hasBlinkAsset(characterId: string, currentExpression: string, manifest: VnAssetManifest): boolean {
    const baseExpression = currentExpression.replace(/-(blink|closed)$/, '')
    return Boolean(findSpriteSrc(characterId, `${baseExpression}-blink`, manifest))
      || Boolean(findSpriteSrc(characterId, `${baseExpression}-closed`, manifest))
  },

  hasTalkAsset(characterId: string, currentExpression: string, manifest: VnAssetManifest): boolean {
    const baseExpression = currentExpression.replace(/-(talk|open|talking)$/, '')
    return Boolean(findSpriteSrc(characterId, `${baseExpression}-talk`, manifest))
      || Boolean(findSpriteSrc(characterId, `${baseExpression}-open`, manifest))
      || Boolean(findSpriteSrc(characterId, `${baseExpression}-talking`, manifest))
  },
}

export function resolveTalkSpriteId(
  characterId: string,
  currentExpression: string,
  manifest: VnAssetManifest,
): string | undefined {
  const baseExpression = currentExpression.replace(/-(talk|open|talking)$/, '')
  return findSpriteForCharacter(characterId, `${baseExpression}-talk`, manifest)
    ?? findSpriteForCharacter(characterId, `${baseExpression}-open`, manifest)
    ?? findSpriteForCharacter(characterId, `${baseExpression}-talking`, manifest)
}

export function resolveBlinkSpriteId(
  characterId: string,
  currentExpression: string,
  manifest: VnAssetManifest,
): string | undefined {
  const baseExpression = currentExpression.replace(/-(blink|closed)$/, '')
  return findSpriteForCharacter(characterId, `${baseExpression}-blink`, manifest)
    ?? findSpriteForCharacter(characterId, `${baseExpression}-closed`, manifest)
}
