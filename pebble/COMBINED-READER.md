# Combined reader — v1.14.0

Install `release/chunky-chinese-time2-supportive-13-v1.14.0.pbw` as an update to
Chunky Chinese. This single installer combines the expression pack and offline
library. It includes Episode 13 and saves up to five published upcoming episodes
when the phone is connected. The app UUID is unchanged.

## Included

- 53 facial reactions across Alden, Hannah, Boe, Jeremy, Gorgon and young Alden.
- 42 installed visual-novel scenes: shared backgrounds, fan/screensaver motion,
  all ten human cover-eyes/peek performances, Alden's folded arms and interrupted sip.
- Five-episode offline queue, offline continuation, per-episode saves, catalogue,
  completion sync and unchanged schema-1 downloadable recipes.
- Old reaction IDs 1000–1034, scene IDs, aliases, original artwork and episode
  placements remain compatible. The previously approved v1.12/v1.13 PBWs are preserved.

## Measured on the exact PBW

| Measurement | Result |
| --- | ---: |
| Lowest measured free heap | **12,556 bytes (12.26 KiB)** |
| Required minimum | 12,288 bytes |
| Native code plus static data | 14,748 bytes |
| Native static data alone | 1,020 bytes |
| Resource storage | 156,287 bytes |
| PBW download size | 254,392 bytes |
| Shared artwork cache | 512 bytes |
| Scene mean drawing times | 25–65 ms |
| Largest sampled scene/reaction drawing time | 153 / 40 ms |
| Offline test payloads | Five × 21,029 bytes |
| Additional allocatable storage demonstrated | At least 458,752 bytes |

The resource-storage tradeoff is **11,799 additional bytes** over the offline-only
v1.13 checkpoint (16,010 over expressions-only v1.13). The earlier 8 KiB expression
expansion target describes that separate release; the combined reader adds streamed
runtime tables as well. Native code/static RAM is 3,610 bytes smaller than the
expression-only build. These are measured results, not estimates of physical-watch
memory. Physical installation/testing remains a separate user action.

Fixed names/UI text, background commands, keyframes, scene descriptors and the
bundled story index stream from flash. The offline index is read on demand, startup
work is staged, and downloaded gesture interpolation uses bounded integer math.
Frames remain allocation-free in native code. The fixed XS pools are 4,608 bytes
of stack, 35,840 bytes of slots and 9,216 bytes of string/chunk storage.

## Verification and compatibility

Evidence: `verification/combined-v1.14.0/`, tied to SHA-256:

`46603f4715c66c14ff0319fc8e5d20d119862b268f6faf19ace07e3c59fc6292`

Passed: 108 unit checks; 570 exact native/browser frames; 53 independently decoded
native final poses; all 42 installed scenes; 26 downloaded recipes and 12 installed
hand-scene transfers; replay, final holds, focus interruption, background motion,
checksums, interrupted downloads, duplicate completion, saves and offline playback.
Upgrades from v1.12 and both v1.13 variants preserve reading position/display. All
five episodes cached by the old offline build remain playable after upgrading.

The SDK/QEMU Bluetooth reconnect test leaves its existing Moddable message channel
unwritable, also observed with the older reader. Offline playback passes while
Bluetooth is disconnected. The test relaunches the app before subsequent transfers;
three transport retries were recorded in the downloadable-scene run. This is
emulator verification, not a claim of physical-device reconnect testing.

## Authoring and rebuilding

Use `scenes/EXPRESSION-PACK.md`, `scenes/README.md`, and `authoring/README.md` to choose
installed actions and actor/emotion names. Continue to place at least five
source-supported animated moments per route; reuse performances rather than adding
five new assets. Future food-container offers, writing and phone-call poses remain
preparation notes, not installed actions.

Edit shared geometry in `reader/src/c/visual_novel_draw.h` and acting in
`scenes/visual-novel.json`. `npm run scenes` generates the packed stage header and
resource; `npm run build -- supportive-13` exports and builds the selected episode.
Never hand-edit `visual_novel_packed.h`, `library.bin`, `stage.bin` or `story-index.bin`.
The exact v1.14 runtime profile is recorded for content-only authoring. Re-run memory,
scene and transfer checks for any runtime/font/art change.

The two different historical v1.13 builds are retained with explicit `-expressions-`
and `-offline-` filenames. Install the v1.14 combined PBW for both feature sets.
