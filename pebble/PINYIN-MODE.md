# Pinyin and English by default

David's preference, 2026-11-14: omit Chinese characters from watch reading for now,
but retain the setup so they can return later. Phone episodes are unchanged.

`reading-mode.json` is the maintained switch. With `{"chinese": false}`:

- Watch exports omit each phrase's `zh`, retain reviewed contextual pinyin and English,
  and keep the same phrase boundaries, choices, rejoins and animation placements.
- The Chinese font is excluded from the installer. The TTF, measured 28px layout,
  glyph list, original annotations and `content/chinese-font.json` are retained.
- Reading uses 24px pinyin above 20px English. Down opens controls; it still replays
  animations. Up browses choice options and Select explicitly confirms a choice.
- Existing downloaded bilingual content remains readable as pinyin/English. A saved
  Chinese encounter displays its same phrase in English. Compatible source-version
  upgrades retain the phrase and chosen route; no phone saves change.

## Restoring Chinese later

Only do this when David requests it. Set `reading-mode.json` to `{"chinese": true}`,
then run the normal selected-episode build. `scripts/configure-reading.mjs` restores
font registration and resource IDs; `watchPresentation` exports the existing Mandarin
again. Check glyph coverage, measured Chinese wrapping, saved position migration and
native playback, then deliver a new versioned PBW and compatible episode content.
Down returns to toggling Chinese/pinyin when both the installed font and episode
support it. Refresh alone cannot reinstall the removed font. Do not retranslate
approved Mandarin or discard the reviewed pinyin. New Han glyphs may require expanding
the retained subset before rebuilding.

## Measured space, not a larger memory promise

The removed packed Chinese font is 65,001 bytes (63.5 KiB). Actual episode wire sizes:

| Episode | With Chinese | Pinyin/English | Reduction |
| --- | ---: | ---: | ---: |
| 11 | 40,101 B | 28,738 B | 28.3% |
| 12 | 22,053 B | 16,026 B | 27.3% |
| 13 | 29,474 B | 21,489 B | 27.1% |

This means roughly 1.37–1.40 times the text capacity **when byte size is the limiting
factor**. The independently tested 64 KiB download, 160-node and 2 KiB record limits
remain unchanged. Font storage does not automatically become working RAM or larger
transfer capacity. Transfers send fewer bytes, but no stopwatch speedup is claimed.

Authoring still needs faithful Mandarin and reviewed contextual pinyin. Existing
annotations make export cheap in either mode. Omitting Chinese avoids watch glyph
expansion and Chinese-page review; it does not eliminate translation, story direction
or animation verification. Reusing approved motion is the main animation-work saving.
