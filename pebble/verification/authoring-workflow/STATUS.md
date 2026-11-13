# Shared scene authoring verification — 2026-11-13

The reader, standalone train demo and browser train preview now consume generated
pose/timing data from `scenes/library.json`. Cafe joint tracks and prop event times
are generated into native C; geometry remains renderer code. Only the train has a
browser preview today. New recipe kinds still need native renderer support.

Episode 11's five cue locations now use persistent Story 2 labels and a separate
watch direction file. Source prose and reviewed annotations were not changed.
The exported 88-node package, all 16 routes and content version `73281f5e8202`
remain identical to the shipped episode. Phone public files and release PBWs
were not changed. The code is a development candidate, not a new watch release.

Verified:

- 50 Node tests, including missing/duplicate anchors, invalid scenes/keyframes,
  generated-file drift, prose edits and insertion before an anchor, route fidelity,
  save migration, transfer validation, font layout and streamed resources.
- Chromium train test: click and Enter, indefinite wait, held/repeated key guard,
  final-pose freeze, boundary click guard, replay, native-size toggle, narrow layout,
  hidden embedded host and echoed saved state.
- Reader and standalone Emery compilation. Compiled font audit: zero missing glyphs.
- Integrated reader: all five scenes move, hold and replay; Select returns to the
  animation menu. Phone waits without advancing before Select. Captured native-size
  train and cafe images show recognizable figures and phone/fry contact.
- Immutable release guard rejects a different PBW under the existing v1.2.0 filename.

Reader resource storage: 231,358 bytes, unchanged. Native RAM footprint: 17,416 bytes
(+684). The SDK's 113,656-byte initial heap is before loading the JS runtime; it is
not spare runtime memory. Scene-start logs showed 3,840 bytes free and held-scene
logs showed 4,036 bytes free. Keep measuring the integrated app when extending it.

The maintained emulator harness uses the existing emulator without erasing flash
or resetting reading progress. An initial repeat run exposed a timing-sensitive
menu-return check; the harness now gives the fresh-press guard extra headroom and
polls for the expected menu without sending extra Select presses. The final
machine-readable run report is stored alongside this note; working screenshots
and logs are under ignored `.local/emulator/`.

Not verified here: physical Time 2 playback, Android pairing/installation, focus
loss/resume, a fresh-flash install or old-PBW emulator upgrade. Existing unit tests
cover save migration, and the current emulator installation retained its saved
reading node. The release command is documented and its component checks were run;
no new version was packaged or published.
