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
if (!args.dryRun) loadEnv(path.resolve(args.env ?? DEFAULT_ENV))
const token = process.env.REPLICATE_API_TOKEN?.trim()
if (!args.dryRun && !token) {
  throw new Error(`REPLICATE_API_TOKEN is missing. Checked ${args.env ?? DEFAULT_ENV}`)
}

const MODEL = args.model ?? (args.perSentenceSdxl ? 'stability-ai/sdxl' : 'black-forest-labs/flux-schnell')
const modelVersion = args.dryRun ? undefined : await resolveModelVersion(MODEL)
const books = loadBooks()
if (books.length === 0) {
  throw new Error(args.bookId ? `No reader book matched --book-id ${args.bookId}.` : 'No reader books found.')
}
const plannedJobs = books.flatMap((book) => createImageJobs(book))
const selectedJobs = selectJobs(plannedJobs)
const total = selectedJobs.length
let completed = 0

console.log(
  `${args.dryRun ? 'Dry run' : 'Planning'} ${total}/${plannedJobs.length} image jobs with ${MODEL}` +
    `${args.proof ? ' in proof mode' : ''}.`,
)

if (args.dryRun) {
  for (const job of selectedJobs) {
    console.log(
      [
        `${job.book.id} sentence ${job.sentenceNumber}`,
        job.outputPath,
        job.prompt,
      ].join('\n  '),
    )
  }
  process.exit(0)
}

for (const job of selectedJobs) {
  const imageDir = path.dirname(job.outputPath)
  mkdirSync(imageDir, { recursive: true })
  removeOldTestImages(job.book.id)

  if (args.skipExisting && existsSync(job.outputPath)) {
    completed += 1
    console.log(`Skipping ${completed}/${total}: ${job.outputPath}`)
    continue
  }

  completed += 1
  console.log(`Generating ${completed}/${total}: ${job.book.id} sentence ${job.sentenceNumber}`)
  const imageUrl = await runPredictionWithFallback(modelVersion, job.prompt, job.scene, 30_000 + completed)
  const response = await fetch(imageUrl)
  if (!response.ok) throw new Error(`Could not download image ${imageUrl}: HTTP ${response.status}`)
  writeFileSync(job.outputPath, Buffer.from(await response.arrayBuffer()))
  await delay(1200)
}

if (shouldWriteMetadata()) {
  for (const book of books) {
    const illustrations = createImageJobs(book).map((job) => job.illustration)
    book.illustrations = illustrations
    writeFileSync(path.join(BOOK_DIR, `${book.id}.json`), `${JSON.stringify(book, null, 2)}\n`)
  }
  console.log(`Wrote ${plannedJobs.length} reader illustration metadata entries.`)
} else {
  console.log('Left reader book metadata unchanged.')
}

console.log(`Finished ${total} image jobs.`)

function shouldWriteMetadata() {
  return !args.proof && !args.limit
}

function createImageJobs(book) {
  const sentences = flattenSentences(book)
  const jobs = []
  const groupSize = usesPerSentenceMode() ? 1 : 2
  for (let index = 0; index < sentences.length; index += groupSize) {
    const group = sentences.slice(index, index + groupSize)
    const sentenceNumber = index + 1
    const imageIndex = usesPerSentenceMode() ? sentenceNumber : Math.floor(index / 2) + 1
    const filename = imageFilenameForIndex(index)
    const proofDir = args.proofLabel ?? 'proof-flux'
    const relativeDir = args.proof
      ? `reader-packs/lms-books/images/${book.id}/${proofDir}`
      : `reader-packs/lms-books/images/${book.id}`
    const imageFilename = `${relativeDir}/${filename}`
    const outputPath = path.join(ROOT, 'public', imageFilename)
    const scene = describeScene(book, group, sentences, index)
    const prompt = buildPrompt(scene)
    jobs.push({
      book,
      sentenceNumber,
      outputPath,
      scene,
      prompt,
      illustration: {
        id: `${book.id}-${usesPerSentenceMode() ? 'sentence' : 'illustration'}-${String(imageIndex).padStart(3, '0')}`,
        imageFilename,
        alt: scene,
        prompt,
        sentenceStart: sentenceNumber,
        sentenceEnd: usesPerSentenceMode() ? sentenceNumber : Math.min(index + 2, sentences.length),
      },
    })
  }
  return jobs
}

function selectJobs(jobs) {
  if (!args.limit) return jobs
  if (!args.proof) return jobs.slice(0, args.limit)
  if (args.limit >= jobs.length) return jobs
  if (args.limit === 1) return [jobs[0]]
  const selected = []
  const usedIndexes = new Set()
  for (let index = 0; index < args.limit; index += 1) {
    const jobIndex = Math.round((index * (jobs.length - 1)) / (args.limit - 1))
    if (usedIndexes.has(jobIndex)) continue
    usedIndexes.add(jobIndex)
    selected.push(jobs[jobIndex])
  }
  return selected
}

function imageFilenameForIndex(sentenceIndex) {
  if (!usesPerSentenceMode()) {
    return `illustration-${String(Math.floor(sentenceIndex / 2) + 1).padStart(3, '0')}.webp`
  }
  return `sentence-${String(sentenceIndex + 1).padStart(3, '0')}.webp`
}

function usesPerSentenceMode() {
  return args.perSentence || args.perSentenceSdxl
}

function loadBooks() {
  return readdirSync(BOOK_DIR)
    .filter((file) => /^lms-book-1-chapters-\d+-\d+\.json$/u.test(file))
    .filter((file) => !args.bookId || file === `${args.bookId}.json`)
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

function describeScene(book, group, allSentences = group, sentenceIndex = 0) {
  const chapter = group[0]?.chapter ?? 1
  const story = group[0]?.storyTitle ? `Story "${group[0].storyTitle}"` : 'the story'
  const english = group.map((sentence) => sentence.english).join(' ')
  const previous = usesPerSentenceMode() ? allSentences[sentenceIndex - 1]?.english : undefined
  const next = usesPerSentenceMode() ? allSentences[sentenceIndex + 1]?.english : undefined
  const context = [previous ? `Previous: ${previous}` : '', next ? `Next: ${next}` : '']
    .filter(Boolean)
    .join(' ')
  const targetWords = [...new Set(group.flatMap((sentence) => sentence.words ?? []))].slice(0, 4)
  const wordCue = targetWords.length > 0 ? ` Key ideas: ${targetWords.join(', ')}.` : ''
  const bookCue = book.id === 'lms-book-1-chapters-16-20'
    ? 'Adapted LMS Book 2 scene'
    : `Book ${book.book} scene`
  return `${bookCue}, learner chapter ${chapter}, ${story}. Current sentence: ${english}${context ? ` ${context}` : ''}${wordCue}`
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
    'Vibrant beautiful detailed fantasy webcomic manga art, polished manhwa-style digital painting, expressive faces, crisp clean line art, luminous color, cinematic lighting, rich backgrounds, dynamic but readable square composition.',
    characterGuide(scene),
    moodGuide(),
    scene,
    'Illustrate the current sentence, using previous and next only as context. Show one main character unless the sentence clearly mentions companions, monsters, or a crowd. Square composition for a small reader thumbnail. Do not include signs, posters, labels, calligraphy, decorative glyphs, UI overlays, speech bubbles, captions, readable text, watermark, signature, logo, artist monogram, or initials.',
  ].join(' ')
}

function characterGuide(scene) {
  const lowerScene = scene.toLowerCase()
  const guides = [
    'Reference character style: elegant fantasy webcomic cast with Korean manhwa proportions, ornate adventure clothing, consistent hair colors and silhouettes. Use the Weed/Lee Hyun reference sheets as text guidance: tousled dark brown hair, sharp amber-brown eyes, lean athletic build, expressive eyebrows, practical clothing that shifts between modern hoodie, moonlit black cloak, and fantasy sculptor-adventurer gear.',
    'Weed / Lee Hyun: young Korean man, messy dark brown-black hair, confident practical expression, white shirt, leather straps, brown adventurer sculptor gear, leather gloves, sculpting tools or sword when relevant. His character is a low-status sculptor who chooses creation over glory, fierce work over fame, and practical kindness over softness. His face should often show determination, clever mischievous glee, wild moonlit focus, or fierce kindness.',
  ]
  if (/\birene\b|priest|cleric|heal|holy/iu.test(lowerScene)) {
    guides.push('Irene: gentle blonde cleric in white and gold fantasy robes, blue eyes, ornate staff, kind expression.')
  }
  if (/\bseoyoon\b|black hair|quiet woman/iu.test(lowerScene)) {
    guides.push('Seoyoon: elegant black-haired woman in white and deep purple fantasy robes, calm violet eyes, graceful reserved pose.')
  }
  if (/\bpale\b|archer|bow/iu.test(lowerScene)) {
    guides.push('Pale: cheerful young archer with light brown ponytail, green adventurer outfit, bright lively smile, bow and quiver.')
  }
  if (/\bsurka\b|martial|punch|fighter/iu.test(lowerScene)) {
    guides.push('Surka: energetic martial artist girl with brown ponytail, red and white outfit, playful determined expression.')
  }
  if (/\bromuna\b|mage|magic|spell|wizard/iu.test(lowerScene)) {
    guides.push('Romuna: purple-haired mage with large dark witch hat, black and purple robes, glowing violet magic.')
  }
  if (/\bmapan\b|merchant|trade|sell|money|shop/iu.test(lowerScene)) {
    guides.push('Mapan: round cheerful merchant with curly brown hair, green and gold clothes, friendly grin, travel pouches.')
  }
  if (/\bhwarveong\b|dance|dancer/iu.test(lowerScene)) {
    guides.push('Hwarveong: graceful dancer with long dark hair, red and gold fantasy performer outfit, elegant confident pose.')
  }
  if (/\bgeomchi\b|master|disciple|sword|warrior|knight|cave of dead warriors/iu.test(lowerScene)) {
    guides.push('Geomchi: muscular sword master with long dark hair and beard, black martial robe, huge sword, fierce grin. Geomchi disciples: young swordsmen in matching black robes.')
  }
  guides.push('Only include characters who fit the sentence; if no named supporting character appears, focus on Weed and the environment.')
  return guides.join(' ')
}

function moodGuide() {
  if (!args.mood) return ''
  return `Emotional direction: ${args.mood}. Prefer determined eyes, a sly satisfied grin, protective warmth, and fierce kindness over blank neutral expressions.`
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
  const parsed = {
    dryRun: false,
    proof: false,
    skipExisting: false,
    perSentence: false,
    perSentenceSdxl: false,
  }
  for (let index = 0; index < values.length; index += 1) {
    const value = values[index]
    if (value === '--env') parsed.env = values[++index]
    else if (value === '--book-id') parsed.bookId = values[++index]
    else if (value === '--dry-run') parsed.dryRun = true
    else if (value === '--proof') parsed.proof = true
    else if (value === '--proof-label') parsed.proofLabel = values[++index]
    else if (value === '--limit') parsed.limit = Number(values[++index])
    else if (value === '--mood') parsed.mood = values[++index]
    else if (value === '--skip-existing') parsed.skipExisting = true
    else if (value === '--per-sentence') parsed.perSentence = true
    else if (value === '--per-sentence-sdxl') parsed.perSentenceSdxl = true
    else if (value === '--model') parsed.model = values[++index]
  }
  if (parsed.limit !== undefined && (!Number.isInteger(parsed.limit) || parsed.limit < 1)) {
    throw new Error('--limit must be a positive integer.')
  }
  return parsed
}

function loadEnv(envPath) {
  if (!existsSync(envPath)) return
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
