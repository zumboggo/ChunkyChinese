# Next five episodes offline — combined v1.14

Install the combined v1.14 PBW once. It also includes all 53 facial reactions and
42 visual-novel scenes, including the cover-eyes/peek and Alden gesture pack. With the reader open and the phone connected, it checks
the published catalogue and saves up to five consecutive episodes after the current
one. The reader does not skip a missing episode or invent unpublished content.
It refills when opened with the phone connected and after changing episodes. Downloads do not
change the current sentence, route, or completion credit.

**Back → Library → Offline queue** lists saved upcoming episodes. Select one to
read/resume it without a phone. **Update downloads** retries a stopped queue after reconnecting; reopening the reader also checks again. If Update downloads cannot restart a stopped transfer, close and reopen the reader.
On an episode's closing card, press Select to open the completion menu, then choose
**Continue to Ep …**. The included episode is usable here without downloading it.
Progress remains manual; completing one episode does not automatically start another.

## Storage and failure handling

- Seven numbered files bound the cache: current + five upcoming + one staging file.
  Each episode is limited to 65,536 wire bytes. Story records are streamed; five
  episodes are not parsed into RAM together.
- The received file is checked for size, checksum, version, supported artwork and
  valid routes before it enters the index. The current file is protected even if
  the index is missing. A failed allocation or index write keeps existing episodes.
- Old cache payloads are evicted as the queue rolls forward; per-episode reading
  positions and completed markers remain. Previous a/b-download installations are
  still readable. This does not uninstall/reset the app or alter phone progress.
- Request tokens reject late messages from superseded downloads. Incomplete files
  remain unindexed and are reused as staging space on retry. Reconnection can
  restart the current transfer rather than resuming its partially written bytes.
- **Check storage** temporarily allocates up to seven 64 KiB files in this app's
  file area, then removes only those probe files. It reports allocatable capacity
  in 64 KiB steps, capped at “>= 448 KiB”; this is not an exact global free-space
  reading. Cached episode data is retained. Every actual download also checks its
  allocation and stops safely on failure.

The installed Moddable Pebble file API exposes file size and creation, but no free-
space query. It uses Pebble filesystem files, not the legacy 4 KiB key/value quota.
Testing demonstrated five 21,029-byte episode files (105,145 bytes) plus at least
458,752 additional allocatable bytes on a dedicated Emery emulator. Actual device
capacity depends on its other stored data; use Check storage on the watch after
installation. This work did not inspect or install on the physical watch.

## Verification

Current combined-build checksums and evidence are in `verification/combined-v1.14.0/`; `verification/offline-v1.13.0/` is the earlier offline-only checkpoint.
The native queue test uses a controlled companion bridge and test-only episode
IDs; these fixtures are never published. The real companion also fetched published
Episodes 14 and 15 in an earlier emulator smoke test. Phone protocol unit tests cover
catalogue selection, consecutive plans, transfer tokens and late acknowledgements.

Run `node --test tests/*.test.mjs`, then the maintained build workflow. On a dedicated
emulator with live companion JS disabled (retain its transport bridge), run SDK
Python `scripts/test-offline-emulator.py --cli <isolated-cli> --emulator-info <path>`.
The test installs the actual PBW, verifies a full queue across reinstall, offline
continuation and interrupted refill, measures storage, and restores the real story.

## Combined-build memory

The queue index is parsed only for library operations; reading retains one episode
record. Shared artwork still uses the 512-byte cache. Fixed catalogue/UI data,
background commands, keyframes and the bundled episode index stream from resources.
The exact combined PBW has separate scene, reaction, transfer and five-episode
queue evidence under `verification/combined-v1.14.0/`; see `COMBINED-READER.md`.
The older v1.13 measurements above describe the offline-only checkpoint.
