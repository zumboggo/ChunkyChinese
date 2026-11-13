# Episode-selected builds — 2026-11-14

Verified the workflow in an isolated snapshot based on `cc74b9df`, with the episode
build changes applied. Isolation avoids concurrent native-library edits and shared
emulator use. This report does not certify the separate expanded native renderer.

- `npm run build -- supportive-10`: 56 tests at build time, compiled fonts valid,
  native PBW built with Episode 10 (`45498c4ba9d7`, 56 nodes).
- `npm run build -- supportive-11`: 56 tests at build time, compiled fonts valid,
  native PBW built with unchanged Episode 11 (`73281f5e8202`, 88 nodes).
- Final `npm run check -- supportive-11`: **57 tests passed**, including the new
  isolated build-command regression. That regression also runs the complete suite
  for Episodes 10 and 11, tests the no-ID Episode 11 default, and verifies malformed,
  missing and extra arguments do not replace the previous generated bundle.
- Selected-episode tests enumerate the actual source and exported branch graphs,
  compare all dialogue/choices/rejoins/cues, validate layouts and installed assets,
  and compare generated native records/index and phone data with the selected pack.
- Refresh URL test uses the selected bundle ID. Old Episode 11 save mappings are
  not emitted for Episode 10. Original Episode 11 save regressions still pass.
- PBW inspection verifies the complete selected story resource inside the archive
  and the app version. Exporting 11 after building 10 makes report generation,
  packaging and emulator preflight reject stale evidence before emulator contact.
- Packaging in the disposable snapshot produces separate episode-qualified PBWs;
  both coexist, while the original v1.2.0 release retains its SHA-256. A mismatched
  report is rejected. These test packages were not published or installed.

No animation or browser rendering changes in this task. No new emulator or physical
watch playback was run; the emulator CLI's episode/preflight checks were exercised
without contacting the shared emulator. Full release mode retains its browser and
emulator gates. Existing downloaded watch content can remain active; selecting a
bundle is not a multi-episode save-library feature.

Future episodes still need compatible scripts, reviewed annotations, fonts and
character artwork. Episode 12/13 inspection found missing portraits; the new
export preflight reports those instead of claiming they are ready for installation.
