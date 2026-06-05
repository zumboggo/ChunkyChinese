#!/usr/bin/env node
import { copyFile, mkdir, readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'
import {
  assetSizeReport,
  assertClientSecretBoundary,
  estimateAssets,
  fileExists,
  listCandidateMetadata,
  loadAuthoringWorld,
  missingReferences,
  modelProfiles,
  parseArgs,
  PUBLIC_WORLD_ROOT,
  readJson,
  selectAssets,
  verifyAuthoringSpec,
  writeJson,
} from './core.mjs'
import { generateReplicateAsset } from './replicateProvider.mjs'

const [command = 'status', ...rawArgs] = process.argv.slice(2)
const args = parseArgs(rawArgs)
const worldId = args.world ?? args.story ?? 'royal-road-prototype'

try {
  assertClientSecretBoundary()
  if (command === 'status') await status()
  else if (command === 'generate') await generate()
  else if (command === 'review') await review()
  else if (command === 'process') await processApproved()
  else if (command === 'publish') await publish()
  else if (command === 'verify') await verify()
  else throw new Error(`Unknown command: ${command}`)
} catch (error) {
  console.error(error.message)
  process.exitCode = 1
}

async function status() {
  const { root, spec } = await loadAuthoringWorld(worldId)
  const assets = selectAssets(spec, args)
  const estimate = estimateAssets(assets, args)
  const sizes = await assetSizeReport(root)
  console.log(`Visual Novel assets: ${worldId}`)
  console.log(`Selected assets: ${assets.length}`)
  console.log(`Candidate files: ${sizes.count} / ${formatBytes(sizes.bytes)}`)
  console.log(`Estimated selected cost: $${estimate.totalEstimatedCostUsd.toFixed(2)}`)
  for (const item of estimate.items) {
    console.log(`- ${item.asset.id} [${item.asset.status}] ${item.profile?.id ?? 'unknown-profile'} x${item.count} ~$${item.estimatedCostUsd.toFixed(2)}`)
  }
}

async function generate() {
  const { root, spec, style } = await loadAuthoringWorld(worldId)
  const assets = selectAssets(spec, args).filter((asset) => ['needed', 'failed'].includes(asset.status) || args.asset)
  const estimate = estimateAssets(assets, args)
  const maxCost = Number(args['max-cost'] ?? 3)
  console.log(`Generation plan for ${worldId}: ${assets.length} asset(s), estimated $${estimate.totalEstimatedCostUsd.toFixed(2)} / max $${maxCost.toFixed(2)}`)
  for (const item of estimate.items) {
    console.log(`- ${item.asset.id}: ${item.profile?.model ?? 'unknown model'} x${item.count}`)
  }
  if (estimate.totalEstimatedCostUsd > maxCost) throw new Error('Estimated cost exceeds --max-cost. Nothing was generated.')
  if (args['dry-run']) {
    console.log('Dry run complete. No Replicate calls were made.')
    return
  }
  const token = process.env.REPLICATE_API_TOKEN
  if (!token) throw new Error('REPLICATE_API_TOKEN is not set. Run dry-run or set a local, non-VITE env var.')
  for (const item of estimate.items) {
    if (modelProfiles[item.asset.modelProfile]?.manualFallbackOnly && !args.asset) {
      console.log(`Skipping manual fallback profile asset without --asset: ${item.asset.id}`)
      continue
    }
    const missing = await missingReferences(root, item.asset)
    if (modelProfiles[item.asset.modelProfile]?.requiresReference && missing.length > 0) {
      console.log(`Skipping ${item.asset.id}; missing approved master reference(s): ${missing.join(', ')}`)
      continue
    }
    const outputs = await generateReplicateAsset({
      root,
      spec,
      style,
      asset: item.asset,
      count: item.count,
      token,
    })
    console.log(`Generated ${outputs.length} candidate file(s) for ${item.asset.id}`)
  }
}

async function review() {
  const { root } = await loadAuthoringWorld(worldId)
  const records = await listCandidateMetadata(root)
  const html = [
    '<!doctype html><meta charset="utf-8"><title>VN Asset Review</title>',
    '<style>body{font-family:system-ui;margin:24px;background:#111;color:#f5f5f5}section{margin:0 0 28px}img{max-width:280px;max-height:240px;background:#333}figure{display:inline-flex;flex-direction:column;gap:8px;margin:8px;padding:12px;background:#1d1d1d}code{color:#9fd}</style>',
    `<h1>${worldId} candidate review</h1>`,
  ]
  const grouped = Map.groupBy(records, (record) => record.data.assetId)
  for (const [assetId, assetRecords] of grouped) {
    html.push(`<section><h2>${escapeHtml(assetId)}</h2>`)
    for (const record of assetRecords) {
      const src = path.relative(path.join(root, 'contact-sheets'), path.join(process.cwd(), record.data.candidatePath)).replaceAll(path.sep, '/')
      html.push(`<figure><img src="${src}" alt="${escapeHtml(assetId)}"><figcaption><code>${escapeHtml(record.data.candidatePath)}</code><br>${escapeHtml(record.data.modelProfile)}</figcaption></figure>`)
    }
    html.push('</section>')
  }
  const outPath = path.join(root, 'contact-sheets', 'latest.html')
  await mkdir(path.dirname(outPath), { recursive: true })
  await writeFile(outPath, `${html.join('\n')}\n`)
  console.log(`Review sheet written: ${path.relative(process.cwd(), outPath)}`)
}

async function processApproved() {
  const { root } = await loadAuthoringWorld(worldId)
  const approvalPath = path.join(root, 'approvals.json')
  if (!await fileExists(approvalPath)) {
    console.log(`No approvals file found at ${path.relative(process.cwd(), approvalPath)}. Nothing processed.`)
    return
  }
  const approvals = await readJson(approvalPath)
  for (const approval of approvals.approved ?? []) {
    const source = path.join(process.cwd(), approval.candidatePath)
    const target = path.join(root, 'source-assets', 'approved', approval.assetId, path.basename(source))
    await mkdir(path.dirname(target), { recursive: true })
    await copyFile(source, target)
    await writeJson(`${target}.asset.json`, { ...approval, sourceAssetPath: path.relative(process.cwd(), target).replaceAll(path.sep, '/'), processedAt: new Date().toISOString() })
    console.log(`Processed approved source: ${path.relative(process.cwd(), target)}`)
  }
}

async function publish() {
  const { root } = await loadAuthoringWorld(worldId)
  const publishPath = path.join(root, 'publish-map.json')
  if (!await fileExists(publishPath)) {
    console.log(`No publish map found at ${path.relative(process.cwd(), publishPath)}. Nothing published.`)
    return
  }
  const publishMap = await readJson(publishPath)
  const publicRoot = path.join(process.cwd(), PUBLIC_WORLD_ROOT, worldId)
  for (const item of publishMap.assets ?? []) {
    const source = path.join(process.cwd(), item.source)
    const target = path.join(publicRoot, item.target)
    if (!target.startsWith(publicRoot)) throw new Error(`Publish target escapes runtime pack: ${item.target}`)
    await mkdir(path.dirname(target), { recursive: true })
    await copyFile(source, target)
    console.log(`Published ${item.target}`)
  }
}

async function verify() {
  const { root, spec } = await loadAuthoringWorld(worldId)
  const result = await verifyAuthoringSpec(root, spec)
  for (const warning of result.warnings) console.warn(`Warning: ${warning}`)
  for (const error of result.errors) console.error(`Error: ${error}`)
  if (result.errors.length > 0) throw new Error(`Authoring verification failed with ${result.errors.length} error(s).`)
  console.log(`Authoring verification passed for ${worldId}.`)
}

function formatBytes(bytes) {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`
}

function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>"']/g, (char) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
  })[char])
}
