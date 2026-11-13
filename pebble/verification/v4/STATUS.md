# Version 1.3 verification — 2026-11-14

Episode 11's content version remains `73281f5e8202`: the same Mandarin, reviewed
pinyin, English, four choices/rejoins and five story animation placements. Native
IDs 1–5 are preserved; 6–17 add the approved Gorgon, Boe and Jeremy gesture
previews; 18–25 add background samples. No new characters or interruptions were
inserted into Episode 11. Phone releases and saves are unchanged.

## Browser evidence

- Train interaction suite passes: explicit pickup, indefinite wait, fresh-press
  and key-repeat guards, replay, native dimensions, narrow layout and host pause.
- Ensemble suite passes all 24 principal action/setting combinations for each of
  three actors, held poses, replay, pause, hidden host and echoed preferences.
- The shared 12-second train world returns to exactly the same browser pixels
  (zero differing pixels at 0/12000 ms). The seam's pixel change is comparable to
  an ordinary step (3073 vs 3064), rather than a reset flash.
- Browser evidence is separate from native rasterization/performance. Native
  screenshots below were captured from the combined reader at 200 × 228.

## Content, controls and resources

- All 59 Node tests pass, including all 16 routes through bundled and streamed
  adapters, exact-position/choice saves, old-version migration, five ordered story
  cues, menu navigation/replay, preview progress isolation and motion preference.
- Font audit finds all 139 glyphs in both Latin sizes and all 779 in the Chinese
  font, including 640 Han and every required tone/ü variant. Zero missing glyphs.
- SDK 4.44 Emery clean build: 229,199 bytes of resources; 23,848-byte native
  code/data footprint. Runtime pools: 32 KiB slots, 20 KiB chunks, 4 KiB stack.
- Native story spans, typed migration maps and compact pose-key tables reduce
  overhead. Downloaded runtime metadata drops duplicate descriptive fields;
  attribution remains in About and the complete exported package.
- Default ambience is On. Off freezes it without disabling deliberate gestures;
  text screens are static. Native timers target 83 ms during actions and 167 ms
  for background-only holds. Background time never advances story state.

## Release-specific native evidence

Final reports and selected screenshots accompany this document. The integrated
suite checks every scene with motion Off (pixel-identical final frames), replays
one per group, verifies previews preserve reading position, reinstalls to check
saved position/preference, then checks moving ambience with held foregrounds.
The independent protocol, focus and offline runs are documented in their reports.

The final scene run recorded 3,732 bytes free at every held scene, unchanged on
replays. Draw averages ranged from 3–10 ms and the maximum observed was 19 ms
against the 83 ms foreground interval. These are emulator measurements, not
physical-watch guarantees. The native resource/JavaScript split remains tight;
future renderer additions must repeat combined-reader and download checks.

Installer: `chunky-chinese-time2-supportive-11-v1.3.0.pbw`, 359,311 bytes.
SHA-256: `cc2b542109a74b2271f356cf886a8cf540da25d4ce65999073511a217e0dc368`.

- The actual emulator receiver rejected incomplete and corrupt chunks, survived
  reinstall halfway through a download without changing the reading screen, then
  received all 40,101 bytes, activated atomically and accepted duplicate END.
- A local notification interrupted Boe's gesture at action/ambient time 89 ms.
  Both clocks remained exactly 89 ms on focus return, and the gesture subsequently
  finished normally. Preview exit returned to the original reading screen.

## Physical watch still needed

No physical-watch or Android pairing test was performed for version 1.3. Battery
impact, sunlight readability, real-watch frame pacing and button feel need David's
installation feedback. Continuous background motion can be disabled in Back →
Background motion. Refresh alone cannot add these native capabilities; install
the new PBW first. Older versioned installers remain available.
