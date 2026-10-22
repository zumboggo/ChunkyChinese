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

Bundled catalog entries may include `intro: {src, poster, title, durationSeconds?}` with app-relative media under `stories/animated/cutscenes/`. Use an MP4 with generated sound and a JPEG poster. Six seconds is the default; set `durationSeconds` for a different total playback length. The current preference is 480p, audio enabled, at most $0.15 per successful clip; do not automatically submit paid replacement generations. Episode 1 has a specifically approved $0.25 ten-second Seedance shot followed by a three-second title card (13 seconds total); that exception does not increase the default budget.

Use `stories/characters/weed-reference.json` and its original novel covers for future Weed artwork. Generated cutscene speech defaults to **English**; include exact dialogue in the prompt. Mandarin lesson TTS remains Mandarin. Add exact titles during postproduction. Save model, prompts, prediction IDs and pricing in `stories/authoring/moonlight-cutscenes.json`.

Introductions sit outside the immutable Story 2 package. Starting or restarting an episode shows its intro; saved reading progress bypasses it. Video completion or Skip starts the story. Sound remains enabled, with a Play button when the browser requires a gesture; reduced-motion readers choose whether to play. A missing intro can always be skipped. Do not embed videos into existing packages, change release IDs, or regenerate Mandarin audio to add an intro. Package checks and the publishing helper validate and verify the referenced media too.

Do not broaden familiarity, regenerate unchanged audio, alter prior releases, or bypass the full final phone/desktop check. No classroom assignments are part of this workflow.
