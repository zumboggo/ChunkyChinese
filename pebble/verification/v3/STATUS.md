# Version 1.2 verification — 2026-11-13

Five native animated moments are inserted after exact reviewed text anchors on the common Episode 11 path: train phone, restaurant seating, Hannah taking a fry, young Alden lowering his milkshake, and the closing train reflection. The existing text, Chinese annotations, choices and rejoins remain unchanged.

## Checks

- 44 Node tests pass. Coverage includes all 16 story routes, exact five-scene ordering, old-save node mapping and phrase/route preservation, back navigation from animations, rejection of unknown animation IDs, transfer protocol/corruption handling, glyph coverage and real font metrics.
- The generated flash index reads every node identically to the exported package. Native resource reads are limited to 2,048 bytes. One shared FFI instance is required: constructing a second instance resets Pebble's native function registry.
- Every streamed static portrait pixel matches its source at Pebble's 64-colour precision. Portraits and opening/closing cards are drawn from row runs using a 512-byte input buffer, avoiding bitmap decompression allocations.
- Compiled-font audit: 139 glyphs in each Latin size, 779 in the Chinese font (including 640 Han); zero missing glyphs.
- SDK 4.44 Emery build: 231,358 bytes resources / 262,144 limit; 16,732-byte native code/data footprint. The reported 114,340-byte initial heap is before the JavaScript archive and runtime allocate their pools. Runtime free native heap observed around 4.4–4.6 KB during scenes; this is a tight budget, not 114 KB of remaining free memory.
- All five scenes were played through the preview menu at native 200 × 228 resolution. Scene rendering averaged about 11–12 ms, with observed maxima around 21 ms, against an 83 ms target interval. These are emulator measurements, not physical-watch benchmarks.
- Phone prompt waits for Select. The final phone pose remains pixel-identical across captures until another Select. Preview completion returns to the menu, and all five scenes can be opened in turn.
- Full default reading route exercised through all five stops to the closing card; scene screenshots retained alongside this report. Animated frames have no story text; the phone action prompt is the exception.
- Known older v1.0/v1.1 feed versions are rejected so Refresh keeps the installed animated story rather than silently reverting it. Remote feed publication is not part of this local sideload delivery.

- The final package also installed and started on fresh Emery storage. The long-running development emulator began NACKing installation requests after repeated development installs; its flash was preserved as `qemu_spi_flash.before-animation-install-test.bin` in the SDK emulator directory before creating fresh test storage. Physical watch storage was not accessed.

## Physical watch check still needed

David must sideload `chunky-chinese-time2-v1.2.0.pbw` through the Android Pebble app. Actual movement, button feel, sunlight readability, startup time and battery behavior require his Time 2. No direct physical-watch connection was established here.
