import { readFileSync } from 'node:fs'
import vm from 'node:vm'
import { describe, it, expect, vi } from 'vitest'

const source = readFileSync(new URL('../../public/service-worker.js', import.meta.url), 'utf8')
function worker(overrides = {}) {
  const cache = { match: vi.fn(), put: vi.fn().mockResolvedValue(undefined) }
  const context = vm.createContext({
    self: { location: new URL('https://example.com/ChunkyChinese/service-worker.js'), addEventListener: vi.fn() },
    caches: { open: vi.fn().mockResolvedValue(cache), match: vi.fn() },
    fetch: vi.fn(), URL, Response, AbortController, setTimeout, clearTimeout, ...overrides,
  })
  vm.runInContext(source, context)
  return { context, cache }
}

describe('app shell updates', () => {
  it('serves a previous release chunk to an existing tab', async () => {
    const { context } = worker()
    context.caches.match.mockResolvedValue(new Response('old chunk'))
    const response = await context.cacheFirst({ url: 'https://example.com/ChunkyChinese/assets/old.js' })
    expect(await response.text()).toBe('old chunk')
    expect(context.fetch).not.toHaveBeenCalled()
  })
  it('returns downloaded code even when cache storage is full', async () => {
    const { context, cache } = worker()
    cache.put.mockRejectedValue(new Error('QuotaExceededError'))
    context.fetch.mockResolvedValue(new Response('new chunk'))
    const response = await context.cacheFirst({ url: 'https://example.com/ChunkyChinese/assets/new.js' })
    expect(await response.text()).toBe('new chunk')
  })
  it('returns fresh HTML even when cache storage is full', async () => {
    const { context, cache } = worker()
    cache.put.mockRejectedValue(new Error('QuotaExceededError'))
    context.fetch.mockResolvedValue(new Response('new html'))
    const response = await context.networkFirstHtml({ url: 'https://example.com/ChunkyChinese/' })
    expect(await response.text()).toBe('new html')
  })
  it('resolves relative shell URLs under the deployed subdirectory', async () => {
    const { context } = worker()
    context.fetch.mockResolvedValue(new Response('<script src="./assets/main.js"></script>'))
    expect(await context.discoverAppShellUrls()).toEqual(['/ChunkyChinese/assets/main.js'])
  })
})
