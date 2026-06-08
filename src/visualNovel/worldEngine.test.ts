import { describe, expect, it } from 'vitest'
import {
  availableNpcTalkQuest,
  availableTravelLocations,
  availableWorldActions,
  commitQuestResult,
  makeVisualNovelWorldSave,
  nextEncounterQuest,
  recommendedWorldAction,
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

  it('recommends the next hub action and resolves NPC talk quests', () => {
    const world = makeWorld()
    const save = makeVisualNovelWorldSave(world)
    const recommended = recommendedWorldAction(world, save)
    const talkQuest = availableNpcTalkQuest(world, save, world.locations.home, 'guide')

    expect(recommended?.kind).toBe('action')
    expect(recommended?.badge).toBe('Main')
    expect(talkQuest?.id).toBe('talk-guide')
  })

  it('clears repeatable micro-scene results after replaying the same result id', () => {
    const world = makeWorld()
    const save = makeVisualNovelWorldSave(world)
    const quest = world.quests['talk-guide']
    const firstRun = startWorldQuest(world, save, quest, makeScript('talk-guide')).worldSave
    const completed = commitQuestResult(world, firstRun, quest, {
      questId: 'talk-guide',
      outcomeId: 'done',
      completed: true,
      resultId: 'talk-guide-done',
      worldEffects: [],
      returnLocationId: 'home',
    })
    const secondRun = startWorldQuest(world, completed, quest, makeScript('talk-guide')).worldSave
    const replayed = commitQuestResult(world, secondRun, quest, {
      questId: 'talk-guide',
      outcomeId: 'done',
      completed: true,
      resultId: 'talk-guide-done',
      worldEffects: [],
      returnLocationId: 'home',
    })

    expect(replayed.interruptedQuest).toBeUndefined()
    expect(replayed.state.questStates['talk-guide']?.status).toBe('completed')
    expect(replayed.state.questStates['talk-guide']?.completions).toBe(2)
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
        npcIds: ['guide'],
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
    characters: {
      guide: {
        id: 'guide',
        displayNames: { english: 'Guide' },
        personas: {
          default: {
            id: 'default',
            defaultOutfitId: 'default',
            defaultSpriteId: 'guide-default',
          },
        },
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
      'talk-guide': {
        id: 'talk-guide',
        title: { chinese: '聊天', english: 'Talk to Guide' },
        category: 'rumour',
        scriptId: 'talk-guide',
        scriptPath: 'talk-guide.json',
        entryNodeId: 'start',
        repeatable: true,
        returnLocationId: 'home',
        hubNpcId: 'guide',
        hubLocationId: 'home',
        hubLabel: { chinese: '聊一句。', english: 'Talk' },
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

function makeScript(id = 'opening'): VnScript {
  return {
    schemaVersion: 1,
    contentVersion: 'test',
    id,
    packId: 'test-world',
    title: id,
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
        questId: id,
        outcomeId: 'done',
        completed: true,
      },
    },
  }
}
