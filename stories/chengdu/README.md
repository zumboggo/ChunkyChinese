# Small adventures in Chengdu

Three original, linked personal-learning episodes. The people, courtyard, school,
and teahouse are fictional. No grades, live AI dialogue, timers, lives, or FSRS
writes. The narrator is David, an English teacher learning Chinese. Mandarin
speech uses the installed macOS Tingting synthetic voice (165 words/minute),
compressed to mono AAC at 32 kbps. There is no music. This is synthetic speech,
not a native-speaker recording; pronunciation can be revised by replacing a
versioned clip and rebuilding before release.

## Authoring

Edit `episodes.json`, not the generated `.twee` files or compiled HTML. Each
scene contains a short English transition, NPC dialogue, an English goal clue,
and a Chinese reaction. Version 2 has exactly three multiple-choice exchanges
(one correct reply, two contextual distractors), followed by one six-chunk
sentence-building exchange with two extra chunks. Simple/rich variants currently
share the same authored language. Each option and reaction has replayable audio.
Chunk occurrence IDs distinguish repeated words; identical text remains
interchangeable. Explicit alternatives allow natural word orders. Banks and options
use an attempt-seeded Fisher–Yates shuffle, stable across repaint and resume.

Version 1 files and saves remain untouched. Revised lessons use content version 2
and `public/game/v2/`; they start new attempts rather than interpreting old saved
progress as the new lesson. There is no old-lesson launcher in the current library.
Never overwrite released versioned resources when publishing future revisions.

The host chooses a variant from actual vocabulary on launch and stores that
choice. It checks dialogue-plus-answer and answer-only coverage separately.
Unknown tokens are shown honestly in supported play. Three declared focus words
are an authoring budget, not a claim that each learner knows every other word.
A completed puzzle does not constitute speaking mastery or an FSRS rating.

## Build

Use official **Tweego 2.1.1** from
https://github.com/tmedwards/tweego/releases/tag/v2.1.1 . Extract the compiler to
a persistent local tools directory and set `TWEEGO` to its executable. SugarCube
**2.37.3** is vendored with its upstream license under `vendor/twine/`.

```
TWEEGO=/absolute/path/to/tweego npm run game:build
npm run game:check
npm test
npm run build
npx playwright test tests/game.spec.ts
```

Generated Twee, compiled HTML, the host catalog and SHA-256 build manifest are
committed. CI checks for stale content/assets without requiring the compiler.
The build rejects invalid chunk sequences, empty audio, excessive focus words,
and episodes over 3 MB. Ordinary app builds do not generate images or audio.

To regenerate authored dialogue on macOS, install FFmpeg and use:

```
FFMPEG=/absolute/path/to/ffmpeg npm run game:audio
TWEEGO=/absolute/path/to/tweego npm run game:build
```

The speech service must be available to `say`; sandboxed macOS execution may
produce empty files. Generation rejects empty output. All branches and both
variants have pre-generated clips. Update the voice/encoding cache key if these
settings change. No API keys are needed or embedded.

## Runtime and saves

React owns the vocabulary snapshot, audio playback, localStorage and transitions.
Twine supplies compiled passages and the reusable `chengduScene` macro. It sends
intents, not trusted saved totals. The bridge validates source window, same origin,
protocol, per-launch channel and expected revision. Audio requests must match
this episode's asset allowlist. All content is authored; no credentials are sent
to the iframe.

Saves use the current auth user ID or `guest`, episode and version. The App keys
the player by identity, which unmounts it and stops audio on account changes.
Pinyin and English goal clues default on. Game settings in the library and player
persist those defaults per identity on this device, including on resume.
Each exchange and unfinished sentence is persisted. A separate first-completion
record and latest-completion record survive replay. Game progress is device-local
and is not included in the existing cloud sync or backup exports. A concurrent
tab's newer attempt is never overwritten; the second tab asks the learner to
reload. Clearing browser data clears these local records.

Opened episodes cache their static HTML, shared WebP art and audio in
`chunky-game-v1`. The service worker handles game HTML before its app-shell
navigation fallback. Nothing from the game is added to install-time precaching.
Text remains playable if an image/audio request fails. Cache failures and storage
failures are visible. Episodes open in a full-window view; native fullscreen is optional. The same
player remains mounted when switching display modes.

## Art and provenance

Original imagery was generated with the built-in ImageGen tool, then downsampled
with nearest-neighbour resampling and encoded as WebP. Prompts are recorded in
`art-prompts.json`. Runtime files: `public/game/v2/courtyard.webp` (480×320) and
`characters.webp` (384×256, transparent three-character atlas). Decoded art is
about 984 KiB RGBA. One portrait is shown at a time with a character-name fallback.
No Nihao Shanghai, Pokémon or Nintendo assets, prose, maps or source code are
included. Inspiration is limited to everyday conversation quests and retro art.

## Checks

Unit tests traverse each lesson in both language variants, test
accepted alternatives and duplicate chunks, supported answers, malformed saves,
identity/version keys, stable shuffles, distractor handling, settings and bridge boundaries. Browser tests exercise complete
stories, partial reply resume, wrong-answer recovery, mobile layout and offline
use. Build budgets include every audio branch, not just the happy path.
