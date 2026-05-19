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
import { pinyin } from 'pinyin-pro'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const DEFAULT_LMS_DIR = path.join(
  process.env.USERPROFILE ?? '',
  'Documents',
  'LearnChinese',
  'LMS',
  'StoryEditor',
)
const DEFAULT_OUT_DIR = path.join(ROOT, 'public', 'reader-packs', 'lms-books')
const DEFAULT_VOICE = process.env.AZURE_SPEECH_VOICE || 'zh-CN-XiaochenNeural'
const DEFAULT_RATE = process.env.AZURE_SPEECH_RATE || '-5%'
const GROUP_SIZE = 5

const args = parseArgs(process.argv.slice(2))
const sourceDir = path.resolve(args.lmsDir ?? DEFAULT_LMS_DIR)
const sourceDataDir = path.join(sourceDir, 'source-data')
const outDir = path.resolve(args.out ?? DEFAULT_OUT_DIR)
const synthesize = Boolean(args.synthesize)

if (!existsSync(sourceDataDir)) {
  throw new Error(`Could not find LMS StoryEditor source-data folder: ${sourceDataDir}`)
}

const stories = loadStories(sourceDataDir)
const books = buildBooks(stories)

rmSync(outDir, { recursive: true, force: true })
mkdirSync(path.join(outDir, 'books'), { recursive: true })
mkdirSync(path.join(outDir, 'ssml', 'sentences'), { recursive: true })
mkdirSync(path.join(outDir, 'audio', 'sentences'), { recursive: true })

let synthesizedAudioCount = 0
for (const book of books) {
  for (const story of book.stories) {
    for (const sentence of story.sentences) {
      const ssml = sentenceSsml(sentence.chinese, DEFAULT_VOICE, DEFAULT_RATE)
      writeText(path.join(outDir, sentence.ssmlFilename), ssml)
      if (synthesize) {
        const audioPath = path.join(outDir, sentence.audioFilename)
        if (await synthesizeAzure(ssml, audioPath)) synthesizedAudioCount += 1
      }
    }
  }
  writeJson(path.join(outDir, book.path), book)
}

const manifest = {
  packId: 'lms-books',
  name: 'LMS Reader Books',
  description: 'Legendary Moonlight Sculptor LMS reader compilations from StoryEditor.',
  sourcePath: sourceDir,
  createdAt: new Date().toISOString(),
  voice: DEFAULT_VOICE,
  rate: DEFAULT_RATE,
  audioAvailable: synthesizedAudioCount > 0,
  synthesizedAudioCount,
  storyCount: stories.length,
  sentenceCount: stories.reduce((sum, story) => sum + story.sentences.length, 0),
  books: books.map((book) => ({
    id: book.id,
    title: book.title,
    book: book.book,
    chapterStart: book.chapterStart,
    chapterEnd: book.chapterEnd,
    storyCount: book.stories.length,
    sentenceCount: book.stories.reduce((sum, story) => sum + story.sentences.length, 0),
    path: book.path,
  })),
}

writeJson(path.join(outDir, 'reader_manifest.json'), manifest)
writeJson(path.join(ROOT, 'public', 'reader-packs', 'index.json'), [
  {
    id: manifest.packId,
    name: manifest.name,
    description: manifest.description,
    baseUrl: 'reader-packs/lms-books',
    language: 'zh-CN',
  },
])

console.log(`Reader pack written to ${outDir}`)
console.log(`Stories: ${manifest.storyCount}`)
console.log(`Books: ${manifest.books.length}`)
console.log(`Sentences: ${manifest.sentenceCount}`)
console.log(`Synthesized audio: ${manifest.synthesizedAudioCount}`)

function parseArgs(values) {
  const parsed = {}
  for (let index = 0; index < values.length; index += 1) {
    const value = values[index]
    if (value === '--synthesize') parsed.synthesize = true
    else if (value === '--lms-dir') parsed.lmsDir = values[++index]
    else if (value === '--out') parsed.out = values[++index]
  }
  return parsed
}

function loadStories(dir) {
  const byId = new Map()
  let order = 0
  const files = readdirSync(dir)
    .filter((file) => /^story_library.*\.json$/u.test(file))
    .sort((a, b) => a.localeCompare(b, 'en'))

  for (const file of files) {
    const json = JSON.parse(readText(path.join(dir, file)))
    for (const story of json.stories ?? []) {
      order += 1
      byId.set(story.story_id, normalizeStory(story, order))
    }
  }

  return [...byId.values()].sort(
    (a, b) => a.book - b.book || a.chapter - b.chapter || a.sourceOrder - b.sourceOrder,
  )
}

function normalizeStory(story, sourceOrder) {
  return {
    id: story.story_id,
    title: story.title,
    book: Number(story.book) || 1,
    chapter: Number(story.chapter) || 1,
    sourceInspiration: story.source_inspiration ?? '',
    newWords: (story.new_words ?? []).map((word) => ({
      word: word.word,
      pinyin: word.pinyin ?? pinyinFor(word.word),
      meaning: word.gloss ?? word.meaning ?? '',
    })),
    sentences: (story.sentences ?? []).map((sentence, index) => {
      const id = sentence.sentence_id || `${story.story_id}-s${String(index + 1).padStart(2, '0')}`
      const safeId = safePath(id)
      const targetWords = (story.new_words ?? [])
        .map((word) => word.word)
        .filter((word) => sentence.chinese?.includes(word))
      return {
        id,
        storyId: story.story_id,
        index: index + 1,
        chinese: sentence.chinese,
        pinyin: pinyinFor(sentence.chinese),
        english: sentence.english_helper ?? sentence.english ?? '',
        targetWords,
        audioClipId: `reader-sentence:${id}`,
        audioFilename: `audio/sentences/${safeId}.mp3`,
        ssmlFilename: `ssml/sentences/${safeId}.ssml`,
      }
    }),
    sourceOrder,
  }
}

function buildBooks(stories) {
  const maxChapter = Math.max(...stories.map((story) => story.chapter))
  const books = []
  for (let start = 1; start <= maxChapter; start += GROUP_SIZE) {
    const end = Math.min(start + GROUP_SIZE - 1, maxChapter)
    const groupStories = stories.filter((story) => story.chapter >= start && story.chapter <= end)
    if (!groupStories.length) continue
    const id = `lms-book-1-chapters-${start}-${end}`
    books.push({
      id,
      title: `LMS Book 1 Chapters ${start}-${end}`,
      book: 1,
      chapterStart: start,
      chapterEnd: end,
      path: `books/${id}.json`,
      stories: groupStories.map(({ sourceOrder, ...story }) => story),
    })
  }
  return books
}

function sentenceSsml(chinese, voice, rate) {
  return [
    '<?xml version="1.0" encoding="utf-8"?>',
    '<speak version="1.0" xmlns="http://www.w3.org/2001/10/synthesis" xml:lang="zh-CN">',
    `  <voice name="${escapeXml(voice)}">`,
    `    <prosody rate="${escapeXml(rate)}">${escapeXml(chinese)}</prosody>`,
    '  </voice>',
    '</speak>',
  ].join('\n')
}

async function synthesizeAzure(ssml, outputPath) {
  const speechKey = process.env.AZURE_SPEECH_KEY
  const speechRegion = process.env.AZURE_SPEECH_REGION
  if (!speechKey || !speechRegion) {
    throw new Error('AZURE_SPEECH_KEY and AZURE_SPEECH_REGION are required with --synthesize')
  }
  const response = await fetch(
    `https://${speechRegion}.tts.speech.microsoft.com/cognitiveservices/v1`,
    {
      method: 'POST',
      headers: {
        'Ocp-Apim-Subscription-Key': speechKey,
        'Content-Type': 'application/ssml+xml',
        'X-Microsoft-OutputFormat': 'audio-24khz-48kbitrate-mono-mp3',
        'User-Agent': 'chunky-chinese-reader-pack',
      },
      body: ssml,
    },
  )
  if (!response.ok) {
    throw new Error(`Azure TTS failed: HTTP ${response.status} ${await response.text()}`)
  }
  mkdirSync(path.dirname(outputPath), { recursive: true })
  writeFileSync(outputPath, Buffer.from(await response.arrayBuffer()))
  return true
}

function readText(filePath) {
  return readFileSync(filePath, 'utf8').replace(/^\uFEFF/u, '')
}

function writeText(filePath, text) {
  mkdirSync(path.dirname(filePath), { recursive: true })
  writeFileSync(filePath, `${text.trim()}\n`, 'utf8')
}

function writeJson(filePath, value) {
  writeText(filePath, JSON.stringify(value, null, 2))
}

function pinyinFor(text) {
  return pinyin(text, { type: 'string', separator: ' ' })
}

function safePath(value) {
  return value
    .normalize('NFKD')
    .replace(/[^\w.-]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .toLowerCase()
}

function escapeXml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&apos;')
}
