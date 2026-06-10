import { describe, expect, it, vi } from 'vitest'
import { executeStoryAnimCommand, executeStoryAnimCommands, isWaitCommand } from './storyCommandAdapter'
import type { AnimationManagerHandle } from './useAnimationManager'

function mockManager(): AnimationManagerHandle {
  return {
    showCharacter: vi.fn().mockResolvedValue(undefined),
    hideCharacter: vi.fn().mockResolvedValue(undefined),
    setExpression: vi.fn().mockResolvedValue(undefined),
    moveCharacter: vi.fn().mockResolvedValue(undefined),
    animateCharacter: vi.fn().mockResolvedValue(undefined),
    startCharacterState: vi.fn(),
    stopCharacterState: vi.fn(),
    animateStage: vi.fn().mockResolvedValue(undefined),
    setSpeedMode: vi.fn(),
    setReducedMotion: vi.fn(),
    getCharacterState: vi.fn(),
    cleanup: vi.fn(),
    stageRef: { current: null },
    characters: {},
    revision: 0,
  } as unknown as AnimationManagerHandle
}

describe('isWaitCommand', () => {
  it('defaults to wait true', () => {
    expect(isWaitCommand({ type: 'animate', character: 'a' })).toBe(true)
  })

  it('respects explicit wait true', () => {
    expect(isWaitCommand({ type: 'animate', character: 'a', wait: true })).toBe(true)
  })

  it('respects explicit wait false', () => {
    expect(isWaitCommand({ type: 'animate', character: 'a', wait: false })).toBe(false)
  })
})

describe('executeStoryAnimCommand', () => {
  it('calls showCharacter for show command', async () => {
    const manager = mockManager()
    await executeStoryAnimCommand(
      { type: 'show', character: 'weed', position: 'left', expression: 'neutral', animation: 'enterLeft' },
      { manager },
    )
    expect(manager.showCharacter).toHaveBeenCalledWith('weed', {
      position: 'left',
      expression: 'neutral',
      animation: 'enterLeft',
      facing: undefined,
    })
  })

  it('calls hideCharacter for hide command', async () => {
    const manager = mockManager()
    await executeStoryAnimCommand(
      { type: 'hide', character: 'weed', animation: 'exitLeft', duration: 400 },
      { manager },
    )
    expect(manager.hideCharacter).toHaveBeenCalledWith('weed', {
      animation: 'exitLeft',
      duration: 400,
    })
  })

  it('calls setExpression for expression command', async () => {
    const manager = mockManager()
    await executeStoryAnimCommand(
      { type: 'expression', character: 'weed', value: 'happy', transition: 'crossfade' },
      { manager },
    )
    expect(manager.setExpression).toHaveBeenCalledWith('weed', 'happy', { crossfade: true })
  })

  it('calls animateCharacter for animate command', async () => {
    const manager = mockManager()
    await executeStoryAnimCommand(
      { type: 'animate', character: 'weed', animation: 'shake', duration: 350 },
      { manager },
    )
    expect(manager.animateCharacter).toHaveBeenCalledWith('weed', 'shake', {
      duration: 350,
      to: undefined,
    })
  })

  it('calls moveCharacter for move command', async () => {
    const manager = mockManager()
    await executeStoryAnimCommand(
      { type: 'move', character: 'weed', position: 'center' },
      { manager },
    )
    expect(manager.moveCharacter).toHaveBeenCalledWith('weed', 'center', {
      duration: undefined,
    })
  })

  it('handles dialogue command with expression and animation', async () => {
    const manager = mockManager()
    await executeStoryAnimCommand(
      { type: 'dialogue', speaker: 'weed', text: '你好', expression: 'happy', animation: 'bounce' },
      { manager },
    )
    expect(manager.setExpression).toHaveBeenCalledWith('weed', 'happy', { crossfade: true })
    expect(manager.animateCharacter).toHaveBeenCalledWith('weed', 'bounce', { duration: undefined })
  })

  it('warns on missing character for show', async () => {
    const manager = mockManager()
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
    await executeStoryAnimCommand({ type: 'show' }, { manager })
    expect(manager.showCharacter).not.toHaveBeenCalled()
    warnSpy.mockRestore()
  })

  it('warns on unknown animation name', async () => {
    const manager = mockManager()
    await executeStoryAnimCommand(
      { type: 'animate', character: 'weed', animation: 'nonexistent' },
      { manager },
    )
    expect(manager.animateCharacter).toHaveBeenCalledWith('weed', 'nonexistent', {
      duration: undefined,
      to: undefined,
    })
  })
})

describe('executeStoryAnimCommands', () => {
  it('executes wait commands sequentially', async () => {
    const manager = mockManager()
    const order: string[] = []
    vi.mocked(manager.animateCharacter).mockImplementation(async () => { order.push('anim') })
    vi.mocked(manager.setExpression).mockImplementation(async () => { order.push('expr') })

    await executeStoryAnimCommands(
      [
        { type: 'animate', character: 'weed', animation: 'shake' },
        { type: 'expression', character: 'weed', value: 'happy' },
      ],
      { manager },
    )
    expect(order).toEqual(['anim', 'expr'])
  })

  it('fires non-wait commands concurrently', async () => {
    const manager = mockManager()
    let resolveAnim: (() => void) | undefined
    vi.mocked(manager.animateCharacter).mockImplementation(() => new Promise<void>((r) => { resolveAnim = r }))

    const promise = executeStoryAnimCommands(
      [
        { type: 'animate', character: 'weed', animation: 'shake', wait: false },
        { type: 'expression', character: 'weed', value: 'happy' },
      ],
      { manager },
    )

    expect(manager.animateCharacter).toHaveBeenCalled()
    expect(manager.setExpression).toHaveBeenCalled()
    resolveAnim?.()
    await promise
  })
})
