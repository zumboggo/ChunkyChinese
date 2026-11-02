import type {StoryState} from '../../src/game/animation/shared/engine/story-engine.js'

export function checkSpeakerStaging(
  state: Pick<StoryState, 'stage'>,
  node: {type: string; actor?: string; text?: string; line?: number},
  choices?: string[],
): void
