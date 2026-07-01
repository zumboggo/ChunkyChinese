import { describe, expect, it } from 'vitest'
import type { VnAssetManifest, VnSceneCharacter } from './types'
import {
  defaultCharacterXPercent,
  resolveSpriteReference,
  spriteDesktopWidth,
  spriteMobileWidth,
  vnSceneLayoutClass,
} from './stageLayout'

const manifest: VnAssetManifest = {
  schemaVersion: 1,
  contentVersion: 'test',
  backgrounds: {},
  cinematics: {},
  sprites: {
    'hero-neutral': {
      id: 'hero-neutral',
      characterId: 'hero',
      personaId: 'default',
      outfitId: 'default',
      poseId: 'standing',
      expressionId: 'neutral',
      src: 'hero-neutral.webp',
      width: 1000,
      height: 1400,
      anchorX: 0.5,
      anchorY: 1,
      defaultScale: 0.7,
      mobileScale: 0.58,
    },
    'hero-worried': {
      id: 'hero-worried',
      characterId: 'hero',
      personaId: 'default',
      outfitId: 'default',
      poseId: 'standing',
      expressionId: 'worried',
      src: 'hero-worried.webp',
      width: 1000,
      height: 1400,
      anchorX: 0.5,
      anchorY: 1,
      defaultScale: 0.7,
      mobileScale: 0.58,
    },
  },
}

const character: VnSceneCharacter = {
  characterId: 'hero',
  personaId: 'default',
  spriteId: 'hero-neutral',
  position: 'left',
  scale: 0.9,
}

describe('VN stage layout helpers', () => {
  it('classifies scenes by visible character count', () => {
    expect(vnSceneLayoutClass([])).toBe('vn-scene-empty')
    expect(vnSceneLayoutClass([character])).toBe('vn-scene-single')
    expect(vnSceneLayoutClass([character, { ...character, characterId: 'friend', spriteId: 'friend-neutral' }])).toBe('vn-scene-duo')
    expect(vnSceneLayoutClass([character, character, character])).toBe('vn-scene-trio')
    expect(vnSceneLayoutClass([character], true)).toBe('vn-scene-cinematic')
  })

  it('resolves expressions through manifest metadata and computes responsive widths', () => {
    expect(defaultCharacterXPercent(character)).toBe(28)
    expect(resolveSpriteReference(manifest, character, 'worried')).toBe('hero-worried')
    expect(resolveSpriteReference(manifest, character, 'hero-worried')).toBe('hero-worried')
    expect(spriteDesktopWidth(manifest.sprites['hero-neutral'], character)).toBe(630)
    expect(spriteMobileWidth(manifest.sprites['hero-neutral'], character)).toBe(522)
  })
})
