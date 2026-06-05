import { createHash } from 'node:crypto'
import { access, mkdir, readFile, readdir, stat, writeFile } from 'node:fs/promises'
import path from 'node:path'

export const AUTHORING_ROOT = 'vn-authoring'
export const PUBLIC_WORLD_ROOT = 'public/reader-packs/lms-books/visual-novels/worlds'

export const modelProfiles = {
  'krea-background': {
    id: 'krea-background',
    model: 'krea/krea-2-medium',
    role: 'background',
    estimatedCostUsd: 0.04,
    defaults: { aspect_ratio: '16:9', creativity: 'medium' },
  },
  'flux-scene': {
    id: 'flux-scene',
    model: 'black-forest-labs/flux-schnell',
    role: 'background',
    estimatedCostUsd: 0.003,
    defaults: { aspect_ratio: '16:9', output_format: 'webp' },
  },
  'flux-sprite': {
    id: 'flux-sprite',
    model: 'black-forest-labs/flux-schnell',
    role: 'sprite',
    estimatedCostUsd: 0.003,
    defaults: { aspect_ratio: '3:4', output_format: 'webp' },
  },
  'seedream-cinematic': {
    id: 'seedream-cinematic',
    model: 'bytedance/seedream-5-lite',
    role: 'cinematic',
    estimatedCostUsd: 0.05,
    defaults: { aspect_ratio: '16:9', size: '2K', max_images: 1 },
  },
  'kontext-sprite': {
    id: 'kontext-sprite',
    model: 'black-forest-labs/flux-kontext-dev',
    role: 'sprite',
    estimatedCostUsd: 0.025,
    defaults: { aspect_ratio: '3:4', output_format: 'png' },
    requiresReference: true,
  },
  'kontext-sprite-premium': {
    id: 'kontext-sprite-premium',
    model: 'black-forest-labs/flux-kontext-pro',
    role: 'sprite',
    estimatedCostUsd: 0.08,
    defaults: { aspect_ratio: '3:4', output_format: 'png' },
    requiresReference: true,
    manualFallbackOnly: true,
  },
}

export function parseArgs(argv) {
  const args = { _: [] }
  for (let index = 0; index < argv.length; index += 1) {
    const value = argv[index]
    if (!value.startsWith('--')) {
      args._.push(value)
      continue
    }
    const key = value.slice(2)
    const next = argv[index + 1]
    if (!next || next.startsWith('--')) {
      args[key] = true
    } else {
      args[key] = next
      index += 1
    }
  }
  return args
}

export async function readJson(filePath) {
  return JSON.parse(await readFile(filePath, 'utf8'))
}

export async function writeJson(filePath, value) {
  await mkdir(path.dirname(filePath), { recursive: true })
  await writeFile(filePath, `${JSON.stringify(value, null, 2)}\n`)
}

export async function fileExists(filePath) {
  try {
    await access(filePath)
    return true
  } catch {
    return false
  }
}

export async function loadAuthoringWorld(worldId, cwd = process.cwd()) {
  const root = path.join(cwd, AUTHORING_ROOT, worldId)
  const specPath = path.join(root, 'asset-spec.json')
  const stylePath = path.join(root, 'style.json')
  const spec = await readJson(specPath)
  const style = await readJson(stylePath)
  return { root, spec, style, specPath, stylePath }
}

export function allSpecAssets(spec) {
  return [
    ...(spec.backgrounds ?? []).map((asset) => ({ ...asset, kind: 'background' })),
    ...(spec.cinematics ?? []).map((asset) => ({ ...asset, kind: 'cinematic' })),
    ...(spec.sprites ?? []).map((asset) => ({ ...asset, kind: 'sprite' })),
  ]
}

export function selectAssets(spec, args) {
  return allSpecAssets(spec).filter((asset) => {
    if (args.asset && asset.id !== args.asset) return false
    if (args.profile && asset.modelProfile !== args.profile) return false
    if (args['only-missing'] && !['needed', 'failed'].includes(asset.status)) return false
    if (!args['retry-failed'] && asset.status === 'failed') return false
    return true
  })
}

export function candidateCount(asset, args = {}) {
  if (args['candidate-count']) return Number(args['candidate-count'])
  if (Number.isFinite(asset.candidateCount)) return asset.candidateCount
  if (asset.kind === 'background') return 4
  if (asset.kind === 'cinematic') return 4
  if (asset.kind === 'sprite') return 2
  return 1
}

export function estimateAssets(assets, args = {}) {
  const items = assets.map((asset) => {
    const profile = modelProfiles[asset.modelProfile]
    const count = candidateCount(asset, args)
    const estimatedCostUsd = (profile?.estimatedCostUsd ?? 0) * count
    return { asset, profile, count, estimatedCostUsd }
  })
  return {
    items,
    totalEstimatedCostUsd: items.reduce((sum, item) => sum + item.estimatedCostUsd, 0),
  }
}

export async function promptText(root, asset, style) {
  const prompt = asset.promptFile ? await readFile(path.join(root, asset.promptFile), 'utf8') : asset.prompt ?? ''
  return [
    `Style bible ${style.styleId}: ${style.description}`,
    style.positivePrompt,
    prompt.trim(),
    `Avoid: ${(style.avoid ?? []).join(', ')}`,
  ].filter(Boolean).join('\n\n')
}

export async function missingReferences(root, asset) {
  const refs = []
  for (const reference of asset.references ?? []) {
    refs.push(reference.path)
  }
  if (asset.masterReferencePath) refs.push(asset.masterReferencePath)
  if (asset.poseMasterReferencePath) refs.push(asset.poseMasterReferencePath)
  const missing = []
  for (const relativePath of refs) {
    if (!await fileExists(path.join(root, relativePath))) missing.push(relativePath)
  }
  return missing
}

export function assertClientSecretBoundary(env = process.env) {
  if (env.VITE_REPLICATE_API_TOKEN || env.VITE_REPLICATE_TOKEN || env.VITE_REPLICATE) {
    throw new Error('Refusing to run: Replicate credentials must not use VITE_* environment variables.')
  }
}

export async function verifyAuthoringSpec(root, spec) {
  const errors = []
  const warnings = []
  const ids = new Set()
  for (const asset of allSpecAssets(spec)) {
    if (!asset.id) errors.push('Asset missing id.')
    if (ids.has(asset.id)) errors.push(`Duplicate asset id: ${asset.id}`)
    ids.add(asset.id)
    if (!modelProfiles[asset.modelProfile]) errors.push(`${asset.id} uses unknown model profile ${asset.modelProfile}`)
    if (asset.promptFile && !await fileExists(path.join(root, asset.promptFile))) errors.push(`${asset.id} prompt file is missing: ${asset.promptFile}`)
    const missing = await missingReferences(root, asset)
    if (missing.length > 0) {
      const message = `${asset.id} is missing reference files: ${missing.join(', ')}`
      if (modelProfiles[asset.modelProfile]?.requiresReference) warnings.push(`${message}. Real generation will skip or fail until approved masters are supplied.`)
      else warnings.push(message)
    }
    for (const value of Object.values(asset)) {
      if (typeof value === 'string' && value.includes('public/')) {
        errors.push(`${asset.id} references public runtime paths from authoring data.`)
      }
    }
  }
  return { errors, warnings }
}

export async function checksumFile(filePath) {
  const buffer = await readFile(filePath)
  return createHash('sha256').update(buffer).digest('hex')
}

export async function listCandidateMetadata(root) {
  const metadataRoot = path.join(root, 'metadata')
  if (!await fileExists(metadataRoot)) return []
  const files = []
  async function walk(dir) {
    for (const entry of await readdir(dir, { withFileTypes: true })) {
      const entryPath = path.join(dir, entry.name)
      if (entry.isDirectory()) await walk(entryPath)
      else if (entry.name.endsWith('.asset.json')) files.push(entryPath)
    }
  }
  await walk(metadataRoot)
  const records = []
  for (const filePath of files) records.push({ filePath, data: await readJson(filePath) })
  return records
}

export async function assetSizeReport(root) {
  const candidatesRoot = path.join(root, 'candidates')
  if (!await fileExists(candidatesRoot)) return { count: 0, bytes: 0 }
  let count = 0
  let bytes = 0
  async function walk(dir) {
    for (const entry of await readdir(dir, { withFileTypes: true })) {
      const entryPath = path.join(dir, entry.name)
      if (entry.isDirectory()) await walk(entryPath)
      else {
        if (entry.name === '.gitkeep') continue
        const info = await stat(entryPath)
        count += 1
        bytes += info.size
      }
    }
  }
  await walk(candidatesRoot)
  return { count, bytes }
}
