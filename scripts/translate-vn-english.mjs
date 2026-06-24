/**
 * Translates empty `english` fields in a VN story JSON using a local Ollama model.
 * Saves after each translation so it can be safely interrupted and resumed.
 *
 * Usage: node scripts/translate-vn-english.mjs
 */

import { readFileSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const STORY_PATH = path.join(
  ROOT,
  'public/reader-packs/just-friends/visual-novels/worlds/just-friends/quests/story.json',
)
const OLLAMA_URL = 'http://127.0.0.1:11434/api/generate'
const MODEL = 'hy-mt2:1.8b'

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

async function main() {
  const script = JSON.parse(readFileSync(STORY_PATH, 'utf8'))
  const nodes = Object.values(script.nodes ?? {})

  const toTranslate = []
  for (const node of nodes) {
    if (node.text && !node.text.english) toTranslate.push({ node, field: 'text' })
    if (node.summary && !node.summary.english) toTranslate.push({ node, field: 'summary' })
    if (node.prompt && !node.prompt.english) toTranslate.push({ node, field: 'prompt' })
    for (const choice of node.choices ?? []) {
      if (choice.label && !choice.label.english) toTranslate.push({ node, choice, field: 'label' })
    }
  }

  console.log(`Found ${toTranslate.length} text fields to translate with ${MODEL}.`)
  if (toTranslate.length === 0) {
    console.log('Nothing to do.')
    return
  }

  let done = 0
  const start = Date.now()

  for (const item of toTranslate) {
    const source = item.choice
      ? item.choice.label.chinese
      : item.node[item.field].chinese
    if (!source) continue

    const english = await translate(source)

    if (item.choice) {
      item.choice.label.english = english
    } else {
      item.node[item.field].english = english
    }

    done++
    writeFileSync(STORY_PATH, JSON.stringify(script, null, 2), 'utf8')

    const elapsed = ((Date.now() - start) / 1000).toFixed(0)
    const perItem = (Date.now() - start) / done
    const remaining = Math.round((toTranslate.length - done) * perItem / 1000)
    console.log(`[${done}/${toTranslate.length}] ${elapsed}s elapsed, ~${remaining}s left`)
    console.log(`  CN: ${source}`)
    console.log(`  EN: ${english}`)
  }

  console.log(`\nDone. Translated ${done} fields.`)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
