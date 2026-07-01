import 'fake-indexeddb/auto'
import { describe, expect, it } from 'vitest'
import { DEFAULT_HOTKEYS, getHotkeys, saveHotkeys } from './db'

describe('hotkey settings', () => {
  it('defaults the four main choices to 1 through 4', () => {
    expect(DEFAULT_HOTKEYS.choiceA).toBe('1')
    expect(DEFAULT_HOTKEYS.choiceB).toBe('2')
    expect(DEFAULT_HOTKEYS.choiceC).toBe('3')
    expect(DEFAULT_HOTKEYS.choiceD).toBe('4')
  })

  it('migrates the old 3/4/1/2 choice defaults to 1/2/3/4', async () => {
    await saveHotkeys({
      ...DEFAULT_HOTKEYS,
      choiceA: '3',
      choiceB: '4',
      choiceC: '1',
      choiceD: '2',
      choiceF: 'r',
    })

    await expect(getHotkeys()).resolves.toMatchObject({
      choiceA: '1',
      choiceB: '2',
      choiceC: '3',
      choiceD: '4',
      choiceF: 'r',
    })
  })

  it('persists the configurable Choice F replay key', async () => {
    expect(DEFAULT_HOTKEYS.choiceF).toBe('6')

    await saveHotkeys({
      ...DEFAULT_HOTKEYS,
      choiceF: 'r',
    })

    await expect(getHotkeys()).resolves.toMatchObject({
      choiceF: 'r',
    })
  })
})
