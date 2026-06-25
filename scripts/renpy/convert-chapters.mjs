// One-shot seed converter: Royal Road world quests -> native Ren'Py chapters.
//
// This produces a clean, hand-editable chapter file per story (collapsing
// straight-line node chains into sequential say statements, only emitting
// labels at branch/merge points). After the first run the .rpy files are the
// source of truth — edit them directly. Re-running overwrites game/story/*.rpy
// and the generated game/chunky/{characters,images,chapters}.rpy, so only
// re-run when you want to re-seed from the JSON.
//
// Usage: node scripts/renpy/convert-chapters.mjs
//
// Dropped on purpose (Path A): card battles, the world hub / travel, money &
// skill economy, adaptive pinyin. cardBattle nodes fall through to their win
// branch. Ending tracking is left as TODO comments at each choice.

import { copyFileSync, existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..')
const WORLD_PATH = 'reader-packs/lms-books/visual-novels/worlds/royal-road-prototype/world.json'
const OUT_PROJECT = 'renpy/lms'

// Chapter order shown in the menu (narrative spine + virtual-world tutorial).
const STORY_ORDER = [
  'ch01-sell-account',
  'opening-crossing',
  'first-lesson',
  'ch02-tired-hands',
  'ch03-straw-dummy',
  'ch04-last-student',
  'ch05-sculptor-path',
]

const POSITION = {
  farLeft: 'far_left',
  left: 'left',
  center: 'center',
  right: 'right',
  farRight: 'far_right',
}

function readJson(rel) {
  return JSON.parse(readFileSync(path.join(ROOT, 'public', rel), 'utf8'))
}

function safe(id) {
  return String(id).replace(/[^A-Za-z0-9_]/g, '_').replace(/^([0-9])/u, '_$1')
}

function charVar(id) {
  return `char_${safe(id)}`
}

function nodeLabel(id) {
  return `node_${safe(id)}`
}

function chapterLabel(id) {
  return `story_${safe(id)}`
}

// Escape raw text for a Ren'Py double-quoted string, then it is safe to append
// our own {tag} / \n markup (which must NOT be escaped).
function esc(raw) {
  return String(raw ?? '')
    .replace(/\\/gu, '\\\\')
    .replace(/"/gu, '\\"')
    .replace(/\{/gu, '{{')
    .replace(/\[/gu, '[[')
}

function sayBody(zh, en) {
  let body = esc(zh)
  if (en) {
    body += `\\n{en}{size=24}{color=#bcd0e8}${esc(en)}{/color}{/size}{/en}`
  }
  return body
}

// --- Label-graph analysis: which nodes need their own label? -----------------
function successors(node) {
  if (!node) return []
  if (node.type === 'choice') return (node.choices ?? []).map((c) => c.nextId).filter(Boolean)
  if (node.type === 'cardBattle') return [node.winNextId].filter(Boolean)
  return node.nextId ? [node.nextId] : []
}

function computeLabelNodes(script) {
  const nodes = script.nodes ?? {}
  const predCount = {}
  const fromChoice = new Set()
  for (const node of Object.values(nodes)) {
    if (node.type === 'choice') {
      for (const c of node.choices ?? []) if (c.nextId) fromChoice.add(c.nextId)
    }
    for (const s of successors(node)) predCount[s] = (predCount[s] ?? 0) + 1
  }
  // Card-battle win branches break the current block with a jump, so they need
  // their own label too.
  for (const node of Object.values(nodes)) {
    if (node.type === 'cardBattle' && node.winNextId) fromChoice.add(node.winNextId)
  }
  const labelNodes = new Set([script.initialNodeId])
  for (const id of Object.keys(nodes)) {
    if (fromChoice.has(id) || (predCount[id] ?? 0) >= 2) labelNodes.add(id)
  }
  return labelNodes
}

// --- Emitters ----------------------------------------------------------------
function emitScene(lines, scene, images) {
  if (!scene) return
  if (scene.backgroundId && images.backgrounds.has(scene.backgroundId)) {
    lines.push(`    scene bg_${safe(scene.backgroundId)}`)
  }
  for (const ch of scene.characters ?? []) {
    if (!ch.spriteId || !images.sprites.has(ch.spriteId)) continue
    const pos = POSITION[ch.position] ?? 'center'
    lines.push(`    show spr_${safe(ch.spriteId)} at ${pos}`)
  }
}

function emitSay(lines, node) {
  const body = sayBody(node.text?.chinese ?? '', node.text?.english ?? '')
  if (node.speaker?.characterId) {
    lines.push(`    ${charVar(node.speaker.characterId)} "${body}"`)
  } else {
    lines.push(`    "${body}"`)
  }
}

function emitChapter(script, world) {
  const nodes = script.nodes ?? {}
  const labelNodes = computeLabelNodes(script)
  const images = script._images
  const questId = script.id
  const lines = []

  lines.push(`# Seeded from ${questId}.json — this file is now the source of truth, edit freely.`)
  lines.push(`label ${chapterLabel(questId)}:`)
  lines.push(`    $ chunky_chapter_start("${questId}")`)
  lines.push(`    jump ${nodeLabel(script.initialNodeId)}`)
  lines.push('')

  // Emit one block per label node; inline straight chains between them.
  const ordered = [...labelNodes].sort((a, b) => {
    // initial first, then source order
    if (a === script.initialNodeId) return -1
    if (b === script.initialNodeId) return 1
    return 0
  })

  for (const startId of ordered) {
    lines.push(`label ${nodeLabel(startId)}:`)
    let current = nodes[startId]
    const visitedInBlock = new Set()
    while (current) {
      if (visitedInBlock.has(current.id)) {
        lines.push(`    jump ${nodeLabel(current.id)}`)
        break
      }
      visitedInBlock.add(current.id)

      if (current.type === 'line') {
        emitScene(lines, current.scene, images)
        emitSay(lines, current)
        const next = current.nextId
        if (!next) { lines.push('    return'); break }
        if (labelNodes.has(next)) { lines.push(`    jump ${nodeLabel(next)}`); break }
        current = nodes[next]
        continue
      }

      if (current.type === 'cinematic') {
        if (current.imageId && images.cinematics.has(current.imageId)) {
          lines.push(`    scene cg_${safe(current.imageId)}`)
        }
        const cap = current.caption?.chinese ?? current.description ?? ''
        lines.push(`    "${sayBody(cap, current.caption?.english ?? '')}"`)
        const next = current.nextId
        if (!next) { lines.push('    return'); break }
        if (labelNodes.has(next)) { lines.push(`    jump ${nodeLabel(next)}`); break }
        current = nodes[next]
        continue
      }

      if (current.type === 'choice') {
        lines.push('    menu:')
        if (current.prompt?.chinese) {
          lines.push(`        "${sayBody(current.prompt.chinese, current.prompt?.english ?? '')}"`)
        }
        for (const choice of current.choices ?? []) {
          lines.push(`        "${sayBody(choice.label?.chinese ?? choice.id, choice.label?.english ?? '')}":`)
          lines.push('            # $ track("romance")  # TODO: weight this choice toward an ending')
          lines.push(`            jump ${nodeLabel(choice.nextId)}`)
        }
        break
      }

      if (current.type === 'cardBattle') {
        lines.push('    # (card battle removed) continue to the win branch')
        if (current.winNextId) { lines.push(`    jump ${nodeLabel(current.winNextId)}`) }
        else lines.push('    return')
        break
      }

      // questResult / end
      if (current.summary?.chinese) {
        lines.push(`    "${sayBody(current.summary.chinese, current.summary?.english ?? '')}"`)
      }
      const outcome = current.outcomeId ?? current.endingId ?? ''
      lines.push(`    $ chunky_chapter_complete("${questId}", "${outcome}")`)
      lines.push('    jump chunky_menu')
      break
    }
    lines.push('')
  }

  return lines.join('\n') + '\n'
}

// --- Asset collection --------------------------------------------------------
function collectReferenced(scripts, manifest) {
  const backgrounds = new Set()
  const sprites = new Set()
  const cinematics = new Set()
  for (const script of scripts) {
    for (const node of Object.values(script.nodes ?? {})) {
      const scene = node.scene
      if (scene?.backgroundId) backgrounds.add(scene.backgroundId)
      for (const ch of scene?.characters ?? []) if (ch.spriteId) sprites.add(ch.spriteId)
      if (node.type === 'cinematic' && node.imageId) cinematics.add(node.imageId)
    }
  }
  // keep only ones present in the manifest
  const keep = (set, group) => new Set([...set].filter((id) => manifest[group]?.[id]))
  return {
    backgrounds: keep(backgrounds, 'backgrounds'),
    sprites: keep(sprites, 'sprites'),
    cinematics: keep(cinematics, 'cinematics'),
  }
}

function copyAssetGroup(ids, manifest, group, folder, gameDir) {
  let copied = 0
  const targetDir = path.join(gameDir, 'images', folder)
  mkdirSync(targetDir, { recursive: true })
  for (const id of ids) {
    const asset = manifest[group][id]
    const src = path.join(ROOT, 'public', asset.src)
    if (!existsSync(src)) { console.warn(`  ! missing asset ${asset.src}`); continue }
    copyFileSync(src, path.join(targetDir, path.basename(asset.src)))
    copied++
  }
  return copied
}

// --- Generated framework files ----------------------------------------------
function writeImagesRpy(images, manifest, gameDir) {
  const lines = ['# Generated by scripts/renpy/convert-chapters.mjs.', '']
  for (const id of images.backgrounds) {
    lines.push(`image bg_${safe(id)} = "images/backgrounds/${path.basename(manifest.backgrounds[id].src)}"`)
  }
  for (const id of images.sprites) {
    lines.push(`image spr_${safe(id)} = "images/characters/${path.basename(manifest.sprites[id].src)}"`)
  }
  for (const id of images.cinematics) {
    lines.push(`image cg_${safe(id)} = "images/cinematics/${path.basename(manifest.cinematics[id].src)}"`)
  }
  writeFileSync(path.join(gameDir, 'chunky', 'images.rpy'), lines.join('\n') + '\n', 'utf8')
}

function writeCharactersRpy(scripts, gameDir) {
  const hasHan = (s) => /[㐀-鿿]/u.test(String(s ?? ''))
  const names = new Map()
  for (const script of scripts) {
    for (const [id, c] of Object.entries(script.characters ?? {})) {
      if (names.has(id)) continue
      // Some source names are corrupted ("??"); fall back to English, then id.
      const zh = c.displayNames?.chinese
      const name = hasHan(zh) ? zh : (c.displayNames?.english || id)
      names.set(id, name)
    }
  }
  const lines = ['# Generated by scripts/renpy/convert-chapters.mjs.', '']
  for (const [id, zh] of names) {
    lines.push(`define ${charVar(id)} = Character("${esc(zh)}")`)
  }
  writeFileSync(path.join(gameDir, 'chunky', 'characters.rpy'), lines.join('\n') + '\n', 'utf8')
}

function writeChaptersRpy(world, gameDir) {
  const lines = ['# Generated by scripts/renpy/convert-chapters.mjs.', 'define chunky_chapters = [']
  for (const id of STORY_ORDER) {
    const quest = world.quests?.[id]
    const zh = quest?.title?.chinese ?? id
    const en = quest?.title?.english ?? ''
    lines.push(`    {"id": ${JSON.stringify(id)}, "label": ${JSON.stringify(chapterLabel(id))}, "title_zh": ${JSON.stringify(zh)}, "title_en": ${JSON.stringify(en)}},`)
  }
  lines.push(']')
  writeFileSync(path.join(gameDir, 'chunky', 'chapters.rpy'), lines.join('\n') + '\n', 'utf8')
}

// --- Main --------------------------------------------------------------------
function main() {
  const world = readJson(WORLD_PATH)
  const manifest = readJson(world.assetManifestPath)
  const gameDir = path.join(ROOT, OUT_PROJECT, 'game')
  const storyDir = path.join(gameDir, 'story')

  const scripts = STORY_ORDER.map((id) => {
    const quest = world.quests?.[id]
    if (!quest?.scriptPath) throw new Error(`Quest ${id} not found in world.json`)
    return readJson(quest.scriptPath)
  })

  const images = collectReferenced(scripts, manifest)
  for (const s of scripts) s._images = images

  rmSync(storyDir, { recursive: true, force: true })
  mkdirSync(storyDir, { recursive: true })

  let nodeTotal = 0
  for (let i = 0; i < scripts.length; i++) {
    const script = scripts[i]
    const id = STORY_ORDER[i]
    writeFileSync(path.join(storyDir, `${safe(id)}.rpy`), emitChapter(script, world), 'utf8')
    nodeTotal += Object.keys(script.nodes ?? {}).length
  }

  writeImagesRpy(images, manifest, gameDir)
  writeCharactersRpy(scripts, gameDir)
  writeChaptersRpy(world, gameDir)

  const bg = copyAssetGroup(images.backgrounds, manifest, 'backgrounds', 'backgrounds', gameDir)
  const spr = copyAssetGroup(images.sprites, manifest, 'sprites', 'characters', gameDir)
  const cg = copyAssetGroup(images.cinematics, manifest, 'cinematics', 'cinematics', gameDir)

  console.log(`Converted ${scripts.length} chapters (${nodeTotal} nodes).`)
  console.log(`Assets copied: ${bg} backgrounds, ${spr} sprites, ${cg} cinematics.`)
  console.log(`Output: ${path.relative(ROOT, storyDir)}`)
  console.log('Next: npm run renpy:pinyin')
}

main()
