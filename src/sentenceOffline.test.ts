import { describe, expect, it } from 'vitest'
import { sentenceOfflineAssetUrls } from './sentenceOffline'

describe('sentence listening offline assets', () => {
  it('includes Chinese and English audio for every sentence without duplicates', () => {
    const urls = sentenceOfflineAssetUrls([
      { word: '一样' },
      { word: '一次' },
      { word: '一样' },
    ])

    expect(urls).toHaveLength(4)
    expect(urls).toContain('/seed/sentence-audio/%E4%B8%80%E6%A0%B7.mp3')
    expect(urls).toContain('/seed/sentence-audio/%E4%B8%80%E6%A0%B7-en.mp3')
    expect(urls).toContain('/seed/sentence-audio/%E4%B8%80%E6%AC%A1.mp3')
    expect(urls).toContain('/seed/sentence-audio/%E4%B8%80%E6%AC%A1-en.mp3')
  })
})
