# Five upcoming episodes offline — v1.13.0

Frozen PBW SHA-256: `4a9c0bc10d196dd48276ca586f822fb56d7df376d24d2b349a70df1f68a33d8a`. Size: 244,684 bytes.

The watch requests five consecutive published successors, caches each validated file without changing the current position, and offers explicit offline continuation. Library exposes the queue, retry/update and a bounded file-capacity check. No placeholders or unpublished content are shipped. Old a/b downloads remain readable and existing progress/completion records are retained.

Seven numbered files bound the cache (current, five upcoming and one staging file). Each supports up to 65,536 wire bytes. Invalid and interrupted transfers never enter the index. The current path is protected independently of index health. Request tokens ignore superseded messages. Cache eviction removes payloads, not saved reading states.

The native queue test stores five 21,029-byte episodes (105,145 bytes), then demonstrates at least another 458,752 allocatable bytes in seven temporary files. These are **emulator measurements**, not a reading of David's physical watch. The watch's Check storage action repeats the same bounded test and removes only its own probe files. The installed API lacks a free-space query, so this is a lower bound, not total filesystem capacity.

JavaScript pools: 35 KiB slots, 11 KiB chunks, 5 KiB stack. Resource package: 144,488 bytes. Native code/static RAM: 17,390 bytes. Playback heap measurements are in the emulator reports; the SDK's pre-VM heap is not used as a runtime claim.

An isolated source snapshot was used because unrelated cast-art work was modifying the shared checkout. This release retains the verified v1.12 renderer/artwork. Only matching artifact reports are accepted. Fixture phone bridges disable live companion JS during native fault/recovery tests; all watch code and installed PBW bytes remain unchanged. Phone-side unit tests exercise the real companion code. An earlier live smoke run fetched published Episodes 14 and 15 automatically.

Physical-watch installation/testing: **not performed**. Install the PBW once; Refresh alone cannot install the queue runtime. Phone source episodes and reading progress are unchanged.

The raw QEMU Bluetooth disconnect/reconnect test leaves the Moddable channel unwritable on both v1.12 and v1.13. The downloaded-scene suite explicitly relaunches after that simulated reconnect. Offline playback itself is tested while disconnected. Seamless physical-device reconnect has not been verified; reopen the reader if Update downloads cannot restart a stopped transfer.

Validation: 104 unit tests passed; 180 pixel-exact native/browser frames matched; all 30 installed scenes passed with 4,564 bytes minimum held free heap. Background preferences and reading positions survived reinstall.

All 26 downloaded recipes (24 cast gestures across six actors plus two scene fixtures) passed. Transfer recovery, duplicate completion, title/reaction overlays, and restoration of the normal episode passed with zero transport retries. The raw-Bluetooth reconnect workaround above remains an explicit emulator-test limitation.
