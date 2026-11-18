# Episode 12 — The Nice One

Watch adaptation of the released `supportive-12` Mandarin text. No new prose,
translations, pinyin, audio, images or paid video were generated. All four binary
choices and all 16 routes retain their original responses and rejoins. Phone public
packages remain unchanged. Six persistent `watch_` labels bind the watch direction.

| Anchor | Character and story beat | Recipe |
| --- | --- | --- |
| watch_arrival | Jeremy brings Alden back to the present | jeremy-train-listen |
| watch_boe_teases | Boe considers why Jeremy joins them | boe-train-think |
| watch_good_one | Jeremy reacts to Alden joining the teasing | jeremy-train-think |
| watch_alden_surprised | Alden reflects on being called good | train-reflection |
| watch_sincere | Jeremy speaks sincerely about Alden's dream | jeremy-street-listen |
| watch_boe_reconsiders | Boe reconsiders Jeremy's insight | boe-street-think |

The five new recipes reuse Boe/Jeremy's native listen/think joint tracks. Street
shots use a standing pose without cafe furniture; train shots use the train seat.
There are no invented drinks or meal actions. The approved Alden thoughtful portrait
is reused for the cover and ending. The native title now comes from the selected
bundle. New scene IDs append after the existing catalogue; no existing IDs change.

`animatedCast` explicitly directs Boe and Jeremy through these scenes instead of
requesting nonexistent bitmap portraits. `cover` chooses an installed portrait.
This adaptation requires the new PBW; Refresh alone cannot install native scenes.

## Hearth Garden

A run starts when the reader advances from the opening. Reaching the actual `end`
queues one completion with a persistent run ID. Backtracking/revisiting the ending
keeps that ID. Restarting and finishing the whole episode creates a new run. Old
partial saves without a run ID are not retroactively credited.

Watch and Android companion both retain pending credits. The watch removes its
copy only after the server confirms the ID. Server insertion uses the existing
`(user_id,event_id)` unique key and ignores duplicate retries. Authentication uses
the existing Garden connection key; the server derives the owner from that key.
No service credential is in the watch app. Existing weekly circles, overflow and
gem awards use the same completion counter as phone episodes.

Separate Pebble apps cannot share their local key automatically. Paste the same
Hearth Garden key once into the Chunky Chinese app's settings. Bluetooth and phone
internet are required for the watchface to receive credit; reading remains offline.
Returning to Hearth Garden lets its normal sync refresh the red Chinese circles.

Old episode positions are archived when changing episodes or installing a new
bundle over an older save. An older downloaded story can remain active after a PBW
upgrade; Library → Read included Ep 12 selects the bundled story without a download.

## Repeatable focused verification

With `PEBBLE_PYTHON` set to the SDK's Python and the Pebble CLI on PATH, from
`pebble/`:

```sh
PEBBLE_EMULATOR_CLI="$PWD/scripts/isolated-cli.sh" \
PEBBLE_TEST_SCENES=5,26,27,28,29,30 npm run release -- supportive-12
```

Without `PEBBLE_TEST_SCENES`, release retains the complete shared catalogue test.
The selected scene runner records exactly which scenes were exercised. The isolated
CLI keeps emulator flash, phone storage and port records under `.local/`; it does
not wipe or interfere with the normal emulator. The full-reading test deliberately
restarts only that test profile. Browser checks retain both existing suites.

The download index and cycle-check stack use bounded typed arrays. This removes
per-node array/object overhead while preserving corruption, target, glyph and cycle
checks. The receiver still stages inactive content and activates only a complete,
verified package. Static street scenes stop their timer at the final pose.
