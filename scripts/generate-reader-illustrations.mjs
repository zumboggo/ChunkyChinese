import {
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  rmSync,
  writeFileSync,
} from 'node:fs'
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
const PACK_DIR = path.join(ROOT, 'public', 'reader-packs', 'lms-books')
const BOOK_DIR = path.join(PACK_DIR, 'books')
const IMAGE_ROOT = path.join(PACK_DIR, 'images')

const args = parseArgs(process.argv.slice(2))
loadEnv(path.resolve(args.env ?? DEFAULT_ENV))
const token = process.env.REPLICATE_API_TOKEN?.trim()
if (!token) throw new Error(`REPLICATE_API_TOKEN is missing. Checked ${args.env ?? DEFAULT_ENV}`)

const MODEL = args.model ?? (args.perSentenceSdxl ? 'stability-ai/sdxl' : 'black-forest-labs/flux-schnell')
const modelVersion = await resolveModelVersion(MODEL)
const books = loadBooks()
const total = books.reduce((sum, book) => sum + plannedImageCount(book), 0)
let completed = 0

for (const book of books) {
  const bookSlug = book.id
  const imageDir = path.join(IMAGE_ROOT, bookSlug)
  mkdirSync(imageDir, { recursive: true })
  removeOldTestImages(bookSlug)

  const sentences = flattenSentences(book)
  const illustrations = []
  for (let index = 0; index < sentences.length; index += args.perSentenceSdxl ? 1 : 2) {
    const group = args.perSentenceSdxl ? [sentences[index]] : sentences.slice(index, index + 2)
    const sentenceNumber = index + 1
    const imageIndex = args.perSentenceSdxl ? sentenceNumber : Math.floor(index / 2) + 1
    const filename = imageFilenameForIndex(index)
    const imageFilename = `reader-packs/lms-books/images/${bookSlug}/${filename}`
    const outputPath = path.join(imageDir, filename)
    const scene = describeScene(group)
    const prompt = buildPrompt(scene)

    illustrations.push({
      id: `${bookSlug}-illustration-${String(imageIndex).padStart(3, '0')}`,
      imageFilename,
      fallbackImageFilename: args.perSentenceSdxl && index % 2 === 1
        ? `reader-packs/lms-books/images/${bookSlug}/illustration-${String(Math.ceil(sentenceNumber / 2)).padStart(3, '0')}.webp`
        : undefined,
      alt: scene,
      prompt,
      sentenceStart: sentenceNumber,
      sentenceEnd: args.perSentenceSdxl ? sentenceNumber : Math.min(index + 2, sentences.length),
    })

    if ((args.skipExisting || isPreservedOddSentence(index)) && existsSync(outputPath)) {
      completed += 1
      continue
    }

    completed += 1
    console.log(
      `Generating ${completed}/${total}: ${bookSlug} sentences ${sentenceNumber}-${args.perSentenceSdxl ? sentenceNumber : Math.min(index + 2, sentences.length)}`,
    )
    const imageUrl = await runPredictionWithFallback(modelVersion, prompt, scene, 30_000 + completed)
    const response = await fetch(imageUrl)
    if (!response.ok) throw new Error(`Could not download image ${imageUrl}: HTTP ${response.status}`)
    writeFileSync(outputPath, Buffer.from(await response.arrayBuffer()))
    await delay(1200)
  }

  book.illustrations = illustrations
  writeFileSync(path.join(BOOK_DIR, `${book.id}.json`), `${JSON.stringify(book, null, 2)}\n`)
}

console.log(`Wrote ${total} reader illustration metadata entries.`)

function plannedImageCount(book) {
  const sentences = flattenSentences(book)
  return args.perSentenceSdxl ? sentences.length : Math.ceil(sentences.length / 2)
}

function imageFilenameForIndex(sentenceIndex) {
  if (!args.perSentenceSdxl) {
    return `illustration-${String(Math.floor(sentenceIndex / 2) + 1).padStart(3, '0')}.webp`
  }
  if (sentenceIndex % 2 === 0) {
    return `illustration-${String(Math.floor(sentenceIndex / 2) + 1).padStart(3, '0')}.webp`
  }
  return `sentence-${String(sentenceIndex + 1).padStart(3, '0')}.webp`
}

function isPreservedOddSentence(sentenceIndex) {
  return args.perSentenceSdxl && sentenceIndex % 2 === 0
}

function loadBooks() {
  return readdirSync(BOOK_DIR)
    .filter((file) => /^lms-book-1-chapters-\d+-\d+\.json$/u.test(file))
    .sort((a, b) => chapterStart(a) - chapterStart(b))
    .map((file) => JSON.parse(readFileSync(path.join(BOOK_DIR, file), 'utf8')))
}

function flattenSentences(book) {
  return book.stories.flatMap((story) =>
    story.sentences.map((sentence) => ({
      ...sentence,
      storyTitle: story.title,
      chapter: story.chapter,
      words: story.newWords?.map((word) => `${word.word} (${word.meaning})`).slice(0, 5) ?? [],
    })),
  )
}

function describeScene(group) {
  const chapter = group[0]?.chapter ?? 1
  const story = group[0]?.storyTitle ? `Story "${group[0].storyTitle}"` : 'the story'
  const english = group.map((sentence) => sentence.english).join(' ')
  const targetWords = [...new Set(group.flatMap((sentence) => sentence.words ?? []))].slice(0, 4)
  const wordCue = targetWords.length > 0 ? ` Key ideas: ${targetWords.join(', ')}.` : ''
  return `Book 1 chapter ${chapter}, ${story}: ${english}${wordCue}`
}

function buildPrompt(scene) {
  if (args.perSentenceSdxl) {
    return [
      'Vibrant beautiful detailed webcomic manga art, polished fantasy manhwa splash illustration, crisp clean line art, luminous color, dynamic composition, expressive faces, cinematic lighting, richly detailed backgrounds, high quality digital painting.',
      'Show Lee Hyun as a young Korean man with messy black hair. In game-world scenes, show him as a novice adventurer or sculptor with simple tools. Keep family characters warm and recognizable when relevant: younger sister small and anxious but sweet, grandmother elderly and gentle.',
      scene,
      'Single square reader illustration. No speech bubbles, no captions, no readable text, no watermark, no signature.',
    ].join(' ')
  }
  return [
    'Use this visual direction: vivid colorful chibi manga illustration like a cheerful fantasy webnovel splash image, big expressive eyes, oversized cute heads, energetic poses, exaggerated funny or dramatic emotions when the scene calls for it, polished anime lighting, crisp clean line art, bright blue skies or warm cozy interiors, charming fantasy-adventure mood.',
    'Keep Lee Hyun as a young Korean man with messy black hair. Use recurring family characters when relevant: his younger sister is small and anxious but sweet, his grandmother is elderly and gentle. In game-world scenes, show him as a cute novice adventurer or sculptor with simple tools.',
    scene,
    'Square composition for a small reader thumbnail. No speech bubbles, no captions, no readable text, no watermark, no signature.',
  ].join(' ')
}

async function resolveModelVersion(model) {
  const response = await replicateFetch(`https://api.replicate.com/v1/models/${model}`)
  return response.latest_version?.id
}

async function runPredictionWithFallback(version, prompt, scene, seed) {
  try {
    return await runPrediction(version, prompt, seed)
  } catch (error) {
    if (!isSafetyFailure(error)) throw error
    console.warn(`Safety fallback for seed ${seed}: ${error.message}`)
    return await runPrediction(version, buildSafePrompt(scene), seed + 90_000)
  }
}

async function runPrediction(version, prompt, seed) {
  const prediction = await replicateFetch('https://api.replicate.com/v1/predictions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      version,
      input: predictionInput(prompt, seed),
    }),
  })
  let current = prediction
  while (!['succeeded', 'failed', 'canceled'].includes(current.status)) {
    await delay(1000)
    current = await replicateFetch(current.urls.get)
  }
  if (current.status !== 'succeeded') {
    throw new Error(`Replicate prediction ${current.status}: ${current.error ?? 'unknown error'}`)
  }
  const output = Array.isArray(current.output) ? current.output[0] : current.output
  if (!output) throw new Error('Replicate succeeded without an image output URL.')
  return output
}

function predictionInput(prompt, seed) {
  if (args.perSentenceSdxl) {
    return {
      width: 1024,
      height: 1024,
      prompt,
      negative_prompt: 'speech bubble, caption, readable text, watermark, signature, logo, blurry, low quality, extra fingers, deformed hands',
      scheduler: 'K_EULER',
      num_outputs: 1,
      num_inference_steps: 35,
      guidance_scale: 7.5,
      prompt_strength: 0.8,
      refine: 'expert_ensemble_refiner',
      output_format: 'webp',
      seed,
    }
  }
  return {
    prompt,
    aspect_ratio: '1:1',
    num_outputs: 1,
    num_inference_steps: 4,
    output_format: 'webp',
    output_quality: 82,
    megapixels: '0.25',
    go_fast: false,
    seed,
  }
}

function buildSafePrompt(scene) {
  if (args.perSentenceSdxl) {
    return [
      'Wholesome vibrant detailed fantasy webcomic manga illustration, polished digital painting, expressive but family-friendly characters, clean line art, colorful lighting.',
      'Show Lee Hyun as a young Korean protagonist with messy black hair. Keep all characters fully clothed and child-safe. No romance, no gore, no injury, no suggestive framing.',
      scene.replace(/\b(sick|medicine|money|sell|empty|afraid|hard|difficult|blood|fight|weapon)\b/giu, 'important'),
      'Single square reader illustration. No speech bubbles, no captions, no readable text, no watermark, no signature.',
    ].join(' ')
  }
  return [
    'Wholesome bright chibi manga illustration, vivid colors, cute exaggerated emotional expressions, cozy family-friendly fantasy webnovel style, clean line art, polished anime lighting.',
    'Show Lee Hyun as a cute young Korean protagonist with messy black hair reacting dramatically but innocently. Keep all characters fully clothed and child-safe. No romance, no violence, no injury, no suggestive framing.',
    scene.replace(/\b(sick|medicine|money|sell|empty|afraid|hard|difficult)\b/giu, 'important'),
    'Square composition for a small reader thumbnail. No speech bubbles, no captions, no readable text, no watermark, no signature.',
  ].join(' ')
}

function isSafetyFailure(error) {
  return /nsfw|safety|filtered|blocked/iu.test(error instanceof Error ? error.message : String(error))
}

async function replicateFetch(url, options = {}) {
  let lastError
  for (let attempt = 1; attempt <= 5; attempt += 1) {
    const response = await fetch(url, {
      ...options,
      headers: {
        Authorization: `Bearer ${token}`,
        ...(options.headers ?? {}),
      },
    })
    const text = await response.text()
    if (response.ok) return JSON.parse(text)
    lastError = new Error(`Replicate HTTP ${response.status}: ${text}`)
    if (response.status !== 429 || attempt === 5) break
    const retryAfter = Number(response.headers.get('retry-after')) || retryAfterSeconds(text) || 5
    await delay((retryAfter + attempt) * 1000)
  }
  throw lastError
}

function parseArgs(values) {
  const parsed = { skipExisting: false, perSentenceSdxl: false }
  for (let index = 0; index < values.length; index += 1) {
    const value = values[index]
    if (value === '--env') parsed.env = values[++index]
    else if (value === '--skip-existing') parsed.skipExisting = true
    else if (value === '--per-sentence-sdxl') parsed.perSentenceSdxl = true
    else if (value === '--model') parsed.model = values[++index]
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

function removeOldTestImages(bookSlug) {
  if (bookSlug !== 'lms-book-1-chapters-1-5') return
  const oldDir = path.join(IMAGE_ROOT, 'book-1-chapters-1-5')
  rmSync(oldDir, { recursive: true, force: true })
}

function chapterStart(filename) {
  return Number(filename.match(/chapters-(\d+)-/u)?.[1] ?? 0)
}

function retryAfterSeconds(text) {
  return Number(text.match(/retry_after"?\s*:?\s*(\d+)/iu)?.[1] ?? 0)
}

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}
