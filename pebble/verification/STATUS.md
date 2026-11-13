# Verification — 2026-11-13

## Automated and build

- Pebble CLI 5.2.0 / SDK 4.44, Emery build. No changes to the existing phone app, released episode, or phone saves.
- 30 passing tests in `tests.txt`: all 16 decision combinations; every spoken line, branch response, and canonical rejoin compared against the original Story 2 script; exact state restore and choice undo; lazy bundled/downloaded adapters; measured wrapping at shipped font sizes; unsupported glyphs, missing art, invalid graphs, corrupt and incomplete packages; actual companion protocol, lost acknowledgements, and duplicate final messages.
- Actual compiled PBFs checked, not just source TTFs: 640 Han characters plus punctuation/Latin and all pinyin tones. `font-coverage.json` records zero missing glyphs. The font must use `extended: true` and a clean SDK build.
- `npm run game:check` passed for the existing repository. Episode preflight encountered an unrelated local `afconvert` audio check failure; this reader contains no audio.
- Default HTTPS episode URL fetched after push and byte-compared with the local export.

## Actual Emery emulator

- Opening illustration, reaction portraits, both encounters, native 200 × 228 Chinese/pinyin rendering inspected. Every 64/48-pixel portrait inspected in `portraits-64-and-48.png` (2× enlargement for comparison).
- Phone simulator downloaded and activated the complete 38,894-character package. Per-chunk and whole-file checks passed; screenshot `07-offline-ready.png` shows verified availability.
- Long offline run with emulated Bluetooth disconnected. Exact Chinese encounter/page restored after restart: `10-offline-midpoint.png` and `11-chinese-resumed.png` are byte-identical screenshots.
- Restart confirmation, choice English/character encounters, explicit Select: choose, previous-screen navigation, and English help during the character encounter checked on the emulator.
- Long pinyin continuation pages retain the shorter English/Chinese text. The older `08-offline-reading.png` records the issue before correction; `09-resumed.png` records the correction.
- Fixed two issues found only under the watch runtime: Math.imul checksum differences (now portable Adler-32) and peak memory during restore. Runtime pools are 28 KiB slots / 20 KiB chunks; the reader retains 64 previous screens and persists 24 to keep recovery small.
- Completed the full default route (500 reading/decision screens in the layout model), with Bluetooth disabled; `14-offline-ending.png` shows the closing illustration.
- Injected a corrupt full transfer: rejected (`15-invalid-download.png`). Started another transfer and restarted before completion: prior episode and exact ending retained (`16-interrupted-resume.png`). Reconnected and downloaded the valid default URL again: Available offline (`17-reconnected-ready.png`).

## Hardware still required

No physical watch or Android device was connected. Emulator phone messaging uses the SDK phone simulator, not the Android app itself. David's installation must confirm pairing, firmware compatibility, settings-page behavior, real Bluetooth reconnect timing, sunlight readability, and battery use. No public app-store submission was made.
