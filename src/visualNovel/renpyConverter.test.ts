import { describe, expect, it } from 'vitest'

describe('vn-renpy converter', () => {
  it('converts lines, choices, and quest completion into RenPy labels', async () => {
    // @ts-expect-error Node-side generator is an mjs script without TS declarations.
    const { convertVisualNovelToRenpy } = await import('../../scripts/vn-renpy/converter.mjs')
    const output = convertVisualNovelToRenpy({
      world: { id: 'test-world' },
      manifest: {
        backgrounds: {
          classroom: { id: 'classroom', src: 'packs/test/backgrounds/classroom.webp' },
        },
        sprites: {
          hero: { id: 'hero', src: 'packs/test/characters/hero.webp' },
        },
        cinematics: {},
      },
      script: {
        id: 'test-story',
        title: 'Test Story',
        contentVersion: 'test',
        initialNodeId: 'start-node',
        characters: {
          hero: { displayNames: { chinese: '小明' }, personas: {} },
        },
        nodes: {
          'start-node': {
            id: 'start-node',
            type: 'line',
            speaker: { characterId: 'hero' },
            text: { chinese: '你好。' },
            scene: {
              backgroundId: 'classroom',
              characters: [{ characterId: 'hero', personaId: 'default', spriteId: 'hero', position: 'left' }],
            },
            nextId: 'choice-node',
          },
          'choice-node': {
            id: 'choice-node',
            type: 'choice',
            prompt: { chinese: '走吗？' },
            choices: [{ id: 'go', kind: 'expressive', label: { chinese: '走。' }, nextId: 'done' }],
          },
          done: {
            id: 'done',
            type: 'questResult',
            questId: 'test-quest',
            outcomeId: 'ok',
            completed: true,
          },
        },
      },
      storyId: 'test-story',
    })

    expect(output).toContain('label node_start_node:')
    expect(output).toContain('scene bg_classroom')
    expect(output).toContain('show spr_hero at left')
    expect(output).toContain('小明: 你好。')
    expect(output).toContain('menu:')
    expect(output).toContain('chunky_choice("choice-node", "go", "走。")')
    expect(output).toContain('chunky_complete("done", "test-quest", "ok")')
  })
})
