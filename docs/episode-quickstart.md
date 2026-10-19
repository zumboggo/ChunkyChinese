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

Do not broaden familiarity, regenerate unchanged audio, alter prior releases, or bypass the full final phone/desktop check. No classroom assignments are part of this workflow.
