import { readFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const packDir = path.join(ROOT, 'public', 'reader-packs', 'lms-books')
const manifest = JSON.parse(readFileSync(path.join(packDir, 'reader_manifest.json'), 'utf8'))

assertEqual(manifest.storyCount, 40, 'story count')
assertEqual(manifest.books.length, 4, 'book count')
assertEqual(manifest.sentenceCount, 1114, 'sentence count')

let countedSentences = 0
const ids = new Set()
for (const bookSummary of manifest.books) {
  const book = JSON.parse(readFileSync(path.join(packDir, bookSummary.path), 'utf8'))
  assertEqual(book.stories.length, bookSummary.storyCount, `${book.id} story count`)
  for (const story of book.stories) {
    for (const sentence of story.sentences) {
      countedSentences += 1
      if (ids.has(sentence.id)) throw new Error(`Duplicate sentence id: ${sentence.id}`)
      ids.add(sentence.id)
      if (!sentence.ssmlFilename?.endsWith('.ssml')) {
        throw new Error(`Missing SSML path for ${sentence.id}`)
      }
      if (!sentence.audioClipId?.startsWith('reader-sentence:')) {
        throw new Error(`Missing reader audio clip id for ${sentence.id}`)
      }
    }
  }
}
assertEqual(countedSentences, manifest.sentenceCount, 'nested sentence count')
console.log('Reader pack fixture checks passed.')

function assertEqual(actual, expected, label) {
  if (actual !== expected) {
    throw new Error(`${label}: expected ${expected}, got ${actual}`)
  }
}
