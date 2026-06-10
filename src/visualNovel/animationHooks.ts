import { useCallback } from 'react'
import type { CharacterAnimationState } from './animationTypes'

export function useAnimatedDomReady(
  charactersRef: React.RefObject<Record<string, CharacterAnimationState>>,
): (characterId: string, element: HTMLElement | null) => void {
  return useCallback((characterId: string, element: HTMLElement | null) => {
    const state = charactersRef.current[characterId]
    if (state) state.domElement = element
  }, [charactersRef])
}
