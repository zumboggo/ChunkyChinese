import { readFileSync, readdirSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { pinyin } from 'pinyin-pro'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const PACK_DIR = path.join(ROOT, 'public', 'reader-packs', 'lms-books')
const BOOKS_DIR = path.join(PACK_DIR, 'books')
const SPLITS_PATH = path.join(ROOT, 'scripts', 'lms-reader-sentence-splits.json')
const MAX_HANZI = 24

const splits = readJson(SPLITS_PATH)
const splitIds = new Set(Object.keys(splits))
const seenSplitIds = new Set()
let originalSentenceCount = 0
let finalSentenceCount = 0

for (const filename of readdirSync(BOOKS_DIR).filter((name) => name.endsWith('.json')).sort()) {
  const bookPath = path.join(BOOKS_DIR, filename)
  const book = readJson(bookPath)
  for (const story of book.stories) {
    const nextSentences = []
    for (const sentence of story.sentences) {
      originalSentenceCount += 1
      const existingPartMatch = sentence.id.match(/^(.*)-part-\d+$/u)
      if (existingPartMatch && splits[existingPartMatch[1]]) {
        seenSplitIds.add(existingPartMatch[1])
        nextSentences.push(sentence)
        continue
      }
      const plannedParts = splits[sentence.id]
      if (!plannedParts) {
        nextSentences.push(sentence)
        continue
      }

      seenSplitIds.add(sentence.id)
      for (const [partIndex, part] of plannedParts.entries()) {
        const id = `${sentence.id}-part-${partIndex + 1}`
        nextSentences.push({
          ...sentence,
          id,
          chinese: part.chinese,
          pinyin: pinyin(part.chinese, { type: 'string', separator: ' ' }),
          english: part.english,
          targetWords: sentence.targetWords.filter((word) => part.chinese.includes(word)),
          audioClipId: `reader-sentence:${id}`,
          audioFilename: '',
          ssmlFilename: `ssml/sentences/${id}.ssml`,
        })
      }
    }
    story.sentences = nextSentences.map((sentence, index) => ({ ...sentence, index: index + 1 }))
    finalSentenceCount += story.sentences.length
  }
  writeJson(bookPath, book)
}

const missingPlans = [...splitIds].filter((id) => !seenSplitIds.has(id))
if (missingPlans.length > 0) {
  throw new Error(`Split plan references missing sentence IDs: ${missingPlans.join(', ')}`)
}

const manifestPath = path.join(PACK_DIR, 'reader_manifest.json')
const manifest = readJson(manifestPath)
manifest.sentenceCount = finalSentenceCount
manifest.splitSourceSentenceCount = splitIds.size
manifest.maxReaderSentenceHanzi = MAX_HANZI
for (const summary of manifest.books) {
  const book = readJson(path.join(PACK_DIR, summary.path))
  summary.sentenceCount = book.stories.reduce((sum, story) => sum + story.sentences.length, 0)
}
writeJson(manifestPath, manifest)

const oversized = []
for (const summary of manifest.books) {
  const book = readJson(path.join(PACK_DIR, summary.path))
  for (const story of book.stories) {
    for (const sentence of story.sentences) {
      const hanzi = [...sentence.chinese].filter((character) => /\p{Script=Han}/u.test(character)).length
      if (hanzi > MAX_HANZI) oversized.push(`${sentence.id} (${hanzi})`)
    }
  }
}
if (oversized.length > 0) {
  throw new Error(`Oversized LMS reader sentences remain: ${oversized.join(', ')}`)
}

console.log(`Audited ${originalSentenceCount} LMS sentences.`)
console.log(`Split ${seenSplitIds.size} oversized sentences into ${finalSentenceCount - originalSentenceCount + seenSplitIds.size} parts.`)
console.log(`Final sentence count: ${finalSentenceCount}; maximum: ${MAX_HANZI} Hanzi.`)

function readJson(filePath) {
  return JSON.parse(readFileSync(filePath, 'utf8').replace(/^\uFEFF/u, ''))
}

function writeJson(filePath, value) {
  writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`, 'utf8')
}
