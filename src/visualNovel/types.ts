export type VnPosition = 'left' | 'center' | 'right'
export type VnChoiceKind = 'expressive' | 'memory' | 'consequential'
export type VnQuestStatus = 'active' | 'completed' | 'failed'
export type VnNodeType = 'line' | 'choice' | 'cinematic' | 'questResult' | 'end' | 'cardBattle'
export type VnWorldQuestStatus = 'hidden' | 'discovered' | 'available' | 'active' | 'completed' | 'failed' | 'recoverable'
export type VnQuestCategory = 'main' | 'side' | 'commission' | 'rumour' | 'training' | 'encounter'

import type { CardBattlerState, CardDefinition, EnemyDefinition } from '../cardBattler/types'

export interface VnIndexEntry {
  id: string
  packId: string
  title: string
  description?: string
  scriptPath: string
  initialNodeId?: string
  readerStoryIds?: string[]
}

export interface VnText {
  chinese: string
  english?: string
  readerSentenceId?: string
}

export interface VnSpeakerRef {
  characterId: string
  personaId?: string
}

export interface VnCharacter {
  id: string
  displayNames: {
    english?: string
    chinese?: string
  }
  personas: Record<string, VnPersona>
}

export interface VnPersona {
  id: string
  displayNames?: {
    english?: string
    chinese?: string
  }
  defaultOutfitId: string
  defaultSpriteId?: string
  voice?: {
    provider?: string
    voiceId?: string
    language?: string
  }
  defaultScale?: number
  preferredPositions?: VnPosition[]
}

export interface VnSceneCharacter {
  slotId?: string
  characterId: string
  personaId: string
  spriteId: string
  position: VnPosition
  visible?: boolean
  xPercent?: number
  yPercent?: number
  scale?: number
  zIndex?: number
  opacity?: number
  mirror?: boolean
  dimmed?: boolean
}

export interface VnScenePatch {
  backgroundId?: string
  characters?: VnSceneCharacter[]
  clearCharacters?: boolean
}

export interface VnSceneState {
  backgroundId?: string
  characters: VnSceneCharacter[]
  cinematicImageId?: string
}

export interface VnQuestNote {
  id: string
  title: string
  text: string
  discoveredAtNodeId: string
  status: VnQuestStatus
}

export interface VnState {
  money: number
  skills: Record<string, number>
  flags: Record<string, boolean | string | number>
  questNotes: Record<string, VnQuestNote>
  appliedOnceKeys: string[]
}

export type VnEffect =
  | { id: string; onceKey?: string; op: 'addMoney'; amount: number }
  | { id: string; onceKey?: string; op: 'addSkill'; skill: string; amount: number }
  | { id: string; onceKey?: string; op: 'setFlag'; key: string; value: boolean | string | number }
  | { id: string; onceKey?: string; op: 'addQuestNote'; note: VnQuestNote }
  | { id: string; onceKey?: string; op: 'updateQuestNote'; noteId: string; status: VnQuestStatus; text?: string }
  | { id: string; onceKey?: string; op: 'unlockLocation'; locationId: string }
  | { id: string; onceKey?: string; op: 'unlockTitle'; titleId: string }
  | { id: string; onceKey?: string; op: 'setWorldQuestStatus'; questId: string; status: VnWorldQuestStatus }
  | { id: string; onceKey?: string; op: 'recordEncounter'; encounterId: string; poolId?: string }
  | { id: string; onceKey?: string; op: 'startCardBattle'; encounterId: string }

export type VnCondition =
  | { op: 'flagEquals'; key: string; value: boolean | string | number }
  | { op: 'moneyAtLeast'; amount: number }
  | { op: 'skillAtLeast'; skill: string; amount: number }
  | { op: 'questStatus'; noteId: string; status: VnQuestStatus }
  | { op: 'worldQuestStatus'; questId: string; status: VnWorldQuestStatus }
  | { op: 'locationUnlocked'; locationId: string }
  | { op: 'hasTitle'; titleId: string }
  | { op: 'encounterSeen'; encounterId: string; value?: boolean }

export type VnNode =
  | {
      id: string
      type: 'line'
      speaker?: VnSpeakerRef
      text: VnText
      scene?: VnScenePatch
      effects?: VnEffect[]
      audioClipId?: string
      nextId?: string
    }
  | {
      id: string
      type: 'choice'
      prompt?: VnText
      choices: VnChoice[]
    }
  | {
      id: string
      type: 'cinematic'
      imageId: string
      description: string
      caption?: VnText
      effects?: VnEffect[]
      audioClipId?: string
      nextId: string
    }
  | {
      id: string
      type: 'questResult'
      questId: string
      outcomeId: string
      completed: boolean
      resultId?: string
      summary?: VnText
      worldEffects?: VnEffect[]
      returnLocationId?: string
    }
  | {
      id: string
      type: 'end'
      endingId: string
      summary?: VnText
      effects?: VnEffect[]
    }
  | {
      id: string
      type: 'cardBattle'
      encounterId: string
      winNextId: string
      loseNextId?: string
      effects?: VnEffect[]
    }

export interface VnChoice {
  id: string
  kind: VnChoiceKind
  label: VnText
  nextId: string
  effects?: VnEffect[]
  conditions?: VnCondition[]
}

export interface VnScript {
  schemaVersion: number
  contentVersion: string
  id: string
  packId: string
  title: string
  description?: string
  initialNodeId: string
  assetManifestPath: string
  characters: Record<string, VnCharacter>
  initialState: VnState
  nodes: Record<string, VnNode>
  cards?: Record<string, CardDefinition>
  enemies?: Record<string, EnemyDefinition>
}

export interface VnBackgroundAsset {
  id: string
  src: string
  width: number
  height: number
  alt: string
}

export interface VnSpriteAsset {
  id: string
  characterId: string
  personaId: string
  outfitId: string
  poseId: string
  expressionId: string
  src: string
  width: number
  height: number
  anchorX: number
  anchorY: number
  defaultScale: number
  mobileScale?: number
  focalPoint?: {
    x: number
    y: number
  }
  alt?: string
}

export interface VnCinematicAsset {
  id: string
  src: string
  width: number
  height: number
  alt: string
}

export interface VnAssetManifest {
  schemaVersion: number
  contentVersion: string
  backgrounds: Record<string, VnBackgroundAsset>
  sprites: Record<string, VnSpriteAsset>
  cinematics: Record<string, VnCinematicAsset>
  fallbackBackgroundId?: string
}

export interface VnHistoryEntry {
  nodeId: string
  selectedChoiceId?: string
  stateSnapshot: VnState
  sceneSnapshot: VnSceneState
  timestamp: string
}

export interface VisualNovelSave {
  id: string
  packId: string
  visualNovelId: string
  contentVersion: string
  currentNodeId: string
  state: VnState
  scene: VnSceneState
  history: VnHistoryEntry[]
  activeEncounter?: CardBattlerState
  updatedAt: string
}

export interface VnWorldIndexEntry {
  id: string
  title: string
  description?: string
  worldPath: string
}

export interface VnWorld {
  id: string
  schemaVersion: number
  contentVersion: string
  title: string
  description?: VnText
  initialLocationId: string
  openingQuestId?: string
  assetManifestPath: string
  characters?: Record<string, VnCharacter>
  locations: Record<string, VnLocation>
  quests: Record<string, VnQuestDefinition>
  encounterPools?: Record<string, VnEncounterPool>
  cards?: Record<string, CardDefinition>
  enemies?: Record<string, EnemyDefinition>
  initialState: VnWorldState
}

export interface VnLocation {
  id: string
  name: VnText
  description?: VnText
  restoredDescription?: VnText
  backgroundId: string
  restoredBackgroundId?: string
  npcIds?: string[]
  travelTo?: string[]
  availableActions?: VnWorldAction[]
  conditions?: VnCondition[]
}

export interface VnWorldAction {
  id: string
  label: VnText
  kind: 'travel' | 'quest' | 'encounterPool' | 'rumour'
  targetId: string
  conditions?: VnCondition[]
}

export interface VnQuestDefinition {
  id: string
  title: VnText
  category: VnQuestCategory
  description?: VnText
  objective?: VnText
  scriptPath: string
  scriptId: string
  entryNodeId: string
  resultNodeIds?: string[]
  discoveryConditions?: VnCondition[]
  prerequisites?: VnCondition[]
  repeatable?: boolean
  maxCompletions?: number
  returnLocationId?: string
  completionEffects?: VnEffect[]
  encounterPoolId?: string
  hubNpcId?: string
  hubLocationId?: string
  hubLabel?: VnText
}

export interface VnEncounterPool {
  id: string
  title: VnText
  questIds: string[]
  conditions?: VnCondition[]
}

export interface VnWorldState {
  currentLocationId: string
  money: number
  skills: Record<string, number>
  flags: Record<string, boolean | string | number>
  questStates: Record<string, VnQuestState>
  unlockedLocations: string[]
  unlockedTitles: string[]
  completedEncounterIds: string[]
  encounterCounts: Record<string, number>
  committedResultIds: string[]
}

export interface VnQuestState {
  status: VnWorldQuestStatus
  completions: number
  activeRunId?: string
  lastOutcomeId?: string
  discoveredAt?: string
  updatedAt: string
}

export interface VnQuestResult {
  questId: string
  outcomeId: string
  completed: boolean
  resultId: string
  worldEffects: VnEffect[]
  returnLocationId?: string
}

export interface VnInterruptedQuest {
  questId: string
  visualNovelId: string
  saveId: string
  startedAt: string
}

export interface VisualNovelWorldSave {
  id: string
  worldId: string
  contentVersion: string
  schemaVersion: number
  state: VnWorldState
  interruptedQuest?: VnInterruptedQuest
  activeEncounter?: CardBattlerState
  updatedAt: string
}
