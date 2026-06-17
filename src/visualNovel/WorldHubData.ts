import { availableNpcTalkQuest } from './worldEngine'
import type { VnAssetManifest, VnLocation, VnQuestDefinition, VnWorld } from './types'
import type { VisualNovelWorldSave } from './types'

export const MAP_LAYOUT: Record<string, { x: number; y: number; label: string }> = {
  'real-world-apartment': { x: 50, y: 15, label: 'Apartment' },
  'town-square': { x: 50, y: 45, label: 'Town Square' },
  'training-hall': { x: 25, y: 75, label: 'Training Hall' },
  'sculpture-workshop': { x: 75, y: 75, label: 'Workshop' },
}

export const MAP_CONNECTIONS: [string, string][] = [
  ['real-world-apartment', 'town-square'],
  ['town-square', 'training-hall'],
  ['town-square', 'sculpture-workshop'],
  ['training-hall', 'sculpture-workshop'],
]

export interface VnHubCastMember {
  characterId: string
  name: string
  spriteId: string
  talkQuest?: VnQuestDefinition
}

export function getHubCastMembers(
  world: VnWorld,
  save: VisualNovelWorldSave,
  location: VnLocation | undefined,
  manifest: VnAssetManifest,
): VnHubCastMember[] {
  const characterIds = location?.npcIds ?? []
  return characterIds.filter((characterId) => characterId !== 'lee-hyun' && characterId !== 'protagonist').flatMap((characterId) => {
    const character = world.characters?.[characterId]
    if (!character) return []
    const persona = Object.values(character.personas)[0]
    const spriteId = persona?.defaultSpriteId
    if (!spriteId || !manifest.sprites[spriteId]) return []
    const talkQuest = availableNpcTalkQuest(world, save, location, characterId)
    return [{
      characterId,
      name: character.displayNames.english ?? character.displayNames.chinese ?? characterId,
      spriteId,
      talkQuest,
    }]
  })
}
