# Visual-novel renderer — v1.12.0

The approved pixel-character/upper-torso system replaces the old full-body native episode renderer. Stable scene IDs and episode direction anchors remain; every existing cue now uses the new renderer. Full-screen emotional reactions retain their approved artwork. Phone releases, source prose, choices and saves are unchanged.

The authoring catalogue and episode review now use this style. Shared performances and actor bindings live in `scenes/visual-novel.json`; new fixed combinations can append a `visualNovel: true` catalogue entry without repurposing an existing ID. The production skill records David’s choice: at least five source-supported placements per route, reusing these actions; no movement below the waist.

## Memory and storage

- Native code/static RAM: **17,390 bytes**, versus **28,744** in the preserved v1.11 reaction release: **11,354 bytes saved**.
- Resource package: **136,122 bytes**, unchanged from v1.11. Characters and reactions share the existing 29,256-byte art/timing resource and 512-byte cache. No second sprite resource or decoded animation frame buffer.
- Minimum measured held-scene/download heap: **16,004 bytes**. This is runtime free heap; the cache figure is not the total application RAM requirement.
- Foreground draw averages: **20–61 ms**, maximum observed **173 ms**. Target timer cadence is about 12 fps, falling to 6 fps for held ambience. Emulator scheduling spikes can exceed the 83 ms frame target; they are retained in the report. The suite requires a sustainable average and bounds stalls at 250 ms. These are emulator observations, not hardware/battery certification.

## Verification

- All **30** catalogue scenes: action/hold, replay, independent ambience, saved motion preference and reading position across reinstall.
- **26** actual recipe downloads; all six characters and their four gestures; same-ID updates, invalid/interrupted download recovery, notification focus pause/resume, offline playback and restoration of the normal episode. Zero transport retries in the final recipe pass.
- Full episode transfer: incomplete/bad chunks rejected, interrupted restart preserves position, duplicate completion is idempotent, opening/closing overlays update. Zero transport retries in the final transfer pass.
- **93** fast content/route/layout/save/transfer tests; **69** approved parts/poses preserved pixel-for-pixel on white; **180** exact native/browser raster comparisons; authoring interaction, pause/replay, search, cue-plan download and narrow-layout checks.
- Optional home rain and cat details are retained alongside fan/screensaver room decoration.

Final installer SHA-256: `e4ffd4bf2feb6fbec7265ebf370acedb1283e6c831e234b55b1366c5699865f9`. Size: **233,711 bytes**. All build, scene, transfer and downloadable reports match this artifact. Earlier prototype/timing attempts are not substituted for this final verification.

The v1.11 reaction installer remains intact. This is a new local v1.12 installer with the same app UUID, so existing watch progress can be retained. Install it once; Refresh cannot replace native code. Physical-watch installation/testing and remote publishing: **not performed**.
