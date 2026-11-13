# Chunky Chinese for Pebble Time 2

Private learning reader for **Episode 11: 还可以更好 · We Could Do Better**, adapted from the existing Chunky Chinese Story 2 package. Original story: [Super Supportive by Sleyca](https://www.royalroad.com/fiction/63759/super-supportive). Source text, annotations, four decisions, distinct responses, and rejoins are preserved. Phone-app code and saves are untouched.

## Install on Android

1. Install the current [official Pebble Android app](https://repebble.com/app), pair your **new Pebble Time 2 (Emery)**, and update watch firmware.
2. Transfer `release/chunky-chinese-time2.pbw` to your phone. Open it with Pebble from Downloads or the Android share sheet, then install it on your connected watch. [Official sideloading instructions](https://developer.repebble.com/guides/tools-and-resources/testing-with-the-mobile-app/#sideloading-apps).
3. Launch **Chunky Chinese**. Episode 11 is bundled: no account, audio, network download, or separate Android APK is needed to begin.
4. For future supported packages, use Back → Library → Load from phone. The companion runs inside the Pebble Android app. Leave both apps open during transfer. The library says **Available offline** after verification. App settings accept an optional HTTPS `raw.githubusercontent.com` episode JSON URL; otherwise the repository's Episode 11 is used. A failed network fetch falls back to the phone cache or bundled copy.

If opening the file does not work, use the [Developer Connection](https://developer.repebble.com/guides/tools-and-resources/developer-connection/): enable Dev Connection in the connected watch's menu; run `pebble login`, then `pebble install release/chunky-chinese-time2.pbw --cloudpebble`. A trusted local-network connection with `--phone PHONE_IP` is another option.

Only Emery is included. This package is not for the original Pebble Time, Time Steel, or other older Pebbles. Android pairing and physical-watch readability still need testing on David's watch.

## Reading

- Select: advance pages; pinyin/English → pinyin/Chinese → next phrase.
- Up: previous reading screen (up to 64 recent screens; the latest 24 survive app restarts).
- Down: reading controls, including English help and 64/48-pixel portrait size.
- Back: Resume / Restart / Library. Restart requires a second selection. Hold Back to exit.
- Choices: Up/Down select an option; Select reads its characters; the final **Select: choose** explicitly commits it. Longer options have additional phrase/pages before confirmation.
- Exact phrase, page, encounter, option, and route save after each action. Two alternating save files protect the prior save during a write.
- Fonts: 24-pixel pinyin, 20-pixel English, 28-pixel Chinese. Text wraps at measured widths; continuation pages repeat the shorter language when needed to keep both visible.
- No audio, animation, automatic advances, or timed choices. Portraits appear on separate emotional beats; ordinary screens devote space to text.

## Build and export

Requires Node.js, Pebble CLI 5.2.0, SDK 4.44, and the SDK Python environment for the compiled-font audit. See the [SDK installer](https://developer.repebble.com/sdk/); the local commands are `uv tool install pebble-tool --python 3.12` and `pebble sdk install 4.44`. [SDK / Alloy documentation](https://developer.repebble.com/guides/alloy/). On David's Mac the CLI is in `~/.local/bin`, and the SDK tool Python is `~/.local/share/uv/tools/pebble-tool/bin/python`.

```sh
cd pebble
PATH="$HOME/.local/bin:$PATH" \
PEBBLE_PYTHON="$HOME/.local/share/uv/tools/pebble-tool/bin/python" \
sh scripts/build.sh
```

This deterministically exports Episode 11, runs reader/export/transfer/layout tests, performs a clean Emery build, audits the compiled font, and copies the PBW into `release/`.

`node scripts/export.mjs supportive-11` exports existing reviewed annotations. It never generates substitute pinyin. IDs are stable and versions derive from content. Unsupported script commands or glyphs fail the export. The exporter supports the same Story 2 command subset for future episodes; new cast, scenes, and artwork need explicit adaptation before shipping another episode.

`content/glyphs.txt` freezes 640 series Chinese characters plus Latin, punctuation and all pinyin tones, including ü/ǖ/ǘ/ǚ/ǜ. To expand intentionally: export with `--refresh-font`, obtain Noto Sans SC variable font from the [Google Fonts source](https://github.com/google/fonts/tree/main/ofl/notosanssc) as `reader/src/embeddedjs/assets/NotoSansSC.ttf`, run `scripts/prepare-fonts.py`, `node scripts/prepare-art.mjs`, and `scripts/measure-fonts.py`, then rebuild. Font preparation requires fontTools; metrics require freetype-py; artwork preparation requires Sharp (`npm install` in `pebble/`). Tested with Sharp 0.35.3, fontTools 4.68.0, and FreeType 2.13.2. The source NotoSansSC.ttf SHA-256 is `a3041811a78c361b1de50f953c805e0244951c21c5bd412f7232ef0d899af0da`. Redistributed subsets carry the SIL OFL in `reader/src/embeddedjs/assets/OFL.txt`.

## Architecture

Alloy/Poco renderer + native Pebble PBF fonts and palette bitmaps. The episode is indexed lazily to fit watch RAM. Phone JSON becomes ASCII NDJSON, transferred in acknowledged 600-character chunks with per-chunk and complete-file Adler-32 checks. Adler-32 detects transfer corruption; it is not an authentication signature. The URL is HTTPS and restricted to raw.githubusercontent.com.

The exporter and receiver limit packages to 64 KiB, 160 nodes and 2 KiB per wire record; split larger stories before exporting. Downloads write to the inactive A/B file. Only complete, checksum-valid content with valid graph, glyphs, and already bundled artwork activates. A failed/interrupted transfer retains the previous episode and progress. Reconnect and select Load from phone to restart an abandoned transfer. This release stores the bundled episode and one active downloaded episode; it is not a multi-episode bookshelf. New art/fonts require a PBW update. Watch reading positions are separate from Chunky Chinese phone saves.

## Verification

See `verification/STATUS.md` for actual test coverage and remaining hardware checks. Screenshots are native 200 × 228 emulator captures, not mockups. `art/` holds generated source artwork; `reader/resources/images/` contains both 64 × 64 and 48 × 48 portraits and opening/closing images. No public app-store submission was made.
