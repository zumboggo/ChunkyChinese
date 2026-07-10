import { normalizeGeneratedStoryPayload, type GeneratedStoryPayload } from './generatedStories'
import type { VocabWord } from './types'

export interface AiStoryModel {
  id: string
  label: string
}

export const AI_STORY_MODELS: AiStoryModel[] = [
  { id: 'deepseek/deepseek-chat', label: 'DeepSeek V3' },
  { id: 'moonshotai/kimi-k2', label: 'Kimi K2' },
]

export const AI_STORY_LENGTHS = [200, 400, 600, 800]

export interface GenerateAiStoryOptions {
  prompt: string
  knownWords: Pick<VocabWord, 'word' | 'pinyin' | 'meaning'>[]
  strictRetry?: boolean
  apiKey: string
  model: string
  lengthChars: number
  /**
   * Background context from the selected story world (see storyWorlds.ts).
   * Injected as context only — learner-level and format constraints in this
   * module always take precedence.
   */
  worldContext?: string
  /** When set, the model writes the next chapter of an existing story. */
  continueFrom?: {
    title: string
    recentSentences: string[]
    nextChapter: number
  }
}

// OpenRouter does not currently serve FLUX models; Gemini flash-lite image is
// the cheapest good option (~$0.002/cover). Swap this constant when FLUX lands.
export const COVER_IMAGE_MODEL = 'google/gemini-3.1-flash-lite-image'

const OPENROUTER_URL = 'https://openrouter.ai/api/v1/chat/completions'
const REQUEST_TIMEOUT_MS = 90_000

const SYSTEM_PROMPT = [
  'You write graded Chinese readers for a language learner.',
  'Respond with ONLY a JSON object — no markdown fences, no commentary — matching exactly:',
  '{ "title": string (a short Chinese title), "sentences": [{ "chinese": string, "english": string }], "unavoidableNewWords": [{ "word": string, "pinyin": string, "meaning": string }] }',
  'Rules: one sentence per array item; natural, simple Chinese; a faithful English translation for each sentence.',
].join('\n')

export async function generateAiStory(options: GenerateAiStoryOptions): Promise<GeneratedStoryPayload> {
  const prompt = options.prompt.trim()
  if (!prompt && !options.continueFrom && !options.worldContext) throw new Error('Enter a story prompt first.')
  if (!options.apiKey) throw new Error('Add your OpenRouter API key in Settings first.')

  const messages = [
    { role: 'system', content: SYSTEM_PROMPT },
    { role: 'user', content: buildUserMessage(options, prompt) },
  ]

  const content = await requestWithMalformedRetry(options, messages)
  return normalizeGeneratedStoryPayload(content, prompt)
}

function buildUserMessage(options: GenerateAiStoryOptions, prompt: string): string {
  const wordList = options.knownWords.map((w) => w.word).join('、')
  const approxSentences = Math.max(4, Math.round(options.lengthChars / 15))
  const opening = options.continueFrom
    ? [
        `You are continuing an existing story titled 《${options.continueFrom.title}》. The most recent sentences are:`,
        options.continueFrom.recentSentences.join('\n'),
        `Write the NEXT chapter (chapter ${options.continueFrom.nextChapter}) that continues this story. Do not retell earlier events; pick up where it left off. Give the chapter its own short Chinese title in "title".`,
        prompt ? `Additional direction from the learner: ${prompt}` : '',
      ].filter(Boolean).join('\n\n')
    : prompt
      ? `Story request: ${prompt}`
      : 'Story request: invent an engaging premise that fits the story world context below.'
  const parts = [
    opening,
    options.worldContext ?? '',
    `The story should be approximately ${options.lengthChars} Chinese characters in total, split into short sentences (roughly ${approxSentences} sentences).`,
    `The learner knows these words:\n${wordList}`,
    'At least 95% of the word occurrences in the story MUST come from this known-word list (plus proper names, numbers, and basic function words like 的/了/是/在/我/你/他/她).',
    'Use at most 5 words outside the list, and include every such word in unavoidableNewWords with pinyin and meaning.',
  ]
  if (options.knownWords.length < 150) {
    parts.push('The learner is a beginner: restrict any vocabulary outside the list to HSK 1–2 level.')
  }
  if (options.strictRetry) {
    parts.push(
      'The previous draft used too many unknown words. Rewrite far more conservatively: use only the most common words from the list, keep sentences shorter, and add zero optional new words.',
    )
  }
  return parts.filter(Boolean).join('\n\n')
}

async function requestWithMalformedRetry(
  options: GenerateAiStoryOptions,
  messages: Array<{ role: string; content: string }>,
): Promise<unknown> {
  try {
    return await requestStoryJson(options, messages)
  } catch (error) {
    if (error instanceof MalformedResponseError) {
      return await requestStoryJson(options, messages)
    }
    throw error
  }
}

class MalformedResponseError extends Error {}

async function requestStoryJson(
  options: GenerateAiStoryOptions,
  messages: Array<{ role: string; content: string }>,
): Promise<unknown> {
  let response: Response
  try {
    response = await fetch(OPENROUTER_URL, {
      method: 'POST',
      headers: openRouterHeaders(options.apiKey),
      body: JSON.stringify({
        model: options.model,
        messages,
        temperature: options.strictRetry ? 0.5 : 0.8,
        max_tokens: 4000,
        response_format: { type: 'json_object' },
      }),
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    })
  } catch (error) {
    if (error instanceof DOMException && (error.name === 'TimeoutError' || error.name === 'AbortError')) {
      throw new Error('Story generation timed out. Try a shorter length or try again.', { cause: error })
    }
    throw new Error('Could not reach openrouter.ai. Check your internet connection.', { cause: error })
  }

  if (!response.ok) {
    throw new Error(describeHttpError(response.status))
  }

  let payload: unknown
  try {
    payload = await response.json()
  } catch {
    throw new MalformedResponseError('OpenRouter returned a non-JSON response.')
  }
  const content = (payload as {
    choices?: Array<{ message?: { content?: string } }>
    error?: { message?: string }
  })
  if (content.error?.message) throw new Error(`OpenRouter error: ${content.error.message}`)
  const text = content.choices?.[0]?.message?.content
  if (!text) throw new MalformedResponseError('OpenRouter response had no story content.')
  return extractJsonObject(text)
}

function describeHttpError(status: number): string {
  if (status === 401 || status === 403) {
    return 'OpenRouter rejected your API key. Check it under Settings > AI Story Generation.'
  }
  if (status === 402) return 'Your OpenRouter account is out of credits.'
  if (status === 429) return 'Rate limited by OpenRouter. Wait a moment and try again.'
  return `OpenRouter request failed (HTTP ${status}).`
}

function openRouterHeaders(apiKey: string): Record<string, string> {
  return {
    Authorization: `Bearer ${apiKey}`,
    'Content-Type': 'application/json',
    'HTTP-Referer': typeof location !== 'undefined' ? location.origin + import.meta.env.BASE_URL : 'https://chunky-chinese.local/',
    'X-Title': 'Chunky Chinese',
  }
}

/**
 * Generates a cover illustration via OpenRouter's unified image API.
 * Best-effort: the caller should catch and save the story without a cover.
 * Returns a data: URL suitable for storing directly in ReaderBook.coverImage.
 */
export async function generateStoryCover(options: {
  apiKey: string
  title: string
  prompt: string
}): Promise<string> {
  const coverPrompt = [
    `Children's picture-book cover illustration for a Chinese graded-reader story titled 《${options.title}》`,
    options.prompt ? `about: ${options.prompt}.` : '.',
    'Warm colors, simple friendly storybook style, no text or lettering on the image.',
  ].join(' ')

  const response = await fetch(OPENROUTER_URL, {
    method: 'POST',
    headers: openRouterHeaders(options.apiKey),
    body: JSON.stringify({
      model: COVER_IMAGE_MODEL,
      messages: [{ role: 'user', content: coverPrompt }],
      modalities: ['image', 'text'],
    }),
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
  })
  if (!response.ok) throw new Error(describeHttpError(response.status))

  const payload = (await response.json()) as {
    choices?: Array<{ message?: { images?: Array<{ image_url?: { url?: string } }> } }>
    error?: { message?: string }
  }
  if (payload.error?.message) throw new Error(`OpenRouter error: ${payload.error.message}`)
  const url = payload.choices?.[0]?.message?.images?.[0]?.image_url?.url
  if (typeof url !== 'string' || !url.startsWith('data:image')) {
    throw new Error('OpenRouter did not return a cover image.')
  }
  return url
}

export function extractJsonObject(text: string): unknown {
  let candidate = text.trim()
  if (candidate.startsWith('```')) {
    candidate = candidate.replace(/^```[a-zA-Z]*\s*/, '').replace(/```\s*$/, '').trim()
  }
  try {
    return JSON.parse(candidate)
  } catch {
    const start = candidate.indexOf('{')
    const end = candidate.lastIndexOf('}')
    if (start >= 0 && end > start) {
      try {
        return JSON.parse(candidate.slice(start, end + 1))
      } catch {
        // fall through
      }
    }
  }
  throw new MalformedResponseError('The model did not return valid story JSON.')
}
