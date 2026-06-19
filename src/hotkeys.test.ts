import 'fake-indexeddb/auto'
import { describe, expect, it } from 'vitest'
import { DEFAULT_HOTKEYS, getHotkeys, saveHotkeys } from './db'

describe('hotkey settings', () => {
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
