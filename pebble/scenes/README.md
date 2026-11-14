# Reusable scene authoring

`library.json` owns shipped IDs/names, poses, pickup contact/keyframes, timing,
cafe actor joint tracks, fry/cup contact events, and reflection timing.
`ensemble/characters.json` owns the reusable actor profiles and gesture tracks.
The generator produces `ensemble_data.h` and the shared menu catalogue as well as
original choreography. Native geometry and prop drawing remain renderer code;
`ambient_draw.h` implements the shared period/tile rules. Installed IDs 1–25 are
append-only: 1–5 Episode 11, 6–17 cast gestures, 18–25 background samples.
The standalone train demo includes the same generated header as the reader.
Runtime 1.8 extends this to all six main character rigs; use `recipeFromGesture`
and the verified profile’s actor list for future content.
Runtime 1.6 also supports [downloadable pose recipes](downloadable.md): new single-character motions and supported combinations can arrive with Refresh. Arbitrary code/assets remain unsupported.

1. Reuse an existing scene ID whenever possible. Never renumber shipped IDs.
2. For new supported downloadable motion, use inline recipes as described above.
   For compiled motion changes, edit the library, then run `npm run scenes` in `pebble/`.
   This generates C constants/choreography, the reader's scene inventory, and
   the train browser preview's embedded data. Do not edit generated sections.
3. Run `npm run check`. It rejects stale generated data, bad keys/contact times,
   changed shipped IDs, missing story anchors, unknown scenes, and route regressions.
4. Review changed motion at 200×228. The train and ensemble browser previews cover shared motion; use the combined
   reader emulator to verify every native scene and its memory budget.

Joint tracks use scalar fields such as `hand.x`, `head.y`, `angle` and `brow`.
Keys begin at zero, increase strictly, and interpolate with smoothstep. Values
hold before/after the key range. Idle motion is an optional sine offset. The
compiler emits compact hundredth-unit key tables (±327.67); extra precision or
out-of-range values fail validation. The watch does not parse this JSON or
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

Build any prepared episode with `npm run build -- <episode-id>` (for example,
`supportive-10`). `npm run check -- <episode-id>` and `npm run release -- <episode-id>`
use that same target throughout export, tests, reports and packaging. Omitting the
ID retains `supportive-11` for backward compatibility. Direct export is also
available as `node scripts/export.mjs <episode-id>`.

The source must exist at `stories/animated/<episode-id>.json`. Unsupported script
commands, missing reviewed annotations, unavailable portraits/scenes, missing
glyphs and oversized packages fail before replacing the generated story. New cast,
opening/closing art or fonts still need explicit preparation and visual review;
selecting an episode does not create assets or adapt a different series' narrator.
New native capabilities still require a PBW installation.

The selected episode gets its own source/route/layout/resource checks; the existing
Episode 11 tests remain a fixed regression suite. Save migration descriptors are
emitted only for the matching episode. Refresh uses the current episode's canonical feed; an explicitly configured phone URL still takes precedence for phone refresh. Publish each validated feed together with its catalogue entry. The [watch catalogue](../CATALOGUE.md) retains individual episode saves and completion markers, with one downloaded episode plus the bundle available offline. Installing an update preserves the current download.

## Repeatable verification

From `pebble/`, with the Pebble CLI on PATH and `PEBBLE_PYTHON` pointing to the
SDK Python environment:

| Command | Purpose |
| --- | --- |
| `npm run scenes` | Regenerate shared artifacts after editing the library |
| `npm run check -- <episode-id>` | Selected-episode export, generation drift, content, route, save, resource tests |
| `npm run test:browser` | Train interaction, native-size, replay, hold and host regressions |
| `npm run build -- <episode-id>` | Selected-episode incremental native build, compiled-font audit, hashed build report |
| `npm run test:emulator -- --install --episode <episode-id>` | Install into existing Emery, test all 25 scenes, holds, replay, ambience, saved preference, heap/frame budgets |
| `npm run release -- <episode-id>` | Selected-episode clean build, tests, font audit, browser and integrated emulator tests, immutable versioned packaging |

Development builds stay in `reader/build` (one current target); reports/screenshots/logs go to ignored
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

Build reports include the episode ID/content version, app version and hashes.
They verify the actual PBW contains the selected native story resource. Packaging
and emulator checks reject mismatched target/build evidence. Release names include
the episode: `chunky-chinese-time2-<episode-id>-v<app-version>.pbw`. Legacy release
filenames remain untouched; the unversioned alias still points to the latest release.
Release packaging refuses to overwrite a versioned PBW with different bytes;
bump `reader/package.json` deliberately for a new release. Clean font/resource
changes before development builds (`pebble clean` inside `reader`); release always
cleans. Physical-watch review is still required for actual readability/performance.

## Additional native stress checks

After the main emulator suite, use the SDK's Python environment to run
`scripts/test-emulator-transfer.py` (incomplete/bad chunks, restart, activation and
duplicate completion) and `scripts/test-emulator-focus.py` (a local emulator-only
notification interrupts an action; both clocks must freeze). These are local
protocol tests, not Android companion or physical-watch certification.

`python3 scripts/test-emulator-offline.py` deliberately restarts the emulator's
reading position and reads the default route with its simulated Bluetooth disabled,
then reinstalls to check the ending save. Run it only after tests that need the
original saved position. It never accesses phone or physical-watch saves.
Reports and screenshots remain under `.local/emulator/` until selected evidence is
copied into a release verification directory.

## Routine episode production

Use [the fast authoring workflow](../authoring/README.md) for batched asset preflight,
a searchable recipe catalogue, episode-only visual review, and guarded content-only
exports against a recorded native runtime. Native changes retain the full checks above.
