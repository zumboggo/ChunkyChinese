import { useCallback, useEffect, useRef, useState } from 'react'
import type { VnAssetManifest } from './types'
import { useAnimationManager } from './useAnimationManager'
import { AnimatedStage } from './AnimatedSprite'
import { useAnimatedDomReady } from './animationHooks'
import { executeStoryAnimCommands } from './storyCommandAdapter'
import type { StoryAnimCommand, CharacterAnimationState } from './animationTypes'

const DEMO_COMMANDS: StoryAnimCommand[][] = [
  [
    { type: 'show', character: 'weed', position: 'left', expression: 'neutral', animation: 'enterLeft' },
    { type: 'show', character: 'mapan', position: 'right', expression: 'default', animation: 'enterRight', wait: false },
  ],
  [
    { type: 'expression', character: 'weed', value: 'amused', transition: 'crossfade' },
  ],
  [
    { type: 'animate', character: 'weed', animation: 'bounce' },
  ],
  [
    { type: 'animate', character: 'mapan', animation: 'shake' },
  ],
  [
    { type: 'move', character: 'weed', position: 'center' },
  ],
  [
    { type: 'animate', character: 'mapan', animation: 'nod' },
  ],
  [
    { type: 'animate', character: 'weed', animation: 'recoil' },
  ],
  [
    { type: 'animate', character: 'weed', animation: 'leanIn' },
  ],
  [
    { type: 'animate', character: 'mapan', animation: 'squash' },
  ],
  [
    { type: 'expression', character: 'weed', value: 'neutral', transition: 'crossfade' },
  ],
  [
    { type: 'hide', character: 'weed', animation: 'exitLeft' },
    { type: 'hide', character: 'mapan', animation: 'exitRight', wait: false },
  ],
]

const DEMO_LABELS = [
  'Enter both characters',
  'Crossfade expression',
  'Bounce',
  'Shake',
  'Move to center',
  'Nod',
  'Recoil',
  'Lean in',
  'Squash',
  'Reset expression',
  'Exit both',
]

export function AnimationDemo({ manifest }: { manifest: VnAssetManifest }) {
  const stageRef = useRef<HTMLDivElement>(null)
  const manager = useAnimationManager(manifest, stageRef)
  const charactersRef = useRef<Record<string, CharacterAnimationState>>({})
  useEffect(() => { charactersRef.current = manager.characters })
  const onDomReady = useAnimatedDomReady(charactersRef)
  const [step, setStep] = useState(0)
  const [isRunning, setIsRunning] = useState(false)
  const [stageAnim, setStageAnim] = useState<string | null>(null)

  const runStep = useCallback(async (index: number) => {
    if (index >= DEMO_COMMANDS.length) return
    setIsRunning(true)
    await executeStoryAnimCommands(DEMO_COMMANDS[index], { manager })
    setIsRunning(false)
    setStep(index + 1)
  }, [manager])

  const runAll = useCallback(async () => {
    setIsRunning(true)
    for (let i = 0; i < DEMO_COMMANDS.length; i++) {
      setStep(i)
      await executeStoryAnimCommands(DEMO_COMMANDS[i], { manager })
    }
    setIsRunning(false)
    setStep(DEMO_COMMANDS.length)
  }, [manager])

  const reset = useCallback(() => {
    manager.cleanup()
    setStep(0)
    setIsRunning(false)
    setStageAnim(null)
  }, [manager])

  const runStageAnim = useCallback(async (name: string) => {
    setStageAnim(name)
    await manager.animateStage(name, { duration: 500 })
    setStageAnim(null)
  }, [manager])

  return (
    <div className="animation-demo">
      <div className="animation-demo-header">
        <h2>Animation Demo</h2>
        <p>Demonstrates the visual-novel animation system.</p>
      </div>

      <div className="animation-demo-stage-wrapper">
        <AnimatedStage
          characters={manager.characters}
          manifest={manifest}
          stageRef={stageRef}
          onDomReady={onDomReady}
        />
      </div>

      <div className="animation-demo-controls">
        <div className="animation-demo-steps">
          {DEMO_LABELS.map((label, i) => (
            <button
              key={label}
              type="button"
              className={i === step ? 'active' : i < step ? 'done' : ''}
              disabled={isRunning || i > step}
              onClick={() => void runStep(i)}
            >
              {i + 1}. {label}
            </button>
          ))}
        </div>

        <div className="animation-demo-actions">
          <button type="button" disabled={isRunning} onClick={() => void runAll()}>
            Run All
          </button>
          <button type="button" onClick={reset}>Reset</button>
        </div>

        <div className="animation-demo-stage-effects">
          <strong>Stage effects:</strong>
          <button type="button" disabled={isRunning || !!stageAnim} onClick={() => void runStageAnim('screenShake')}>Screen Shake</button>
          <button type="button" disabled={isRunning || !!stageAnim} onClick={() => void runStageAnim('cameraZoom')}>Camera Zoom</button>
          <button type="button" disabled={isRunning || !!stageAnim} onClick={() => void runStageAnim('cameraReset')}>Camera Reset</button>
          <button type="button" disabled={isRunning || !!stageAnim} onClick={() => void runStageAnim('stageFade')}>Stage Fade</button>
        </div>
      </div>
    </div>
  )
}
