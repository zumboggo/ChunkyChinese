export type StartupMark =
  | 'shell-rendered'
  | 'destination-selected'
  | 'essential-data-ready'
  | 'study-interactive'
  | 'background-complete'

const START = 'chunky-startup:start'

export function markStartup(name: StartupMark): void {
  if (typeof performance === 'undefined') return
  if (performance.getEntriesByName(START).length === 0) performance.mark(START)
  const mark = `chunky-startup:${name}`
  performance.mark(mark)
  performance.measure(`chunky-startup:to-${name}`, START, mark)
  if (import.meta.env.DEV) {
    const duration = performance.getEntriesByName(`chunky-startup:to-${name}`).at(-1)?.duration
    if (duration !== undefined) console.debug(`[startup] ${name}: ${Math.round(duration)}ms`)
  }
}
