import { describe, expect, it } from 'vitest'

const TEST_WORLD = { id: 'test-world' }
const TEST_MANIFEST = {
  backgrounds: {
    classroom: { id: 'classroom', src: 'packs/test/backgrounds/classroom.webp' },
  },
  sprites: {
    hero: { id: 'hero', src: 'packs/test/characters/hero.webp' },
  },
  cinematics: {},
}
const TEST_SCRIPT = {
  id: 'test-story',
  title: 'Test Story',
  contentVersion: 'test',
  initialNodeId: 'start-node',
  characters: {
    hero: { displayNames: { chinese: '小明', english: 'Xiao Ming' }, personas: {} },
  },
  nodes: {
    'start-node': {
      id: 'start-node',
      type: 'line',
      speaker: { characterId: 'hero' },
      text: { chinese: '你好。', english: 'Hello.' },
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
}

describe('vn-renpy converter', () => {
  it('converts lines, choices, and quest completion into RenPy labels', async () => {
    // @ts-expect-error Node-side generator is an mjs script without TS declarations.
    const { convertVisualNovelToRenpy } = await import('../../scripts/vn-renpy/converter.mjs')
    const output = convertVisualNovelToRenpy({
      world: TEST_WORLD,
      manifest: TEST_MANIFEST,
      script: TEST_SCRIPT,
      storyId: 'test-story',
    })

    expect(output).toContain('label node_start_node:')
    expect(output).toContain('scene bg_classroom')
    expect(output).toContain('show spr_hero at left')
    expect(output).toContain('define char_hero = Character("小明")')
    expect(output).toContain('char_hero "你好。"')
    expect(output).toContain('default chunky_english_visible = False')
    expect(output).toContain('screen chunky_english():')
    expect(output).toContain('show screen chunky_english')
    expect(output).toContain('menu:')
    expect(output).toContain('chunky_choice("choice-node", "go", "走。")')
    expect(output).toContain('chunky_complete("done", "test-quest", "ok")')
  })

  it('generates English translation blocks for all dialogue lines', async () => {
    // @ts-expect-error converter script is plain ESM without generated TS declarations.
    const { buildEnglishTranslations } = await import('../../scripts/vn-renpy/converter.mjs')
    const output = buildEnglishTranslations(TEST_SCRIPT)

    expect(output).toContain('translate english strings:')
    expect(output).toContain('old "小明"')
    expect(output).toContain('new "Xiao Ming"')
    expect(output).toContain('translate english node_start_node_0:')
    expect(output).toContain('char_hero "Hello."')
  })
})
