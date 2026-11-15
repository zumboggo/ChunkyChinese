# Two-minute reading light and download-memory fix — v1.14.3

Hold the middle-right Select button for 0.6 seconds to keep the backlight on for **two minutes**. Another hold restarts the timer. Long presses do not advance the story or choose an option. The clock and direct English A/Up, B/Down choices are unchanged.

Install the new PBW over the existing app; do not uninstall or clear its data. Existing reading saves, cached episodes, 53 reactions and 42 installed scenes are retained. The phone companion included in the PBW must also update so subsequent downloads use the compact metadata format.

## Why the old build could run out of memory

The earlier tests filled the cache with simple synthetic episodes. Actual next episodes and a completed current story with 24 history entries and four choices reproduced Alloy allocation failures. Native free heap alone was not an adequate indicator: Alloy has separate fixed string/chunk and object-slot pools. Loading the whole pending completion-credit backlog also exhausted slots when reopening a completed story.

The fix halves streamed episode indexes to 16-bit offsets, including the exact 65,536-byte endpoint; collects during branch validation; releases the last validation node before committing; consumes queue-plan entries as they finish; and omits redundant descriptive metadata from phone-to-watch transfers. Story nodes, choices, animations and package versions are unchanged.

Completion credits now live in individual disk records. Only one credit is decoded for sending or acknowledgement. Legacy pending credits migrate incrementally with a persisted cursor and interruption recovery. Credits are not discarded to free memory.

The string/chunk pool increases from 9,216 to 11,264 bytes. Stack (4,224) and slot allocation (34,816) stay unchanged. This deliberately rebalances memory toward the pool that failed. **The earlier 12 KiB free-native-heap target is not met by this fix.** The current regression reserve is 8 KiB native, with the measured minimum and exact build sizes in `verification/download-memory-v1.14.3/metrics.json`. The shared 512-byte artwork cache and allocation-free native artwork renderer are unchanged.

## Verification

**Final measurements:** 9,520 bytes minimum free native heap over 668 samples; 256,574-byte PBW; 157,862 bytes of resources; 14,248 bytes native code plus 1,036 bytes static RAM. Representative scene frames peaked at 55 ms. All 114 unit checks passed.

The retained regression uses published Episodes 14–17 and a test-only copy of Episode 14 in a fifth cache slot. The copy is never published as a story. Downloads run after completing a test current episode with a full 24-entry reading history and four saved choices. Every cached episode is opened offline and reopened after an app reinstall. The formerly failing emulator storage was retained during diagnosis.

Unit checks cover the exact 64 KiB offset boundary, unchanged story payloads, a 100-credit backlog, and interrupted migration. Native checks cover direct choice buttons, saved choices, clock formats, light renewal and the full 120-second timeout, upgrading from v1.14.2 with five cached episodes, and representative scene IDs 1, 26, 31 and 42. Full-library art verification from v1.14.2 remains historical evidence; no artwork or animation renderer source changed in this release. A scene timing run during concurrent emulator stress exceeded its frame budget; the retained final run is performed after transfer stress completes.

Evidence is emulator-based. Physical-watch installation, brightness and battery consumption remain unmeasured.

Reproduce the download regression with SDK Python:

```
python scripts/test-download-memory.py --cli /path/to/isolated-cli --emulator-info /path/to/emulators.json --content-dir verification/download-memory-v1.14.3/fixtures
```

Run `python3 scripts/verify-download-memory-release.py` to check the packaged installer, current source hashes, retained reports and measured native reserve.
