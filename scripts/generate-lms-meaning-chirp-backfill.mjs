/**
 * Backfill missing LMS vocabulary meaning clips with Google Cloud TTS Chirp.
 *
 * This script only generates English meaning clips that are absent from the
 * existing LMS clip-pack manifest or missing on disk. It does not replace
 * working Azure clips.
 *
 * Usage:
 *   node scripts/generate-lms-meaning-chirp-backfill.mjs --dry-run
 *   GOOGLE_CLOUD_TTS_KEY=<key> node scripts/generate-lms-meaning-chirp-backfill.mjs
 *   node scripts/generate-lms-meaning-chirp-backfill.mjs --key path/to/service-account.json
 */

import { createSign } from 'crypto'
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs'
import { dirname, join, resolve } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = resolve(__dirname, '..')
const PACK_DIR = join(ROOT, 'public', 'clip-packs', 'lms-1000-azure')
const MANIFEST_PATH = join(PACK_DIR, 'clips_manifest.json')
const VOCAB_PATH = join(PACK_DIR, 'vocab.csv')
const MEANINGS_DIR = join(PACK_DIR, 'audio', 'meanings')
const VOICE = 'en-US-Chirp3-HD-Aoede'

const args = process.argv.slice(2)
const hasFlag = (flag) => args.includes(flag)
const getArg = (flag) => {
  const index = args.indexOf(flag)
  return index === -1 ? undefined : args[index + 1]
}

const dryRun = hasFlag('--dry-run')
const keyFile = getArg('--key') ?? process.env.GOOGLE_APPLICATION_CREDENTIALS
const apiKey = process.env.GOOGLE_CLOUD_TTS_KEY

if (!dryRun && !apiKey && !keyFile) {
  console.error('Provide GOOGLE_CLOUD_TTS_KEY, GOOGLE_APPLICATION_CREDENTIALS, --key, or use --dry-run.')
  process.exit(1)
}

const manifest = JSON.parse(readFileSync(MANIFEST_PATH, 'utf8'))
const words = parseCsv(readFileSync(VOCAB_PATH, 'utf8')).filter((row) => row.word && row.meaning)
const existingMeaningEntries = new Map(
  manifest.clips
    .filter((clip) => clip.type === 'meaning')
    .flatMap((clip) => (clip.linkedWordIds ?? []).map((wordId) => [wordId, clip])),
)

mkdirSync(MEANINGS_DIR, { recursive: true })

let created = 0
let skipped = 0

for (const word of words) {
  const wordId = `word:${word.word}`
  const existing = existingMeaningEntries.get(wordId)
  const outputPath = existing?.path ?? `audio/meanings/${slugify(word.meaning)}.mp3`
  const outputFile = join(PACK_DIR, outputPath)
  const needsClip = !existing || !existsSync(outputFile)

  if (!needsClip) {
    skipped += 1
    continue
  }

  console.log(`${dryRun ? 'Would generate' : 'Generating'} ${word.word}: ${word.meaning}`)
  if (!dryRun) {
    const audioContent = await synthesize(word.meaning)
    mkdirSync(dirname(outputFile), { recursive: true })
    writeFileSync(outputFile, Buffer.from(audioContent, 'base64'))
  }

  if (!existing) {
    manifest.clips.push({
      id: `meaning:${word.word}`,
      type: 'meaning',
      text: word.meaning,
      language: 'en-US',
      path: outputPath,
      label: word.meaning,
      linkedWordIds: [wordId],
      provider: 'google-cloud-tts',
      voice: VOICE,
    })
  }
  created += 1
}

if (!dryRun && created > 0) {
  manifest.createdAt = new Date().toISOString()
  writeFileSync(MANIFEST_PATH, `${JSON.stringify(manifest, null, 2)}\n`)
}

console.log(`Done. ${dryRun ? 'Would create' : 'Created'} ${created}; skipped ${skipped}.`)

async function synthesize(text) {
  const url = apiKey
    ? `https://texttospeech.googleapis.com/v1/text:synthesize?key=${encodeURIComponent(apiKey)}`
    : 'https://texttospeech.googleapis.com/v1/text:synthesize'
  const headers = { 'Content-Type': 'application/json' }
  if (!apiKey) headers.Authorization = `Bearer ${await getAccessToken()}`
  const response = await fetch(url, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      input: { text },
      voice: { languageCode: 'en-US', name: VOICE },
      audioConfig: { audioEncoding: 'MP3', speakingRate: 0.95 },
    }),
  })
  if (!response.ok) {
    throw new Error(`Google TTS failed: HTTP ${response.status} ${await response.text()}`)
  }
  const json = await response.json()
  return json.audioContent
}

let accessToken

async function getAccessToken() {
  if (accessToken) return accessToken
  const key = JSON.parse(readFileSync(keyFile, 'utf8'))
  const now = Math.floor(Date.now() / 1000)
  const header = Buffer.from(JSON.stringify({ alg: 'RS256', typ: 'JWT' })).toString('base64url')
  const payload = Buffer.from(
    JSON.stringify({
      iss: key.client_email,
      scope: 'https://www.googleapis.com/auth/cloud-platform',
      aud: 'https://oauth2.googleapis.com/token',
      iat: now,
      exp: now + 3600,
    }),
  ).toString('base64url')
  const signer = createSign('RSA-SHA256')
  signer.update(`${header}.${payload}`)
  const signature = signer.sign(key.private_key, 'base64url')
  const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion: `${header}.${payload}.${signature}`,
    }),
  })
  if (!tokenResponse.ok) {
    throw new Error(`Could not get Google access token: HTTP ${tokenResponse.status}`)
  }
  accessToken = (await tokenResponse.json()).access_token
  return accessToken
}

function parseCsv(text) {
  const rows = []
  let row = []
  let field = ''
  let inQuotes = false
  for (let index = 0; index < text.length; index += 1) {
    const char = text[index]
    const next = text[index + 1]
    if (char === '"' && inQuotes && next === '"') {
      field += '"'
      index += 1
    } else if (char === '"') {
      inQuotes = !inQuotes
    } else if (char === ',' && !inQuotes) {
      row.push(field)
      field = ''
    } else if ((char === '\n' || char === '\r') && !inQuotes) {
      if (char === '\r' && next === '\n') index += 1
      row.push(field)
      if (row.some((cell) => cell.trim() !== '')) rows.push(row)
      row = []
      field = ''
    } else {
      field += char
    }
  }
  row.push(field)
  if (row.some((cell) => cell.trim() !== '')) rows.push(row)
  const headers = rows.shift()?.map((header) => header.trim()) ?? []
  return rows.map((cells) =>
    Object.fromEntries(headers.map((header, index) => [header, (cells[index] ?? '').trim()])),
  )
}

function slugify(text) {
  return (
    text
      .toLowerCase()
      .replace(/['"]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 96) || 'meaning'
  )
}
