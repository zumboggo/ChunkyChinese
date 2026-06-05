import type {
  VisualNovelSave,
  VnChoice,
  VnCondition,
  VnEffect,
  VnNode,
  VnQuestResult,
  VnScenePatch,
  VnSceneState,
  VnScript,
  VnState,
} from './types'

export function makeVisualNovelSave(script: VnScript): VisualNovelSave {
  const scene = applyNodeScene(emptySceneState(), script.nodes[script.initialNodeId])
  return {
    id: visualNovelSaveId(script.packId, script.id),
    packId: script.packId,
    visualNovelId: script.id,
    contentVersion: script.contentVersion,
    currentNodeId: script.initialNodeId,
    state: cloneState(script.initialState),
    scene,
    history: [
      {
        nodeId: script.initialNodeId,
        stateSnapshot: cloneState(script.initialState),
        sceneSnapshot: cloneScene(scene),
        timestamp: new Date().toISOString(),
      },
    ],
    updatedAt: new Date().toISOString(),
  }
}

export function visualNovelSaveId(packId: string, visualNovelId: string): string {
  return `visual-novel-save:${packId}:${visualNovelId}`
}

export function currentVisualNovelNode(script: VnScript, save: VisualNovelSave): VnNode | undefined {
  return script.nodes[save.currentNodeId]
}

export function availableChoices(script: VnScript, save: VisualNovelSave): VnChoice[] {
  const node = currentVisualNovelNode(script, save)
  if (!node || node.type !== 'choice') return []
  return node.choices.filter((choice) => conditionsPass(choice.conditions ?? [], save.state))
}

export function advanceVisualNovel(
  script: VnScript,
  save: VisualNovelSave,
  selectedChoiceId?: string,
): VisualNovelSave {
  const node = currentVisualNovelNode(script, save)
  if (!node) return save

  if (node.type === 'end' || node.type === 'questResult') return save

  if (node.type === 'choice') {
    const choice = node.choices.find((item) => item.id === selectedChoiceId)
    if (!choice || !conditionsPass(choice.conditions ?? [], save.state)) return save
    return moveToNode(script, save, choice.nextId, choice.effects ?? [], choice.id)
  }

  if (node.type === 'line') {
    if (!node.nextId) return save
    return moveToNode(script, save, node.nextId, node.effects ?? [])
  }

  return moveToNode(script, save, node.nextId, node.effects ?? [])
}

export function visualNovelQuestResult(node: VnNode | undefined): VnQuestResult | undefined {
  if (!node || node.type !== 'questResult') return undefined
  return {
    questId: node.questId,
    outcomeId: node.outcomeId,
    completed: node.completed,
    resultId: node.resultId ?? `${node.questId}:${node.outcomeId}`,
    worldEffects: node.worldEffects ?? [],
    returnLocationId: node.returnLocationId,
  }
}

export function goBackVisualNovel(save: VisualNovelSave): VisualNovelSave {
  if (save.history.length <= 1) return save
  const nextHistory = save.history.slice(0, -1)
  const previous = nextHistory[nextHistory.length - 1]
  return {
    ...save,
    currentNodeId: previous.nodeId,
    state: cloneState(previous.stateSnapshot),
    scene: cloneScene(previous.sceneSnapshot),
    history: nextHistory,
    updatedAt: new Date().toISOString(),
  }
}

export function restartVisualNovel(script: VnScript): VisualNovelSave {
  return makeVisualNovelSave(script)
}

export function applyNodeScene(scene: VnSceneState, node: VnNode | undefined): VnSceneState {
  if (!node) return scene
  if (node.type === 'cinematic') {
    return { ...scene, cinematicImageId: node.imageId }
  }
  if (node.type !== 'line') {
    return scene
  }
  return applyScenePatch({ ...scene, cinematicImageId: undefined }, node.scene)
}

export function applyEffects(state: VnState, effects: VnEffect[]): VnState {
  let next = cloneState(state)
  for (const effect of effects) {
    if (effect.onceKey && next.appliedOnceKeys.includes(effect.onceKey)) continue
    if (effect.op === 'addMoney') {
      next = { ...next, money: next.money + effect.amount }
    } else if (effect.op === 'addSkill') {
      next = {
        ...next,
        skills: {
          ...next.skills,
          [effect.skill]: (next.skills[effect.skill] ?? 0) + effect.amount,
        },
      }
    } else if (effect.op === 'setFlag') {
      next = {
        ...next,
        flags: { ...next.flags, [effect.key]: effect.value },
      }
    } else if (effect.op === 'addQuestNote') {
      next = {
        ...next,
        questNotes: { ...next.questNotes, [effect.note.id]: { ...effect.note } },
      }
    } else if (effect.op === 'updateQuestNote') {
      const note = next.questNotes[effect.noteId]
      if (note) {
        next = {
          ...next,
          questNotes: {
            ...next.questNotes,
            [effect.noteId]: {
              ...note,
              status: effect.status,
              text: effect.text ?? note.text,
            },
          },
        }
      }
    }

    if (effect.onceKey) {
      next = { ...next, appliedOnceKeys: [...next.appliedOnceKeys, effect.onceKey] }
    }
  }
  return next
}

export function conditionsPass(conditions: VnCondition[], state: VnState): boolean {
  return conditions.every((condition) => {
    if (condition.op === 'flagEquals') return state.flags[condition.key] === condition.value
    if (condition.op === 'moneyAtLeast') return state.money >= condition.amount
    if (condition.op === 'skillAtLeast') return (state.skills[condition.skill] ?? 0) >= condition.amount
    if (condition.op === 'questStatus') return state.questNotes[condition.noteId]?.status === condition.status
    if (
      condition.op === 'worldQuestStatus' ||
      condition.op === 'locationUnlocked' ||
      condition.op === 'hasTitle' ||
      condition.op === 'encounterSeen'
    ) {
      return false
    }
    return false
  })
}

export function cloneState(state: VnState): VnState {
  return {
    money: state.money,
    skills: { ...state.skills },
    flags: { ...state.flags },
    questNotes: Object.fromEntries(
      Object.entries(state.questNotes).map(([id, note]) => [id, { ...note }]),
    ),
    appliedOnceKeys: [...state.appliedOnceKeys],
  }
}

export function cloneScene(scene: VnSceneState): VnSceneState {
  return {
    backgroundId: scene.backgroundId,
    cinematicImageId: scene.cinematicImageId,
    characters: scene.characters.map((character) => ({ ...character })),
  }
}

function moveToNode(
  script: VnScript,
  save: VisualNovelSave,
  nodeId: string,
  effects: VnEffect[],
  selectedChoiceId?: string,
): VisualNovelSave {
  const node = script.nodes[nodeId]
  if (!node) return save
  const state = applyEffects(save.state, effects)
  const scene = applyNodeScene(save.scene, node)
  const history = [
    ...save.history,
    {
      nodeId,
      selectedChoiceId,
      stateSnapshot: cloneState(state),
      sceneSnapshot: cloneScene(scene),
      timestamp: new Date().toISOString(),
    },
  ]
  return {
    ...save,
    currentNodeId: nodeId,
    state,
    scene,
    history,
    updatedAt: new Date().toISOString(),
  }
}

function applyScenePatch(scene: VnSceneState, patch?: VnScenePatch): VnSceneState {
  if (!patch) return scene
  return {
    backgroundId: patch.backgroundId ?? scene.backgroundId,
    cinematicImageId: undefined,
    characters: patch.characters
      ? patch.characters.map((character) => ({ ...character }))
      : patch.clearCharacters
        ? []
        : scene.characters,
  }
}

function emptySceneState(): VnSceneState {
  return { characters: [] }
}
