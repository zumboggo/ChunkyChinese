import { readFileSync, existsSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

let segmenter = null

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const PUBLIC_DIR = path.join(ROOT, 'public')
const WORLD_INDEX_PATH = path.join(PUBLIC_DIR, 'reader-packs', 'lms-books', 'visual-novels', 'worlds', 'index.json')

const isMain = process.argv[1] === fileURLToPath(import.meta.url)

if (isMain) {
  const args = process.argv.slice(2)
  let worldId = null
  let vocabPath = null

  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--world') worldId = args[++i]
    if (args[i] === '--vocab') vocabPath = args[++i]
  }

  if (!worldId || !vocabPath) {
    console.error('Usage: node vn-analyze-language.mjs --world <world-id> --vocab <path-to-vocab-snapshot.json>')
    process.exit(1)
  }

  runAnalysis(worldId, vocabPath).catch(console.error)
}

export function buildDict(vocab) {
  const dict = new Map()
  if (vocab.words) {
    for (const w of vocab.words.strong || []) dict.set(w, 'known')
    for (const w of vocab.words.medium || []) dict.set(w, 'medium')
    for (const w of vocab.words.learning || []) dict.set(w, 'unknown')
  }
  return dict
}

export async function runAnalysis(worldId, vocabPath) {
  const vocab = readJson(vocabPath)
  const dict = buildDict(vocab)

  const index = readJson(WORLD_INDEX_PATH)
  const entry = index.find(e => e.id === worldId || e.worldPath.includes(worldId))
  if (!entry) {
    console.error(`World ${worldId} not found in index.json`)
    process.exit(1)
  }

  const world = readJson(publicPath(entry.worldPath))
  const quests = Object.values(world.quests ?? {})

  console.log(`\nAnalyzing World: ${world.id}`)

  let totalRunningWords = 0
  let totalKnown = 0
  let totalMedium = 0
  let totalUnknown = 0
  const uniqueUnknowns = new Set()
  const nodesBelow95 = []
  const nodesBelow97 = []
  const nodesBelow98 = []
  let maxCluster = 0

  function processTokens(tokens, nodeId, contextName) {
    if (tokens.length === 0) return
    
    let known = 0
    let medium = 0
    let unknown = 0
    let currentCluster = 0

    for (const t of tokens) {
      totalRunningWords++
      if (t.category === 'known') {
        known++
        totalKnown++
        currentCluster = 0
      } else if (t.category === 'medium') {
        medium++
        totalMedium++
        currentCluster = 0
      } else {
        unknown++
        totalUnknown++
        uniqueUnknowns.add(t.text)
        currentCluster++
        if (currentCluster > maxCluster) maxCluster = currentCluster
      }
    }

    const coverage = (known + medium) / tokens.length
    const pct = coverage * 100

    if (tokens.length >= 5) {
      if (pct < 95) nodesBelow95.push({ id: nodeId, pct, context: contextName, unknowns: tokens.filter(t => t.category === 'unknown').map(t => t.text) })
      if (pct < 97) nodesBelow97.push({ id: nodeId, pct, context: contextName })
      if (pct < 98) nodesBelow98.push({ id: nodeId, pct, context: contextName })
    }
  }

  for (const [id, loc] of Object.entries(world.locations ?? {})) {
    if (loc.name?.chinese) processTokens(tokenize(loc.name.chinese, dict), `loc:${id}:name`, 'Location Name')
    if (loc.description?.chinese) processTokens(tokenize(loc.description.chinese, dict), `loc:${id}:desc`, 'Location Description')
  }

  for (const quest of quests) {
    const script = readJson(publicPath(quest.scriptPath))
    for (const [nodeId, node] of Object.entries(script.nodes ?? {})) {
      if (node.type === 'line' && node.text?.chinese) {
        processTokens(tokenize(node.text.chinese, dict), `quest:${quest.id}:node:${nodeId}`, 'Line')
      }
      if (node.type === 'choice') {
        if (node.prompt?.chinese) processTokens(tokenize(node.prompt.chinese, dict), `quest:${quest.id}:node:${nodeId}:prompt`, 'Choice Prompt')
        for (const choice of node.choices ?? []) {
          if (choice.label?.chinese) processTokens(tokenize(choice.label.chinese, dict), `quest:${quest.id}:node:${nodeId}:choice:${choice.id}`, 'Choice Label')
        }
      }
    }
  }

  const overallCoverage = totalRunningWords > 0 ? ((totalKnown + totalMedium) / totalRunningWords) * 100 : 100

  console.log(`\nRunning words:             ${totalRunningWords.toLocaleString()}`)
  console.log(`Known occurrences:         ${totalKnown.toLocaleString()}`)
  console.log(`Medium occurrences:        ${totalMedium.toLocaleString()}`)
  console.log(`Unfamiliar occurrences:    ${totalUnknown.toLocaleString()}`)
  console.log(`Unique unfamiliar words:   ${uniqueUnknowns.size}`)
  console.log(`\nKnown coverage:            ${overallCoverage.toFixed(2)}%`)

  console.log(`\nNodes below 95%:               ${nodesBelow95.length}`)
  console.log(`Nodes below 97%:               ${nodesBelow97.length}`)
  console.log(`Nodes below 98%:               ${nodesBelow98.length}`)
  console.log(`Largest unfamiliar cluster:    ${maxCluster} words`)

  if (nodesBelow95.length > 0) {
    console.log(`\n--- Nodes needing revision (<95%) ---`)
    for (const node of nodesBelow95.slice(0, 10)) {
      console.log(`[${node.pct.toFixed(1)}%] ${node.id} (${node.context}) - Unknowns: ${node.unknowns.join(', ')}`)
    }
    if (nodesBelow95.length > 10) console.log(`... and ${nodesBelow95.length - 10} more`)
  }
}


export function isChineseChar(char) {
  return /[\u3400-\u9fff]/.test(char)
}

export function matchWord(text, start, dict) {
  for (let len = Math.min(8, text.length - start); len > 0; len--) {
    const candidate = text.slice(start, start + len)
    if (dict.has(candidate)) return candidate
  }
  return null
}

export function tokenize(text, dict) {
  if (!segmenter) segmenter = new Intl.Segmenter('zh-CN', { granularity: 'word' })
  const tokens = []
  let index = 0
  while (index < text.length) {
    if (!isChineseChar(text[index])) {
      index++
      continue
    }
    const match = matchWord(text, index, dict)
    if (match) {
      tokens.push({ text: match, category: dict.get(match) })
      index += match.length
    } else {
      const segment = Array.from(segmenter.segment(text.slice(index)))[0].segment
      const val = isChineseChar(segment[0]) ? segment : text[index]
      tokens.push({ text: val, category: 'unknown' })
      index += val.length
    }
  }
  return tokens
}

function publicPath(relativePath) {
  const normalized = relativePath.replace(/\\/g, '/').replace(/^\/+/, '')
  return path.resolve(PUBLIC_DIR, normalized)
}

function readJson(filePath) {
  return JSON.parse(readFileSync(filePath, 'utf8'))
}
