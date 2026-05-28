import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const DEFAULT_ENV = path.join(
  process.env.USERPROFILE ?? '',
  'Documents',
  'LearnChinese',
  'LMS',
  'TTS_Pipeline',
  '.env',
)
const MODEL = process.env.IMAGE_MODEL || 'ideogram-ai/ideogram-v3-balanced'
const RAW_DIR = path.join(ROOT, 'tmp', 'nav-icons-ideogram')
const ASSET_DIR = path.join(ROOT, 'src', 'assets')

loadEnv(process.env.IMAGE_ENV || DEFAULT_ENV)
const token = process.env.REPLICATE_API_TOKEN?.trim()
if (!token) throw new Error(`REPLICATE_API_TOKEN is missing. Checked ${process.env.IMAGE_ENV || DEFAULT_ENV}`)

mkdirSync(RAW_DIR, { recursive: true })
mkdirSync(ASSET_DIR, { recursive: true })

const specs = [
  ['flashcards_icon', 'two stacked study flashcards, one front card with a simple sparkle mark'],
  ['settings_icon', 'a simple gear with six rounded teeth and a small center circle'],
  ['listen_icon', 'simple headphones around a small sound wave'],
]

for (const [name, subject] of specs) {
  const prompt = [
    `${subject}.`,
    'Minimalist mobile app navigation icon.',
    'Pure black smooth line art only, rounded caps, vector-like clean strokes.',
    'Centered single symbol with generous padding, readable at 28px.',
    'Perfectly flat solid #00ff00 chroma-key background for background removal.',
    'No text, no letters, no watermark, no signature, no gray, no shadow, no gradient, no texture, no 3D.',
    'Do not use green in the icon itself.',
  ].join(' ')

  console.log(`Generating ${name} with ${MODEL}`)
  const imageUrl = await runPrediction(prompt)
  const response = await fetch(imageUrl)
  if (!response.ok) throw new Error(`Could not download ${name}: HTTP ${response.status}`)
  writeFileSync(path.join(RAW_DIR, `${name}.webp`), Buffer.from(await response.arrayBuffer()))
}

console.log(`Generated raw icons in ${RAW_DIR}. Remove the green chroma key into ${ASSET_DIR}.`)

async function runPrediction(prompt) {
  const prediction = await replicateFetch(`https://api.replicate.com/v1/models/${MODEL}/predictions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      input: {
        prompt,
        aspect_ratio: '1:1',
        magic_prompt_option: 'Off',
      },
    }),
  })
  let current = prediction
  while (!['succeeded', 'failed', 'canceled'].includes(current.status)) {
    await delay(1500)
    current = await replicateFetch(current.urls.get)
  }
  if (current.status !== 'succeeded') {
    throw new Error(`Replicate prediction ${current.status}: ${current.error ?? 'unknown error'}`)
  }
  const output = Array.isArray(current.output) ? current.output[0] : current.output
  if (typeof output === 'string') return output
  if (output?.url) return output.url
  throw new Error('Replicate prediction did not return an image URL.')
}

async function replicateFetch(url, options = {}) {
  const response = await fetch(url, {
    ...options,
    headers: {
      Authorization: `Bearer ${token}`,
      ...(options.headers ?? {}),
    },
  })
  const text = await response.text()
  if (response.ok) return JSON.parse(text)
  throw new Error(`Replicate HTTP ${response.status}: ${text}`)
}

function loadEnv(envPath) {
  if (!existsSync(envPath)) return
  for (const line of readFileSync(envPath, 'utf8').split(/\r?\n/u)) {
    const match = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/u)
    if (!match || process.env[match[1]]) continue
    process.env[match[1]] = match[2].replace(/^["']|["']$/gu, '').trim()
  }
}

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}
