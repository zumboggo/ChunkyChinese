import { readFile, writeFile } from 'node:fs/promises'
import { argv } from 'node:process'

const ENDPOINT = 'http://localhost:11434/v1/chat/completions'
const MODEL = 'hy-mt2:1.8b'
const TIMEOUT = 300_000

const chapterPath = argv[2] || 'public/comic-packs/quanqiu-gaowu-ch01/chapters/chapter-01.json'

async function translateBatch(bubbles) {
  const source = bubbles
    .filter(b => b.chinese && b.chinese.trim())
    .map(b => ({ id: b.id, chinese: b.chinese }))

  if (source.length === 0) return []

  const prompt = `Translate every Chinese comic line naturally into English. Preserve every ID, do not omit lines, and do not add commentary. Use surrounding lines for context and keep names consistent. Return only a JSON array of objects with id and english.\n\n${JSON.stringify(source)}`

  const payload = {
    model: MODEL,
    temperature: 0.1,
    messages: [
      { role: 'system', content: 'You translate Chinese comics into concise natural English. Return only valid JSON.' },
      { role: 'user', content: prompt },
    ],
  }

  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), TIMEOUT)

  try {
    const resp = await fetch(ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      signal: controller.signal,
    })
    clearTimeout(timeout)

    if (!resp.ok) {
      const text = await resp.text()
      throw new Error(`LLM error ${resp.status}: ${text.slice(0, 200)}`)
    }

    const result = await resp.json()
    let content = result.choices[0].message.content.trim()

    // Strip markdown code fences if present
    if (content.startsWith('```')) {
      const match = content.match(/```(?:json)?\s*\n?([\s\S]*?)```/)
      if (match) content = match[1].trim()
    }
    // Handle thinking tags
    if (content.includes('<think>')) {
      const thinkEnd = content.indexOf('</think>')
      if (thinkEnd !== -1) content = content.slice(thinkEnd + 8).trim()
    }

    const translations = JSON.parse(content)
    if (!Array.isArray(translations)) throw new Error('LLM did not return a JSON array')

    const allowedIds = new Set(source.map(s => s.id))
    return translations.filter(t => allowedIds.has(t.id) && typeof t.english === 'string')
  } catch (e) {
    clearTimeout(timeout)
    throw e
  }
}

async function main() {
  console.log(`Reading ${chapterPath}...`)
  const chapter = JSON.parse(await readFile(chapterPath, 'utf8'))

  // Collect ALL untranslated bubbles
  const untranslated = []
  for (const page of chapter.pages) {
    for (const bubble of (page.bubbles || [])) {
      if (bubble.chinese && bubble.chinese.trim() && !bubble.english) {
        untranslated.push(bubble)
      }
    }
  }

  const totalBubbles = chapter.pages.reduce((s, p) => s + (p.bubbles?.length || 0), 0)
  console.log(`Total bubbles: ${totalBubbles}, untranslated: ${untranslated.length}`)

  if (untranslated.length === 0) {
    console.log('All bubbles already have translations.')
    return
  }

  // Batch in chunks of 20
  const CHUNK = 20
  let totalTranslated = 0

  for (let i = 0; i < untranslated.length; i += CHUNK) {
    const chunk = untranslated.slice(i, i + CHUNK)
    const num = Math.floor(i / CHUNK) + 1
    const total = Math.ceil(untranslated.length / CHUNK)
    console.log(`  Batch ${num}/${total}: ${chunk.length} bubbles...`)

    try {
      const translations = await translateBatch(chunk)
      const byId = new Map(translations.map(t => [t.id, t.english]))
      for (const bubble of chunk) {
        if (byId.has(bubble.id)) {
          bubble.english = byId.get(bubble.id)
          totalTranslated++
        }
      }
      console.log(`  Batch ${num}/${total}: ${translations.length} translated`)
    } catch (e) {
      console.log(`  Batch ${num}/${total} FAILED: ${e.message}`)
    }
  }

  await writeFile(chapterPath, JSON.stringify(chapter, null, 2) + '\n')
  console.log(`\nDone: ${totalTranslated}/${untranslated.length} translated`)
  console.log(`Saved to ${chapterPath}`)
}

main().catch(e => { console.error('Fatal:', e.message); process.exit(1) })
