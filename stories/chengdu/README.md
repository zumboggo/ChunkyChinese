# A living Chengdu neighbourhood

**Become a familiar face** is an ongoing, platonic neighbourhood adventure. David
plays an English teacher learning Chinese. People and places are fictional.
All episodes stay selectable. No timers, lives, music, grades, live AI dialogue,
or flashcard/FSRS changes. Mandarin uses synthetic macOS Tingting speech at
165 words/minute, compressed to mono AAC at 32 kbps.

## Add an episode

Author `episodes/<stable-id>.json`; the build discovers every file. Shared cast,
portrait atlas metadata, locations, facts, bonus conversations, milestones and
the initial Belonging collection live in `world.json`. A new episode does not
require editing React navigation, the player or a portrait index.

```
npm run game:new -- buying-fruit --title "Buying fruit" --character lin --location courtyard
FFMPEG=/absolute/path/to/ffmpeg npm run game:audio -- --episode buying-fruit
TWEEGO=/absolute/path/to/tweego npm run game:build -- --episode buying-fruit
npm run game:check
```

The scaffold creates a valid starter lesson, unique story IFID, ID/version,
library entry/order and milestone. Replace its sample dialogue with the requested
topic before delivery. It never overwrites an existing episode. Registered
characters/locations can be selected with flags. Add new people or places to the
shared world metadata and artwork; no custom player code is needed.

Each episode has three multiple-choice exchanges (one correct Chinese reply and
two contextual distractors), exactly one listening-only prompt among them, then a
5–7 chunk builder with 1–2 unused distractors. Both authored simple/rich variants
are required; current introductory episodes use identical variants. All paths
lead through those four exchanges to an ending. English transitions and short
goal clues scaffold the conversation without giving away listening answers.
Pinyin and clues default on, with identity-local preferences. Stronger hints,
meanings, transcript support and worked answers remain available. Shuffle order
is stable within an attempt and varies on replay. Identical chunk occurrences
are interchangeable; natural alternative sequences must be explicitly authored.

`promptMode: "listen"` hides transcript, pinyin and meaning until success or
requested support. The host enables replies after actual prompt playback ends.
Replay alone is free; transcripts count as support. Missing audio opens supported
text play. Browser permission errors offer retry or transcript.

Content fields include stable `id`, `ifid`, content `version`, `order`, `location`,
`mapLabel`, relationship `participants`, `milestone`, `vocabularyRefs`, story text,
and `scenes`. Vocabulary references document practice targets; actual coverage
uses the app's tokenizer and recognition categories at launch. Prompts, replies,
distractors, reactions and optional content are counted; required answers are
checked separately. Aim for 95% known occurrences and at most three new focus
words, otherwise show an honest unfamiliar-word preview and supported version.

A scene's `learnFacts` references facts naturally stated in its reaction.
`memoryCheck` references an encountered fact and supplies stable event ID,
speaker, question, factual options, repair, and unknown-fact introduction. See
`teahouse.json` for an example. A free **People I know** notebook records details.
Facts known when an attempt starts determine memory-test eligibility throughout
that attempt. A previously unknown fact is introduced without penalty.
Shared `bonuses` specify character, friendship threshold, title, narration and
Chinese line. They are optional, unscored ending scenes, outside the four lessons.

## Rewards and saves

React owns transitions, vocabulary, audio and progression. Twine presents content
and requests actions through a source/origin/channel/revision-validated bridge.
Its audio requests must match the current episode resource allowlist. It cannot
award itself points or assert listening completion. No credentials enter Twine.

- **Language XP:** 4 per independent exchange, 2 after errors or explicit support,
  capped at 16 per episode. Default pinyin, goal clues and replay cost nothing.
  Replays improve only the prior episode best. XP is practice, not mastery.
- **Friendship:** first completion gives +2 to each declared participant once.
  Levels are New acquaintance 0, Familiar 2, Friendly 4, Trusted 8. Memory checks
  give +1 for remembering or −1 for forgetting, once per stable event. An immediate
  repair restores the actual lost point, including correctly handling a zero floor.
  Grammar errors, ordinary comprehension mistakes and help never lower friendship.
  Friendly unlocks stay permanent after setbacks. Keep event IDs stable across
  versions; never reuse an old ID for a different memory event.
- **Belonging:** named completion milestones; the first three earn Familiar face.
  Future episodes add achievements without ending the journey.

`src/game/journal.ts` writes an attempt and its effects atomically to
`chunky-game:journal:1:<encoded identity>`. It contains current/first/latest
attempts, best XP, friendships, encountered facts, milestones, unlocked bonuses
and processed reward IDs. Web Locks and revision comparison prevent stale tabs
from overwriting newer progress. The App remounts Game on identity changes and
stops audio. Progress is device-local; browser data removal clears it. Cloud sync
and existing backup exports do not include it.

Legacy v1/v2/v3 completions migrate once: milestones, one-time participant rewards
and normalized XP capped at 16 (seven-exchange results are scaled). Migration does
not invent encountered facts. Old incomplete attempts remain untouched; updated
lessons start fresh with an explanation. Released assets and earlier sources stay
in place. Bump content versions for incompatible changes; retain immutable paths.

Portraits bob 2px, moving slightly more during that NPC's actual audio. Response
previews never animate the NPC; pause/end/error/interruption/navigation stop
speaking motion. Scene and bonus changes fade for 200ms with input protection
and focus restoration. Tile taps and settings do not fade. Motion has a saved
setting; system reduced motion overrides it. Mouth-frame animation is deferred.

## Build and assets

Use **Tweego 2.1.1** and vendored **SugarCube 2.37.3** (`vendor/twine/`, license
included). Tweego releases: https://github.com/tmedwards/tweego/releases/tag/v2.1.1

```
FFMPEG=/absolute/path/to/ffmpeg npm run game:audio
TWEEGO=/absolute/path/to/tweego npm run game:build
npm test
GITHUB_PAGES=true npm run build
GAME_PRODUCTION_TEST=1 PLAYWRIGHT_BASE_URL=http://127.0.0.1:4173/ChunkyChinese/ npx playwright test tests/game.spec.ts
```

Audio generation hashes text/voice settings and reuses unchanged clips, including
legacy clips. `say` needs access to the installed macOS speech service; sandboxed
runs may create empty output, which is rejected. Change the audio cache key when
changing voice/encoding. Ordinary app builds only verify generated outputs.

Generated files: `generated/*.twee`, `src/game/catalog.json`, `src/game/world.json`,
`build-manifest.json`, and `public/game/episodes/<id>/v<version>/index.html`.
Shared audio/art use content-addressed paths under `public/game/audio/` and
`public/game/art/`. Commit generated files with source. `--episode` compiles one
changed episode; shared presentation/content changes can require a full build.
Validation checks references, unique IDs, answer alternatives, listening format,
memory prerequisites, resource hashes and the 3MB total per-episode download cap.
Story/art target is under 1MB. Only the opened episode's resources are downloaded
and cached; nothing is added to startup precaching. Missing art leaves a named
speaker; missing audio leaves usable text. Partial audio responses are served but
never incorrectly stored as full clips by the service worker.

Original artwork was generated with ImageGen and downsampled using nearest-neighbour
resampling to WebP; see `art-prompts.json`. `assets/characters.webp` is a transparent
384×256 three-character atlas; `assets/courtyard.webp` is 480×320. CSS uses shared
atlas metadata rather than hardcoded character positions. No Nihao Shanghai or
Nintendo artwork, prose, maps or source code is included.

## Verification

Model tests traverse both language variants, alternatives, duplicate chunks,
listening support, shuffle/resume and malformed messages/saves. Journal tests
cover one-time rewards, best-XP improvements, memory eligibility, repair/zero-floor,
permanent unlocks, atomic conflicts, identity boundaries and repeatable migration.
Browser tests cover all three complete stories, audio and motion, settings,
keyboard/controller mappings, phone layout, notebook, optional memory/bonus
scenes, replay and offline reopening. Run a scaffold in an isolated temporary
project to verify fourth-episode discovery and targeted compilation. Use the
production startup-size check and verify the actual deployed release.
