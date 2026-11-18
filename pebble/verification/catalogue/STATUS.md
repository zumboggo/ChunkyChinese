# Episode catalogue — v1.9.1

The Library supports numbered ranges of ten, five titles per page, completion
markers and direct download/resume. The published list initially contains Episodes
11–13. Future catalogue entries do not require another PBW when their content uses
installed capabilities. Metadata supports up to 2,000 entries; tests exercise 150.

## Verified on this exact installer

- 91 automated tests passed, including paging, malformed metadata, asynchronous
  selection races, preserved saves and durable completion markers.
- Both existing browser motion suites passed.
- All 30 native scenes passed movement, held poses, replay, background movement,
  saved settings and position checks. Minimum held free heap: 6,056 bytes;
  maximum measured drawing time: 30 ms.
- Fourteen new recipe transfers passed across Boe, Jeremy, Hannah and both Alden
  ages, including all twelve new main-cast gestures, focus/replay, offline playback, invalid-update
  retention and interrupted-transfer recovery. Minimum held free heap: 5,992 bytes.
- The native Library navigated a 150-entry synthetic catalogue, opened Episode 149,
  rendered maximum-sized title metadata, downloaded real Episode 11 and restored
  exact Episode 11/13 reading positions.
- Opening cards use the selected episode's title and number; ending cards use its title. A bounded
  numeric bridge copies titles into the native renderer; no borrowed string pointer.
- A completed test episode retained its marker through reinstall and offline
  resume and produced one new simulated completion credit.
- A full real Episode 13 route completed with Bluetooth disabled, played all six
  expected animations, restored its ending at node 83 after reinstall, and produced
  one unique simulated completion credit.

No real Garden account or physical watch was used. Physical-watch pairing,
readability and battery life remain untested. Test Episode 149 is a fixture only;
it is not part of the published catalogue.

## Runtime

The native JavaScript is bundled with Rolldown 1.0.3 and private identifiers are
minified. Editable source, public property/state names and platform APIs remain.
Allocation: 32 KiB slots / 12 KiB chunks / 4.5 KiB stack. Reading history retains
24 recent steps, including the long-reading memory fix. Original Chinese
sources and restoration configuration are retained; current reading is pinyin-only.

Installer SHA-256: `58144455f77f55abc06d4d19e9d2e87ee4db0e818dcbb0c7d73b8af3bfa0dca0`
