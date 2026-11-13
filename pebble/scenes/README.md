# Reusable scene authoring

`library.json` owns shipped IDs/names, poses, pickup contact/keyframes, timing,
cafe actor joint tracks, fry/cup contact events, and reflection timing.
Native geometry, settings, character styling and prop drawing remain renderer code.
The standalone train demo includes the same generated header as the reader.
This is a tested recipe library, not an arbitrary downloadable animation format.

1. Reuse an existing scene ID whenever possible. Never renumber the first five.
2. For a motion change, edit the library, then run `npm run scenes` in `pebble/`.
   This generates C constants/choreography, the reader's scene inventory, and
   the train browser preview's embedded data. Do not edit generated sections.
3. Run `npm run check`. It rejects stale generated data, bad keys/contact times,
   changed shipped IDs, missing story anchors, unknown scenes, and route regressions.
4. Review changed motion at 200×228. The browser preview currently covers the
   train phone scene; use the integrated emulator for the other four scenes.

Joint tracks use scalar fields such as `hand.x`, `head.y`, `angle` and `brow`.
Keys begin at zero, increase strictly, and interpolate with smoothstep. Values
hold before/after the key range. Idle motion is an optional sine offset. The
compiler emits constant C expressions; the watch does not parse this JSON or
allocate keyframes. Phone position follows its hand after `contact`.

## Story anchors

Add an ordinary Story 2 label at the intended boundary in both the editable
`.story` and its annotated `stories/animated/*.json` script, for example:

```
I: <reviewed story passage>
label watch_phone_notice
```

Create `direction/<episode-id>.json`:

```json
{"schema":1,"episode":"example-12","cues":[{"anchor":"watch_phone_notice","scene":"train-phone"}]}
```

Preserve the label when editing prose or inserting passages. Labels produce no
visible text; this does not require a new phone/story-format command. The watch
exporter inserts the cue at that label and fails if it is absent or duplicated.
Do not place anchors between a choice and its options. Publishing phone copies
is a separate workflow; this tooling does not modify `public/` phone releases.
An episode without a direction file has no added animation cues.

Export a future episode with `node scripts/export.mjs <episode-id>`; existing
cast, font, art and migration assumptions still require deliberate adaptation.
The build command currently targets bundled Episode 11, not automatic multi-series
release authoring. New native capabilities still require a PBW installation.

## Repeatable verification

From `pebble/`, with the Pebble CLI on PATH and `PEBBLE_PYTHON` pointing to the
SDK Python environment:

| Command | Purpose |
| --- | --- |
| `npm run scenes` | Regenerate shared artifacts after editing the library |
| `npm run check` | Fast export, generation drift, content, route, save, resource tests |
| `npm run test:browser` | Train interaction, native-size, replay, hold and host regressions |
| `npm run build` | Incremental native build, compiled-font audit, hashed build report |
| `npm run test:emulator -- --install` | Install into existing Emery, test all five scenes, holds, replay, movement, heap/frame budgets |
| `npm run release` | Clean build, tests, font audit, browser and integrated emulator tests, immutable versioned packaging |

Development builds stay in `reader/build`; reports/screenshots/logs go to ignored
`.local/`. The emulator runner uses the animation menu and leaves story progress
alone. It never deletes or resets emulator flash. Without `--install`, start at a
normal reader screen; a missing expected log/menu fails instead of claiming success.
The runner overwrites only its own `.local/emulator` evidence. Close other manual
interactions with Emery while it runs. It reports emulator evidence, not hardware
approval or Android pairing.

Freeze library/content before the final emulator pass. Review screenshots and
retain its report with the candidate PBW hash. For a fresh-install or saved-version
upgrade check, use an explicitly prepared emulator and retained old package; this
runner does not manufacture a clean profile by erasing an existing one.

Release packaging refuses to overwrite a versioned PBW with different bytes;
bump `reader/package.json` deliberately for a new release. Clean font/resource
changes before development builds (`pebble clean` inside `reader`); release always
cleans. Physical-watch review is still required for actual readability/performance.
