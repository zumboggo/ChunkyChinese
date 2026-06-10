import { describe, expect, it } from 'vitest'
import {
  getCharacterAnimation,
  getCharacterAnimationNames,
  getStageAnimation,
  getStageAnimationNames,
  isValidCharacterAnimation,
  isValidStageAnimation,
} from './animationRegistry'
import {
  ANIMATION_SPEED_PRESETS,
  CHARACTER_ANIMATION_NAMES,
  STAGE_ANIMATION_NAMES,
  STAGE_POSITION_PERCENT,
  STAGE_POSITIONS,
} from './animationTypes'

describe('STAGE_POSITION_PERCENT', () => {
  it('maps all stage positions to percentages', () => {
    for (const pos of STAGE_POSITIONS) {
      expect(STAGE_POSITION_PERCENT[pos]).toBeTypeOf('number')
      expect(STAGE_POSITION_PERCENT[pos]).toBeGreaterThanOrEqual(0)
      expect(STAGE_POSITION_PERCENT[pos]).toBeLessThanOrEqual(100)
    }
  })

  it('orders positions left to right', () => {
    expect(STAGE_POSITION_PERCENT.farLeft).toBeLessThan(STAGE_POSITION_PERCENT.left)
    expect(STAGE_POSITION_PERCENT.left).toBeLessThan(STAGE_POSITION_PERCENT.center)
    expect(STAGE_POSITION_PERCENT.center).toBeLessThan(STAGE_POSITION_PERCENT.right)
    expect(STAGE_POSITION_PERCENT.right).toBeLessThan(STAGE_POSITION_PERCENT.farRight)
  })
})

describe('CHARACTER_ANIMATION_NAMES', () => {
  it('contains all required animations', () => {
    const required = [
      'enterLeft', 'enterRight', 'exitLeft', 'exitRight',
      'fadeIn', 'fadeOut', 'bounce', 'shake', 'nod',
      'recoil', 'leanIn', 'squash', 'idle', 'blink', 'talk',
    ]
    for (const name of required) {
      expect(CHARACTER_ANIMATION_NAMES).toContain(name)
    }
  })

  it('includes move animations for all positions', () => {
    for (const pos of STAGE_POSITIONS) {
      const moveName = `move${pos.charAt(0).toUpperCase()}${pos.slice(1)}`
      expect(CHARACTER_ANIMATION_NAMES).toContain(moveName)
    }
  })
})

describe('isValidCharacterAnimation', () => {
  it('returns true for valid names', () => {
    expect(isValidCharacterAnimation('bounce')).toBe(true)
    expect(isValidCharacterAnimation('enterLeft')).toBe(true)
    expect(isValidCharacterAnimation('idle')).toBe(true)
  })

  it('returns false for unknown names', () => {
    expect(isValidCharacterAnimation('nonexistent')).toBe(false)
    expect(isValidCharacterAnimation('')).toBe(false)
  })
})

describe('getCharacterAnimation', () => {
  it('returns entry for valid animation', () => {
    const entry = getCharacterAnimation('bounce')
    expect(entry).toBeDefined()
    expect(entry!.keyframes.length).toBeGreaterThan(0)
  })

  it('returns undefined for unknown animation', () => {
    expect(getCharacterAnimation('nonexistent')).toBeUndefined()
  })

  it('all registered animations have keyframes and getOptions', () => {
    for (const name of getCharacterAnimationNames()) {
      const entry = getCharacterAnimation(name)
      expect(entry).toBeDefined()
      expect(entry!.keyframes.length).toBeGreaterThan(0)
      expect(typeof entry!.getOptions).toBe('function')
    }
  })

  it('returns move animations for all positions', () => {
    for (const pos of STAGE_POSITIONS) {
      const name = `move${pos.charAt(0).toUpperCase()}${pos.slice(1)}`
      const entry = getCharacterAnimation(name)
      expect(entry).toBeDefined()
    }
  })
})

describe('getCharacterAnimation options', () => {
  it('returns zero duration for instant speed', () => {
    const entry = getCharacterAnimation('bounce')!
    const opts = entry.getOptions({ speedMode: 'instant' })
    expect(opts.duration).toBe(0)
  })

  it('returns reduced duration for fast speed', () => {
    const entry = getCharacterAnimation('bounce')!
    const normal = entry.getOptions({ speedMode: 'normal' }) as { duration: number }
    const fast = entry.getOptions({ speedMode: 'fast' }) as { duration: number }
    expect(fast.duration).toBeLessThan(normal.duration)
    expect(fast.duration).toBeGreaterThan(0)
  })

  it('uses custom duration when provided', () => {
    const entry = getCharacterAnimation('bounce')!
    const opts = entry.getOptions({ duration: 1000, speedMode: 'normal' }) as { duration: number }
    expect(opts.duration).toBe(1000)
  })
})

describe('STAGE_ANIMATION_NAMES', () => {
  it('contains required stage animations', () => {
    expect(STAGE_ANIMATION_NAMES).toContain('screenShake')
    expect(STAGE_ANIMATION_NAMES).toContain('cameraZoom')
    expect(STAGE_ANIMATION_NAMES).toContain('cameraReset')
    expect(STAGE_ANIMATION_NAMES).toContain('stageFade')
    expect(STAGE_ANIMATION_NAMES).toContain('backgroundPan')
  })
})

describe('isValidStageAnimation', () => {
  it('returns true for valid names', () => {
    expect(isValidStageAnimation('screenShake')).toBe(true)
    expect(isValidStageAnimation('cameraZoom')).toBe(true)
  })

  it('returns false for unknown names', () => {
    expect(isValidStageAnimation('nonexistent')).toBe(false)
  })
})

describe('getStageAnimation', () => {
  it('returns entry for valid animation', () => {
    const entry = getStageAnimation('screenShake')
    expect(entry).toBeDefined()
    expect(entry!.keyframes.length).toBeGreaterThan(0)
  })

  it('returns undefined for unknown animation', () => {
    expect(getStageAnimation('nonexistent')).toBeUndefined()
  })

  it('all registered stage animations have keyframes and getOptions', () => {
    for (const name of getStageAnimationNames()) {
      const entry = getStageAnimation(name)
      expect(entry).toBeDefined()
      expect(entry!.keyframes.length).toBeGreaterThan(0)
      expect(typeof entry!.getOptions).toBe('function')
    }
  })
})

describe('ANIMATION_SPEED_PRESETS', () => {
  it('has presets for all modes', () => {
    expect(ANIMATION_SPEED_PRESETS.normal).toBeDefined()
    expect(ANIMATION_SPEED_PRESETS.fast).toBeDefined()
    expect(ANIMATION_SPEED_PRESETS.instant).toBeDefined()
  })

  it('instant mode has zero multiplier', () => {
    expect(ANIMATION_SPEED_PRESETS.instant.multiplier).toBe(0)
  })

  it('fast mode has smaller multiplier than normal', () => {
    expect(ANIMATION_SPEED_PRESETS.fast.multiplier).toBeLessThan(ANIMATION_SPEED_PRESETS.normal.multiplier)
    expect(ANIMATION_SPEED_PRESETS.fast.multiplier).toBeGreaterThan(0)
  })
})
