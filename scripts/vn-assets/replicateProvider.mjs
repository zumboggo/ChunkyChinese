import { mkdir, writeFile } from 'node:fs/promises'
import path from 'node:path'
import Replicate from 'replicate'
import {
  checksumFile,
  modelProfiles,
  missingReferences,
  promptText,
  writeJson,
} from './core.mjs'

export async function inspectModelSchema(profile, token) {
  const replicate = new Replicate({ auth: token })
  const [owner, name] = profile.model.split('/')
  try {
    const model = await replicate.models.get(owner, name)
    const latest = model.latest_version
    return latest?.openapi_schema?.components?.schemas?.Input?.properties ?? latest?.openapi_schema ?? null
  } catch (error) {
    return { warning: `Could not inspect Replicate schema for ${profile.model}: ${error.message}` }
  }
}

export async function generateReplicateAsset({ root, spec, style, asset, count, token }) {
  const profile = modelProfiles[asset.modelProfile]
  if (!profile) throw new Error(`${asset.id} uses unknown model profile ${asset.modelProfile}`)
  const missing = await missingReferences(root, asset)
  if (missing.length > 0) {
    throw new Error(`${asset.id} is missing required reference files: ${missing.join(', ')}`)
  }

  const replicate = new Replicate({ auth: token })
  const prompt = await promptText(root, asset, style)
  const input = await buildReplicateInput(root, profile, asset, prompt)
  const schema = await inspectModelSchema(profile, token)
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
  const outputs = []

  for (let index = 1; index <= count; index += 1) {
    const predictionInput = { ...input }
    const output = await replicate.run(profile.model, { input: predictionInput })
    const urls = normalizeOutputs(output)
    if (urls.length === 0) throw new Error(`${asset.id} generation returned no downloadable outputs.`)
    for (let outputIndex = 0; outputIndex < urls.length; outputIndex += 1) {
      const url = urls[outputIndex]
      const ext = extensionFromUrl(url, profile.role === 'sprite' ? '.png' : '.webp')
      const candidateName = `${asset.id}-${timestamp}-${index}-${outputIndex + 1}${ext}`
      const candidatePath = path.join(root, 'candidates', asset.id, candidateName)
      await downloadFile(url, candidatePath)
      const sha256 = await checksumFile(candidatePath)
      const metadata = {
        assetId: asset.id,
        kind: asset.kind,
        modelProfile: profile.id,
        model: profile.model,
        generatedAt: new Date().toISOString(),
        promptFile: asset.promptFile,
        inputReferences: [
          ...(asset.references ?? []).map((reference) => reference.path),
          asset.masterReferencePath,
          asset.poseMasterReferencePath,
        ].filter(Boolean),
        masterAssetId: asset.masterAssetId,
        poseMasterAssetId: asset.poseMasterAssetId,
        generationSettings: predictionInput,
        candidateNumber: index,
        approvalStatus: 'candidate',
        candidatePath: path.relative(process.cwd(), candidatePath).replaceAll(path.sep, '/'),
        sha256,
        schema,
      }
      const metadataPath = path.join(root, 'metadata', asset.id, `${candidateName}.asset.json`)
      await writeJson(metadataPath, metadata)
      outputs.push(metadata)
    }
  }
  void spec
  return outputs
}

async function buildReplicateInput(root, profile, asset, prompt) {
  const input = { ...profile.defaults, ...(asset.input ?? {}), prompt }
  const styleReferences = (asset.references ?? [])
    .filter((reference) => reference.role === 'style' || reference.role === 'location-master')
    .map((reference) => pathToFileUrl(path.join(root, reference.path)))
  const mainReference = asset.masterReferencePath ?? asset.poseMasterReferencePath ?? asset.references?.[0]?.path

  if (profile.id === 'krea-background' && styleReferences.length > 0) {
    input.style_reference_images = styleReferences
  }
  if (profile.id === 'seedream-cinematic' && styleReferences.length > 0) {
    input.image_input = styleReferences
  }
  if (profile.role === 'sprite' && mainReference) {
    input.input_image = pathToFileUrl(path.join(root, mainReference))
  }
  return input
}

function normalizeOutputs(output) {
  if (!output) return []
  if (typeof output === 'string') return [output]
  if (Array.isArray(output)) return output.flatMap(normalizeOutputs)
  if (typeof output.url === 'function') return [String(output.url())]
  if (typeof output.url === 'string') return [output.url]
  if (typeof output === 'object') return Object.values(output).flatMap(normalizeOutputs)
  return []
}

async function downloadFile(url, filePath) {
  const response = await fetch(url)
  if (!response.ok) throw new Error(`Download failed ${response.status}: ${url}`)
  await mkdir(path.dirname(filePath), { recursive: true })
  await writeFile(filePath, Buffer.from(await response.arrayBuffer()))
}

function extensionFromUrl(url, fallback) {
  try {
    const pathname = new URL(url).pathname
    const ext = path.extname(pathname)
    return ext || fallback
  } catch {
    return fallback
  }
}

function pathToFileUrl(filePath) {
  return new URL(`file:///${filePath.replaceAll('\\', '/')}`).toString()
}
