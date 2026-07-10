export interface DeferredTask {
  id: string
  run: () => void | Promise<void>
}

interface IdleWindow {
  setTimeout: (callback: () => void, delay: number) => number
  clearTimeout: (id: number) => void
  requestIdleCallback?: (callback: () => void, options?: { timeout: number }) => number
  cancelIdleCallback?: (id: number) => void
}

export class DeferredTaskCoordinator {
  private pending = new Map<string, DeferredTask>()
  private completed = new Set<string>()
  private handle: number | null = null
  private stopped = false

  private target: IdleWindow

  constructor(target: IdleWindow = window) {
    this.target = target
  }

  enqueue(task: DeferredTask): void {
    if (this.stopped || this.pending.has(task.id) || this.completed.has(task.id)) return
    this.pending.set(task.id, task)
    this.schedule()
  }

  cancel(): void {
    this.stopped = true
    this.pending.clear()
    if (this.handle === null) return
    if (this.target.cancelIdleCallback) this.target.cancelIdleCallback(this.handle)
    else this.target.clearTimeout(this.handle)
    this.handle = null
  }

  private schedule(): void {
    if (this.handle !== null || this.pending.size === 0) return
    const callback = () => {
      this.handle = null
      void this.flushOne()
    }
    this.handle = this.target.requestIdleCallback
      ? this.target.requestIdleCallback(callback, { timeout: 1500 })
      : this.target.setTimeout(callback, 250)
  }

  private async flushOne(): Promise<void> {
    if (this.stopped) return
    const task = this.pending.values().next().value as DeferredTask | undefined
    if (!task) return
    this.pending.delete(task.id)
    try {
      await task.run()
      this.completed.add(task.id)
    } catch (error) {
      console.warn(`Deferred startup task failed: ${task.id}`, error)
    }
    this.schedule()
  }
}
