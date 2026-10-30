# Next Mandarin episode

Start with `npm run game:preflight -- --series=jedi --vocab=.local/episodes/jedi-01/vocab.json` (use the correct series/export). This fetches remote main without merging, rejects divergence, checks assets, smoke-tests local Mandarin encoding, locates video tools and writes a compact private brief. Read `.local/authoring/<series>-brief.json` and this page first. Use `docs/episode-authoring.md` for unfamiliar flags; use the current shared acting docs for unfamiliar commands. Read private JSON through selected fields, not raw dumps.

1. `npm run game:episode -- --init=moonlight-10 --series=moonlight`
2. `npm run game:source -- --series=moonlight --output=.local/moonlight-next-source.txt`
3. After reading the excerpt, write a small private candidate list such as `[{"word":"体力","alternatives":["身体","力气"]}]`. Alternatives are possibilities for human review, not automatic substitutions.
4. `npm run game:brief -- --series=moonlight --vocab=.local/episode-vocab.json --terms=.local/terms.json --output=.local/brief.json`
5. Audit a short opening exchange with `--draft` before drafting the whole story. Complete the plan and plain script, including `sceneActivities`: the physical task under dialogue, its interruptions and supported staging. Run `game:episode -- --plan=PLAN --vocab=VOCAB --draft`, then annotate, generate audio and review pinyin. Set `pinyinReviewed` only after review.
6. `npm run game:episode -- --plan=PLAN --vocab=VOCAB --stage` checks and stages a new immutable release. Inspect screenshots. Audio is cached.
7. If a browser test fails, inspect `browser-results.json` and the failure context first. `npm run game:episode:test -- --fixture=FIXTURE --failed-from=BROWSER_RUN_DIRECTORY` retries failed title/project pairs only, rejecting changed fixture/package bytes. This is diagnostic, never final release evidence. Staging always performs a full run.
8. Add `continuation` to the plan: `{ "end": "Episode ending summary", "nextStart": "Exact next source anchor", "nextEndBefore": "Exact later source anchor", "note": "Next scope", "continuity": ["Updated continuity notes"] }`. Omitting `continuity` preserves existing notes.
9. `npm run game:continuation -- --plan=PLAN --report=PASSING_RUN/report.json --output=.local/continuation.json` validates the full run, exact package and next EPUB anchors, without changing the series record. When the next passage begins in another chapter, add its exact EPUB entry name as `continuation.chapter`; the same fingerprint and anchor checks apply before any record update.
10. Commit intended changes, then `npm run game:publish -- --push --continuation=.local/continuation.json`. Publication verifies live files before committing and pushing just the continuation record. The final summary includes release ID, package bytes, coverage and browser result. Without `--continuation`, publication retains its original behavior. `--verify-only` remains read-only.

Keep one yielding publishing process; check it about once a minute instead of repeatedly reading unchanged logs. The helper handles network retries. If bookkeeping push fails after its commit, rerun the same command; its local receipt identifies the already-verified release. If interrupted while the record is dirty, inspect the diff before committing/recovering; the clean-tree safeguard intentionally stops automatic publication.

## Optional video introductions

Bundled catalog entries may include `intro: {src, poster, title, durationSeconds?}` with app-relative media under `stories/animated/cutscenes/`. Use an MP4 with generated sound and a JPEG poster. The default model is `prunaai/p-video-2-pro`, `mode="cost"`, `resolution="480p"`, `prompt_upsampler="off"`, with native generated sound and English speech. The standard is six generated seconds plus a three-second thinking still (nine seconds total); set `durationSeconds` for a different total playback length. The current preference is 480p, audio enabled, a hard $0.15 total per requested clip across providers, counting all paid retries and variants. Verify current pricing for every billable setting and its maximum charge before submission; do not submit uncertain pricing or automatically retry. Exceptions require explicit approval of a stated dollar amount for specified clips. Episode 1 has a specifically approved $0.25 ten-second Seedance shot followed by a three-second title card (13 seconds total); that exception does not increase the default budget.

Use `stories/characters/lms-reference.json` and its approved main-cast lineup for future Chinese LMS artwork; this supersedes the novel covers. `npm run game:cast:lineup` builds the supported SVG approximations without changing released packages. New episode plans use `castFrom` from the series record; the episode builder overlays that bundle onto reused assets. Preview these designs through “Meet the LMS cast.” Generated cutscene speech defaults to **English**; include exact dialogue in the prompt. Mandarin lesson TTS remains Mandarin. Add exact titles during postproduction. Save model, prompts, prediction IDs and pricing in `stories/authoring/moonlight-cutscenes.json`.

Introductions sit outside the immutable Story 2 package. Starting or restarting an episode shows its intro; saved reading progress bypasses it. Video completion or Skip starts the story. Sound remains enabled, with a Play button when the browser requires a gesture; reduced-motion readers choose whether to play. A missing intro can always be skipped. Do not embed videos into existing packages, change release IDs, or regenerate Mandarin audio to add an intro. Package checks and the publishing helper validate and verify the referenced media too.

Do not broaden familiarity, regenerate unchanged audio or alter prior releases. New or revised episode scripts retain their full final phone/desktop checks; cutscene-only edits use the targeted final intro checks below. No classroom assignments are part of this workflow.

### Emotional cutscene direction

Choose the moment of greatest source-grounded tension or emotional resonance. Center each clip on one meaningful action or one short English phrase, with clearly audible dialogue above ambience/music. By default, prepend a three-second thinking/decision hold using the exact first decoded video frame, then play motion in the same MP4 so the transition is automatic and seamless. Record generated and total delivery durations separately; still holds incur no generation cost. Adjust or omit the hold when the scene calls for it.

### Faster cutscene workflow

Use `stories/authoring/templates/cutscene-prompt.txt`: one visible speaker, one short phrase, a simple emotional/action beat, and only the exact quoted words once. Explicitly forbid extra words, repetition, paraphrase, fillers and other voices; after the line, keep the mouth closed with quiet ambience. Keep scene directions separate from dialogue. These instructions reduce opportunities for extra speech; they do not guarantee compliance.

1. Reuse the approved cast references and a concise scene brief. Use one imagegen still and one paid prediction per requested clip. Reverify current pricing and count all attempts against the $0.15 total cap. Cache prediction IDs and outputs; poll without resubmitting.
2. Preserve the native clip. Run `scripts/finish-cutscene.py` for a single standardized offline finish: 480p, sound normalization, default three-second still hold, poster, review frames, and timing/sound checks. It never calls a generation API or changes the episode catalog. No trim is guessed; full motion/audio is retained unless explicit trim arguments are supplied.
3. Make one local speech-recognition pass, using `--speech-model` and an already cached model when available. The report flags extra/missing words for review (exit code 2); it never silently trims speech, downloads models or retries generation. Then watch/listen once for acting, lip sync and visual artifacts. Use a simple clean endpoint and reaction hold only if the output actually needs it. Keep a usable imperfect result when it meets the creative goal; do not chase tiny cosmetic differences.
4. Batch catalog/provenance updates and one publication for the requested group. Run targeted intro tests on phone/desktop once per final batch; repeat only affected checks after a material change. Broaden checks when player/code changes or failures justify it. Keep required publication checks.

The command defaults to six seconds of motion and a three-second thinking hold:

```bash
python3 scripts/finish-cutscene.py --source PATH/native.mp4 --output PATH/intro.mp4 --dialogue "Exact English line."
```

Use `--hold-seconds 0` to omit the hold or override `--motion-seconds` for another duration. The command discovers `ffmpeg`, accepts `--ffmpeg` / `FFMPEG_PATH`, or uses an installed `imageio-ffmpeg`. Add `--speech-model base.en --speech-cache PATH` when the local `faster-whisper` environment is available. For an explicit clean endpoint, use `--motion-seconds`, `--audio-end` and `--total-seconds` to retain the line and extend the final reaction without another paid run. Outputs include `.poster.jpg`, `.motion.jpg`, `.end.jpg`, `.soundtrack.wav` and `.checks.json`. Inspect the report before integrating; preserve the source. The first-use setup is reusable, not a task to repeat per clip.

## Efficiency and compact continuity

The preflight remembers the exact vocabulary path privately; subsequent `game:episode -- --plan=PLAN` commands may omit `--vocab`. An explicit path always overrides it. `--offline` skips the initial remote check and labels that limitation; it does not waive the publisher’s remote check. Read selected fields from plans, never dump full packages, embedded media, or continuity state lists. Supported animation and character values in the brief come from the current runtime. The preflight never approves a video purchase: verify exact live pricing for every requested clip as before.

New packages automatically compact continuity into a suffix-sharing decision graph. The graph accepts exactly the original valid combinations and preserves saved snapshots and bounded variable bindings. Existing released packages are never rewritten. To shrink an existing private plan, use `node scripts/compact-continuity.mjs INPUT_PLAN .local/compact-plan.json`; it refuses overwrites and public destinations. To add a field without enumerating the cross-product, use `extendContinuity(definition, newField, requirements)` from `src/game/animation/continuity.ts`. Requirements map each restricted new value to allowed prior field values, for example `{isolate: {station: ['leave','brace']}}`. Explicitly update the new sourceId and sourceField mappings for the next episode. Never assume independent fields when the prior story couples them.

Use the shared `chooseEpisodeOption` browser helper rather than copying controller timing assumptions. Keep final complete phone/desktop routes, pinyin review and visual/audio inspection. The publisher owns the final production build; do not run a duplicate build immediately before it unless debugging a build problem.

Live verification uses four bounded parallel downloads. With a verified baseline receipt, it checks changed public assets, new/changed catalog references, the catalog, service worker, and matching build entry/version/JS/CSS. Unknown baselines safely receive a full library check. Receipts survive push retries and record-only continuation commits. `game:publish -- --verify-only --full-verify` performs a full audit when requested; no recurring automation is created. The publisher rechecks remote main immediately before pushing and stops on concurrent changes. No force push, skipped required tests, or automatic paid retries.

## Plan-driven authoring (routine episodes)

Use the same workflow for LMS, Super Supportive and other established series. One episode is the shortest path to a playable result. For a requested batch, finish each script/language package in order, reuse cached assets, and publish the batch once. Do not reopen the full conversation or all skill references; read the compact preflight brief and references for capabilities actually being changed.

1. Run preflight. It checks remote ancestry, pinned animation dependencies, dirty checkout state, speech encoding and video tools. Its output points to the detailed private brief rather than dumping the whole runtime catalog. Resolve a missing dependency now. A dirty checkout is not permission to stash, delete or commit another task's files.
2. Initialize with `game:episode -- --init=ID --series=SERIES`. This creates the plan, script and **one `authoring.json`** and extracts the pinned EPUB passage when applicable. Reuse `assetsFrom` for unchanged scenes/cast. Fill source attribution, outline, desired ending and source assertions in the plan.
3. Audit the opening, finish the script, then `game:episode -- --plan=PLAN --draft --freeze`. Freeze is permitted only after vocabulary passes. It creates one annotation row per unique line/choice. Later script edits invalidate language review; re-audit and freeze again, retaining unchanged rows.
4. Fill each row with a natural full English translation and contextual chunks. Run `game:assemble -- --plan=PLAN` to generate sentence/chunk pinyin and a private `pinyin-review.txt`. Correct readings **in `authoring.json`**, then run `game:assemble -- --plan=PLAN --reviewed` after inspecting them. Generated pinyin is a proposal; the review hash records exactly the language data approved. Do not use mechanical global polyphone replacements.
5. Fill `plan.review.lines` with exact consequential dialogue and aftermath text to inspect. Stage with `game:episode -- --plan=PLAN --stage`. This assembles assets and annotations, checks all engine routes/replay and source assertions, reuses audio, chooses browser routes covering every reachable beat/option, checks both device sizes, plays the designated lines and captures screenshots. It also tests the planned opening's sound and transition. Inspect those screenshots; do not write another playback script.
6. Successful staging writes the immutable package, public-safe `stories/authoring/ID.json` and private `continuation.json` automatically. If continuation validation fails, fix its source anchors and use `game:continuation` with the passing stage report; do not restage an immutable release.
7. Commit only intended files, then `game:publish -- --push --continuation=CANDIDATE`. If concurrent work makes the checkout dirty, use `game:release -- --ref=COMMIT --push --continuation=CANDIDATE`: this runs the same publisher from an isolated committed snapshot, retains failed worktrees for diagnosis, copies verification receipts back, and leaves the active authoring checkout unchanged. It creates a `codex/release-*` reference for the verified continuation commit.

The single authoring input uses this shape (paths are relative to the app root):

```json
{
  "castRecipes": "stories/characters/my-series/cast-next.json",
  "backgrounds": {
    "field": {"name": "Empty field after practice", "file": ".local/episodes/my-episode/field.png"}
  },
  "lines": [{
    "chinese": "我来了。",
    "english": "I'm here.",
    "pinyin": "wǒ lái le",
    "chunks": [{"chinese": "我来了。", "gloss": "I'm here.", "pinyin": "wǒ lái le"}]
  }]
}
```

`castRecipes` is optional; use existing character recipes and the supported builder, not a one-off compiler. New cast bundles are versioned and carried into continuation. `backgrounds` only lists additions/replacements for this new episode; PNG/JPEG/WebP files are embedded automatically. For newly authored vector scenery, `game:background -- --source=SCENE.svg --output=.local/episodes/ID/scene.png` renders self-contained shapes. This is not an image-editing substitute for imagegen. Unchanged assets cost no regeneration.

For opening media, optionally add this to the plan after generation and offline checks:

```json
{
  "media": {
    "image": ".local/episodes/ID/reference.png",
    "video": ".local/episodes/ID/final.mp4",
    "poster": ".local/episodes/ID/final.poster.jpg",
    "checks": ".local/episodes/ID/final.checks.json",
    "provenance": {
      "scene": "The specific event shown in this episode",
      "style": "The chosen medium",
      "identityReference": "stories/characters/series/approved.png",
      "model": "The actual video model",
      "predictionId": "The saved prediction ID",
      "verifiedMaximumUsd": 0.06,
      "paidAttempts": 1
    }
  },
  "review": {"lines": ["Exact dialogue to inspect", "Exact reader-held aftermath"]}
}
```

Assembly verifies the video's hash and passing audio/speech report, copies only final media, and generates catalog metadata and provenance. Image generation and paid video requests remain explicit, with fresh exact pricing and the $0.15 total cap. Nothing in assembly purchases media. Keep checks, source excerpts, intermediate soundtracks and learner data private. Spoken-number normalization accepts “ninety”/“90” while retaining extra words for review.

For a batch, initialize the next episode with `--init=NEXT_ID --series=SERIES --after=PREVIOUS_CANDIDATE` to inherit its verified assets and next source boundary without advancing the live series. Then merge prepared candidates **in source order** with `game:continuation -- --merge CANDIDATE1 CANDIDATE2 --output=.local/batch-continuation.json`; all candidates must share an unchanged series baseline. The publisher validates every batch package hash. Never hand-edit a merged continuation.

## Fast checks and measurable delays

All reachable engine routes and replay states are checked. Stateless, reconverging choices use a browser set covering every authored beat, ending and option; persistent-state stories remain exhaustive. Use `--all-browser-routes` for deliberate exhaustive UI diagnosis. Keep source-specific assertions in `plan.routes`; a small browser set does not reduce those checks. Reviewer-selected lines and intro playback run in the normal suite, with observable step transitions (including repeated identical lines), rather than fragile screenshot-loop sleeps.

English audio defaults to two workers (maximum four), a single writer lock and bounded Retry-After/backoff. Explicit 429 rejections can retry; accepted predictions resume polling, and uncertain POST outcomes stop without resubmission. If a process is killed while holding the lock, confirm it has stopped before removing `.local/episode-english-kokoro/generation.lock`. Reuse saved receipts and completed audio.

Phase reports now save start/end timestamps before and after each phase, including failures. For an unexplained conversation delay, use `game:timing -- --transcript=EXACT_SESSION_FILE --turn=EXACT_TURN_ID`. It reads only the selected turn's event metadata and incremental usage, deduplicates response IDs, labels gaps with/without a pending tool, and outputs no conversation text or images. It cannot diagnose model/network internals and never calls an unrecorded gap “authoring time.” Do not sum cumulative counters or turn token counts into unverified dollar estimates.

Avoid raw package dumps, base64 output and repeated whole-file reads. Inspect summaries and relevant fields. Run focused regression tests while changing tools; let the publisher own the final full suite/build. Do not generate a new paid clip or voice recording merely to test workflow code.
