import { execFileSync } from 'node:child_process'
import { describe, expect, it } from 'vitest'

describe('published VN scene data', () => {
  it('passes the scene composition and expression audit', () => {
    const output = execFileSync('node', ['scripts/vn-scene-audit.mjs'], {
      cwd: process.cwd(),
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
    })

    expect(output).toContain('missing composition: 0')
    expect(output).toContain('missing sprites: 0')
    expect(output).toContain('unsupported expressions: 0')
  })
})
