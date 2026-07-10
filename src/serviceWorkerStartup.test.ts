import { readFile } from 'node:fs/promises'
import { describe, expect, it } from 'vitest'

describe('service worker startup cache', () => {
  it('keeps optional heavy content out of the install list', async () => {
    const source = await readFile(new URL('../public/service-worker.js', import.meta.url), 'utf8')
    const shell = source.slice(source.indexOf('const APP_SHELL'), source.indexOf('self.addEventListener'))
    expect(shell).not.toContain('dictionary/cedict.json')
    expect(shell).not.toContain('reader-packs/')
    expect(shell).not.toContain('visual-novels/')
    expect(shell).toContain('seed/lms-vocab-1000.csv')
  })
})
