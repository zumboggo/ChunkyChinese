// Builds the "china-arrival" reader pack (book JSON + manifest + TTS plan)
// from the authored source at scripts/china-arrival-story.json.
//
//   node scripts/build-china-arrival-pack.mjs
//
// Audio itself is generated separately by scripts/generate-china-arrival-tts.py,
// which reads the tts-plan.json this script emits.
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs'
import { dirname, join } from 'node:path'

const SOURCE = 'scripts/china-arrival-story.json'
const PACK_DIR = 'public/reader-packs/china-arrival'
const PLAN_PATH = 'scripts/china-arrival-tts-plan.json'

/** One distinct Chirp3-HD voice per speaker so dialogue is easy to follow by ear. */
const SPEAKER_VOICES = {
  narrator: 'cmn-CN-Chirp3-HD-Vindemiatrix',
  david: 'cmn-CN-Chirp3-HD-Charon',
  wang: 'cmn-CN-Chirp3-HD-Aoede',
  driver: 'cmn-CN-Chirp3-HD-Orus',
  courier: 'cmn-CN-Chirp3-HD-Fenrir',
  chen: 'cmn-CN-Chirp3-HD-Gacrux',
  rider: 'cmn-CN-Chirp3-HD-Iapetus',
  lin_mom: 'cmn-CN-Chirp3-HD-Kore',
  lin: 'cmn-CN-Chirp3-HD-Puck',
  zhang: 'cmn-CN-Chirp3-HD-Algieba',
}

const source = JSON.parse(readFileSync(SOURCE, 'utf8'))

const unknownSpeakers = new Set()
const stories = []
const plan = []

source.chapters.forEach((chapter, chapterIndex) => {
  const storyId = `${source.bookId}-${chapter.id}`
  const sentences = chapter.lines.map((line, lineIndex) => {
    if (!SPEAKER_VOICES[line.s]) unknownSpeakers.add(line.s)
    const id = `${storyId}-s${String(lineIndex + 1).padStart(3, '0')}`
    plan.push({
      id,
      text: line.zh,
      voice: SPEAKER_VOICES[line.s],
      file: `audio/sentences/${id}.mp3`,
    })
    return {
      id,
      storyId,
      index: lineIndex + 1,
      chinese: line.zh,
      pinyin: '',
      english: line.en,
      targetWords: [],
      speaker: line.s,
      audioClipId: `reader-sentence:${id}`,
      audioFilename: `audio/sentences/${id}.mp3`,
      ssmlFilename: '',
    }
  })

  stories.push({
    id: storyId,
    title: chapter.titleEn,
    book: 1,
    chapter: chapterIndex + 1,
    sourceInspiration: chapter.title,
    newWords: [],
    sentences,
  })
})

if (unknownSpeakers.size > 0) {
  throw new Error(`No voice mapped for speaker(s): ${[...unknownSpeakers].join(', ')}`)
}

const sentenceCount = stories.reduce((total, story) => total + story.sentences.length, 0)

const book = {
  id: source.bookId,
  title: source.title,
  book: 1,
  chapterStart: 1,
  chapterEnd: stories.length,
  stories,
}

const manifest = {
  packId: source.packId,
  name: source.title,
  description: source.description,
  createdAt: '2026-08-09T00:00:00.000Z',
  voice: SPEAKER_VOICES.narrator,
  rate: '0.9',
  audioAvailable: true,
  synthesizedAudioCount: sentenceCount,
  storyCount: stories.length,
  sentenceCount,
  books: [
    {
      id: book.id,
      title: book.title,
      book: 1,
      chapterStart: 1,
      chapterEnd: stories.length,
      storyCount: stories.length,
      sentenceCount,
      path: `books/${book.id}.json`,
    },
  ],
  speakingRate: 0.9,
}

function writeJson(path, value) {
  mkdirSync(dirname(path), { recursive: true })
  writeFileSync(path, `${JSON.stringify(value, null, 2)}\n`, 'utf8')
}

writeJson(join(PACK_DIR, 'books', `${book.id}.json`), book)
writeJson(join(PACK_DIR, 'reader_manifest.json'), manifest)
writeJson(PLAN_PATH, { packDir: PACK_DIR, clips: plan })

console.log(`Wrote ${stories.length} chapters / ${sentenceCount} sentences to ${PACK_DIR}`)
console.log(`TTS plan: ${PLAN_PATH} (${plan.length} clips)`)
