import { existsSync, readFileSync, statSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const PUBLIC_DIR = path.join(ROOT, 'public')
const WORLD_INDEX_PATH = path.join(PUBLIC_DIR, 'reader-packs', 'lms-books', 'visual-novels', 'worlds', 'index.json')
const ALLOWED_IMAGE_EXTENSIONS = new Set(['.svg', '.webp', '.png', '.jpg', '.jpeg', '.avif'])

const index = readJson(WORLD_INDEX_PATH)
const allErrors = []
if (!Array.isArray(index)) throw new Error('Visual Novel world index must be an array.')
for (const entry of index) verifyWorld(entry)

if (allErrors.length > 0) {
  for (const error of allErrors) console.error(`ERROR ${error}`)
  process.exitCode = 1
} else {
  console.log('Visual Novel world checks passed.')
}

function verifyWorld(entry) {
  const errors = []
  const warnings = []
  const world = readJson(publicPath(entry.worldPath))
  const manifest = readJson(publicPath(world.assetManifestPath))
  const locationIds = new Set(Object.keys(world.locations ?? {}))
  const questIds = new Set(Object.keys(world.quests ?? {}))
  const scripts = new Map()
  const backgroundRefs = new Set()
  const spriteRefs = new Set()
  const cinematicRefs = new Set()
  const commitIds = new Set()

  if (!world.id) errors.push('missing world id')
  if (!world.schemaVersion) errors.push('missing schemaVersion')
  if (!world.contentVersion) errors.push('missing contentVersion')
  if (!locationIds.has(world.initialLocationId)) errors.push(`missing initial location ${world.initialLocationId}`)

  for (const location of Object.values(world.locations ?? {})) {
    if (!location.name?.chinese) errors.push(`location ${location.id} missing Chinese name`)
    if (location.backgroundId) backgroundRefs.add(location.backgroundId)
    if (location.restoredBackgroundId) backgroundRefs.add(location.restoredBackgroundId)
    for (const target of location.travelTo ?? []) {
      if (!locationIds.has(target)) errors.push(`location ${location.id} travels to missing ${target}`)
    }
    for (const action of location.availableActions ?? []) {
      if (action.kind === 'travel' && !locationIds.has(action.targetId)) errors.push(`${action.id} targets missing location ${action.targetId}`)
      if (action.kind === 'quest' && !questIds.has(action.targetId)) errors.push(`${action.id} targets missing quest ${action.targetId}`)
      if (action.kind === 'encounterPool' && !world.encounterPools?.[action.targetId]) errors.push(`${action.id} targets missing encounter pool ${action.targetId}`)
    }
  }

  for (const pool of Object.values(world.encounterPools ?? {})) {
    for (const questId of pool.questIds ?? []) {
      if (!questIds.has(questId)) errors.push(`pool ${pool.id} references missing quest ${questId}`)
    }
  }

  for (const quest of Object.values(world.quests ?? {})) {
    if (quest.returnLocationId && !locationIds.has(quest.returnLocationId)) {
      errors.push(`quest ${quest.id} returns to missing ${quest.returnLocationId}`)
    }
    const script = readJson(publicPath(quest.scriptPath))
    scripts.set(quest.scriptId, script)
    if (!script.nodes?.[quest.entryNodeId]) errors.push(`quest ${quest.id} entry node missing ${quest.entryNodeId}`)
    const reachable = new Set()
    walk(quest.entryNodeId, script, reachable)
    let resultCount = 0
    for (const [nodeId, node] of Object.entries(script.nodes ?? {})) {
      if (!reachable.has(nodeId)) warnings.push(`quest ${quest.id} has unreachable node ${nodeId}`)
      collectNodeAssets(node, backgroundRefs, spriteRefs, cinematicRefs)
      for (const nextId of nextNodeIds(node)) {
        if (!script.nodes?.[nextId]) errors.push(`node ${nodeId} points to missing ${nextId}`)
      }
      if (node.type === 'questResult') {
        resultCount += 1
        if (node.questId !== quest.id) errors.push(`result ${nodeId} questId ${node.questId} does not match ${quest.id}`)
        if (node.returnLocationId && !locationIds.has(node.returnLocationId)) errors.push(`result ${nodeId} returns to missing ${node.returnLocationId}`)
        const commitId = `${quest.id}:${node.resultId ?? `${node.questId}:${node.outcomeId}`}`
        if (commitIds.has(commitId)) errors.push(`duplicate commit id ${commitId}`)
        commitIds.add(commitId)
      }
    }
    if (resultCount === 0) errors.push(`quest ${quest.id} has no questResult`)
  }

  validateAssetRefs('background', backgroundRefs, manifest.backgrounds ?? {}, errors)
  validateAssetRefs('sprite', spriteRefs, manifest.sprites ?? {}, errors)
  validateAssetRefs('cinematic', cinematicRefs, manifest.cinematics ?? {}, errors)
  const report = validateAssetFiles(manifest, errors, warnings)

  console.log(`\nVisual Novel World: ${world.id}`)
  console.log(`Locations:       ${locationIds.size}`)
  console.log(`Quests:          ${questIds.size}`)
  console.log(`Backgrounds:     ${report.backgrounds.count} files / ${formatBytes(report.backgrounds.bytes)}`)
  console.log(`Sprites:         ${report.sprites.count} files / ${formatBytes(report.sprites.bytes)}`)
  console.log(`Cinematics:      ${report.cinematics.count} files / ${formatBytes(report.cinematics.bytes)}`)
  console.log(`Total visuals:   ${formatBytes(report.totalBytes)}`)
  if (report.largest.path) console.log(`Largest asset:   ${report.largest.path} / ${formatBytes(report.largest.bytes)}`)
  for (const warning of warnings) console.warn(`WARN ${world.id}: ${warning}`)
  for (const error of errors) allErrors.push(`${world.id}: ${error}`)
}

function collectNodeAssets(node, backgroundRefs, spriteRefs, cinematicRefs) {
  if (node.type === 'line' && node.scene) {
    if (node.scene.backgroundId) backgroundRefs.add(node.scene.backgroundId)
    for (const character of node.scene.characters ?? []) spriteRefs.add(character.spriteId)
  }
  if (node.type === 'cinematic') cinematicRefs.add(node.imageId)
}

function validateAssetRefs(label, refs, assets, errors) {
  for (const id of refs) {
    if (!assets[id]) errors.push(`missing ${label} asset ${id}`)
  }
}

function validateAssetFiles(manifest, errors, warnings) {
  const report = {
    backgrounds: { count: 0, bytes: 0 },
    sprites: { count: 0, bytes: 0 },
    cinematics: { count: 0, bytes: 0 },
    totalBytes: 0,
    largest: { path: '', bytes: 0 },
  }
  for (const [type, assets] of Object.entries({
    backgrounds: manifest.backgrounds ?? {},
    sprites: manifest.sprites ?? {},
    cinematics: manifest.cinematics ?? {},
  })) {
    for (const asset of Object.values(assets)) {
      if (!asset.src || asset.src.includes('vn-authoring') || asset.src.includes('candidates') || asset.src.includes('..')) {
        errors.push(`${asset.id} has invalid runtime path ${asset.src}`)
        continue
      }
      const extension = path.extname(asset.src).toLowerCase()
      if (!ALLOWED_IMAGE_EXTENSIONS.has(extension)) warnings.push(`${asset.src} has unsupported image extension`)
      const absolute = publicPath(asset.src)
      if (!existsSync(absolute)) {
        errors.push(`missing asset file ${asset.src}`)
        continue
      }
      const bytes = statSync(absolute).size
      report[type].count += 1
      report[type].bytes += bytes
      report.totalBytes += bytes
      if (bytes > report.largest.bytes) report.largest = { path: asset.src, bytes }
      if ((asset.width ?? 0) <= 0 || (asset.height ?? 0) <= 0) errors.push(`${asset.id} missing dimensions`)
      if (type === 'sprites' && (asset.anchorX === undefined || asset.anchorY === undefined)) errors.push(`${asset.id} missing sprite anchors`)
      if (type === 'backgrounds' && bytes > 800 * 1024) warnings.push(`${asset.src} is larger than 800 KB`)
      if (type === 'sprites' && bytes > 400 * 1024) warnings.push(`${asset.src} is larger than 400 KB`)
      if (type === 'cinematics' && bytes > 1.5 * 1024 * 1024) warnings.push(`${asset.src} is larger than 1.5 MB`)
    }
  }
  return report
}

function walk(nodeId, script, reachable) {
  if (!nodeId || reachable.has(nodeId)) return
  const node = script.nodes?.[nodeId]
  if (!node) return
  reachable.add(nodeId)
  for (const nextId of nextNodeIds(node)) walk(nextId, script, reachable)
}

function nextNodeIds(node) {
  if (node.type === 'choice') return (node.choices ?? []).map((choice) => choice.nextId).filter(Boolean)
  return node.nextId ? [node.nextId] : []
}

function publicPath(relativePath) {
  const normalized = relativePath.replace(/\\/g, '/').replace(/^\/+/, '')
  const absolute = path.resolve(PUBLIC_DIR, normalized)
  if (!absolute.startsWith(PUBLIC_DIR)) throw new Error(`Path escapes public directory: ${relativePath}`)
  return absolute
}

function readJson(filePath) {
  return JSON.parse(readFileSync(filePath, 'utf8'))
}

function formatBytes(bytes) {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`
}
