import { afterEach, describe, expect, it, vi } from 'vitest'
import { extractJsonObject, generateAiStory } from './aiStories'

const STORY_JSON = {
  title: '小狗的一天',
  sentences: [
    { chinese: '小狗很高兴。', english: 'The puppy is happy.' },
    { chinese: '它去公园玩。', english: 'It goes to the park to play.' },
  ],
  unavoidableNewWords: [],
}

function completionResponse(content: string, status = 200) {
  return new Response(
    JSON.stringify({ choices: [{ message: { content } }] }),
    { status, headers: { 'Content-Type': 'application/json' } },
  )
}

function baseOptions() {
  return {
    prompt: 'a puppy in the park',
    knownWords: [{ word: '小狗', pinyin: 'xiǎo gǒu', meaning: 'puppy' }],
    apiKey: 'test-key',
    model: 'deepseek/deepseek-chat',
    lengthChars: 200,
  }
}

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('extractJsonObject', () => {
  it('parses plain JSON', () => {
    expect(extractJsonObject('{"a":1}')).toEqual({ a: 1 })
  })

  it('strips markdown fences', () => {
    expect(extractJsonObject('```json\n{"a":1}\n```')).toEqual({ a: 1 })
  })

  it('recovers JSON surrounded by prose', () => {
    expect(extractJsonObject('Here is the story:\n{"a":1}\nEnjoy!')).toEqual({ a: 1 })
  })

  it('throws on garbage', () => {
    expect(() => extractJsonObject('not json at all')).toThrow()
  })
})

describe('generateAiStory', () => {
  it('returns a normalized story from an OpenRouter completion', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(completionResponse(JSON.stringify(STORY_JSON))))
    const story = await generateAiStory(baseOptions())
    expect(story.title).toBe('小狗的一天')
    expect(story.sentences).toHaveLength(2)
  })

  it('sends the known words and length in the request', async () => {
    const fetchMock = vi.fn().mockResolvedValue(completionResponse(JSON.stringify(STORY_JSON)))
    vi.stubGlobal('fetch', fetchMock)
    await generateAiStory(baseOptions())
    const body = JSON.parse(fetchMock.mock.calls[0][1].body as string)
    const userMessage = body.messages[1].content as string
    expect(body.model).toBe('deepseek/deepseek-chat')
    expect(userMessage).toContain('小狗')
    expect(userMessage).toContain('200 Chinese characters')
    expect(fetchMock.mock.calls[0][1].headers.Authorization).toBe('Bearer test-key')
  })

  it('maps auth errors to an actionable message', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('', { status: 401 })))
    await expect(generateAiStory(baseOptions())).rejects.toThrow(/rejected your API key/)
  })

  it('maps credit exhaustion to an actionable message', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('', { status: 402 })))
    await expect(generateAiStory(baseOptions())).rejects.toThrow(/out of credits/)
  })

  it('maps rate limiting to an actionable message', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('', { status: 429 })))
    await expect(generateAiStory(baseOptions())).rejects.toThrow(/Rate limited/)
  })

  it('retries once when the model returns malformed JSON', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(completionResponse('sorry, no JSON here'))
      .mockResolvedValueOnce(completionResponse(JSON.stringify(STORY_JSON)))
    vi.stubGlobal('fetch', fetchMock)
    const story = await generateAiStory(baseOptions())
    expect(story.sentences).toHaveLength(2)
    expect(fetchMock).toHaveBeenCalledTimes(2)
  })

  it('fails without an API key before any request', async () => {
    const fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)
    await expect(generateAiStory({ ...baseOptions(), apiKey: '' })).rejects.toThrow(/Settings/)
    expect(fetchMock).not.toHaveBeenCalled()
  })
})
