import { describe, expect, it } from 'vitest'

describe('VN asset authoring helpers', () => {
  it('estimates cost from fixed model profiles and candidate counts', async () => {
    // @ts-expect-error script helper is a Node ESM module outside the app source tree
    const { estimateAssets } = await import('../../scripts/vn-assets/core.mjs')
    const estimate = estimateAssets([
      { id: 'town', kind: 'background', modelProfile: 'krea-background', candidateCount: 4 },
      { id: 'sprite', kind: 'sprite', modelProfile: 'kontext-sprite', candidateCount: 2 },
    ])

    expect(estimate.totalEstimatedCostUsd).toBeCloseTo(0.21)
  })

  it('rejects browser-exposed Replicate environment variables', async () => {
    // @ts-expect-error script helper is a Node ESM module outside the app source tree
    const { assertClientSecretBoundary } = await import('../../scripts/vn-assets/core.mjs')

    expect(() => assertClientSecretBoundary({ VITE_REPLICATE_API_TOKEN: 'bad' })).toThrow(/VITE/)
    expect(() => assertClientSecretBoundary({ REPLICATE_API_TOKEN: 'local-only' })).not.toThrow()
  })
})
