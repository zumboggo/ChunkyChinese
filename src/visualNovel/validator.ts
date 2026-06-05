import type { VnAssetManifest, VnChoice, VnCondition, VnEffect, VnNode, VnScript } from './types'

export interface VnValidationResult {
  errors: string[]
  warnings: string[]
}

export function validateVisualNovelScript(
  script: VnScript,
  manifest?: VnAssetManifest,
  readerSentenceIds = new Set<string>(),
): VnValidationResult {
  const errors: string[] = []
  const warnings: string[] = []
  const nodeIds = new Set(Object.keys(script.nodes))

  if (!script.schemaVersion) errors.push('Missing schemaVersion.')
  if (!script.contentVersion) errors.push('Missing contentVersion.')
  if (!script.initialNodeId || !nodeIds.has(script.initialNodeId)) {
    errors.push(`Missing initial node: ${script.initialNodeId || '(empty)'}.`)
  }

  const referencedNodes = new Set<string>()
  const referencedAssets = {
    backgrounds: new Set<string>(),
    sprites: new Set<string>(),
    cinematics: new Set<string>(),
  }
  const onceKeys = new Map<string, string>()

  for (const node of Object.values(script.nodes)) {
    validateNode(node, script, nodeIds, referencedNodes, referencedAssets, onceKeys, errors, warnings)
    validateReaderSentence(node, readerSentenceIds, warnings)
  }

  for (const nodeId of nodeIds) {
    if (nodeId !== script.initialNodeId && !referencedNodes.has(nodeId)) {
      warnings.push(`Unreachable node: ${nodeId}.`)
    }
  }

  if (manifest) {
    validateAssetReferences(manifest, referencedAssets, errors, warnings)
  }

  return { errors, warnings }
}

function validateNode(
  node: VnNode,
  script: VnScript,
  nodeIds: Set<string>,
  referencedNodes: Set<string>,
  referencedAssets: {
    backgrounds: Set<string>
    sprites: Set<string>
    cinematics: Set<string>
  },
  onceKeys: Map<string, string>,
  errors: string[],
  warnings: string[],
) {
  if (node.type === 'line') {
    if (!node.text?.chinese) errors.push(`Line node ${node.id} has no Chinese text.`)
    if (node.nextId) addNodeReference(node.id, node.nextId, nodeIds, referencedNodes, errors)
    if (node.scene?.backgroundId) referencedAssets.backgrounds.add(node.scene.backgroundId)
    for (const character of node.scene?.characters ?? []) {
      if (!script.characters[character.characterId]) {
        errors.push(`Node ${node.id} references missing character ${character.characterId}.`)
      } else if (!script.characters[character.characterId].personas[character.personaId]) {
        errors.push(`Node ${node.id} references missing persona ${character.characterId}.${character.personaId}.`)
      }
      referencedAssets.sprites.add(character.spriteId)
    }
    validateEffects(node.effects ?? [], node.id, onceKeys, errors, warnings)
  } else if (node.type === 'choice') {
    if (node.choices.length === 0) errors.push(`Choice node ${node.id} has no choices.`)
    for (const choice of node.choices) {
      validateChoice(node.id, choice, script, nodeIds, referencedNodes, onceKeys, errors, warnings)
    }
  } else if (node.type === 'cinematic') {
    if (!node.description) errors.push(`Cinematic node ${node.id} needs an accessible description.`)
    referencedAssets.cinematics.add(node.imageId)
    addNodeReference(node.id, node.nextId, nodeIds, referencedNodes, errors)
    validateEffects(node.effects ?? [], node.id, onceKeys, errors, warnings)
  } else if (node.type === 'end') {
    validateEffects(node.effects ?? [], node.id, onceKeys, errors, warnings)
  }
}

function validateChoice(
  nodeId: string,
  choice: VnChoice,
  script: VnScript,
  nodeIds: Set<string>,
  referencedNodes: Set<string>,
  onceKeys: Map<string, string>,
  errors: string[],
  warnings: string[],
) {
  if (!choice.label?.chinese) errors.push(`Choice ${nodeId}.${choice.id} has no Chinese label.`)
  addNodeReference(nodeId, choice.nextId, nodeIds, referencedNodes, errors)
  validateEffects(choice.effects ?? [], `${nodeId}.${choice.id}`, onceKeys, errors, warnings)
  validateConditions(choice.conditions ?? [], `${nodeId}.${choice.id}`, script, warnings)
  if (
    choice.kind === 'expressive' &&
    (choice.effects ?? []).some((effect) => effect.op === 'addMoney' || effect.op === 'addSkill')
  ) {
    warnings.push(`Expressive choice ${nodeId}.${choice.id} modifies money or skill.`)
  }
}

function validateConditions(
  conditions: VnCondition[],
  ownerId: string,
  script: VnScript,
  warnings: string[],
) {
  for (const condition of conditions) {
    if (condition.op === 'skillAtLeast' && !(condition.skill in script.initialState.skills)) {
      warnings.push(`Condition on ${ownerId} references unknown skill ${condition.skill}.`)
    }
  }
}

function validateEffects(
  effects: VnEffect[],
  ownerId: string,
  onceKeys: Map<string, string>,
  errors: string[],
  warnings: string[],
) {
  for (const effect of effects) {
    if (!effect.id) errors.push(`Effect on ${ownerId} is missing an id.`)
    if (effect.onceKey) {
      const previous = onceKeys.get(effect.onceKey)
      if (previous && previous !== effect.id) {
        warnings.push(`onceKey ${effect.onceKey} is reused by ${previous} and ${effect.id}.`)
      }
      onceKeys.set(effect.onceKey, effect.id)
    }
  }
}

function validateReaderSentence(
  node: VnNode,
  readerSentenceIds: Set<string>,
  warnings: string[],
) {
  const texts = []
  if (node.type === 'line') texts.push(node.text)
  if (node.type === 'choice') {
    if (node.prompt) texts.push(node.prompt)
    texts.push(...node.choices.map((choice) => choice.label))
  }
  if (node.type === 'cinematic' && node.caption) texts.push(node.caption)
  if (node.type === 'end' && node.summary) texts.push(node.summary)

  for (const text of texts) {
    if (text.readerSentenceId && readerSentenceIds.size > 0 && !readerSentenceIds.has(text.readerSentenceId)) {
      warnings.push(`Unknown readerSentenceId ${text.readerSentenceId} in node ${node.id}.`)
    }
    if (text.chinese.length > 70) {
      warnings.push(`Long Chinese line in node ${node.id}: ${text.chinese.length} characters.`)
    }
  }
}

function validateAssetReferences(
  manifest: VnAssetManifest,
  referencedAssets: {
    backgrounds: Set<string>
    sprites: Set<string>
    cinematics: Set<string>
  },
  errors: string[],
  warnings: string[],
) {
  for (const id of referencedAssets.backgrounds) {
    if (!manifest.backgrounds[id]) errors.push(`Missing background asset: ${id}.`)
  }
  for (const id of referencedAssets.sprites) {
    if (!manifest.sprites[id]) errors.push(`Missing sprite asset: ${id}.`)
  }
  for (const id of referencedAssets.cinematics) {
    if (!manifest.cinematics[id]) errors.push(`Missing cinematic asset: ${id}.`)
  }
  for (const id of Object.keys(manifest.backgrounds)) {
    if (!referencedAssets.backgrounds.has(id) && manifest.fallbackBackgroundId !== id) {
      warnings.push(`Unused background asset: ${id}.`)
    }
  }
  for (const id of Object.keys(manifest.sprites)) {
    if (!referencedAssets.sprites.has(id)) warnings.push(`Unused sprite asset: ${id}.`)
  }
  for (const id of Object.keys(manifest.cinematics)) {
    if (!referencedAssets.cinematics.has(id)) warnings.push(`Unused cinematic asset: ${id}.`)
  }
}

function addNodeReference(
  ownerId: string,
  nodeId: string | undefined,
  nodeIds: Set<string>,
  referencedNodes: Set<string>,
  errors: string[],
) {
  if (!nodeId) return
  referencedNodes.add(nodeId)
  if (!nodeIds.has(nodeId)) errors.push(`${ownerId} points to missing node ${nodeId}.`)
}
