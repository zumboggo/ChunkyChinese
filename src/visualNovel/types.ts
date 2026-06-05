export type VnPosition = 'left' | 'center' | 'right'
export type VnChoiceKind = 'expressive' | 'memory' | 'consequential'
export type VnQuestStatus = 'active' | 'completed' | 'failed'
export type VnNodeType = 'line' | 'choice' | 'cinematic' | 'end'

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

export type VnCondition =
  | { op: 'flagEquals'; key: string; value: boolean | string | number }
  | { op: 'moneyAtLeast'; amount: number }
  | { op: 'skillAtLeast'; skill: string; amount: number }
  | { op: 'questStatus'; noteId: string; status: VnQuestStatus }

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
      type: 'end'
      endingId: string
      summary?: VnText
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
  updatedAt: string
}
