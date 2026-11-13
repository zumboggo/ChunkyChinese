# Verification checkpoint — 2026-11-13

- SDK 4.44 installed and Emery native build succeeds.
- 25 automated tests pass: all 16 binary-choice routes, original line fidelity, lazy bundled/downloaded content, save-state restoration, choice undo, measured wrapping, glyph rejection, transfer corruption/interruption, graph validation.
- Actual compiled fonts audited: 640 Han characters and all requested tone marks covered. SDK `extended: true` is necessary; non-extended PBF generation silently truncates glyphs.
- Emulator: opening art, portraits, both encounters, native Chinese rendering and phone-simulator transfer verified. Complete 38,894-character wire file downloaded, checked, activated; library reports Available offline.
- Emulator: Bluetooth disabled and 90 consecutive reading advances completed without logged errors. Exact long-run restart and full ending verification still in progress at this checkpoint.
- Found and fixed watch-runtime Math.imul checksum incompatibility; portable Adler-32 now agrees on phone and watch. Per-chunk checks are enabled.
- Found and fixed blank lower-language continuation pages; shorter text now repeats during spillover. Fresh screenshots pending.
- Existing repository `npm run game:check` passed. Episode preflight encountered an unrelated local `afconvert` audio check failure; no audio is part of this app.
- No physical watch or Android device was connected. Real pairing, settings-page behavior, Bluetooth interruption timing, sunlight readability, button feel, and battery use remain hardware checks.
