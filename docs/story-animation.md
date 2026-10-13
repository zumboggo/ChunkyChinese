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
