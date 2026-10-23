# Next Mandarin episode

Read the series JSON and this page first. Use `docs/episode-authoring.md` for unfamiliar flags; use the current shared acting docs for unfamiliar commands. Read private JSON through selected fields, not raw dumps.

1. `npm run game:episode -- --init=moonlight-10 --series=moonlight`
2. `npm run game:source -- --series=moonlight --output=.local/moonlight-next-source.txt`
3. After reading the excerpt, write a small private candidate list such as `[{"word":"体力","alternatives":["身体","力气"]}]`. Alternatives are possibilities for human review, not automatic substitutions.
4. `npm run game:brief -- --series=moonlight --vocab=.local/episode-vocab.json --terms=.local/terms.json --output=.local/brief.json`
5. Complete the plan and plain script, including `sceneActivities`: the physical task under dialogue, its interruptions and supported staging. Run `game:episode -- --plan=PLAN --vocab=VOCAB --draft`, then annotate, generate audio and review pinyin. Set `pinyinReviewed` only after review.
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
