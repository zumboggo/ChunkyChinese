import {
  existsSync,
  mkdirSync,
  readFileSync,
  writeFileSync,
} from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const DEFAULT_SOURCE = path.join(
  process.env.USERPROFILE ?? '',
  'Documents',
  'LearnChinese',
  'Chinese Books',
  'Rise of the Monkey King Text (English Chinese)',
  'Rise_of_the_Monkey_King_COMPLETE_Bilingual_Audiobook_Script.txt',
)
const OUT_DIR = path.join(ROOT, 'public', 'reader-packs', 'rise-of-the-monkey-king')
const BOOK_DIR = path.join(OUT_DIR, 'books')
const AUDIO_DIR = path.join(OUT_DIR, 'audio', 'sentences')
const BOOK_PATH = path.join(BOOK_DIR, 'rise-of-the-monkey-king.json')
const MANIFEST_PATH = path.join(OUT_DIR, 'reader_manifest.json')
const VOICE = process.env.AZURE_SPEECH_VOICE || 'zh-CN-XiaochenNeural'
const RATE = process.env.AZURE_SPEECH_RATE || '-10%'
const SYNTHESIS_CONCURRENCY = 4
const SYNTHESIS_RETRIES = 4

const args = parseArgs(process.argv.slice(2))
const sourcePath = path.resolve(args.source ?? DEFAULT_SOURCE)
const synthesize = Boolean(args.synthesize)
const limit = args.limit ? Math.max(1, Number(args.limit)) : Number.POSITIVE_INFINITY
const force = Boolean(args.force)

if (!existsSync(sourcePath)) throw new Error(`Book script not found: ${sourcePath}`)

const pairs = parseBilingualScript(readFileSync(sourcePath, 'utf8'))
if (pairs.length === 0) throw new Error('No Chinese/English sentence pairs were found.')

const book = makeBook(pairs)
mkdirSync(BOOK_DIR, { recursive: true })
mkdirSync(AUDIO_DIR, { recursive: true })
writeJson(BOOK_PATH, book)
writeJson(MANIFEST_PATH, makeManifest(book, countExistingAudio(book)))

console.log(`Built Rise of the Monkey King reader with ${pairs.length} sentence pairs.`)

if (synthesize) {
  await synthesizeAudio(book, limit, force)
  writeJson(MANIFEST_PATH, makeManifest(book, countExistingAudio(book)))
}

function parseArgs(values) {
  const parsed = {}
  for (let index = 0; index < values.length; index += 1) {
    const value = values[index]
    if (value === '--synthesize') parsed.synthesize = true
    else if (value === '--force') parsed.force = true
    else if (value === '--source') parsed.source = values[++index]
    else if (value === '--limit') parsed.limit = values[++index]
  }
  return parsed
}

function parseBilingualScript(text) {
  const lines = text.split(/\r?\n/u).map((line) => line.trim())
  const pairs = []
  for (let index = 0; index < lines.length; index += 1) {
    if (!containsChinese(lines[index])) continue
    let englishIndex = index + 1
    while (englishIndex < lines.length && !lines[englishIndex]) englishIndex += 1
    const english = lines[englishIndex]
    if (
      !english ||
      containsChinese(english) ||
      /^=+$/u.test(english) ||
      /^SECTION\s+\d+:/iu.test(english)
    ) {
      continue
    }
    pairs.push({
      chinese: cleanChinese(lines[index], pairs.length),
      english: cleanEnglish(english, pairs.length),
    })
    index = englishIndex
  }
  return pairs
}

function cleanChinese(text, index) {
  let cleaned = text.replace(/\s+/gu, '')
  if (index === 0) cleaned = cleaned.replace(/^猴王的诞生猴王的诞生/u, '')
  return cleaned
}

function cleanEnglish(text, index) {
  let cleaned = text.replace(/\s+/gu, ' ').trim()
  if (index === 0) {
    cleaned = cleaned
      .replace(/^The Rise of the Monkey King The Rise of the Monkey King\s*/u, '')
      .replace(/^M y\b/u, 'My')
  }
  return cleaned
}

function makeBook(pairs) {
  const storyId = 'monkey-king-part-1'
  const sentences = pairs.map((pair, index) => {
    const id = `monkey-king-s${String(index + 1).padStart(3, '0')}`
    return {
      id,
      storyId,
      index: index + 1,
      chinese: pair.chinese,
      pinyin: '',
      english: pair.english,
      targetWords: [],
      audioClipId: `reader-sentence:${id}`,
      audioFilename: `audio/sentences/${id}.mp3`,
      ssmlFilename: '',
    }
  })
  return {
    id: 'rise-of-the-monkey-king',
    title: 'Rise of the Monkey King',
    book: 1,
    chapterStart: 1,
    chapterEnd: 1,
    stories: [
      {
        id: storyId,
        title: '猴王的诞生',
        book: 1,
        chapter: 1,
        sourceInspiration: 'Rise of the Monkey King — Part 1',
        newWords: [],
        sentences,
      },
    ],
  }
}

function makeManifest(book, audioCount) {
  const sentenceCount = book.stories.reduce(
    (total, story) => total + story.sentences.length,
    0,
  )
  return {
    packId: 'rise-of-the-monkey-king',
    name: 'Rise of the Monkey King',
    description: 'A bilingual Chinese-English retelling of the rise of Sun Wukong.',
    createdAt: new Date().toISOString(),
    voice: VOICE,
    rate: RATE,
    audioAvailable: audioCount === sentenceCount,
    synthesizedAudioCount: audioCount,
    storyCount: book.stories.length,
    sentenceCount,
    books: [
      {
        id: book.id,
        title: book.title,
        book: book.book,
        chapterStart: book.chapterStart,
        chapterEnd: book.chapterEnd,
        storyCount: book.stories.length,
        sentenceCount,
        path: 'books/rise-of-the-monkey-king.json',
      },
    ],
  }
}

async function synthesizeAudio(book, maxNewFiles, overwrite) {
  const sentences = book.stories.flatMap((story) => story.sentences)
  const credentials = loadAzureCredentials()
  const pending = sentences
    .map((sentence, index) => ({
      sentence,
      index,
      outputPath: path.join(OUT_DIR, sentence.audioFilename),
    }))
    .filter(({ outputPath }) => overwrite || !existsSync(outputPath) || readFileSync(outputPath).length === 0)
    .slice(0, maxNewFiles)
  const counts = {
    generated: 0,
    skipped: sentences.length - pending.length,
    failed: 0,
  }
  let cursor = 0

  async function worker() {
    while (cursor < pending.length) {
      const item = pending[cursor]
      cursor += 1
      const { sentence, index, outputPath } = item
      console.log(`[${index + 1}/${sentences.length}] ${sentence.chinese}`)
      try {
        const audio = await synthesizeAzure(sentence.chinese, credentials)
        mkdirSync(path.dirname(outputPath), { recursive: true })
        writeFileSync(outputPath, audio)
        counts.generated += 1
        console.log(`  saved ${path.basename(outputPath)}`)
      } catch (error) {
        counts.failed += 1
        console.error(`  failed: ${error instanceof Error ? error.message : error}`)
      }
    }
  }

  await Promise.all(
    Array.from(
      { length: Math.min(SYNTHESIS_CONCURRENCY, pending.length) },
      () => worker(),
    ),
  )

  console.log(
    `Audio complete: ${counts.generated} generated, ${counts.skipped} existing, ${counts.failed} failed.`,
  )
  if (counts.failed > 0) throw new Error(`${counts.failed} Azure clips failed to synthesize.`)
}

async function synthesizeAzure(text, credentials) {
  const ssml = [
    '<?xml version="1.0" encoding="utf-8"?>',
    '<speak version="1.0" xmlns="http://www.w3.org/2001/10/synthesis" xml:lang="zh-CN">',
    `  <voice name="${escapeXml(VOICE)}">`,
    `    <prosody rate="${escapeXml(RATE)}">${escapeXml(text)}</prosody>`,
    '  </voice>',
    '</speak>',
  ].join('\n')
  let lastError
  for (let attempt = 1; attempt <= SYNTHESIS_RETRIES; attempt += 1) {
    try {
      const response = await fetch(
        `https://${credentials.region}.tts.speech.microsoft.com/cognitiveservices/v1`,
        {
          method: 'POST',
          headers: {
            'Ocp-Apim-Subscription-Key': credentials.key,
            'Content-Type': 'application/ssml+xml',
            'X-Microsoft-OutputFormat': 'audio-24khz-48kbitrate-mono-mp3',
            'User-Agent': 'chunky-chinese-monkey-king-reader',
          },
          body: ssml,
        },
      )
      if (response.ok) return Buffer.from(await response.arrayBuffer())
      lastError = new Error(`Azure HTTP ${response.status}: ${await response.text()}`)
    } catch (error) {
      lastError = error
    }
    if (attempt < SYNTHESIS_RETRIES) await delay(500 * attempt)
  }
  throw lastError
}

function countExistingAudio(book) {
  return book.stories
    .flatMap((story) => story.sentences)
    .filter((sentence) => {
      const audioPath = path.join(OUT_DIR, sentence.audioFilename)
      return existsSync(audioPath) && readFileSync(audioPath).length > 0
    }).length
}

function loadAzureCredentials() {
  const envPath = path.join(ROOT, '.env')
  const values = existsSync(envPath)
    ? Object.fromEntries(
        readFileSync(envPath, 'utf8')
          .split(/\r?\n/u)
          .filter((line) => line && !line.startsWith('#') && line.includes('='))
          .map((line) => {
            const separator = line.indexOf('=')
            return [line.slice(0, separator), line.slice(separator + 1)]
          }),
      )
    : {}
  const key = process.env.AZURE_SPEECH_KEY || values.AZURE_SPEECH_KEY
  const region = process.env.AZURE_SPEECH_REGION || values.AZURE_SPEECH_REGION
  if (!key || !region) throw new Error('Set AZURE_SPEECH_KEY and AZURE_SPEECH_REGION.')
  return { key, region }
}

function containsChinese(text) {
  return /[\u3400-\u9fff]/u.test(text)
}

function writeJson(filePath, value) {
  mkdirSync(path.dirname(filePath), { recursive: true })
  writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`, 'utf8')
}

function escapeXml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&apos;')
}

function delay(milliseconds) {
  return new Promise((resolve) => setTimeout(resolve, milliseconds))
}
