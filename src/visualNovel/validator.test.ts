import { describe, expect, it } from 'vitest'
import { validateVisualNovelScript } from './validator'
import type { VnAssetManifest, VnScript } from './types'

describe('visual novel validator', () => {
  it('warns when expressive choices mutate story stats', () => {
    const result = validateVisualNovelScript(makeScript(), makeManifest())

    expect(result.errors).toEqual([])
    expect(result.warnings.some((warning) => warning.toLowerCase().includes('expressive choice'))).toBe(true)
  })

  it('reports missing asset ids', () => {
    const result = validateVisualNovelScript(makeScript(), {
      ...makeManifest(),
      backgrounds: {},
    })

    expect(result.errors).toContain('Missing background asset: bg.')
  })
})

function makeScript(): VnScript {
  return {
    schemaVersion: 1,
    contentVersion: 'test',
    id: 'validator-test',
    packId: 'test-pack',
    title: 'Validator Test',
    initialNodeId: 'start',
    assetManifestPath: 'asset-manifest.json',
    characters: {
      'lee-hyun': {
        id: 'lee-hyun',
        displayNames: { english: 'Lee Hyun' },
        personas: {
          'real-world': {
            id: 'real-world',
            defaultOutfitId: 'work-clothes',
            defaultSpriteId: 'sprite',
          },
        },
      },
    },
    initialState: {
      money: 0,
      skills: { sculpting: 0 },
      flags: {},
      questNotes: {},
      appliedOnceKeys: [],
    },
    nodes: {
      start: {
        id: 'start',
        type: 'line',
        speaker: { characterId: 'lee-hyun', personaId: 'real-world' },
        text: { chinese: '开始。' },
        scene: {
          backgroundId: 'bg',
          characters: [
            {
              characterId: 'lee-hyun',
              personaId: 'real-world',
              spriteId: 'sprite',
              position: 'center',
            },
          ],
        },
        nextId: 'choice',
      },
      choice: {
        id: 'choice',
        type: 'choice',
        prompt: { chinese: '选择。' },
        choices: [
          {
            id: 'joke',
            kind: 'expressive',
            label: { chinese: '开玩笑。' },
            nextId: 'end',
            effects: [{ id: 'bad-joke-money', op: 'addMoney', amount: 1 }],
          },
        ],
      },
      end: {
        id: 'end',
        type: 'end',
        endingId: 'done',
        summary: { chinese: '结束。' },
      },
    },
  }
}

function makeManifest(): VnAssetManifest {
  return {
    schemaVersion: 1,
    contentVersion: 'test',
    backgrounds: {
      bg: { id: 'bg', src: 'bg.svg', width: 1600, height: 900, alt: 'Background' },
    },
    sprites: {
      sprite: {
        id: 'sprite',
        characterId: 'lee-hyun',
        personaId: 'real-world',
        outfitId: 'work-clothes',
        poseId: 'standing',
        expressionId: 'neutral',
        src: 'sprite.svg',
        width: 620,
        height: 920,
        anchorX: 310,
        anchorY: 900,
        defaultScale: 0.7,
      },
    },
    cinematics: {},
  }
}
