import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { VnAssetManifest, VnSceneCharacter } from './types'
import {
  ANIMATION_SPEED_PRESETS,
  STAGE_POSITION_PERCENT,
  type AnimationOptions,
  type AnimationSpeedMode,
  type CharacterAnimationState,
  type HideCharacterOptions,
  type SetExpressionOptions,
  type ShowCharacterOptions,
  type StageAnimationOptions,
  type StagePosition,
  type StartStateOptions,
} from './animationTypes'
import { getCharacterAnimation, getStageAnimation } from './animationRegistry'
import { expressionAssetResolver, resolveBlinkSpriteId, resolveTalkSpriteId } from './expressionResolver'

function randomBlinkDelay(): number {
  return 2500 + Math.random() * 4000
}

function randomTalkInterval(): number {
  return 120 + Math.random() * 100
}

function randomIdleDelay(): number {
  return Math.random() * 600
}

function buildSceneCharacter(
  characterId: string,
  expression: string,
  position: StagePosition,
  facing: 'left' | 'right' | 'none',
  zIndex: number,
  scale: number,
  manifest: VnAssetManifest,
): VnSceneCharacter {
  const resolved = expressionAssetResolver.resolve(characterId, expression, manifest)
  return {
    characterId,
    personaId: 'default',
    spriteId: resolved.spriteId ?? `${characterId}-${expression}`,
    position,
    visible: true,
    scale,
    zIndex,
    mirror: facing === 'left',
  }
}

interface InternalState extends CharacterAnimationState {
  _idleTimeout?: number
  _idleAnimation?: Animation
  _blinkTimeout?: number
  _blinkRestoreTimeout?: number
  _talkTimeout?: number
  _talkActive?: boolean
  _talkClosedSpriteId?: string
}

export interface AnimationManagerHandle {
  showCharacter: (characterId: string, options?: ShowCharacterOptions) => Promise<void>
  hideCharacter: (characterId: string, options?: HideCharacterOptions) => Promise<void>
  setExpression: (characterId: string, expression: string, options?: SetExpressionOptions) => Promise<void>
  moveCharacter: (characterId: string, position: StagePosition, options?: AnimationOptions) => Promise<void>
  animateCharacter: (characterId: string, animationName: string, options?: AnimationOptions & { to?: StagePosition }) => Promise<void>
  startCharacterState: (characterId: string, stateName: string, options?: StartStateOptions) => void
  stopCharacterState: (characterId: string, stateName: string) => void
  animateStage: (animationName: string, options?: StageAnimationOptions) => Promise<void>
  setSpeedMode: (mode: AnimationSpeedMode) => void
  setReducedMotion: (reduced: boolean) => void
  getCharacterState: (characterId: string) => CharacterAnimationState | undefined
  cleanup: () => void
  stageRef: React.RefObject<HTMLDivElement | null>
  characters: Record<string, CharacterAnimationState>
  revision: number
}

export function useAnimationManager(
  manifest: VnAssetManifest,
  stageRef: React.RefObject<HTMLDivElement | null>,
): AnimationManagerHandle {
  const charactersRef = useRef<Record<string, InternalState>>({})
  const speedModeRef = useRef<AnimationSpeedMode>('normal')
  const reducedMotionRef = useRef(false)
  const expressionGenRef = useRef(0)
  const [characters, setCharacters] = useState<Record<string, CharacterAnimationState>>({})

  const sync = useCallback(() => {
    setCharacters({ ...charactersRef.current })
  }, [])

  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)')
    reducedMotionRef.current = mq.matches
    const handler = (e: MediaQueryListEvent) => { reducedMotionRef.current = e.matches }
    mq.addEventListener('change', handler)
    return () => mq.removeEventListener('change', handler)
  }, [])

  const effectiveDurationMs = useCallback((ms: number): number => {
    const config = ANIMATION_SPEED_PRESETS[speedModeRef.current]
    if (reducedMotionRef.current || config.mode === 'instant') return 0
    return Math.round(ms * config.multiplier)
  }, [])

  const runAnimation = useCallback((
    element: HTMLElement,
    keyframes: Keyframe[],
    options: KeyframeAnimationOptions,
    abortController: AbortController,
  ): Promise<void> => {
    if (abortController.signal.aborted || keyframes.length === 0) return Promise.resolve()
    const duration = typeof options.duration === 'number' ? options.duration : 0
    if (duration <= 0) return Promise.resolve()

    return new Promise<void>((resolve) => {
      if (abortController.signal.aborted) { resolve(); return }
      const animation = element.animate(keyframes, options)
      const finish = () => { animation.cancel(); resolve() }
      abortController.signal.addEventListener('abort', finish, { once: true })
      animation.addEventListener('finish', () => {
        abortController.signal.removeEventListener('abort', finish)
        resolve()
      }, { once: true })
      animation.addEventListener('cancel', () => {
        abortController.signal.removeEventListener('abort', finish)
        resolve()
      }, { once: true })
    })
  }, [])

  // ── Idle ───────────────────────────────────────────────────────────────

  const stopIdle = useCallback((id: string) => {
    const s = charactersRef.current[id]
    if (!s) return
    if (s._idleTimeout) window.clearTimeout(s._idleTimeout)
    s._idleAnimation?.cancel()
    s._idleTimeout = undefined
    s._idleAnimation = undefined
  }, [])

  const startIdle = useCallback((id: string) => {
    const s = charactersRef.current[id]
    if (!s?.domElement || !s.visible || !s.idleEnabled) return
    if (reducedMotionRef.current) return

    const anim = getCharacterAnimation('idle')
    if (!anim) return
    const layer = s.domElement.querySelector('.vn-anim-layer') as HTMLElement | null
    if (!layer) return

    const loop = () => {
      const cur = charactersRef.current[id]
      if (!cur?.idleEnabled || !cur.visible || cur.currentReaction) return
      const opts = anim.getOptions({ speedMode: speedModeRef.current })
      const delay = randomIdleDelay()
      cur._idleTimeout = window.setTimeout(() => {
        const now = charactersRef.current[id]
        if (!now?.idleEnabled || now.currentReaction) return
        const inst = layer.animate(anim.keyframes, { ...opts, delay })
        now._idleAnimation = inst
        const onDone = () => {
          if (charactersRef.current[id]?.idleEnabled && !charactersRef.current[id]?.currentReaction) loop()
        }
        inst.addEventListener('finish', onDone, { once: true })
        inst.addEventListener('cancel', () => {}, { once: true })
      }, delay)
    }
    loop()
  }, [])

  // ── Blink ──────────────────────────────────────────────────────────────

  const stopBlink = useCallback((id: string) => {
    const s = charactersRef.current[id]
    if (!s) return
    if (s._blinkTimeout) window.clearTimeout(s._blinkTimeout)
    if (s._blinkRestoreTimeout) window.clearTimeout(s._blinkRestoreTimeout)
    s._blinkTimeout = undefined
    s._blinkRestoreTimeout = undefined
  }, [])

  const startBlink = useCallback((id: string) => {
    const s = charactersRef.current[id]
    if (!s?.domElement || !s.visible || !s.blinkEnabled) return
    if (reducedMotionRef.current) return
    if (!expressionAssetResolver.hasBlinkAsset(s.characterId, s.expression, manifest)) return

    const schedule = () => {
      const cur = charactersRef.current[id]
      if (!cur?.blinkEnabled || !cur.visible) return
      cur._blinkTimeout = window.setTimeout(() => {
        const now = charactersRef.current[id]
        if (!now?.blinkEnabled || !now.visible || now.currentReaction) {
          if (now?.blinkEnabled) schedule()
          return
        }
        const blinkId = resolveBlinkSpriteId(now.characterId, now.expression, manifest)
        if (!blinkId) return
        const origId = now.sceneCharacter.spriteId
        now.sceneCharacter = { ...now.sceneCharacter, spriteId: blinkId }
        sync()
        now._blinkRestoreTimeout = window.setTimeout(() => {
          const r = charactersRef.current[id]
          if (r) r.sceneCharacter = { ...r.sceneCharacter, spriteId: origId }
          sync()
          if (charactersRef.current[id]?.blinkEnabled) schedule()
        }, 180)
      }, randomBlinkDelay())
    }
    schedule()
  }, [manifest, sync])

  // ── Talk ───────────────────────────────────────────────────────────────

  const stopTalk = useCallback((id: string) => {
    const s = charactersRef.current[id]
    if (!s) return
    if (s._talkTimeout) window.clearTimeout(s._talkTimeout)
    if (s._talkClosedSpriteId) {
      s.sceneCharacter = { ...s.sceneCharacter, spriteId: s._talkClosedSpriteId }
      sync()
    }
    s._talkTimeout = undefined
    s._talkActive = false
    s._talkClosedSpriteId = undefined
  }, [sync])

  const startTalk = useCallback((id: string) => {
    const s = charactersRef.current[id]
    if (!s?.domElement || !s.visible || !s.talkEnabled) return
    if (!expressionAssetResolver.hasTalkAsset(s.characterId, s.expression, manifest)) return

    const talkId = resolveTalkSpriteId(s.characterId, s.expression, manifest)
    if (!talkId) return
    const closedId = s.sceneCharacter.spriteId
    s._talkActive = true
    s._talkClosedSpriteId = closedId

    const alternate = () => {
      const cur = charactersRef.current[id]
      if (!cur?._talkActive || !cur.visible) return
      const isOpen = cur.sceneCharacter.spriteId === talkId
      cur.sceneCharacter = { ...cur.sceneCharacter, spriteId: isOpen ? closedId : talkId }
      sync()
      cur._talkTimeout = window.setTimeout(alternate, randomTalkInterval())
    }
    alternate()
  }, [manifest, sync])

  // ── animateCharacter (declared before show/hide that use it) ──────────

  const animateCharacterFn = useCallback(async (characterId: string, animationName: string, options?: AnimationOptions & { to?: StagePosition }): Promise<void> => {
    const s = charactersRef.current[characterId]
    if (!s?.domElement) { console.warn(`[AnimationManager] Cannot animate "${characterId}": not found.`); return }
    const entry = getCharacterAnimation(animationName)
    if (!entry) { console.warn(`[AnimationManager] Unknown animation: "${animationName}"`); return }
    if (animationName === 'idle' || animationName === 'blink' || animationName === 'talk') {
      console.warn(`[AnimationManager] "${animationName}" is a continuous state. Use startCharacterState().`)
      return
    }

    if (animationName.startsWith('enter') && options?.to) {
      s.position = options.to
      s.sceneCharacter = { ...s.sceneCharacter, position: options.to }
      sync()
    }

    stopIdle(characterId)
    s.currentReaction = animationName
    const opts = entry.getOptions({ ...options, speedMode: speedModeRef.current })

    if (animationName.startsWith('enter')) {
      const fromPct = animationName.includes('Left') ? -40 : 120
      s.domElement.style.setProperty('--vn-anim-from-left', `${fromPct}%`)
    }

    await runAnimation(s.domElement, entry.keyframes, opts, s.animationAbortController)

    if (animationName.startsWith('enter')) {
      s.domElement.style.removeProperty('--vn-anim-from-left')
    }

    if (!animationName.startsWith('exit') && charactersRef.current[characterId]?.visible) {
      s.currentReaction = null
      startIdle(characterId)
    }
  }, [stopIdle, startIdle, runAnimation, sync])

  // ── setExpression (declared before show/hide that use it) ─────────────

  const setExpression = useCallback(async (characterId: string, expression: string, options?: SetExpressionOptions): Promise<void> => {
    const s = charactersRef.current[characterId]
    if (!s) return
    const gen = ++expressionGenRef.current

    let effectiveExpression = expression
    if (!expressionAssetResolver.resolve(characterId, expression, manifest).spriteId) {
      effectiveExpression = options?.fallback ?? 'neutral'
      if (effectiveExpression === expression) return
    }

    const resolved = expressionAssetResolver.resolve(characterId, effectiveExpression, manifest)
    const targetSpriteId = resolved.spriteId ?? `${characterId}-${effectiveExpression}`

    if (options?.crossfade && s.domElement) {
      const img = s.domElement.querySelector('.vn-sprite img') as HTMLElement | null
      if (img) {
        const fo = getCharacterAnimation('fadeOut')
        if (fo) await runAnimation(img, fo.keyframes, { duration: effectiveDurationMs(options.crossfadeDuration ?? 200), fill: 'forwards' }, s.animationAbortController)
      }
      if (expressionGenRef.current !== gen) return
      s.expression = effectiveExpression
      s.sceneCharacter = { ...s.sceneCharacter, spriteId: targetSpriteId }
      sync()
      if (img) {
        const fi = getCharacterAnimation('fadeIn')
        if (fi) await runAnimation(img, fi.keyframes, { duration: effectiveDurationMs(options.crossfadeDuration ?? 200), fill: 'forwards' }, s.animationAbortController)
      }
    } else {
      s.expression = effectiveExpression
      s.sceneCharacter = { ...s.sceneCharacter, spriteId: targetSpriteId }
      sync()
    }

    if (charactersRef.current[characterId]?.blinkEnabled) { stopBlink(characterId); startBlink(characterId) }
  }, [manifest, effectiveDurationMs, stopBlink, startBlink, runAnimation, sync])

  // ── Public API ─────────────────────────────────────────────────────────

  const showCharacter = useCallback(async (characterId: string, options?: ShowCharacterOptions): Promise<void> => {
    const position = options?.position ?? 'center'
    const expression = options?.expression ?? 'neutral'
    const facing = options?.facing ?? 'none'
    const sc = buildSceneCharacter(characterId, expression, position, facing, options?.zIndex ?? 2, options?.scale ?? 1, manifest)
    const abort = new AbortController()
    const state: InternalState = {
      characterId, expression, position, facing, visible: true,
      zIndex: options?.zIndex ?? 2, scale: options?.scale ?? 1,
      sceneCharacter: sc, domElement: null, animationAbortController: abort,
      idleEnabled: true, blinkEnabled: true, talkEnabled: false,
      currentReaction: null, expressionGeneration: 0,
    }
    charactersRef.current[characterId] = state
    sync()

    await new Promise<void>((r) => requestAnimationFrame(() => r()))
    const el = charactersRef.current[characterId]?.domElement

    if (el && options?.animation) {
      await animateCharacterFn(characterId, options.animation, { duration: 500 })
    } else if (el) {
      const anim = getCharacterAnimation('fadeIn')
      if (anim) await runAnimation(el, anim.keyframes, anim.getOptions({ speedMode: speedModeRef.current }), abort)
    }

    if (charactersRef.current[characterId]?.visible) { startIdle(characterId); startBlink(characterId) }
  }, [manifest, sync, runAnimation, startIdle, startBlink, animateCharacterFn])

  const hideCharacter = useCallback(async (characterId: string, options?: HideCharacterOptions): Promise<void> => {
    const s = charactersRef.current[characterId]
    if (!s) return
    stopIdle(characterId); stopBlink(characterId); stopTalk(characterId)

    if (s.domElement && options?.animation) {
      await animateCharacterFn(characterId, options.animation, { duration: options.duration })
    } else if (s.domElement) {
      const anim = getCharacterAnimation('fadeOut')
      if (anim) await runAnimation(s.domElement, anim.keyframes, anim.getOptions({ speedMode: speedModeRef.current }), s.animationAbortController)
    }
    s.animationAbortController.abort()
    delete charactersRef.current[characterId]
    sync()
  }, [stopIdle, stopBlink, stopTalk, runAnimation, sync, animateCharacterFn])

  const moveCharacter = useCallback(async (characterId: string, position: StagePosition, options?: AnimationOptions): Promise<void> => {
    const s = charactersRef.current[characterId]
    if (!s) return
    const fromPct = STAGE_POSITION_PERCENT[s.position]
    s.position = position
    s.sceneCharacter = { ...s.sceneCharacter, position }
    sync()

    if (s.domElement) {
      s.domElement.style.setProperty('--vn-anim-from-left', `${fromPct}%`)
      const name = `move${position.charAt(0).toUpperCase()}${position.slice(1)}`
      const entry = getCharacterAnimation(name)
      if (entry) await runAnimation(s.domElement, entry.keyframes, entry.getOptions({ ...options, speedMode: speedModeRef.current }), s.animationAbortController)
      s.domElement.style.removeProperty('--vn-anim-from-left')
    }
  }, [sync, runAnimation])

  const startCharacterState = useCallback((characterId: string, stateName: string) => {
    const s = charactersRef.current[characterId]
    if (!s) return
    switch (stateName) {
      case 'idle': s.idleEnabled = true; startIdle(characterId); break
      case 'blink': s.blinkEnabled = true; startBlink(characterId); break
      case 'talk': s.talkEnabled = true; startTalk(characterId); break
      default: console.warn(`[AnimationManager] Unknown state: "${stateName}"`)
    }
  }, [startIdle, startBlink, startTalk])

  const stopCharacterState = useCallback((characterId: string, stateName: string) => {
    const s = charactersRef.current[characterId]
    if (!s) return
    switch (stateName) {
      case 'idle': s.idleEnabled = false; stopIdle(characterId); break
      case 'blink': s.blinkEnabled = false; stopBlink(characterId); break
      case 'talk': s.talkEnabled = false; stopTalk(characterId); break
      default: break
    }
  }, [stopIdle, stopBlink, stopTalk])

  const animateStageFn = useCallback(async (animationName: string, options?: StageAnimationOptions): Promise<void> => {
    const stage = stageRef.current
    if (!stage) return
    const entry = getStageAnimation(animationName)
    if (!entry) { console.warn(`[AnimationManager] Unknown stage animation: "${animationName}"`); return }
    await runAnimation(stage, entry.keyframes, entry.getOptions(options ?? {}), new AbortController())
  }, [stageRef, runAnimation])

  const setSpeedMode = useCallback((mode: AnimationSpeedMode) => { speedModeRef.current = mode }, [])
  const setReducedMotion = useCallback((reduced: boolean) => { reducedMotionRef.current = reduced }, [])
  const getCharacterState = useCallback((id: string) => charactersRef.current[id], [])

  const cleanup = useCallback(() => {
    for (const id of Object.keys(charactersRef.current)) {
      const s = charactersRef.current[id]
      s.animationAbortController.abort()
      stopIdle(id); stopBlink(id); stopTalk(id)
    }
    charactersRef.current = {}
    sync()
  }, [stopIdle, stopBlink, stopTalk, sync])

  useEffect(() => cleanup, [cleanup])

  return useMemo(() => ({
    showCharacter, hideCharacter, setExpression, moveCharacter,
    animateCharacter: animateCharacterFn, startCharacterState, stopCharacterState,
    animateStage: animateStageFn, setSpeedMode, setReducedMotion,
    getCharacterState, cleanup, stageRef,
    characters, revision: Object.keys(characters).length,
  }), [
    showCharacter, hideCharacter, setExpression, moveCharacter, animateCharacterFn,
    startCharacterState, stopCharacterState, animateStageFn, setSpeedMode,
    setReducedMotion, getCharacterState, cleanup, stageRef, characters,
  ])
}
