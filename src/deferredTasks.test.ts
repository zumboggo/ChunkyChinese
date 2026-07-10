import { describe, expect, it, vi } from 'vitest'
import { DeferredTaskCoordinator } from './deferredTasks'

describe('DeferredTaskCoordinator', () => {
  const timerTarget = () => ({
    setTimeout: globalThis.setTimeout.bind(globalThis),
    clearTimeout: globalThis.clearTimeout.bind(globalThis),
  })

  it('deduplicates work and runs tasks in order', async () => {
    vi.useFakeTimers()
    const calls: string[] = []
    const coordinator = new DeferredTaskCoordinator(timerTarget())
    coordinator.enqueue({ id: 'one', run: () => { calls.push('one') } })
    coordinator.enqueue({ id: 'one', run: () => { calls.push('duplicate') } })
    coordinator.enqueue({ id: 'two', run: () => { calls.push('two') } })
    await vi.runAllTimersAsync()
    expect(calls).toEqual(['one', 'two'])
    vi.useRealTimers()
  })

  it('cancels pending work', async () => {
    vi.useFakeTimers()
    const run = vi.fn()
    const coordinator = new DeferredTaskCoordinator(timerTarget())
    coordinator.enqueue({ id: 'later', run })
    coordinator.cancel()
    await vi.runAllTimersAsync()
    expect(run).not.toHaveBeenCalled()
    vi.useRealTimers()
  })
})
