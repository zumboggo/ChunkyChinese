# Alden Scene Lab

Local combined visual-novel prototype for Pebble Emery. Nothing is pushed or installed on a physical watch. Production reader sources are unchanged by this prototype.

Open `preview/index.html` for three performances: a reaction, eating a fry, and checking a phone. Foreground performances finish after four seconds; the ceiling fan and bouncing screensaver continue independently. The GIF loops for comparison. The interactive preview supports original artwork colours and the watch's reduced palette.

The approved Alden sincere face layers are reused without redrawing. Only the body receives a silhouette mask to remove its white backdrop. An extended hoodie torso, forearm, hand, props and room are drawn with small primitives. No movement below the waist. Timelines and gesture geometry are reusable; clothing/skin palettes and attachment points would still need fitting for each character.

## Watch controls

- Up: next performance.
- Select: replay.
- Down: cycle background motion (both, off, fan, screen).
- Hold Select: toggle labels.
- Back: exit.

Timers pause on focus loss and resume from the same action and ambient clocks.

## Measured costs

| Measurement | Bytes |
|---|---:|
| Character resource including mask | 2,589 |
| Added body mask | 168 |
| Flash read cache | 512 |
| Gesture timelines (24 keys) | 192 |
| Standalone resource package | 6,697 |
| Standalone compiled RAM footprint (code + static data) | 5,932 |
| Minimum observed standalone free heap | 124,908 |

The 512-byte cache is not the total RAM requirement. The decoder also has small stack buffers; framework allocations and stack are additional. No decoded animation frame buffer or full-frame sprite sequence is stored by the renderer. Maximum observed emulator draw time was 43 ms against an 83 ms foreground timer interval. These are Emery emulator measurements, not physical-watch battery or performance results.

Browser and emulator verification passed for all three performances, finite holds, replay and background settings. A notification interruption test verified that both clocks pause and playback completes after resume. Reports and screenshots are in `verification/`.

## Reader integration result

A private snapshot of the current full reader was tested, without editing the active reader. The unchanged baseline booted and reported 4,892 bytes free during a held reaction. Adding this renderer separately increased compiled RAM footprint from 28,676 to 33,864 bytes (5,188 extra); resource package grew from 130,825 to 133,587 bytes. The combined reader failed during startup with `fxMapArchive failed (in ArchivePebbleResource)` and `fxAbort unhandled exception`.

Consequently this standalone demo is usable, but the additive full-reader integration is not. The next implementation should share or replace existing scene/portrait rendering code and retest startup and peak heap, rather than ship a second renderer. Baseline held heap and startup allocations are different measurements, so these figures do not establish an exact byte shortfall. Reader source hashes are recorded in `verification/reader-source.json`.

## Reproduction

Run `python3 prepare.py`, `python3 generate.py`, `python3 preview.py`, then `./cli.sh build`. The CLI uses a separate emulator store under `.local/emulator`. `verify.py`, `verify_focus.py` and `preview.test.mjs` perform local checks. `stage_reader.py` creates private baseline and modified reader snapshots under `.local/`; `compile-reader.mjs` builds the modified JS bundle. The failed reader experiment is deliberately not offered as an installer.

`alden-scene-lab-v1.0.0.pbw` matches the tested standalone build; its SHA-256 is recorded in `verification/report.json`.
