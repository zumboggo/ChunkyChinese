/**
 * Generate LMS book audio clips using Google Cloud TTS CHIRP voices.
 *
 * Usage:
 *   node scripts/generate-lms-audio.mjs [options]
 *
 * Options:
 *   --key <path>   Path to a Google Cloud service-account JSON key file.
 *                  Falls back to GOOGLE_APPLICATION_CREDENTIALS env var.
 *   --skip-existing  Skip sentences where the .mp3 already exists (default: true)
 *   --overwrite    Re-generate all clips even if they already exist
 *   --dry-run      Print what would be generated without calling the API
 *   --books <ids>  Comma-separated book IDs to process (default: all)
 *
 * Environment variables:
 *   GOOGLE_CLOUD_TTS_KEY   API key string (alternative to service account)
 *   GOOGLE_APPLICATION_CREDENTIALS  Path to service-account JSON
 *
 * Required Google Cloud permissions:
 *   Cloud Text-to-Speech API must be enabled in your project.
 *
 * CHIRP3 HD voices used (Mandarin Chinese):
 *   cmn-CN-Chirp3-HD-Aoede    (female, warm)
 *   cmn-CN-Chirp3-HD-Leda     (female, clear)
 *   cmn-CN-Chirp3-HD-Puck     (male, energetic)
 *   cmn-CN-Chirp3-HD-Charon   (male, deep)
 *   cmn-CN-Chirp3-HD-Kore     (female, gentle)
 *   cmn-CN-Chirp3-HD-Zephyr   (male, calm)
 *
 * Each story is assigned a different voice for natural variety.
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs'
import { join, dirname, resolve } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = resolve(__dirname, '..')
const PACK_DIR = join(ROOT, 'public', 'reader-packs', 'lms-books')
const AUDIO_DIR = join(PACK_DIR, 'audio', 'sentences')

// CHIRP3 HD Mandarin voices — assigned round-robin per story
const CHIRP_VOICES = [
  'cmn-CN-Chirp3-HD-Aoede',
  'cmn-CN-Chirp3-HD-Leda',
  'cmn-CN-Chirp3-HD-Puck',
  'cmn-CN-Chirp3-HD-Charon',
  'cmn-CN-Chirp3-HD-Kore',
  'cmn-CN-Chirp3-HD-Zephyr',
]

// ── CLI args ─────────────────────────────────────────────────────────────────
const args = process.argv.slice(2)
const getArg = (flag) => {
  const i = args.indexOf(flag)
  return i !== -1 ? args[i + 1] : null
}
const hasFlag = (flag) => args.includes(flag)

const keyFile = getArg('--key') ?? process.env.GOOGLE_APPLICATION_CREDENTIALS
const apiKey = process.env.GOOGLE_CLOUD_TTS_KEY
const skipExisting = !hasFlag('--overwrite')
const dryRun = hasFlag('--dry-run')
const booksFilter = getArg('--books')?.split(',').map(s => s.trim()) ?? null

if (!keyFile && !apiKey) {
  console.error('❌  Provide a Google Cloud API key or service-account file:')
  console.error('   --key path/to/key.json')
  console.error('   GOOGLE_CLOUD_TTS_KEY=<api-key-string> node scripts/generate-lms-audio.mjs')
  console.error('   GOOGLE_APPLICATION_CREDENTIALS=path/to/key.json node scripts/generate-lms-audio.mjs')
  process.exit(1)
}

// ── Auth ──────────────────────────────────────────────────────────────────────
let accessToken = null

async function getAccessToken() {
  if (apiKey) return null  // use API key param instead
  if (accessToken) return accessToken

  // Use service-account JSON to get a token via JWT → OAuth2
  const key = JSON.parse(readFileSync(keyFile, 'utf8'))
  const now = Math.floor(Date.now() / 1000)
  const payload = {
    iss: key.client_email,
    scope: 'https://www.googleapis.com/auth/cloud-platform',
    aud: 'https://oauth2.googleapis.com/token',
    iat: now,
    exp: now + 3600,
  }

  // Encode JWT manually (no external deps)
  const encodeB64Url = (buf) => Buffer.from(buf).toString('base64url')
  const header = encodeB64Url(JSON.stringify({ alg: 'RS256', typ: 'JWT' }))
  const body = encodeB64Url(JSON.stringify(payload))
  const unsigned = `${header}.${body}`

  // Sign with RSA-SHA256 using Node crypto
  const { createSign } = await import('crypto')
  const sign = createSign('RSA-SHA256')
  sign.update(unsigned)
  const signature = sign.sign(key.private_key, 'base64url')
  const jwt = `${unsigned}.${signature}`

  const resp = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion: jwt,
    }),
  })
  if (!resp.ok) {
    const err = await resp.text()
    throw new Error(`OAuth token fetch failed: ${resp.status} ${err}`)
  }
  const data = await resp.json()
  accessToken = data.access_token
  return accessToken
}

// ── TTS call ──────────────────────────────────────────────────────────────────
async function synthesize(text, voiceName, retries = 3) {
  const token = await getAccessToken()
  const url = apiKey
    ? `https://texttospeech.googleapis.com/v1/text:synthesize?key=${apiKey}`
    : 'https://texttospeech.googleapis.com/v1/text:synthesize'
  const headers = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  }
  const body = JSON.stringify({
    input: { text },
    voice: { languageCode: 'cmn-CN', name: voiceName },
    audioConfig: { audioEncoding: 'MP3', speakingRate: 0.9 },
  })

  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const resp = await fetch(url, { method: 'POST', headers, body })
      if (!resp.ok) {
        const err = await resp.text()
        if (resp.status === 429 && attempt < retries) {
          const delay = attempt * 2000
          console.warn(`  Rate limited — waiting ${delay}ms…`)
          await new Promise(r => setTimeout(r, delay))
          continue
        }
        throw new Error(`TTS API error ${resp.status}: ${err}`)
      }
      const data = await resp.json()
      return Buffer.from(data.audioContent, 'base64')
    } catch (err) {
      if (attempt === retries) throw err
      await new Promise(r => setTimeout(r, attempt * 1000))
    }
  }
}

// ── Main ──────────────────────────────────────────────────────────────────────
async function main() {
  const manifest = JSON.parse(readFileSync(join(PACK_DIR, 'reader_manifest.json'), 'utf8'))
  const books = manifest.books.filter(b => !booksFilter || booksFilter.includes(b.id))

  if (books.length === 0) {
    console.error('No books matched the filter. Available IDs:')
    manifest.books.forEach(b => console.error(' ', b.id))
    process.exit(1)
  }

  console.log(`📚  Processing ${books.length} book(s) — ${books.reduce((s, b) => s + b.sentenceCount, 0)} sentences total`)
  console.log(`    Mode: ${dryRun ? 'DRY RUN' : skipExisting ? 'skip-existing' : 'overwrite all'}`)
  console.log()

  mkdirSync(AUDIO_DIR, { recursive: true })

  let storyCount = 0
  let generated = 0
  let skipped = 0
  let errors = 0

  for (const bookMeta of books) {
    const bookJson = JSON.parse(readFileSync(join(PACK_DIR, bookMeta.path), 'utf8'))
    console.log(`📖  ${bookMeta.title}`)

    for (const story of bookJson.stories) {
      const voiceIndex = storyCount % CHIRP_VOICES.length
      const voice = CHIRP_VOICES[voiceIndex]
      storyCount++

      for (const sentence of story.sentences) {
        const filename = sentence.audioFilename.split('/').pop()
        const outPath = join(AUDIO_DIR, filename)

        if (skipExisting && existsSync(outPath)) {
          skipped++
          continue
        }

        if (dryRun) {
          console.log(`  [dry] ${filename}  voice=${voice}  text="${sentence.chinese}"`)
          generated++
          continue
        }

        try {
          const mp3 = await synthesize(sentence.chinese, voice)
          writeFileSync(outPath, mp3)
          generated++
          process.stdout.write(`\r  ✓ ${generated + skipped}/${bookMeta.sentenceCount} — ${filename}`.padEnd(80))
        } catch (err) {
          errors++
          console.error(`\n  ✗ ${filename}: ${err.message}`)
        }

        // Polite delay to avoid rate limits
        await new Promise(r => setTimeout(r, 120))
      }

      console.log(`\n  Story "${story.title ?? story.id}": voice=${voice}`)
    }
  }

  console.log()
  console.log('─'.repeat(50))
  console.log(`✅  Generated: ${generated}   Skipped: ${skipped}   Errors: ${errors}`)
  if (generated > 0 && !dryRun) {
    console.log()
    console.log('Next steps:')
    console.log('  1. Open the app')
    console.log('  2. Go to Settings → Reader Packs → LMS Books → Redownload')
    console.log('     (the app fetches clips from these paths at import time)')
  }
}

main().catch(err => {
  console.error('Fatal:', err.message)
  process.exit(1)
})
