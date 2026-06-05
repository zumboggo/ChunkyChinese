import { describe, expect, it } from 'vitest'
import {
  availableTravelLocations,
  availableWorldActions,
  commitQuestResult,
  makeVisualNovelWorldSave,
  nextEncounterQuest,
  startWorldQuest,
} from './worldEngine'
import type { VnScript, VnWorld } from './types'

describe('visual novel world engine', () => {
  it('initializes world save and respects locked travel', () => {
    const world = makeWorld()
    const save = makeVisualNovelWorldSave(world)

    expect(save.state.currentLocationId).toBe('home')
    expect(availableTravelLocations(world, save)).toEqual([])
    expect(availableWorldActions(world, save).map((action) => action.id)).toEqual(['start'])
  })

  it('starts a quest and commits its world result once', () => {
    const world = makeWorld()
    const save = makeVisualNovelWorldSave(world)
    const quest = world.quests.opening
    const { worldSave, questSave } = startWorldQuest(world, save, quest, makeScript())

    expect(worldSave.interruptedQuest?.questId).toBe('opening')
    expect(questSave.currentNodeId).toBe('start')

    const completed = commitQuestResult(world, worldSave, quest, {
      questId: 'opening',
      outcomeId: 'done',
      completed: true,
      resultId: 'opening-done',
      worldEffects: [
        { id: 'gold', op: 'addMoney', amount: 5 },
        { id: 'unlock-town', op: 'unlockLocation', locationId: 'town' },
        { id: 'title', op: 'unlockTitle', titleId: 'Careful Newcomer' },
      ],
      returnLocationId: 'town',
    })
    const replayed = commitQuestResult(world, completed, quest, {
      questId: 'opening',
      outcomeId: 'done',
      completed: true,
      resultId: 'opening-done',
      worldEffects: [{ id: 'gold', op: 'addMoney', amount: 5 }],
      returnLocationId: 'town',
    })

    expect(completed.state.money).toBe(5)
    expect(completed.state.currentLocationId).toBe('town')
    expect(completed.state.unlockedTitles).toContain('Careful Newcomer')
    expect(replayed.state.money).toBe(5)
  })

  it('prefers unseen authored encounters until exhaustion', () => {
    const world = makeWorld()
    const save = makeVisualNovelWorldSave(world)
    const pool = world.encounterPools?.commissions
    expect(pool).toBeTruthy()

    const first = nextEncounterQuest(world, save, pool!)
    const afterOne = {
      ...save,
      state: { ...save.state, completedEncounterIds: [first!.id] },
    }
    const second = nextEncounterQuest(world, afterOne, pool!)

    expect(first?.id).toBe('commission-a')
    expect(second?.id).toBe('commission-b')
  })
})

function makeWorld(): VnWorld {
  return {
    id: 'test-world',
    schemaVersion: 1,
    contentVersion: 'test',
    title: 'Test World',
    initialLocationId: 'home',
    assetManifestPath: 'manifest.json',
    locations: {
      home: {
        id: 'home',
        name: { chinese: '家', english: 'Home' },
        backgroundId: 'home-bg',
        travelTo: ['town'],
        availableActions: [
          { id: 'start', kind: 'quest', targetId: 'opening', label: { chinese: '开始', english: 'Start' } },
        ],
      },
      town: {
        id: 'town',
        name: { chinese: '广场', english: 'Town' },
        backgroundId: 'town-bg',
      },
    },
    quests: {
      opening: {
        id: 'opening',
        title: { chinese: '开场', english: 'Opening' },
        category: 'main',
        scriptId: 'opening',
        scriptPath: 'opening.json',
        entryNodeId: 'start',
        returnLocationId: 'town',
      },
      'commission-a': {
        id: 'commission-a',
        title: { chinese: '甲', english: 'A' },
        category: 'commission',
        scriptId: 'commission-a',
        scriptPath: 'a.json',
        entryNodeId: 'start',
        repeatable: false,
      },
      'commission-b': {
        id: 'commission-b',
        title: { chinese: '乙', english: 'B' },
        category: 'commission',
        scriptId: 'commission-b',
        scriptPath: 'b.json',
        entryNodeId: 'start',
        repeatable: false,
      },
    },
    encounterPools: {
      commissions: {
        id: 'commissions',
        title: { chinese: '委托', english: 'Commissions' },
        questIds: ['commission-a', 'commission-b'],
      },
    },
    initialState: {
      currentLocationId: 'home',
      money: 0,
      skills: { sculpting: 0, swordsmanship: 0 },
      flags: {},
      questStates: {},
      unlockedLocations: ['home'],
      unlockedTitles: [],
      completedEncounterIds: [],
      encounterCounts: {},
      committedResultIds: [],
    },
  }
}

function makeScript(): VnScript {
  return {
    schemaVersion: 1,
    contentVersion: 'test',
    id: 'opening',
    packId: 'test-world',
    title: 'Opening',
    initialNodeId: 'start',
    assetManifestPath: 'manifest.json',
    characters: {},
    initialState: {
      money: 0,
      skills: { sculpting: 0, swordsmanship: 0 },
      flags: {},
      questNotes: {},
      appliedOnceKeys: [],
    },
    nodes: {
      start: { id: 'start', type: 'line', text: { chinese: '开始。' }, nextId: 'result' },
      result: {
        id: 'result',
        type: 'questResult',
        questId: 'opening',
        outcomeId: 'done',
        completed: true,
      },
    },
  }
}
