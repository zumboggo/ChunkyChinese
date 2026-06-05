import { describe, expect, it } from 'vitest'
import {
  advanceVisualNovel,
  availableChoices,
  goBackVisualNovel,
  makeVisualNovelSave,
} from './engine'
import type { VnScript } from './types'

describe('visual novel engine', () => {
  it('applies choice effects, snapshots history, and restores state on back', () => {
    const script = makeScript()
    const initial = makeVisualNovelSave(script)
    const atChoice = advanceVisualNovel(script, initial)
    const rewarded = advanceVisualNovel(script, atChoice, 'paid')

    expect(rewarded.currentNodeId).toBe('reward')
    expect(rewarded.state.money).toBe(10)
    expect(rewarded.history).toHaveLength(3)

    const back = goBackVisualNovel(rewarded)
    expect(back.currentNodeId).toBe('choice')
    expect(back.state.money).toBe(0)
  })

  it('guards onceKey effects during legitimate loops', () => {
    const script = makeScript()
    const initial = makeVisualNovelSave(script)
    const atChoice = advanceVisualNovel(script, initial)
    const rewarded = advanceVisualNovel(script, atChoice, 'paid')
    const loopedChoice = advanceVisualNovel(script, rewarded)
    const rewardedAgain = advanceVisualNovel(script, loopedChoice, 'paid')

    expect(rewardedAgain.state.money).toBe(10)
    expect(rewardedAgain.state.appliedOnceKeys).toEqual(['paid-once'])
  })

  it('filters choices with deterministic conditions', () => {
    const script = makeScript()
    const save = makeVisualNovelSave(script)
    const atChoice = advanceVisualNovel(script, save)

    expect(availableChoices(script, atChoice).map((choice) => choice.id)).toEqual(['paid'])
  })
})

function makeScript(): VnScript {
  return {
    schemaVersion: 1,
    contentVersion: 'test',
    id: 'test-vn',
    packId: 'test-pack',
    title: 'Test VN',
    initialNodeId: 'start',
    assetManifestPath: 'asset-manifest.json',
    characters: {},
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
        text: { chinese: '开始。' },
        scene: { backgroundId: 'bg' },
        nextId: 'choice',
      },
      choice: {
        id: 'choice',
        type: 'choice',
        prompt: { chinese: '选择。' },
        choices: [
          {
            id: 'paid',
            kind: 'consequential',
            label: { chinese: '拿钱。' },
            nextId: 'reward',
            effects: [{ id: 'money', onceKey: 'paid-once', op: 'addMoney', amount: 10 }],
          },
          {
            id: 'locked',
            kind: 'consequential',
            label: { chinese: '高手方案。' },
            nextId: 'reward',
            conditions: [{ op: 'skillAtLeast', skill: 'sculpting', amount: 1 }],
          },
        ],
      },
      reward: {
        id: 'reward',
        type: 'line',
        text: { chinese: '奖励。' },
        nextId: 'choice',
      },
    },
  }
}
