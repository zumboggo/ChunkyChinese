import { existsSync, readFileSync, statSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const PUBLIC_DIR = path.join(ROOT, 'public')
const VN_INDEX_PATH = path.join(PUBLIC_DIR, 'reader-packs', 'lms-books', 'visual-novels', 'index.json')
const ALLOWED_IMAGE_EXTENSIONS = new Set(['.svg', '.webp', '.png', '.jpg', '.jpeg', '.avif'])

const readerSentenceIds = loadReaderSentenceIds()
const index = readJson(VN_INDEX_PATH)
const allErrors = []

if (!Array.isArray(index)) {
  throw new Error('Visual Novel index must be an array.')
}

for (const entry of index) {
  verifyEntry(entry)
}

if (allErrors.length > 0) {
  for (const error of allErrors) console.error(`ERROR ${error}`)
  process.exitCode = 1
} else {
  console.log('Visual Novel pack checks passed.')
}

function verifyEntry(entry) {
  const errors = []
  const warnings = []
  const scriptPath = publicPath(entry.scriptPath)
  const script = readJson(scriptPath)
  const manifestPath = publicPath(script.assetManifestPath)
  const manifest = readJson(manifestPath)
  const nodeIds = new Set(Object.keys(script.nodes ?? {}))
  const assetRefs = {
    backgrounds: new Set(),
    sprites: new Set(),
    cinematics: new Set(),
  }

  if (!script.schemaVersion) errors.push('missing schemaVersion')
  if (!script.contentVersion) errors.push('missing contentVersion')
  if (!nodeIds.has(script.initialNodeId)) errors.push(`missing initial node ${script.initialNodeId}`)
  if (!manifest.schemaVersion) errors.push('asset manifest missing schemaVersion')
  if (manifest.contentVersion !== script.contentVersion) {
    warnings.push(`manifest contentVersion ${manifest.contentVersion} differs from script ${script.contentVersion}`)
  }

  const reachable = new Set()
  walk(script.initialNodeId, script, reachable)
  for (const nodeId of nodeIds) {
    const node = script.nodes[nodeId]
    if (!reachable.has(nodeId)) warnings.push(`unreachable node ${nodeId}`)
    validateNode(script, node, nodeIds, assetRefs, errors, warnings)
    if (!canReachEnd(nodeId, script, new Set())) warnings.push(`node ${nodeId} cannot reach an end`)
  }

  validateAssetRefs('backgrounds', assetRefs.backgrounds, manifest.backgrounds ?? {}, errors)
  validateAssetRefs('sprites', assetRefs.sprites, manifest.sprites ?? {}, errors)
  validateAssetRefs('cinematics', assetRefs.cinematics, manifest.cinematics ?? {}, errors)
  const assetReport = validateAssetFiles(manifest, errors, warnings)

  console.log(`\nVisual Novel: ${script.id}`)
  console.log(`Nodes:           ${nodeIds.size}`)
  console.log(`Backgrounds:     ${assetReport.backgrounds.count} files / ${formatBytes(assetReport.backgrounds.bytes)}`)
  console.log(`Sprites:         ${assetReport.sprites.count} files / ${formatBytes(assetReport.sprites.bytes)}`)
  console.log(`Cinematics:      ${assetReport.cinematics.count} files / ${formatBytes(assetReport.cinematics.bytes)}`)
  console.log(`Total visuals:   ${formatBytes(assetReport.totalBytes)}`)
  if (assetReport.largest.path) {
    console.log(`Largest asset:   ${assetReport.largest.path} / ${formatBytes(assetReport.largest.bytes)}`)
  }
  for (const warning of warnings) console.warn(`WARN ${script.id}: ${warning}`)
  for (const error of errors) allErrors.push(`${script.id}: ${error}`)
}

function validateNode(script, node, nodeIds, assetRefs, errors, warnings) {
  if (!node?.id) {
    errors.push('node missing id')
    return
  }
  if (node.type === 'line') {
    validateText(node.id, node.text, errors, warnings)
    validateNext(node.id, node.nextId, nodeIds, errors)
    collectSceneAssets(node.scene, assetRefs)
  } else if (node.type === 'choice') {
    validateText(node.id, node.prompt, errors, warnings, true)
    if (!Array.isArray(node.choices) || node.choices.length === 0) errors.push(`${node.id} has no choices`)
    for (const choice of node.choices ?? []) {
      validateText(`${node.id}/${choice.id}`, choice.label, errors, warnings)
      validateNext(`${node.id}/${choice.id}`, choice.nextId, nodeIds, errors)
      validateEffects(`${node.id}/${choice.id}`, choice.kind, choice.effects ?? [], errors, warnings)
      validateConditions(`${node.id}/${choice.id}`, choice.conditions ?? [], script, warnings)
    }
  } else if (node.type === 'cinematic') {
    if (!node.imageId) errors.push(`${node.id} missing imageId`)
    if (!node.description) errors.push(`${node.id} missing cinematic description`)
    assetRefs.cinematics.add(node.imageId)
    validateText(node.id, node.caption, errors, warnings, true)
    validateNext(node.id, node.nextId, nodeIds, errors)
  } else if (node.type === 'end') {
    validateText(node.id, node.summary, errors, warnings, true)
  } else {
    errors.push(`${node.id} has unknown type ${node.type}`)
  }
}

function validateText(label, text, errors, warnings, optional = false) {
  if (!text) {
    if (!optional) errors.push(`${label} missing text`)
    return
  }
  if (!text.chinese) errors.push(`${label} missing Chinese text`)
  if (text.readerSentenceId && !readerSentenceIds.has(text.readerSentenceId)) {
    warnings.push(`${label} references unknown Reader sentence ${text.readerSentenceId}`)
  }
  if ((text.chinese ?? '').length > 70) warnings.push(`${label} Chinese line is long`)
}

function validateNext(label, nextId, nodeIds, errors) {
  if (!nextId) return
  if (!nodeIds.has(nextId)) errors.push(`${label} points to missing node ${nextId}`)
}

function validateEffects(label, choiceKind, effects, errors, warnings) {
  const onceKeys = new Set()
  for (const effect of effects) {
    if (!effect.id) errors.push(`${label} effect missing id`)
    if (effect.onceKey) {
      if (onceKeys.has(effect.onceKey)) warnings.push(`${label} repeats onceKey ${effect.onceKey}`)
      onceKeys.add(effect.onceKey)
    }
    if (choiceKind === 'expressive' && (effect.op === 'addMoney' || effect.op === 'addSkill')) {
      warnings.push(`${label} expressive choice mutates ${effect.op}`)
    }
  }
}

function validateConditions(label, conditions, script, warnings) {
  for (const condition of conditions) {
    if (condition.op === 'skillAtLeast' && !(condition.skill in (script.initialState?.skills ?? {}))) {
      warnings.push(`${label} references skill not present in initialState: ${condition.skill}`)
    }
  }
}

function collectSceneAssets(scene, assetRefs) {
  if (!scene) return
  if (scene.backgroundId) assetRefs.backgrounds.add(scene.backgroundId)
  for (const character of scene.characters ?? []) {
    if (character.spriteId) assetRefs.sprites.add(character.spriteId)
  }
}

function validateAssetRefs(type, refs, assets, errors) {
  for (const id of refs) {
    if (!assets[id]) errors.push(`missing ${type} asset ${id}`)
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
    const seenPaths = new Set()
    for (const asset of Object.values(assets)) {
      if (!asset.src || asset.src.includes('authoring') || asset.src.includes('..')) {
        errors.push(`${asset.id} has invalid runtime path ${asset.src}`)
        continue
      }
      if (seenPaths.has(asset.src)) warnings.push(`${asset.src} is duplicated in ${type}`)
      seenPaths.add(asset.src)
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
      if (type === 'backgrounds' && bytes > 800 * 1024) warnings.push(`${asset.src} is larger than 800 KB`)
      if (type === 'sprites' && bytes > 400 * 1024) warnings.push(`${asset.src} is larger than 400 KB`)
      if (type === 'cinematics' && bytes > 1.5 * 1024 * 1024) warnings.push(`${asset.src} is larger than 1.5 MB`)
      if ((asset.width ?? 0) <= 0 || (asset.height ?? 0) <= 0) warnings.push(`${asset.id} missing dimensions`)
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

function canReachEnd(nodeId, script, visiting) {
  if (visiting.has(nodeId)) return false
  const node = script.nodes?.[nodeId]
  if (!node) return false
  if (node.type === 'end') return true
  visiting.add(nodeId)
  return nextNodeIds(node).some((nextId) => canReachEnd(nextId, script, new Set(visiting)))
}

function nextNodeIds(node) {
  if (node.type === 'choice') return (node.choices ?? []).map((choice) => choice.nextId).filter(Boolean)
  return node.nextId ? [node.nextId] : []
}

function loadReaderSentenceIds() {
  const ids = new Set()
  const packDir = path.join(PUBLIC_DIR, 'reader-packs', 'lms-books')
  const manifest = readJson(path.join(packDir, 'reader_manifest.json'))
  for (const bookSummary of manifest.books ?? []) {
    const book = readJson(path.join(packDir, bookSummary.path))
    for (const story of book.stories ?? []) {
      for (const sentence of story.sentences ?? []) ids.add(sentence.id)
    }
  }
  return ids
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
