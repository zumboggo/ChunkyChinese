import {
  applyEffects,
  makeVisualNovelSave,
  visualNovelSaveId,
} from './engine'
import type {
  VisualNovelSave,
  VisualNovelWorldSave,
  VnCondition,
  VnEffect,
  VnEncounterPool,
  VnLocation,
  VnQuestDefinition,
  VnQuestResult,
  VnQuestState,
  VnScript,
  VnState,
  VnWorld,
  VnWorldAction,
  VnWorldQuestStatus,
  VnWorldState,
} from './types'

export function visualNovelWorldSaveId(worldId: string): string {
  return `visual-novel-world-save:${worldId}`
}

export function makeVisualNovelWorldSave(world: VnWorld): VisualNovelWorldSave {
  return {
    id: visualNovelWorldSaveId(world.id),
    worldId: world.id,
    schemaVersion: world.schemaVersion,
    contentVersion: world.contentVersion,
    state: cloneWorldState(world.initialState),
    updatedAt: new Date().toISOString(),
  }
}

export function currentWorldLocation(world: VnWorld, save: VisualNovelWorldSave): VnLocation | undefined {
  return world.locations[save.state.currentLocationId]
}

export function visibleWorldLocations(world: VnWorld, save: VisualNovelWorldSave): VnLocation[] {
  return Object.values(world.locations).filter((location) => worldConditionsPass(location.conditions ?? [], save.state))
}

export function availableTravelLocations(world: VnWorld, save: VisualNovelWorldSave): VnLocation[] {
  const current = currentWorldLocation(world, save)
  if (!current) return []
  return (current.travelTo ?? [])
    .map((locationId) => world.locations[locationId])
    .filter((location): location is VnLocation => {
      if (!location) return false
      return save.state.unlockedLocations.includes(location.id) && worldConditionsPass(location.conditions ?? [], save.state)
    })
}

export function availableWorldActions(world: VnWorld, save: VisualNovelWorldSave): VnWorldAction[] {
  const current = currentWorldLocation(world, save)
  if (!current) return []
  return (current.availableActions ?? []).filter((action) => {
    if (!worldConditionsPass(action.conditions ?? [], save.state)) return false
    if (action.kind === 'quest') {
      const quest = world.quests[action.targetId]
      return quest ? isQuestAvailable(quest, save.state) : false
    }
    if (action.kind === 'encounterPool') {
      const pool = world.encounterPools?.[action.targetId]
      return Boolean(pool && nextEncounterQuest(world, save, pool))
    }
    return true
  })
}

export function availableWorldQuests(world: VnWorld, save: VisualNovelWorldSave): VnQuestDefinition[] {
  return Object.values(world.quests).filter((quest) => isQuestAvailable(quest, save.state))
}

export function activeWorldQuests(world: VnWorld, save: VisualNovelWorldSave): VnQuestDefinition[] {
  return Object.values(world.quests).filter((quest) => save.state.questStates[quest.id]?.status === 'active')
}

export function completedWorldQuests(world: VnWorld, save: VisualNovelWorldSave): VnQuestDefinition[] {
  return Object.values(world.quests).filter((quest) => save.state.questStates[quest.id]?.status === 'completed')
}

export function isQuestDiscovered(quest: VnQuestDefinition, state: VnWorldState): boolean {
  const status = state.questStates[quest.id]?.status
  if (status && status !== 'hidden') return true
  if (status === 'hidden') return (quest.discoveryConditions?.length ?? 0) > 0 && worldConditionsPass(quest.discoveryConditions ?? [], state)
  return worldConditionsPass(quest.discoveryConditions ?? [], state)
}

export function isQuestAvailable(quest: VnQuestDefinition, state: VnWorldState): boolean {
  if (!isQuestDiscovered(quest, state)) return false
  const questState = state.questStates[quest.id]
  const status = questState?.status ?? 'available'
  if (status === 'active' || status === 'failed' || status === 'recoverable') return true
  if (status === 'completed' && !quest.repeatable) return false
  if (quest.maxCompletions !== undefined && (questState?.completions ?? 0) >= quest.maxCompletions) return false
  return worldConditionsPass(quest.prerequisites ?? [], state)
}

export function startWorldQuest(
  _world: VnWorld,
  save: VisualNovelWorldSave,
  quest: VnQuestDefinition,
  script: VnScript,
): { worldSave: VisualNovelWorldSave; questSave: VisualNovelSave } {
  const now = new Date().toISOString()
  const runId = `${quest.id}:${now}`
  const questState = nextQuestState(save.state.questStates[quest.id], 'active', now, runId)
  const worldSave = {
    ...save,
    state: {
      ...save.state,
      questStates: { ...save.state.questStates, [quest.id]: questState },
    },
    interruptedQuest: {
      questId: quest.id,
      visualNovelId: script.id,
      saveId: visualNovelSaveId(script.packId, script.id),
      startedAt: now,
    },
    updatedAt: now,
  }
  const questSave = makeVisualNovelSave({ ...script, initialNodeId: quest.entryNodeId })
  return { worldSave, questSave }
}

export function abandonWorldQuest(save: VisualNovelWorldSave): VisualNovelWorldSave {
  return {
    ...save,
    interruptedQuest: undefined,
    updatedAt: new Date().toISOString(),
  }
}

export function commitQuestResult(
  world: VnWorld,
  save: VisualNovelWorldSave,
  quest: VnQuestDefinition,
  result: VnQuestResult,
): VisualNovelWorldSave {
  const resultId = `${quest.id}:${result.resultId}`
  if (save.state.committedResultIds.includes(resultId)) {
    return {
      ...save,
      interruptedQuest: undefined,
      state: {
        ...save.state,
        currentLocationId: result.returnLocationId ?? quest.returnLocationId ?? save.state.currentLocationId,
      },
      updatedAt: new Date().toISOString(),
    }
  }

  const worldEffects = [
    ...(result.worldEffects ?? []),
    ...(result.completed ? quest.completionEffects ?? [] : []),
  ]
  const nextState = applyWorldEffects(world, save.state, worldEffects)
  const now = new Date().toISOString()
  const previousQuestState = nextState.questStates[quest.id]
  const nextStatus: VnWorldQuestStatus = result.completed ? 'completed' : 'recoverable'
  const completions = (previousQuestState?.completions ?? 0) + (result.completed ? 1 : 0)
  const returnLocationId = result.returnLocationId ?? quest.returnLocationId ?? save.state.currentLocationId

  return {
    ...save,
    interruptedQuest: undefined,
    state: {
      ...nextState,
      currentLocationId: world.locations[returnLocationId] ? returnLocationId : world.initialLocationId,
      questStates: {
        ...nextState.questStates,
        [quest.id]: {
          status: nextStatus,
          completions,
          activeRunId: undefined,
          lastOutcomeId: result.outcomeId,
          discoveredAt: previousQuestState?.discoveredAt ?? now,
          updatedAt: now,
        },
      },
      committedResultIds: [...nextState.committedResultIds, resultId],
    },
    updatedAt: now,
  }
}

export function nextEncounterQuest(
  world: VnWorld,
  save: VisualNovelWorldSave,
  pool: VnEncounterPool,
): VnQuestDefinition | undefined {
  if (!worldConditionsPass(pool.conditions ?? [], save.state)) return undefined
  const eligible = pool.questIds
    .map((questId) => world.quests[questId])
    .filter((quest): quest is VnQuestDefinition => Boolean(quest && isQuestAvailable(quest, save.state)))
  return (
    eligible.find((quest) => !save.state.completedEncounterIds.includes(quest.id)) ??
    eligible.find((quest) => quest.repeatable)
  )
}

export function worldConditionsPass(conditions: VnCondition[], state: VnWorldState): boolean {
  return conditions.every((condition) => {
    if (condition.op === 'flagEquals') return state.flags[condition.key] === condition.value
    if (condition.op === 'moneyAtLeast') return state.money >= condition.amount
    if (condition.op === 'skillAtLeast') return (state.skills[condition.skill] ?? 0) >= condition.amount
    if (condition.op === 'worldQuestStatus') return state.questStates[condition.questId]?.status === condition.status
    if (condition.op === 'locationUnlocked') return state.unlockedLocations.includes(condition.locationId)
    if (condition.op === 'hasTitle') return state.unlockedTitles.includes(condition.titleId)
    if (condition.op === 'encounterSeen') {
      const seen = state.completedEncounterIds.includes(condition.encounterId)
      return condition.value === undefined ? seen : seen === condition.value
    }
    if (condition.op === 'questStatus') return false
    return false
  })
}

export function applyWorldEffects(world: VnWorld, state: VnWorldState, effects: VnEffect[]): VnWorldState {
  const baseQuestState: VnState = {
    money: state.money,
    skills: state.skills,
    flags: state.flags,
    questNotes: {},
    appliedOnceKeys: state.committedResultIds,
  }
  const sharedEffects = effects.filter((effect) =>
    effect.op === 'addMoney' || effect.op === 'addSkill' || effect.op === 'setFlag',
  )
  const shared = applyEffects(baseQuestState, sharedEffects)
  let next: VnWorldState = {
    ...state,
    money: shared.money,
    skills: shared.skills,
    flags: shared.flags,
  }
  for (const effect of effects) {
    if (effect.op === 'unlockLocation' && world.locations[effect.locationId]) {
      next = {
        ...next,
        unlockedLocations: unique([...next.unlockedLocations, effect.locationId]),
      }
    } else if (effect.op === 'unlockTitle') {
      next = {
        ...next,
        unlockedTitles: unique([...next.unlockedTitles, effect.titleId]),
      }
    } else if (effect.op === 'setWorldQuestStatus') {
      next = {
        ...next,
        questStates: {
          ...next.questStates,
          [effect.questId]: nextQuestState(next.questStates[effect.questId], effect.status),
        },
      }
    } else if (effect.op === 'recordEncounter') {
      const countKey = effect.poolId ?? 'default'
      next = {
        ...next,
        completedEncounterIds: unique([...next.completedEncounterIds, effect.encounterId]),
        encounterCounts: {
          ...next.encounterCounts,
          [countKey]: (next.encounterCounts[countKey] ?? 0) + 1,
        },
      }
    }
  }
  return next
}

export function cloneWorldState(state: VnWorldState): VnWorldState {
  return {
    currentLocationId: state.currentLocationId,
    money: state.money,
    skills: { ...state.skills },
    flags: { ...state.flags },
    questStates: Object.fromEntries(
      Object.entries(state.questStates).map(([id, questState]) => [id, { ...questState }]),
    ),
    unlockedLocations: [...state.unlockedLocations],
    unlockedTitles: [...state.unlockedTitles],
    completedEncounterIds: [...state.completedEncounterIds],
    encounterCounts: { ...state.encounterCounts },
    committedResultIds: [...state.committedResultIds],
  }
}

function nextQuestState(
  current: VnQuestState | undefined,
  status: VnWorldQuestStatus,
  now = new Date().toISOString(),
  activeRunId?: string,
): VnQuestState {
  return {
    status,
    completions: current?.completions ?? 0,
    activeRunId,
    lastOutcomeId: current?.lastOutcomeId,
    discoveredAt: current?.discoveredAt ?? now,
    updatedAt: now,
  }
}

function unique<T>(items: T[]): T[] {
  return Array.from(new Set(items))
}
