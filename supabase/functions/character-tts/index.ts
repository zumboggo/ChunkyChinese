import { createClient } from 'npm:@supabase/supabase-js@2.110.7'
import {
  corsHeadersForRequest,
  isRequestOriginAllowed,
} from '../_shared/cors.ts'

const MODEL_VERSION = '9cfba4c265e685f840612be835424f8c33bdee685d7466ece7684b0d9d4c0b1c'
const REFERENCE_BUCKET = 'character-voice-references'
const CACHE_BUCKET = 'character-voice-cache'
const MAX_TEXT_LENGTH = 300
const DAILY_LIMIT = 60

const VOICES: Record<string, string> = {
  ANNA: 'anna.wav',
  SARAH: 'sarah.wav',
  GRACE: 'grace.wav',
  ELLIOTT: 'elliott.wav',
}

const EMOTIONS: Record<string, number> = {
  neutral: 0.45,
  happy: 0.7,
  laughing: 0.7,
  surprised: 0.65,
  sad: 0.55,
  angry: 0.55,
  scared: 0.55,
  confused: 0.55,
}

type Input = {
  character?: unknown
  text?: unknown
  emotion?: unknown
  language?: unknown
}

function json(
  status: number,
  error: string,
  corsHeaders: Record<string, string>,
  extraHeaders: HeadersInit = {},
): Response {
  return Response.json({ error }, {
    status,
    headers: { ...corsHeaders, ...extraHeaders },
  })
}

function readSecretKey(): string {
  const modern = Deno.env.get('SUPABASE_SECRET_KEYS')
  if (modern) {
    const parsed = JSON.parse(modern) as Record<string, string>
    const key = parsed.default ?? Object.values(parsed)[0]
    if (key) return key
  }
  const legacy = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
  if (!legacy) throw new Error('Supabase server credentials are unavailable.')
  return legacy
}

function detectLanguage(text: string): 'en' | 'zh' {
  return /[\u3400-\u4dbf\u4e00-\u9fff\uf900-\ufaff]/u.test(text) ? 'zh' : 'en'
}

async function sha256(value: string): Promise<string> {
  const bytes = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value))
  return [...new Uint8Array(bytes)]
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('')
}

async function readPredictionAudio(
  token: string,
  input: Record<string, unknown>,
): Promise<Response> {
  let response = await fetch('https://api.replicate.com/v1/predictions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      Prefer: 'wait=60',
    },
    body: JSON.stringify({ version: MODEL_VERSION, input }),
  })
  let prediction = await response.json() as {
    status?: string
    output?: string
    error?: string
    urls?: { get?: string }
  }
  if (!response.ok) {
    throw new Error(prediction.error ?? 'Replicate rejected the voice request.')
  }

  for (let attempt = 0; !prediction.output && attempt < 12; attempt += 1) {
    if (
      prediction.status === 'failed' ||
      prediction.status === 'canceled' ||
      prediction.status === 'aborted'
    ) {
      throw new Error(prediction.error ?? `Replicate prediction ${prediction.status}.`)
    }
    if (!prediction.urls?.get) {
      throw new Error('Replicate did not return a prediction URL.')
    }
    await new Promise((resolve) => setTimeout(resolve, 1_500))
    response = await fetch(prediction.urls.get, {
      headers: { Authorization: `Bearer ${token}` },
    })
    prediction = await response.json()
  }

  if (!prediction.output) throw new Error('Voice generation timed out.')
  const audio = await fetch(prediction.output)
  if (!audio.ok) throw new Error('Generated voice audio could not be downloaded.')
  return audio
}

Deno.serve(async (request: Request) => {
  const allowedOrigins = Deno.env.get('CHUNKY_ALLOWED_ORIGINS') ?? ''
  const corsHeaders = corsHeadersForRequest(request, allowedOrigins)
  if (!isRequestOriginAllowed(request, allowedOrigins)) {
    return json(403, 'Origin not allowed.', corsHeaders)
  }
  if (request.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }
  if (request.method !== 'POST') {
    return json(405, 'Use POST for voice generation.', corsHeaders)
  }

  try {
    const authorization = request.headers.get('Authorization') ?? ''
    const token = authorization.replace(/^Bearer\s+/iu, '')
    if (!token) return json(401, 'Sign in to hear character voices.', corsHeaders)

    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    if (!supabaseUrl) throw new Error('Supabase URL is unavailable.')
    const admin = createClient(supabaseUrl, readSecretKey(), {
      auth: { persistSession: false, autoRefreshToken: false },
    })
    const { data: { user }, error: userError } = await admin.auth.getUser(token)
    if (userError || !user) {
      return json(401, 'Your sign-in has expired. Please sign in again.', corsHeaders)
    }

    const contentType = request.headers.get('Content-Type') ?? ''
    if (!contentType.toLowerCase().includes('application/json')) {
      return json(415, 'Voice requests must use JSON.', corsHeaders)
    }
    const input = await request.json() as Input
    const character = typeof input.character === 'string'
      ? input.character.toUpperCase()
      : ''
    const text = typeof input.text === 'string' ? input.text.trim() : ''
    const emotion = typeof input.emotion === 'string'
      ? input.emotion.toLowerCase()
      : 'neutral'
    const requestedLanguage =
      input.language === 'zh' || input.language === 'en' ? input.language : undefined

    if (!VOICES[character]) {
      return json(422, 'This character does not have a consented cloned voice.', corsHeaders)
    }
    if (!text) return json(400, 'Dialogue text is required.', corsHeaders)
    if (text.length > MAX_TEXT_LENGTH) {
      return json(
        400,
        `Dialogue is limited to ${MAX_TEXT_LENGTH} characters.`,
        corsHeaders,
      )
    }
    if (!(emotion in EMOTIONS)) {
      return json(400, 'Unsupported dialogue emotion.', corsHeaders)
    }

    const language = requestedLanguage ?? detectLanguage(text)
    const cacheKey = await sha256(JSON.stringify({
      model: MODEL_VERSION,
      character,
      text,
      emotion,
      language,
    }))
    const cachePath = `${character.toLowerCase()}/${cacheKey}.wav`
    const { data: cached } = await admin.storage.from(CACHE_BUCKET).download(cachePath)
    if (cached) {
      return new Response(cached, {
        headers: {
          ...corsHeaders,
          'Content-Type': cached.type || 'audio/wav',
          'Cache-Control': 'private, max-age=86400',
          'X-Voice-Cache': 'hit',
        },
      })
    }

    const { data: allowed, error: quotaError } = await admin.rpc(
      'consume_character_tts_quota',
      {
        p_user_id: user.id,
        p_daily_limit: DAILY_LIMIT,
      },
    )
    if (quotaError) {
      throw new Error(`Voice quota check failed: ${quotaError.message}`)
    }
    if (!allowed) {
      return json(
        429,
        'Daily character voice limit reached. Try again tomorrow.',
        corsHeaders,
        { 'Retry-After': '86400' },
      )
    }

    let generated: Response
    try {
      const { data: signedReference, error: signedError } = await admin.storage
        .from(REFERENCE_BUCKET)
        .createSignedUrl(VOICES[character], 300)
      if (signedError || !signedReference?.signedUrl) {
        throw new Error('The character reference voice is unavailable.')
      }

      const replicateToken = Deno.env.get('REPLICATE_API_TOKEN')
      if (!replicateToken) {
        throw new Error('Replicate voice generation is not configured.')
      }
      const seed = Number.parseInt(cacheKey.slice(0, 8), 16) % 2_147_483_647
      generated = await readPredictionAudio(replicateToken, {
        text,
        language,
        reference_audio: signedReference.signedUrl,
        exaggeration: EMOTIONS[emotion],
        cfg_weight: language === 'zh' ? 0.3 : 0.45,
        temperature: 0.65,
        seed,
      })
    } catch (error) {
      const { error: refundError } = await admin.rpc(
        'refund_character_tts_quota',
        { p_user_id: user.id },
      )
      if (refundError) {
        console.error('[character-tts] quota refund failed:', refundError.message)
      }
      throw error
    }

    const audioBytes = await generated.arrayBuffer()
    const audioType = generated.headers.get('Content-Type') ?? 'audio/wav'
    const { error: uploadError } = await admin.storage
      .from(CACHE_BUCKET)
      .upload(cachePath, audioBytes, {
        contentType: audioType,
        cacheControl: '86400',
        upsert: false,
      })
    if (
      uploadError &&
      !uploadError.message.toLowerCase().includes('already exists')
    ) {
      console.error('[character-tts] cache upload failed:', uploadError.message)
    }

    return new Response(audioBytes, {
      headers: {
        ...corsHeaders,
        'Content-Type': audioType,
        'Cache-Control': 'private, max-age=86400',
        'X-Voice-Cache': 'miss',
      },
    })
  } catch (error) {
    const message = error instanceof Error
      ? error.message
      : 'Character voice generation failed.'
    console.error('[character-tts]', message)
    return json(502, message, corsHeaders)
  }
})
