/**
 * Translates empty `english` fields in reader book JSON files using local Ollama.
 * Saves after each sentence. Safe to interrupt and resume.
 *
 * Usage: node scripts/translate-books.mjs
 */

import { readFileSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const OLLAMA_URL = 'http://127.0.0.1:11434/api/generate'
const MODEL = 'hy-mt2:1.8b'

const BOOK_FILES = [
  'public/reader-packs/can-i-dance/books/can-i-dance-with-you.json',
  'public/reader-packs/just-friends/books/just-friends.json',
  'public/reader-packs/sherlock-holmes/books/sherlock-holmes-curly-haired.json',
]

async function translate(chinese) {
  const prompt =
    `Translate the following Chinese text to English. Output only the English translation, nothing else.\n\nChinese: ${chinese}\nEnglish:`
  const res = await fetch(OLLAMA_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ model: MODEL, prompt, stream: false }),
  })
  if (!res.ok) throw new Error(`Ollama error ${res.status}: ${await res.text()}`)
  const data = await res.json()
  return data.response.trim()
}

async function processFile(relPath) {
  const filePath = path.join(ROOT, relPath)
  const data = JSON.parse(readFileSync(filePath, 'utf8'))
  const stories = data.stories ?? []

  // Collect all sentences that need translation
  const toTranslate = []
  for (const story of stories) {
    for (const sentence of story.sentences ?? []) {
      if (!sentence.english || sentence.english.trim() === '') {
        toTranslate.push(sentence)
      }
    }
  }

  const fileName = path.basename(relPath)
  if (toTranslate.length === 0) {
    console.log(`✓ ${fileName}: all translations present`)
    return
  }

  console.log(`\n── ${fileName}: ${toTranslate.length} sentences to translate ──`)
  let done = 0
  const start = Date.now()

  for (const sentence of toTranslate) {
    const source = sentence.chinese
    if (!source || source.trim() === '') {
      sentence.english = ''
      continue
    }

    const english = await translate(source)
    sentence.english = english
    done++

    writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8')

    const elapsed = ((Date.now() - start) / 1000).toFixed(0)
    const perItem = (Date.now() - start) / done
    const remaining = Math.round((toTranslate.length - done) * perItem / 1000)
    process.stdout.write(`\r  [${done}/${toTranslate.length}] ${elapsed}s elapsed, ~${remaining}s left`)
  }
  console.log(`\n✓ ${fileName}: done (${done} translated)`)
}

async function main() {
  for (const file of BOOK_FILES) {
    await processFile(file)
  }
  console.log('\nAll books translated.')
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
