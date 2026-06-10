import type { VnAssetManifest, VnSceneCharacter } from './types'

// ── Position constants ───────────────────────────────────────────────────────

export const STAGE_POSITIONS = ['farLeft', 'left', 'center', 'right', 'farRight'] as const
export type StagePosition = (typeof STAGE_POSITIONS)[number]

export const STAGE_POSITION_PERCENT: Record<StagePosition, number> = {
  farLeft: 8,
  left: 20,
  center: 50,
  right: 80,
  farRight: 92,
}

// ── Animation names ──────────────────────────────────────────────────────────

export const CHARACTER_ANIMATION_NAMES = [
  'enterLeft',
  'enterRight',
  'exitLeft',
  'exitRight',
  'fadeIn',
  'fadeOut',
  'moveFarLeft',
  'moveLeft',
  'moveCenter',
  'moveRight',
  'moveFarRight',
  'bounce',
  'shake',
  'nod',
  'recoil',
  'leanIn',
  'squash',
  'idle',
  'blink',
  'talk',
] as const

export type CharacterAnimationName = (typeof CHARACTER_ANIMATION_NAMES)[number]

export const STAGE_ANIMATION_NAMES = [
  'screenShake',
  'cameraZoom',
  'cameraReset',
  'stageFade',
  'backgroundPan',
] as const

export type StageAnimationName = (typeof STAGE_ANIMATION_NAMES)[number]

// ── Animation speed modes ────────────────────────────────────────────────────

export type AnimationSpeedMode = 'normal' | 'fast' | 'instant'

export interface AnimationSpeedConfig {
  mode: AnimationSpeedMode
  multiplier: number
  reducedMotion: boolean
}

export const ANIMATION_SPEED_PRESETS: Record<AnimationSpeedMode, AnimationSpeedConfig> = {
  normal: { mode: 'normal', multiplier: 1, reducedMotion: false },
  fast: { mode: 'fast', multiplier: 0.3, reducedMotion: false },
  instant: { mode: 'instant', multiplier: 0, reducedMotion: false },
}

// ── Options ──────────────────────────────────────────────────────────────────

export interface AnimationOptions {
  duration?: number
  easing?: string
  speedMode?: AnimationSpeedMode
}

export interface EnterExitOptions extends AnimationOptions {
  to?: StagePosition
}

export interface MoveOptions extends AnimationOptions {
  from?: StagePosition
}

export interface SetExpressionOptions {
  crossfade?: boolean
  crossfadeDuration?: number
  fallback?: string
  preload?: boolean
}

export interface ShowCharacterOptions {
  position?: StagePosition
  expression?: string
  animation?: string
  facing?: 'left' | 'right' | 'none'
  zIndex?: number
  scale?: number
}

export interface HideCharacterOptions {
  animation?: string
  duration?: number
}

export interface StartStateOptions {
  speedMode?: AnimationSpeedMode
  interval?: [number, number]
}

// ── Stage animation options ──────────────────────────────────────────────────

export interface StageAnimationOptions {
  duration?: number
  easing?: string
  target?: string
  scale?: number
  axis?: 'x' | 'y' | 'both'
}

// ── Character state ──────────────────────────────────────────────────────────

export interface CharacterAnimationState {
  characterId: string
  expression: string
  position: StagePosition
  facing: 'left' | 'right' | 'none'
  visible: boolean
  zIndex: number
  scale: number
  sceneCharacter: VnSceneCharacter
  domElement: HTMLElement | null
  animationAbortController: AbortController
  idleEnabled: boolean
  blinkEnabled: boolean
  talkEnabled: boolean
  currentReaction: string | null
  expressionGeneration: number
}

export interface AnimationManagerState {
  characters: Record<string, CharacterAnimationState>
  speedMode: AnimationSpeedMode
  reducedMotion: boolean
}

// ── Registry entry ───────────────────────────────────────────────────────────

export interface AnimationRegistryEntry {
  keyframes: Keyframe[] | ((options: AnimationOptions) => Keyframe[])
  options?: KeyframeAnimationOptions | ((options: AnimationOptions) => KeyframeAnimationOptions)
}

// ── Story commands ───────────────────────────────────────────────────────────

export interface StoryAnimCommand {
  type: 'show' | 'hide' | 'expression' | 'animate' | 'move' | 'dialogue'
  character?: string
  speaker?: string
  position?: StagePosition
  expression?: string
  value?: string
  animation?: string
  transition?: 'crossfade' | 'immediate'
  duration?: number
  wait?: boolean
  text?: string
  facing?: 'left' | 'right' | 'none'
}

// ── Manager interface ────────────────────────────────────────────────────────

export interface AnimationManager {
  showCharacter: (characterId: string, options?: ShowCharacterOptions) => Promise<void>
  hideCharacter: (characterId: string, options?: HideCharacterOptions) => Promise<void>
  setExpression: (characterId: string, expression: string, options?: SetExpressionOptions) => Promise<void>
  moveCharacter: (characterId: string, position: StagePosition, options?: AnimationOptions) => Promise<void>
  animateCharacter: (characterId: string, animationName: string, options?: AnimationOptions & EnterExitOptions) => Promise<void>
  startCharacterState: (characterId: string, stateName: string, options?: StartStateOptions) => void
  stopCharacterState: (characterId: string, stateName: string) => void
  animateStage: (animationName: string, options?: StageAnimationOptions) => Promise<void>
  setSpeedMode: (mode: AnimationSpeedMode) => void
  setReducedMotion: (reduced: boolean) => void
  getCharacterState: (characterId: string) => CharacterAnimationState | undefined
  cleanup: () => void
  stageRef: React.RefObject<HTMLDivElement | null>
}

// ── Asset helpers ────────────────────────────────────────────────────────────

export interface ResolvedExpressionAsset {
  spriteId: string | undefined
  src: string | undefined
}

export interface ExpressionAssetResolver {
  resolve: (characterId: string, expression: string, manifest: VnAssetManifest) => ResolvedExpressionAsset
  hasBlinkAsset: (characterId: string, currentExpression: string, manifest: VnAssetManifest) => boolean
  hasTalkAsset: (characterId: string, currentExpression: string, manifest: VnAssetManifest) => boolean
}
