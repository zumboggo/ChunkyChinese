# Combined v1.14.0 evidence

`metrics.json` and `build-report.json` identify the exact packaged PBW. Run
`python3 scripts/verify-combined-release.py verification/combined-v1.14.0` to check
cross-report hashes, counts, memory acceptance and upgrade evidence.

Native/protocol tests used isolated Emery emulators and the controlled companion
(`PEBBLE_TEST_FIXTURE_COMPANION=1`). The installed PBW bytes were unchanged; only the
emulator companion's network delivery was replaced by test-driven AppMessages.
The five cache files total 105,145 bytes. Older PBWs are used only in upgrade tests;
their lower heap measurements are excluded from the combined-build heap result.

`scene-watch.log`, `reaction-watch.log`, `downloadable-watch.log`, `offline-watch.log`
and `transfer-watch.log` provide final-build heap/frame evidence. `upgrade-report.json`
combines the legacy reading comparisons and a fresh offline-v1.13-to-v1.14 queue
upgrade. Run upgrade modes on separate stores; downgrading the old offline reader
onto newer test state can exhaust that older build's slot pool.

The downloaded-recipe test uses a relaunch after simulated Bluetooth reconnection,
as described in `../../COMBINED-READER.md`. Physical-watch testing is not claimed.
