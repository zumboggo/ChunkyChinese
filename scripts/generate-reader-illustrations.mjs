import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
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
const BOOK_PATH = path.join(
  ROOT,
  'public',
  'reader-packs',
  'lms-books',
  'books',
  'lms-book-1-chapters-1-5.json',
)
const IMAGE_DIR = path.join(
  ROOT,
  'public',
  'reader-packs',
  'lms-books',
  'images',
  'book-1-chapters-1-5',
)
const MODEL = 'black-forest-labs/flux-schnell'

const prompts = [
  {
    id: 'b01c01-test-001',
    sentenceStart: 1,
    sentenceEnd: 5,
    file: 'illustration-001.png',
    alt: 'Lee Hyun returns from work to care for his grandmother and younger sister in a modest home.',
    scene:
      'A tired young Korean man in work clothes stands in the doorway of a cramped apartment, checking on his sick grandmother while his younger sister sits nearby with a worried expression, plain walls and unmarked household objects.',
  },
  {
    id: 'b01c01-test-002',
    sentenceStart: 6,
    sentenceEnd: 10,
    file: 'illustration-002.png',
    alt: 'Lee Hyun sits at his computer, quietly looking at an old game account.',
    scene:
      'A young man sits alone at an old computer late at night, a soft abstract fantasy avatar glow on the monitor with no interface text, giving him a small moment of calm in a dark room.',
  },
  {
    id: 'b01c01-test-003',
    sentenceStart: 11,
    sentenceEnd: 15,
    file: 'illustration-003.png',
    alt: 'Lee Hyun weighs his old game account against the need for medicine money.',
    scene:
      'A tense quiet family room with a small medicine bottle and blank envelope on a low table, a young man looking down in silence while his younger sister watches him anxiously.',
  },
  {
    id: 'b01c01-test-004',
    sentenceStart: 16,
    sentenceEnd: 20,
    file: 'illustration-004.png',
    alt: 'Lee Hyun sits between his old game card and his family obligation.',
    scene:
      'A conflicted young man sits at a table beside a plain blank game keepsake card and the open doorway to his grandmother room, torn between personal hope and family duty.',
  },
  {
    id: 'b01c01-test-005',
    sentenceStart: 21,
    sentenceEnd: 25,
    file: 'illustration-005.png',
    alt: 'Lee Hyun brings money home and his family feels relief.',
    scene:
      'A small but emotional homecoming: a young man places a simple stack of money on the table, his grandmother smiles softly, and his younger sister relaxes with visible relief, uncluttered tabletop.',
  },
]

const args = parseArgs(process.argv.slice(2))
loadEnv(path.resolve(args.env ?? DEFAULT_ENV))
const token = process.env.REPLICATE_API_TOKEN?.trim()
if (!token) throw new Error(`REPLICATE_API_TOKEN is missing. Checked ${args.env ?? DEFAULT_ENV}`)

mkdirSync(IMAGE_DIR, { recursive: true })
const modelVersion = await resolveModelVersion(MODEL)
const book = JSON.parse(readFileSync(BOOK_PATH, 'utf8'))
const illustrations = []

for (const [index, item] of prompts.entries()) {
  const imageFilename = `reader-packs/lms-books/images/book-1-chapters-1-5/${item.file}`
  const outputPath = path.join(IMAGE_DIR, item.file)
  const prompt = buildPrompt(item.scene)
  illustrations.push({
    id: item.id,
    imageFilename,
    alt: item.alt,
    prompt,
    sentenceStart: item.sentenceStart,
    sentenceEnd: item.sentenceEnd,
  })
  console.log(`Generating ${index + 1}/${prompts.length}: ${item.file}`)
  const imageUrl = await runPrediction(modelVersion, prompt, 10_000 + index)
  const response = await fetch(imageUrl)
  if (!response.ok) throw new Error(`Could not download image ${imageUrl}: HTTP ${response.status}`)
  writeFileSync(outputPath, Buffer.from(await response.arrayBuffer()))
}

book.illustrations = illustrations
writeFileSync(BOOK_PATH, `${JSON.stringify(book, null, 2)}\n`)
console.log(`Wrote ${illustrations.length} illustrations to ${IMAGE_DIR}`)

function buildPrompt(scene) {
  return [
    scene,
    'Manga-inspired digital illustration, expressive clean linework, cinematic panel composition, soft watercolor shading, grounded modern Korean urban drama mood, warm interior lighting. No text anywhere, no letters, no numbers, no labels, no signs, no posters, no handwriting, no captions, no speech bubbles, no watermark, no signature.',
  ].join(' ')
}

async function resolveModelVersion(model) {
  const response = await replicateFetch(`https://api.replicate.com/v1/models/${model}`)
  return response.latest_version?.id
}

async function runPrediction(version, prompt, seed) {
  const prediction = await replicateFetch('https://api.replicate.com/v1/predictions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      version,
      input: {
        prompt,
        aspect_ratio: '1:1',
        num_outputs: 1,
        num_inference_steps: 4,
        output_format: 'png',
        output_quality: 100,
        megapixels: '1',
        go_fast: false,
        seed,
      },
    }),
  })
  let current = prediction
  while (!['succeeded', 'failed', 'canceled'].includes(current.status)) {
    await delay(1200)
    current = await replicateFetch(current.urls.get)
  }
  if (current.status !== 'succeeded') {
    throw new Error(`Replicate prediction ${current.status}: ${current.error ?? 'unknown error'}`)
  }
  const output = Array.isArray(current.output) ? current.output[0] : current.output
  if (!output) throw new Error('Replicate succeeded without an image output URL.')
  return output
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
  if (!response.ok) throw new Error(`Replicate HTTP ${response.status}: ${text}`)
  return JSON.parse(text)
}

function parseArgs(values) {
  const parsed = {}
  for (let index = 0; index < values.length; index += 1) {
    const value = values[index]
    if (value === '--env') parsed.env = values[++index]
  }
  return parsed
}

function loadEnv(envPath) {
  for (const line of readFileSync(envPath, 'utf8').split(/\r?\n/u)) {
    const match = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/u)
    if (!match || process.env[match[1]]) continue
    process.env[match[1]] = match[2].replace(/^["']|["']$/gu, '').trim()
  }
}

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}
