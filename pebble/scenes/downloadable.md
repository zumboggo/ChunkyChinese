# Downloadable animation recipes (runtime 1.6+)

Install a verified 1.6 PBW once. After that, an episode JSON can contain new pose
sequences and combinations of installed ensemble characters, settings and ambience.
Refresh transfers these records with the story; validation and atomic activation
cover both. The whole episode, including its motion, plays offline. No executable
code or bitmap frames are downloaded.

## Authoring

Use an existing stable story label and a `download-` scene ID in the episode's
normal direction file. Inline `recipe` data is shared by the watch exporter and
the browser episode review. IDs must not collide with compiled scene IDs.

```json
{
  "schema": 1,
  "episode": "example-17",
  "cues": [{
    "anchor": "watch_quiet_response",
    "scene": "download-boe-pauses",
    "recipe": {
      "actor": "boe",
      "setting": "train",
      "ambient": "train",
      "prop": "none",
      "keys": [
        [0, 0, 0, 0, 0],
        [1100, 3, 0, 0, 80],
        [2100, 3, 0, 0, 80],
        [3400, 0, 0, 0, 0]
      ]
    }
  }]
}
```

Each key is `[milliseconds, headYOffset, handXOffset, handYOffset, headAngleMilliradians]`.
Coordinates use native 200×228 pixels. The encoder accepts 2–8 keys, starting at
zero, with strictly increasing times and a final duration of 800–12000 ms. Values
are integers. Current ranges: head Y ±8; hand X −30…24; hand Y −42…8; angle ±300.
The validator additionally checks the complete interpolated arm path for reach
and elbow singularities, so a value inside those ranges may still be rejected.
Keep the proven identity and hand-contact geometry; source-faithful acting matters
more than exhausting the range. Smoothstep interpolation and the final held pose
are provided by the reader.

Supported actors: `gorgon`, `boe`, `jeremy`. Props: `none`, `cup`. These are
single-character recipes controlling the head and right arm. They do not add
walking, new facial channels, two-person transfers or arbitrary body rigs.
Original Alden/Hannah/young Alden scenes remain available by their compiled IDs.

| Setting | Available ambience |
| --- | --- |
| `train` | `train`, `none` |
| `cafe`, `consulate`, `home`, `classroom` | `walkers`, `foliage`, `rain`, `cat`, `none` |
| `trading` | `light`, `none` |
| `street` | `none` (the existing static street composition) |

Choose only combinations that fit the source: no automatic Gorgon eye contact,
no cat before its established presence, no rain by default, and no invented
trading-table contact. A browser catalogue combination is not evidence of story fit.
Background motion remains an independent clock with a persistent On/Off setting;
action completion never advances the text. Down replays and Select acknowledges
an action only after its hold guard.

Run `npm run review -- <id>` and `npm run preflight -- <id>`. After recording a
verified recipe-capable runtime, `npm run content -- <id>` accepts these new IDs
without modifying the native catalogue. It still rejects actual runtime drift.
Review changed poses at 200×228; the cue-plan download preserves the inline recipe.
The exporter encodes it into a bounded `recipe` string on its animation node;
this changes the episode version when pose data changes. Do not edit wire strings
by hand. Existing old clients reject unknown `download-` IDs instead of silently
ignoring new motion.

## Boundaries and verification

New drawing primitives, rigs/characters, unsupported actions or props, fonts,
bundled illustrations and reader behaviour still require a PBW. A new sequence
using the supported channels or a supported setting/ambience combination does not.
No change is made to phone releases or phone reading positions.

`scripts/downloadable-scene.mjs` and native `downloadable_scene.h` define schema 1.
The native boundary accepts bounded integers because the current firmware's string
handle FFI failed in emulator testing. The watch checks the recipe again before
activation and playback; native validation does not mutate a currently held scene.
The compact data shares the existing staged-transfer integrity checks and node-size
limits. No separate asset download can leave an episode half installed.

- `node --test tests/downloadable-scene.test.mjs`: source export, old-runtime
  rejection and matching native/authoring acceptance across malformed/reach cases.
- `node authoring/downloadable.test.mjs`: actual browser preview and lossless plan export.
- SDK Python `scripts/test-downloadable-scenes.py --cli <isolated-cli> --emulator-info <emulators.json>`:
  new recipes transferred without rebuilding, repeated playback, held frames,
  invalid-package rejection, interrupted-update restart and offline playback.
  This deliberately replaces the dedicated emulator's content; never target a
  shared emulator being used by another task.

Keep `downloadable-report.json` with the matching build/emulator evidence when
recording the runtime profile. Only matching evidence enables `recipeSchema: 1`
for guarded content exports. Report browser, emulator and physical-watch evidence
separately; physical readability and battery use need a real watch.
