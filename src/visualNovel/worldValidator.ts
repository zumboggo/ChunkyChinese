import { validateVisualNovelScript, type VnValidationResult } from './validator'
import type { VnAssetManifest, VnScript, VnWorld } from './types'

export function validateVisualNovelWorld(
  world: VnWorld,
  scripts: Record<string, VnScript> = {},
  manifest?: VnAssetManifest,
): VnValidationResult {
  const errors: string[] = []
  const warnings: string[] = []

  if (!world.id) errors.push('World is missing id.')
  if (!world.schemaVersion) errors.push('World is missing schemaVersion.')
  if (!world.contentVersion) errors.push('World is missing contentVersion.')
  if (!world.locations[world.initialLocationId]) {
    errors.push(`World initialLocationId points to missing location: ${world.initialLocationId}.`)
  }
  if (world.initialState.currentLocationId !== world.initialLocationId) {
    warnings.push('Initial world state starts at a different location than initialLocationId.')
  }

  const locationIds = new Set(Object.keys(world.locations))
  const questIds = new Set(Object.keys(world.quests))
  const referencedBackgrounds = new Set<string>()
  const resultIds = new Set<string>()

  for (const location of Object.values(world.locations)) {
    if (!location.name?.chinese) errors.push(`Location ${location.id} is missing Chinese name.`)
    if (!locationIds.has(location.id)) errors.push(`Location key mismatch: ${location.id}.`)
    referencedBackgrounds.add(location.backgroundId)
    if (location.restoredBackgroundId) referencedBackgrounds.add(location.restoredBackgroundId)
    for (const destination of location.travelTo ?? []) {
      if (!locationIds.has(destination)) errors.push(`Location ${location.id} travels to missing ${destination}.`)
    }
    for (const action of location.availableActions ?? []) {
      if (action.kind === 'travel' && !locationIds.has(action.targetId)) {
        errors.push(`Action ${location.id}.${action.id} targets missing location ${action.targetId}.`)
      }
      if (action.kind === 'quest' && !questIds.has(action.targetId)) {
        errors.push(`Action ${location.id}.${action.id} targets missing quest ${action.targetId}.`)
      }
      if (action.kind === 'encounterPool' && !world.encounterPools?.[action.targetId]) {
        errors.push(`Action ${location.id}.${action.id} targets missing encounter pool ${action.targetId}.`)
      }
    }
  }

  for (const quest of Object.values(world.quests)) {
    if (!quest.title?.chinese) errors.push(`Quest ${quest.id} is missing Chinese title.`)
    if (quest.returnLocationId && !locationIds.has(quest.returnLocationId)) {
      errors.push(`Quest ${quest.id} returnLocationId points to missing ${quest.returnLocationId}.`)
    }
    if (quest.encounterPoolId && !world.encounterPools?.[quest.encounterPoolId]) {
      errors.push(`Quest ${quest.id} references missing encounter pool ${quest.encounterPoolId}.`)
    }
    const script = scripts[quest.scriptId]
    if (script) {
      const scriptResult = validateVisualNovelScript(script, manifest)
      errors.push(...scriptResult.errors.map((error) => `${quest.id}: ${error}`))
      warnings.push(...scriptResult.warnings.map((warning) => `${quest.id}: ${warning}`))
      if (!script.nodes[quest.entryNodeId]) {
        errors.push(`Quest ${quest.id} entryNodeId points to missing ${quest.entryNodeId}.`)
      }
      const resultNodes = Object.values(script.nodes).filter((node) => node.type === 'questResult')
      if (resultNodes.length === 0) errors.push(`Quest ${quest.id} script has no questResult node.`)
      for (const node of resultNodes) {
        if (node.type !== 'questResult') continue
        if (node.questId !== quest.id) errors.push(`Quest result ${node.id} has questId ${node.questId}, expected ${quest.id}.`)
        const commitId = `${quest.id}:${node.resultId ?? `${node.questId}:${node.outcomeId}`}`
        if (resultIds.has(commitId)) errors.push(`Duplicate quest commit id ${commitId}.`)
        resultIds.add(commitId)
        if (node.returnLocationId && !locationIds.has(node.returnLocationId)) {
          errors.push(`Quest result ${node.id} returns to missing ${node.returnLocationId}.`)
        }
      }
    } else {
      warnings.push(`Quest ${quest.id} script ${quest.scriptId} was not loaded for deep validation.`)
    }
    validateConditions(`${quest.id}.discoveryConditions`, quest.discoveryConditions ?? [], world, warnings)
    validateConditions(`${quest.id}.prerequisites`, quest.prerequisites ?? [], world, warnings)
    validateEffects(`${quest.id}.completionEffects`, quest.completionEffects ?? [], world, warnings)
  }

  for (const pool of Object.values(world.encounterPools ?? {})) {
    for (const questId of pool.questIds) {
      if (!questIds.has(questId)) errors.push(`Encounter pool ${pool.id} references missing quest ${questId}.`)
    }
  }

  if (manifest) {
    for (const backgroundId of referencedBackgrounds) {
      if (!manifest.backgrounds[backgroundId]) errors.push(`Missing world background asset: ${backgroundId}.`)
    }
    for (const asset of [
      ...Object.values(manifest.backgrounds),
      ...Object.values(manifest.sprites),
      ...Object.values(manifest.cinematics),
    ]) {
      if (!asset.src || asset.src.includes('vn-authoring') || asset.src.includes('candidates') || asset.src.includes('..')) {
        errors.push(`Asset ${asset.id} has invalid runtime path ${asset.src}.`)
      }
      if ((asset.width ?? 0) <= 0 || (asset.height ?? 0) <= 0) {
        errors.push(`Asset ${asset.id} is missing dimensions.`)
      }
      if ('anchorX' in asset && ((asset.anchorX ?? -1) < 0 || (asset.anchorY ?? -1) < 0)) {
        errors.push(`Sprite ${asset.id} is missing anchors.`)
      }
    }
  }

  return { errors, warnings }
}

function validateConditions(label: string, conditions: Array<{ op: string; skill?: string; locationId?: string; questId?: string; titleId?: string }>, world: VnWorld, warnings: string[]) {
  for (const condition of conditions) {
    if (condition.op === 'skillAtLeast' && condition.skill && !(condition.skill in world.initialState.skills)) {
      warnings.push(`${label} references unknown skill ${condition.skill}.`)
    }
    if (condition.op === 'locationUnlocked' && condition.locationId && !world.locations[condition.locationId]) {
      warnings.push(`${label} references unknown location ${condition.locationId}.`)
    }
    if (condition.op === 'worldQuestStatus' && condition.questId && !world.quests[condition.questId]) {
      warnings.push(`${label} references unknown quest ${condition.questId}.`)
    }
    if (condition.op === 'hasTitle' && condition.titleId && !world.initialState.unlockedTitles.includes(condition.titleId)) {
      warnings.push(`${label} references title ${condition.titleId}; ensure it can be unlocked by effects.`)
    }
  }
}

function validateEffects(label: string, effects: Array<{ op: string; skill?: string; locationId?: string; questId?: string; titleId?: string }>, world: VnWorld, warnings: string[]) {
  for (const effect of effects) {
    if (effect.op === 'addSkill' && effect.skill && !(effect.skill in world.initialState.skills)) {
      warnings.push(`${label} adds unknown skill ${effect.skill}.`)
    }
    if (effect.op === 'unlockLocation' && effect.locationId && !world.locations[effect.locationId]) {
      warnings.push(`${label} unlocks unknown location ${effect.locationId}.`)
    }
    if (effect.op === 'setWorldQuestStatus' && effect.questId && !world.quests[effect.questId]) {
      warnings.push(`${label} updates unknown quest ${effect.questId}.`)
    }
  }
}
