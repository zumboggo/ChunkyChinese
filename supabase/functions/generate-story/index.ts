import { serve } from 'https://deno.land/std@0.224.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import {
  corsHeadersForRequest,
  isRequestOriginAllowed,
} from '../_shared/cors.ts'

type KnownWord = {
  word: string
  pinyin?: string
  meaning: string
}

type RequestBody = {
  prompt?: string
  knownWords?: KnownWord[]
  strictRetry?: boolean
}

const storySchema = {
  type: 'object',
  additionalProperties: false,
  properties: {
    title: { type: 'string' },
    prompt: { type: 'string' },
    estimatedLevel: { type: 'string' },
    knownCoverageEstimate: { type: 'number' },
    unavoidableNewWords: {
      type: 'array',
      maxItems: 5,
      items: {
        type: 'object',
        additionalProperties: false,
        properties: {
          word: { type: 'string' },
          pinyin: { type: 'string' },
          meaning: { type: 'string' },
        },
        required: ['word', 'meaning'],
      },
    },
    sentences: {
      type: 'array',
      minItems: 8,
      maxItems: 40,
      items: {
        type: 'object',
        additionalProperties: false,
        properties: {
          chinese: { type: 'string' },
          english: { type: 'string' },
        },
        required: ['chinese', 'english'],
      },
    },
  },
  required: ['title', 'prompt', 'estimatedLevel', 'knownCoverageEstimate', 'unavoidableNewWords', 'sentences'],
}

serve(async (request) => {
  const allowedOrigins = Deno.env.get('CHUNKY_ALLOWED_ORIGINS') ?? ''
  const corsHeaders = corsHeadersForRequest(request, allowedOrigins)
  if (!isRequestOriginAllowed(request, allowedOrigins)) {
    return json({ error: 'Origin not allowed.' }, 403, corsHeaders)
  }
  if (request.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  if (request.method !== 'POST') return json({ error: 'Method not allowed.' }, 405, corsHeaders)

  if (Deno.env.get('CHUNKY_AI_STORIES_ENABLED') === 'false') {
    return json({ error: 'AI story generation is disabled.' }, 503, corsHeaders)
  }

  const openRouterKey = Deno.env.get('OPENROUTER_API_KEY')
  if (!openRouterKey) return json({ error: 'OpenRouter is not configured.' }, 503, corsHeaders)

  const supabaseUrl = Deno.env.get('SUPABASE_URL')
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY')
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
  if (!supabaseUrl || !anonKey || !serviceRoleKey) {
    return json({ error: 'Supabase function environment is not configured.' }, 503, corsHeaders)
  }

  const authorization = request.headers.get('Authorization') ?? ''
  const userClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authorization } },
  })
  const { data: userData, error: userError } = await userClient.auth.getUser()
  if (userError || !userData.user) {
    return json({ error: 'Sign in before generating stories.' }, 401, corsHeaders)
  }

  const body = (await request.json().catch(() => ({}))) as RequestBody
  const prompt = (body.prompt ?? '').trim().slice(0, 700)
  if (!prompt) return json({ error: 'Prompt is required.' }, 400, corsHeaders)

  const knownWords = normalizeKnownWords(body.knownWords ?? []).slice(0, 1200)
  if (knownWords.length < 20) {
    return json({ error: 'Add more known words before generating a known-word story.' }, 400, corsHeaders)
  }

  const admin = createClient(supabaseUrl, serviceRoleKey)
  const limit = Number(Deno.env.get('CHUNKY_AI_STORY_DAILY_LIMIT') ?? '5')
  const since = new Date()
  since.setUTCHours(0, 0, 0, 0)
  const { count } = await admin
    .from('ai_story_generations')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userData.user.id)
    .gte('created_at', since.toISOString())

  if ((count ?? 0) >= limit) {
    return json({ error: 'Daily AI story limit reached.' }, 429, corsHeaders)
  }

  const model = Deno.env.get('CHUNKY_STORY_MODEL') ?? 'moonshotai/kimi-k2.6'
  const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${openRouterKey}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': Deno.env.get('CHUNKY_APP_URL') ?? 'https://chunky-chinese.local',
      'X-OpenRouter-Title': 'Chunky Chinese',
    },
    body: JSON.stringify({
      model,
      temperature: body.strictRetry ? 0.35 : 0.55,
      max_tokens: 3600,
      response_format: {
        type: 'json_schema',
        json_schema: {
          name: 'chunky_chinese_story',
          strict: true,
          schema: storySchema,
        },
      },
      messages: [
        {
          role: 'system',
          content: storySystemPrompt(body.strictRetry),
        },
        {
          role: 'user',
          content: JSON.stringify({
            prompt,
            knownWords,
            output: 'Return JSON only. Each sentence object must include Chinese and English.',
          }),
        },
      ],
    }),
  })

  const raw = await response.text()
  if (!response.ok) {
    return json({ error: `OpenRouter error ${response.status}: ${raw.slice(0, 300)}` }, 502, corsHeaders)
  }

  const parsed = JSON.parse(raw) as {
    choices?: Array<{ message?: { content?: string } }>
    usage?: unknown
  }
  const content = parsed.choices?.[0]?.message?.content
  if (!content) return json({ error: 'OpenRouter returned an empty story.' }, 502, corsHeaders)
  const story = JSON.parse(content) as Record<string, unknown>

  await admin.from('ai_story_generations').insert({
    user_id: userData.user.id,
    model,
    prompt,
  })

  return json(story, 200, corsHeaders)
})

function storySystemPrompt(strictRetry?: boolean): string {
  return [
    'You write highly comprehensible Mandarin Chinese graded-reader stories for one learner.',
    'Use simplified Chinese.',
    'The story must include both Chinese and English sentence-by-sentence translations.',
    'Target about 400 Chinese word tokens, acceptable range 320 to 480.',
    'Prefer short sentences, concrete actions, repeated words, and clear cause/effect.',
    'Use the provided knownWords as your main vocabulary bank.',
    'Aim for at least 95% of Chinese word occurrences to come from knownWords.',
    'Avoid idioms, literary phrasing, rare characters, and advanced grammar unless unavoidable.',
    'You may introduce at most 5 unavoidable new words; list them with pinyin and English.',
    strictRetry
      ? 'This is a retry because the previous story was too hard. Use even simpler wording and more repetition.'
      : 'Make the story fun and specific while staying easy.',
  ].join('\n')
}

function normalizeKnownWords(words: KnownWord[]): KnownWord[] {
  const seen = new Set<string>()
  const normalized: KnownWord[] = []
  for (const word of words) {
    const text = String(word.word ?? '').trim()
    const meaning = String(word.meaning ?? '').trim()
    if (!text || !meaning || seen.has(text)) continue
    seen.add(text)
    normalized.push({
      word: text,
      meaning,
      pinyin: typeof word.pinyin === 'string' ? word.pinyin.trim() : undefined,
    })
  }
  return normalized
}

function json(
  value: unknown,
  status = 200,
  corsHeaders: Record<string, string> = {},
): Response {
  return new Response(JSON.stringify(value), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}
