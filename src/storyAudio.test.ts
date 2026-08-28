import { describe, expect, it } from 'vitest'
import { buildMeditationSsml } from './storyAudio'

describe('meditation speech', () => {
  it('builds slowed Mandarin SSML with a pause between phrases', () => {
    const ssml = buildMeditationSsml(['耶和华', '是', '我的牧者'], 'zh-CN-XiaoyiNeural')
    expect(ssml).toContain('xml:lang="zh-CN"')
    expect(ssml).toContain('name="zh-CN-XiaoyiNeural"')
    expect(ssml.match(/<break time="420ms"\/>/g)).toHaveLength(2)
    expect(ssml).toContain('<prosody rate="-18%">我的牧者</prosody>')
  })

  it('escapes text and voice values used in SSML', () => {
    const ssml = buildMeditationSsml(['爱 & 恩典'], 'voice"name')
    expect(ssml).toContain('爱 &amp; 恩典')
    expect(ssml).toContain('voice&quot;name')
  })
})
