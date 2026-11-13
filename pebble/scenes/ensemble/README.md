# Ensemble and ambience prototype

Reusable browser reference library for Gorgon, Boe and Jeremy, beside the shipped
native scene catalogue. It does not change installed scene IDs, PBWs, story cues,
phone content or saves. These designs are proposed for review, not approved native
capabilities. Character identity comes from the source/cast references named in
`characters.json`; no generated images or video were used.

- `characters.json`: separate actor profiles and four reusable joint tracks.
- `renderer.js`: pure deterministic `PebbleEnsemble.render(ctx, data, options)`;
  options are actor/action/setting, actionMs, ambientMs and ambience. Coordinates
  target 200×228; action keys hold at their final value. Props follow the hand.
- `../../preview/ensemble.template.html`: preview controls and independent clocks.
- `../../scripts/generate-ensemble-preview.mjs`: embeds the above in a self-contained
  preview. Run with `--check` to detect drift.

From the app root:

```
node pebble/scripts/generate-ensemble-preview.mjs
node pebble/preview/ensemble.test.mjs
```

The generated `pebble/preview/ensemble.html` opens offline. Preview all three actors
with Listen, Offer, Think or Sip, in six settings. Background movement and Pause
are separate controls. Gestures last 4.8 seconds and then hold; ambience can keep
looping. Enlarge changes CSS display size, not canvas resolution. Reduced motion
starts paused with background movement disabled; Replay deliberately starts a gesture.
Saved host preferences do not reset animation time when echoed back.

Gorgon uses a separate head/collar design, long fingers and anchored golden bonds;
he has no human blink or eye-roll cycle. This is an acting catalogue: choosing a
setting does not assert that the character canonically belongs there. His train
preview, for example, is a background comparison, not an episode scene.

Ambient choices are demonstrations, not automatically applied story events:
consulate passersby/cat, train parallax, rain outside cafe/home/classroom windows,
and low-key trading-room activity lights. Do not add rain to a source-established
snowy or dry scene, add visitors to a private empty-lobby conversation, or show
Victor present before his arrival. The basement trading room has no invented
exterior window. Cat movement is a small silhouette prototype, not a complete
Victor acting library.

The train repeats a 180px world tile with far scenery moving one tile and foreground
poles three tiles per 12 seconds. Both layers wrap offscreen and meet exactly at
the common period. Rain uses fixed x coordinates and six vertical cycles per
period; pedestrians/cats enter and exit outside the viewport. No frame sequences
are stored. The browser rasterizer is antialiased and is not exact Pebble hardware
rasterization. Palette channels use Pebble's four-level RGB colours.

Before native integration, adapt renderer operations to native primitives and
measure the *combined* reader's heap, resource size, draw time and battery impact.
Use a lower independent background cadence if necessary. Keep ambience on image/
scene screens; do not animate behind ordinary interlinear reading by default.
Stop all native timers on scene exit/app focus loss. A user can freeze ambience;
foreground final poses and manual story progression remain unchanged. Native
renderer additions require a new PBW, not content Refresh alone.

Tests cover all 24 action/setting combinations across three actors, changes over
 time, held poses with ambience disabled, replay, pause, hidden embedded-host
behaviour, echoed preferences, narrow layout and exact train-loop continuity.
Screenshots go to ignored `preview/verification/`. This is browser evidence only.
