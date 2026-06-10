# Visual Novel Animation System

Lightweight, reusable character and stage animations for the visual novel engine.

## File layout

| File | Purpose |
|------|---------|
| `src/visualNovel/animationTypes.ts` | All animation types, position constants, speed presets |
| `src/visualNovel/animationRegistry.ts` | Named animation keyframes and option factories |
| `src/visualNovel/expressionResolver.ts` | Resolves sprite IDs for expressions, blink, talk |
| `src/visualNovel/useAnimationManager.ts` | React hook: manages character state, idle, blink, talk |
| `src/visualNovel/AnimatedSprite.tsx` | Animated sprite and stage components |
| `src/visualNovel/storyCommandAdapter.ts` | Executes declarative story commands |
| `src/visualNovel/AnimationDemo.tsx` | Development demo scene |
| `src/visualNovel/animationRegistry.test.ts` | Animation registry tests |
| `src/visualNovel/storyCommandAdapter.test.ts` | Story command adapter tests |

## Stage positions

Defined centrally in `animationTypes.ts`:

```ts
export const STAGE_POSITION_PERCENT: Record<StagePosition, number> = {
  farLeft: 8,
  left: 20,
  center: 50,
  right: 80,
  farRight: 92,
}
```

## Adding a new animation

1. Add the name to `CHARACTER_ANIMATION_NAMES` in `animationTypes.ts`.
2. Add an entry to `characterAnimations` in `animationRegistry.ts`:

```ts
wave: {
  keyframes: [
    { transform: 'rotate(0deg)' },
    { transform: 'rotate(15deg)', offset: 0.25 },
    { transform: 'rotate(-10deg)', offset: 0.5 },
    { transform: 'rotate(0deg)' },
  ],
  getOptions: (o) => ({
    duration: effectiveDuration(o.duration ?? 600, o.speedMode),
    easing: 'ease-in-out',
    fill: 'forwards',
  }),
},
```

3. Optionally add CSS `@keyframes` in `index.css` for CSS-only usage.

## Animating from story data

Add `animCommands` to a `line` node in the script JSON:

```json
{
  "id": "line-42",
  "type": "line",
  "speaker": { "characterId": "weed" },
  "text": { "chinese": "我绝对不害怕。" },
  "animCommands": [
    { "type": "expression", "character": "weed", "value": "terrified", "transition": "crossfade" },
    { "type": "animate", "character": "weed", "animation": "shake", "duration": 350, "wait": true }
  ]
}
```

In the component, process commands after the node loads:

```ts
import { executeStoryAnimCommands } from './storyCommandAdapter'

await executeStoryAnimCommands(node.animCommands ?? [], { manager })
```

## Expression assets

Expected naming pattern in the asset manifest:

```
assets/characters/{characterId}/{expressionId}.webp
```

Examples:
- `weed-sculptor-neutral.webp`
- `weed-sculptor-amused.webp`
- `weed-sculptor-annoyed.webp`

The resolver searches the manifest by `characterId` + `expressionId`. If not found, falls back to `neutral`.

## Blink assets

Optional closed-eye sprites:

```
{baseExpression}-blink.webp   or   {baseExpression}-closed.webp
```

If neither exists, blinking is silently skipped.

## Talk assets

Optional mouth-open sprites:

```
{baseExpression}-talk.webp   or   {baseExpression}-open.webp   or   {baseExpression}-talking.webp
```

If none exist, talk animation is silently skipped.

## Reduced motion

When `prefers-reduced-motion: reduce` is active or `setReducedMotion(true)` is called:

- Looping animations (idle, blink) are disabled
- Reaction animations run with duration 0 (instant)
- Entrance/exit animations become instant

## Speed modes

```ts
manager.setSpeedMode('normal')   // 1x speed
manager.setSpeedMode('fast')     // 0.3x speed
manager.setSpeedMode('instant')  // 0ms duration
```

## Allowed animation names

### Character animations

```
enterLeft, enterRight, exitLeft, exitRight,
fadeIn, fadeOut,
moveFarLeft, moveLeft, moveCenter, moveRight, moveFarRight,
bounce, shake, nod, recoil, leanIn, squash,
idle, blink, talk
```

### Stage animations

```
screenShake, cameraZoom, cameraReset, stageFade, backgroundPan
```

## Example scene command sequence

```json
[
  { "type": "show", "character": "weed", "position": "left", "expression": "neutral", "animation": "enterLeft" },
  { "type": "show", "character": "mapan", "position": "right", "expression": "default", "animation": "enterRight", "wait": false },
  { "type": "animate", "character": "weed", "animation": "bounce", "duration": 350 },
  { "type": "expression", "character": "weed", "value": "amused", "transition": "crossfade" },
  { "type": "dialogue", "speaker": "weed", "text": "你好！", "expression": "happy", "animation": "nod" },
  { "type": "hide", "character": "weed", "animation": "exitLeft" },
  { "type": "hide", "character": "mapan", "animation": "exitRight", "wait": false }
]
```

## Transform composition

Characters use nested DOM layers to prevent transform conflicts:

```
.vn-sprite-anim-root          ← position (CSS left, transition)
  .vn-position-layer           ← positioning wrapper
    .vn-anim-layer             ← reaction animations (Web Animations API)
      .vn-sprite-inner         ← flip (scaleX) and dimming
        img                    ← the sprite image
```

Idle breathing runs on `.vn-anim-layer`, reaction animations also target `.vn-anim-layer`, and position changes animate the outer `.vn-sprite-anim-root` via CSS transitions.

## Launching the demo

The `AnimationDemo` component can be rendered anywhere with an asset manifest:

```tsx
import { AnimationDemo } from './visualNovel/AnimationDemo'

<AnimationDemo manifest={manifest} />
```

It steps through entrances, expression changes, reactions, movement, and exits using existing sprite assets.
