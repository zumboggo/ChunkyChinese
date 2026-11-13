# Version 1.1 verification — 2026-11-13

David reported successful installation and use of version 1.0 on his phone/watch. Version 1.1 still requires his physical-device feedback.

## Changes

- Pinyin/English default; Down toggles optional Chinese. Select advances without a compulsory second encounter.
- Small blue speaker name at bottom left.
- 24 portrait beats (previously 12), using full-screen 200 × 228 versions of the existing art. No emotion captions or AI image-generation requests.
- Explicit choice confirmation retained, with Up browsing and Down toggling language.
- Refresh in the watch's Back menu and the phone settings page. Fetch failures keep the installed episode and report the failure.
- v1 save migration preserves phrase and selected route with the new portrait positions.

## Verification

- 38 Node tests pass: all 16 paths match original story responses/rejoins; one-pass progression, optional Chinese, explicit confirmation, save/upgrade migration, refresh, transfer corruption/interruption, and asset/glyph coverage.
- Native full-screen portrait inspected at 200 × 228. Full-screen images use four tiles and explicit C bitmap destruction, rather than relying on JavaScript bitmap lifetime. The FFI binding passes numbers only; portrait names remain local to the native code.
- Pinyin/English and optional Chinese screenshots inspected, including the blue speaker caption.
- Full offline native-renderer route completed to the closing image without allocation errors. Restarted midway and continued from the saved phrase. The layout model requires 269 Select presses versus 500 previously (46% fewer).
- Live-feed Refresh downloaded the published 39,890-character package and returned Available offline (`09-refreshed.png`), retaining the ending position. Startup HELLO now retries until the watch acknowledges READY; queued commands are preserved while that handshake completes.
- Compiled fonts still include all 640 Han characters and tone-marked vowels. No changes to the phone app's released content or saves.

The emulator is SDK 4.44 Emery with its phone simulator. Android settings and pairing are not represented by the phone simulator; real sunlight readability, battery use, and the revised physical button feel need David's feedback.
