import {
  ANIMATION_SPEED_PRESETS,
  STAGE_POSITION_PERCENT,
  type AnimationOptions,
  type AnimationSpeedMode,
  type CharacterAnimationName,
  type StageAnimationName,
  type StageAnimationOptions,
  type StagePosition,
} from './animationTypes'

export interface AnimationEntry {
  keyframes: Keyframe[]
  getOptions: (opts: AnimationOptions) => KeyframeAnimationOptions
}

export interface StageAnimationEntry {
  keyframes: Keyframe[]
  getOptions: (opts: StageAnimationOptions) => KeyframeAnimationOptions
}

function effectiveDuration(ms: number, speedMode: AnimationSpeedMode = 'normal'): number {
  const config = ANIMATION_SPEED_PRESETS[speedMode]
  if (config.reducedMotion || config.mode === 'instant') return 0
  return Math.round(ms * config.multiplier)
}

function baseOpts(
  ms: number,
  easing: string = 'ease',
  speedMode: AnimationSpeedMode = 'normal',
): KeyframeAnimationOptions {
  const duration = effectiveDuration(ms, speedMode)
  return { duration, easing, fill: 'forwards' }
}

// ── Character animation registry ─────────────────────────────────────────────

const characterAnimations: Record<string, AnimationEntry> = {
  enterLeft: {
    keyframes: [
      { opacity: 0, transform: 'translateX(-100%)' },
      { opacity: 1, transform: 'translateX(0)' },
    ],
    getOptions: (o) => baseOpts(o.duration ?? 500, o.easing ?? 'ease-out', o.speedMode),
  },
  enterRight: {
    keyframes: [
      { opacity: 0, transform: 'translateX(100%)' },
      { opacity: 1, transform: 'translateX(0)' },
    ],
    getOptions: (o) => baseOpts(o.duration ?? 500, o.easing ?? 'ease-out', o.speedMode),
  },
  exitLeft: {
    keyframes: [
      { opacity: 1, transform: 'translateX(0)' },
      { opacity: 0, transform: 'translateX(-100%)' },
    ],
    getOptions: (o) => baseOpts(o.duration ?? 400, o.easing ?? 'ease-in', o.speedMode),
  },
  exitRight: {
    keyframes: [
      { opacity: 1, transform: 'translateX(0)' },
      { opacity: 0, transform: 'translateX(100%)' },
    ],
    getOptions: (o) => baseOpts(o.duration ?? 400, o.easing ?? 'ease-in', o.speedMode),
  },
  fadeIn: {
    keyframes: [{ opacity: 0 }, { opacity: 1 }],
    getOptions: (o) => baseOpts(o.duration ?? 300, o.easing, o.speedMode),
  },
  fadeOut: {
    keyframes: [{ opacity: 1 }, { opacity: 0 }],
    getOptions: (o) => baseOpts(o.duration ?? 300, o.easing, o.speedMode),
  },
  bounce: {
    keyframes: [
      { transform: 'translateY(0)' },
      { transform: 'translateY(-18px)', offset: 0.35 },
      { transform: 'translateY(0)' },
    ],
    getOptions: (o) => baseOpts(o.duration ?? 350, o.easing ?? 'ease-in-out', o.speedMode),
  },
  shake: {
    keyframes: [
      { transform: 'translateX(0)' },
      { transform: 'translateX(-6px)', offset: 0.15 },
      { transform: 'translateX(6px)', offset: 0.3 },
      { transform: 'translateX(-4px)', offset: 0.45 },
      { transform: 'translateX(4px)', offset: 0.6 },
      { transform: 'translateX(-2px)', offset: 0.75 },
      { transform: 'translateX(0)' },
    ],
    getOptions: (o) => baseOpts(o.duration ?? 400, o.easing ?? 'ease-in-out', o.speedMode),
  },
  nod: {
    keyframes: [
      { transform: 'rotate(0deg) translateY(0)' },
      { transform: 'rotate(3deg) translateY(3px)', offset: 0.4 },
      { transform: 'rotate(0deg) translateY(0)' },
    ],
    getOptions: (o) => baseOpts(o.duration ?? 400, o.easing ?? 'ease-in-out', o.speedMode),
  },
  recoil: {
    keyframes: [
      { transform: 'translateX(0) scale(1)' },
      { transform: 'translateX(12px) scale(0.97)', offset: 0.25 },
      { transform: 'translateX(-3px) scale(1.01)', offset: 0.55 },
      { transform: 'translateX(0) scale(1)' },
    ],
    getOptions: (o) => baseOpts(o.duration ?? 450, o.easing ?? 'ease-out', o.speedMode),
  },
  leanIn: {
    keyframes: [
      { transform: 'rotate(0deg) translateX(0)' },
      { transform: 'rotate(-2deg) translateX(6px)', offset: 0.5 },
      { transform: 'rotate(0deg) translateX(0)' },
    ],
    getOptions: (o) => baseOpts(o.duration ?? 500, o.easing ?? 'ease-in-out', o.speedMode),
  },
  squash: {
    keyframes: [
      { transform: 'scaleY(1) scaleX(1)' },
      { transform: 'scaleY(0.88) scaleX(1.08)', offset: 0.25 },
      { transform: 'scaleY(1.05) scaleX(0.97)', offset: 0.5 },
      { transform: 'scaleY(1) scaleX(1)' },
    ],
    getOptions: (o) => baseOpts(o.duration ?? 350, o.easing ?? 'ease-in-out', o.speedMode),
  },
  idle: {
    keyframes: [
      { transform: 'translateY(0)' },
      { transform: 'translateY(-2px)', offset: 0.5 },
      { transform: 'translateY(0)' },
    ],
    getOptions: (o) => ({
      duration: effectiveDuration(o.duration ?? 3200, o.speedMode),
      easing: o.easing ?? 'ease-in-out',
      iterations: Infinity,
    }),
  },
  blink: {
    keyframes: [{ opacity: 1 }, { opacity: 0, offset: 0.45 }, { opacity: 1 }],
    getOptions: (o) => baseOpts(o.duration ?? 180, o.easing, o.speedMode),
  },
  talk: {
    keyframes: [
      { opacity: 1 },
      { opacity: 0, offset: 0.48 },
      { opacity: 1 },
    ],
    getOptions: (o) => baseOpts(o.duration ?? 200, o.easing, o.speedMode),
  },
}

// ── Move animations (generated from position constants) ──────────────────────

const movePositions: StagePosition[] = ['farLeft', 'left', 'center', 'right', 'farRight']

for (const pos of movePositions) {
  const pct = STAGE_POSITION_PERCENT[pos]
  const name: CharacterAnimationName = `move${pos.charAt(0).toUpperCase()}${pos.slice(1)}` as CharacterAnimationName
  characterAnimations[name] = {
    keyframes: [
      { left: 'var(--vn-anim-from-left)' },
      { left: `${pct}%` },
    ],
    getOptions: (o) => baseOpts(o.duration ?? 450, o.easing ?? 'ease-in-out', o.speedMode),
  }
}

// ── Public API ───────────────────────────────────────────────────────────────

export function getCharacterAnimation(name: string): AnimationEntry | undefined {
  return characterAnimations[name]
}

export function isValidCharacterAnimation(name: string): name is CharacterAnimationName {
  return name in characterAnimations
}

export function getCharacterAnimationNames(): string[] {
  return Object.keys(characterAnimations)
}

// ── Stage animation registry ─────────────────────────────────────────────────

const stageAnimations: Record<string, StageAnimationEntry> = {
  screenShake: {
    keyframes: [
      { transform: 'translate(0, 0)' },
      { transform: 'translate(-4px, 2px)', offset: 0.15 },
      { transform: 'translate(4px, -2px)', offset: 0.3 },
      { transform: 'translate(-3px, 1px)', offset: 0.5 },
      { transform: 'translate(2px, -1px)', offset: 0.7 },
      { transform: 'translate(0, 0)' },
    ],
    getOptions: (o) => ({
      duration: effectiveDuration(o.duration ?? 450),
      easing: 'ease-in-out',
      fill: 'forwards',
    }),
  },
  cameraZoom: {
    keyframes: [
      { transform: 'scale(1)' },
      { transform: `scale(${1.2})` },
    ],
    getOptions: (o) => ({
      duration: effectiveDuration(o.duration ?? 500),
      easing: 'ease-in-out',
      fill: 'forwards',
    }),
  },
  cameraReset: {
    keyframes: [
      { transform: 'var(--vn-stage-transform)' },
      { transform: 'scale(1) translate(0, 0)' },
    ],
    getOptions: (o) => ({
      duration: effectiveDuration(o.duration ?? 400),
      easing: 'ease-in-out',
      fill: 'forwards',
    }),
  },
  stageFade: {
    keyframes: [{ opacity: 1 }, { opacity: 0 }, { opacity: 1 }],
    getOptions: (o) => ({
      duration: effectiveDuration(o.duration ?? 800),
      easing: 'ease-in-out',
      fill: 'forwards',
    }),
  },
  backgroundPan: {
    keyframes: [
      { objectPosition: '0% 50%' },
      { objectPosition: '100% 50%' },
    ],
    getOptions: (o) => ({
      duration: effectiveDuration(o.duration ?? 2000),
      easing: 'ease-in-out',
      fill: 'forwards',
    }),
  },
}

export function getStageAnimation(name: string): StageAnimationEntry | undefined {
  return stageAnimations[name]
}

export function isValidStageAnimation(name: string): name is StageAnimationName {
  return name in stageAnimations
}

export function getStageAnimationNames(): string[] {
  return Object.keys(stageAnimations)
}
