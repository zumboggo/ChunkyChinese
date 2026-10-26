# Native Story 2 episodes

The Game tab now uses native React Story 2 playback and authoring. Twine/SugarCube, its iframe protocol, three Chengdu episodes, generated HTML, portrait art/audio, old game reward model and compiler are removed at David's request. Other app features and vocabulary data are unchanged. Old localStorage data is not interpreted as Story 2 progress or erased; new data lives in an identity-scoped IndexedDB database, `ChunkyChineseStory2`.

## Shared source

`src/game/animation/shared/` contains the actual Learning is Fun parser, character schema/builder, rigs, acting vocabulary/controller, coordinated action choreography, stage/camera renderer, CSS, and studio tools. `manifest.json` records upstream paths, revision and hashes. Only import paths are rewritten. `StoryPlayer.tsx` is the explicit host adapter to the Chinese playback shell.

Run `npm run game:sync -- --source=/absolute/path/to/LearningIsFun/implementation` after upstream improvements, then `npm run game:parity -- --source=...` and tests. No network or sibling checkout is needed to build or deploy this app. Do not hand-edit vendored shared files; update the source and re-sync. Chinese differences belong in the host layer, not alternate emotion names or choreography. Shared source should eventually be extracted into a versioned package if both repositories evolve independently.

## Packages and authoring

Game → Create episode provides the same choices/callbacks builder, reachable-state side-by-side previews, scene beat presets, Wide/Conversation shots, acting/action libraries and character recipe builder. Reusable cast includes the approved hybrid Learning is Fun packs and two original polished SVG fantasy characters. The demo is a rehearsal, not a full language lesson. No new illustrated head artwork was generated.

One package consists of `episode.story`, `episode.json`, and embedded/exported assets, with Story 2 commands and format 2. Stable choice IDs, four bounded variables, reconverging branches, explicit action outcomes and resume semantics come from the shared engine. Chinese packages may omit the classroom quiz using `quiz: []`; imported four-question quizzes retain the existing score/retry behavior. Publishing creates a fixed local library version keyed by content SHA-256; editing creates a draft, never rewriting a published package. ZIPs provide portable backup/sharing. This is personal local publication, not the school backend or cloud synchronization.

The additional metadata is:

```json
{"chinese":{"lines":{"别怕。":{"pinyin":"bié pà 。","english":"Don't be afraid.","audio":"data:audio/mp4;base64,..."}}}}
```

Keys match exact spoken dialogue or choice text. Moving lines cannot mismatch audio; changing text needs fresh metadata/audio. Pinyin defaults on and meaning is optional. NPC mouth motion follows real audio start/pause/end; choice audio does not animate the speaker. Reduced motion preserves text and decisions. Missing audio leaves text playable. No live AI dialogue or classroom assignments are added.

Source packages live in `stories/animated`; `npm run game:audio -- --episode=gate-in-the-mist` generates pinyin and cached Tingting speech at 165 wpm with macOS `say` + `afconvert` (AAC, 32 kbps). Audio cache keys include text/voice/encoding. `npm run game:build` regenerates pinyin and public packages without TTS; `npm run game:check` checks source/output equality, shared parser/rig validation, embedded assets, 5 MB total decoded package budget and included Mandarin audio. The studio can upload clips and edit pinyin/meanings; generating speech is an authoring command, not a browser service.

## Checks

`npm test`, `npm run game:parity`, `GITHUB_PAGES=true npm run build`, and `npx playwright test tests/game.spec.ts` cover the shared renderer integration, callbacks/replay, action outcomes, ZIP round trip, unsafe asset rejection, actual Mandarin playback, native (no iframe) UI, phone/desktop, local version immutability and resume. The app-shell budget remains in place. Published/imported packages embed all scene media and are stored locally for reopening; the service worker handles the app shell.
# Interlinear Chinese presentation

Chinese line metadata can include `interlinear: [{chinese, pinyin, gloss}]`, using Reader's `ReaderInterlinearChunk` type. Concatenated Chinese must exactly reproduce the dialogue/option key. Use natural short phrases and contextual English glosses. `EpisodeInterlinear` uses Reader's three-row styling; choices contain non-interactive chunk spans inside one bordered button, with audio outside. Pinyin and chunk-meaning toggles are independent, while full-sentence English remains optional. Missing chunks retain the legacy sentence layout.

`game:audio` and `game:build` fill missing pinyin, preserving reviewed pronunciations. Changed wording creates a new exact-text entry; replace stale chunk metadata rather than attaching it to new text. Validation rejects incomplete or mismatched chunks; ZIP exports preserve them.

Moonlight 01's active catalog release is `moonlight-01-v2.json`. Its script, assets and audio are unchanged from v1. The catalog's optional `resumeFrom` can carry device/account-scoped progress forward only when the previous cached package's script matches exactly. A restart always starts fresh; new-version progress takes precedence. Original packages and old attempts remain intact.

## Faster episode authoring

Use [the reusable episode workflow](episode-authoring.md) for the pinned series source, series-selected assumed-familiar supplement, vocabulary-first `.story` audit and bounded VPN publishing helper. These authoring tools do not change the shared animation runtime or flashcard state.

## Continuous acting and attention (2026-10-15)

The shared player now runs finite reactions alongside dialogue. Use `perform Hyun sword-strike Dummy repeat 3 tiring` before a Mandarin line for bounded repeated training; Continue cancels the sequence. `express Hyun embarrassed` retains props, pose and facing. `look Hyun Instructor`, `look Hyun down`, `away`, `front` and `auto` direct attention. Polished/hybrid eyes follow the target; emotional gestures no longer restart on unrelated narration. Dummy characters can declare `impact: "anchored"` for base-pivot sway. Reduced motion skips transient sequences; resume restores the held state.

Episode 8 v2 demonstrates these changes with unchanged Mandarin/audio and a separate saved-progress identity. Original v1 is retained. Shared implementation and detailed authoring guidance live in Learning is Fun (`docs/scene-continuity.md`); synchronize with `game:sync` and verify `game:parity`.

## Responsive shots and optional atmosphere (2026-10-15)

Episode 8 v3 adds fitted two-person and sword-training shots, eased listener close-ups, subtle dust, hall ambience and timed sword impacts. Mandarin, annotations, choices and recorded audio are unchanged; v1/v2 remain available and v3 has separate progress.

Shared camera commands include `camera listener Hyun over 0.65`, `camera speaker over 0.4`, `camera two Hyun Instructor cut`, and `camera action Hyun Dummy cut`. Scene commands include `ambience hall`, `environment dust`, and `sound chime`; use `none` to clear ambience/environment. See upstream `docs/scene-continuity.md` for full syntax.

Sound & atmosphere starts off. Readers can enable ambience, effects and captions independently and adjust their volumes and Mandarin voice volume. Sound ducks under voice and stops on leaving or completing an episode. Reduced motion removes particles and transient action animation. Sound effects are locally synthesized, with no new audio downloads.

## Sustained activities

The shared player supports optional articulated walking, mirrored scrolling landscapes and ongoing sword practice with recovery. See [scene activities](scene-activities.md) for syntax, staging, interruptions and selective-use guidance. Existing episodes keep their authored staging.

## Reader navigation

The episode player handles Left Arrow to return one displayed story beat and Right Arrow to continue. Returning rebuilds the scene from the saved route with its original seed, removes the latest step, and saves the earlier position. Returning across a choice lets the reader choose a different route. Left Arrow at the first beat does nothing; typing, settings and open player panels keep their own keyboard controls. This behavior belongs to the player, so existing and future episode packages need no special script commands.

## Shared angles and conversational performances (2026-10-27)

Synced upstream orientation state (`orient Actor auto|front|three-quarter|profile`), reusable vector angle geometry, optional embedded hybrid view artwork with facial anchors, and twelve finite gesture-specific timing profiles. Existing package bytes remain intact. Props, held poses and contact activities keep their stable geometry. The approved Weed Option A and young Kvothe overlays preserve their custom faces until matching angle assets are supplied; they still use the improved shared performances. Upstream `docs/character-angles.md` documents the recipe contract and comparison rehearsal. Add shared files through the sync list, never edit vendored files directly.
