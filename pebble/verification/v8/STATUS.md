# All main characters and pinyin-only reading — v1.8.1

Bundles Episode 13 with its existing six animation placements and 23 reaction shots
per route. The installer is 305,013 bytes versus v1.7.0’s 396,246 bytes. Source prose, reviewed Mandarin/pinyin/English, choices and phone releases
remain unchanged. New watch packages omit Chinese text and the installer omits its
font, following David's 2026-11-14 preference. Restoration is documented in
`../../PINYIN-MODE.md`; all original annotations, font sources and layout metrics remain.

## New reusable capability

Schema 1 keeps actor IDs 0–2 and appends Hannah (3), young Alden (4), and present-day
Alden (5). All six use supported head/right-arm pose recipes and cup/no-prop settings.
The new actors share the original native head drawing. Hannah retains braids, young
Alden is smaller and wears yellow, and adult Alden retains coat lapels. The shared
`recipeFromGesture` helper selects validated downloadable timing. The think gesture
uses an intermediate reachable arm pose, preserving shipped compiled IDs.

New supported motion and combinations can use Refresh after this one-time upgrade.
New rigs, drawing channels, fonts or bitmap assets still require a PBW. Content exports
check the verified actor list and pinyin-only capability, in addition to runtime drift.

## Verification

Reports for the frozen candidate accompany this document. Browser evidence, native
emulator evidence and physical-watch verification are distinct. No physical watch was
connected; battery use and real-device readability still need David's feedback.

- Native catalogue: all 30 compiled scenes, replay, frozen foreground, moving
  ambience, saved motion preference and saved reading position passed. Held native
  heap was 4,876 bytes free; maximum sampled draw was 21 ms (83 ms frame budget).
- Browser: original train, ensemble and review suites passed; all 12 new actor/gesture
  combinations passed movement, final-hold and wire-encoding checks at 200 × 228.
- All 82 automated tests passed. Checks cover source fidelity, every branching route, strict host/native
  recipe validation, glyph coverage, pinyin-only content, legacy reading and transfers.
- The real content CLI exports a new Hannah recipe without a native build, and
  rejects it when the recorded runtime supports only the older three actors.
- Font configuration roundtrips Chinese on/off without changing portrait IDs.
- Fourteen new recipe packages transferred without rebuilding, including all twelve
  new main-cast gesture combinations. Final native held heap stayed at 4,876 bytes
  for repeated/new-cast playback. Replays, foreground holds, focus pause/resume,
  same-ID motion updates, invalid-package retention, interrupted updates and offline
  downloaded playback passed; normal Episode 13 content was restored afterward.
  The test sender now uses the phone companion’s acknowledgement retry behavior.
  The final passing run needed zero retries. Native screenshots were inspected.
- Full Episode 13 reading completed with Bluetooth disabled, including all six scenes,
  and the ending restored identically after reinstall. The separate Garden credit assertion
  was inconclusive because the isolated phone outbox retained an older synthetic test
  credit; no real Garden connection was configured. See `reading-report.json`.
- The native old-release bundled saved Chinese encounter returns to the same pinyin/English
  phrase; a screenshot comparison excludes only the changed control footer.

Early candidates exceeded startup archive/stack allocations and were not released. The initial full-route candidate also exhausted its text heap. Capping live Back history at the same 24 screens already saved on disk fixed the long-passage failure; exact position and choices still save after every advance.
Factoring the original head renderer removed duplicate code. The tested allocation is
34 KiB slots, 11.5 KiB data chunks and 4.5 KiB stack. Font removal saves flash storage;
it is not presented as equivalent working-memory savings.

## Space and creation effort

The packed Chinese font is 65,001 bytes. Episode wire reductions are 28.3%, 27.3%,
and 27.1% for Episodes 11–13 respectively; see `storage-report.json`. The 64 KiB,
160-node and 2 KiB-record limits remain unchanged. No measured authoring-time or
transfer-time speedup is claimed. Source translation and contextual pinyin remain
necessary; the avoided work is Chinese watch-layout/glyph expansion, while reusable
motion avoids drawing and animating the same characters again.

The Chinese Episode skill records the new default, all six actor IDs, the reusable
motion helper and the restoration procedure. Skill validation and reference-link
checks passed; phone defaults and the newer pacing preferences remain intact.

Frozen installer SHA-256: `9cf55d6d76e21b837985975c24643bc766e8369a61f2a6f839835cef1f81c383`.
