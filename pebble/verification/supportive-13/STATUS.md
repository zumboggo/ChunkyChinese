# Episode 13 verification — v1.7.0

- 75 automated tests passed; browser motion suites passed.
- All 16 story routes contain exactly 6 animated moments and 23 emotional portrait placements.
- All 30 native scenes passed playback, final-pose hold, replay, background motion and saved-setting checks. Minimum held free memory: 3,896 bytes; maximum measured draw: 58 ms.
- All 24 newly installed portraits rendered on the native emulator.
- Two new downloadable animation recipes passed transfer, offline playback, replay, interrupted transfer and invalid-update retention checks without rebuilding.
- Full Episode 13 default route completed with Bluetooth disabled; all six expected scenes held. The ending at node 83 survived reinstall with an identical screenshot.
- The new completion appeared once in the phone outbox after manually acknowledging two older synthetic fixture events. The isolated emulator has no real Garden connection key. This verifies durable queuing; physical watch/watchface synchronization remains untested.
- Native runtime allocation: 34 KiB slots / 13 KiB chunks / 4 KiB stack.

PBW SHA-256: `5f238de2e2f5d1d19f3d1d46058b419e548df8ae6dbb985bb1d5453b9001e743`
