# Visual-novel renderer update (v1.12)

The episode animation renderer has been replaced with the approved close-up pixel-character style. Existing scene IDs, source anchors and reading saves are retained. Five animated moments per route now reuse torso/hand performances over separate backgrounds. Room fans and screensavers can continue after the foreground holds; Background motion Off freezes them. All six cast packs share the reaction decoder and its 512-byte cache. No movement below the waist.

Use `npm run catalogue` / `npm run review -- <episode>` for the updated authoring preview. Current implementation and compatibility details: [scene workflow](scenes/README.md). The descriptions of older renderer releases below are historical.

# Chunky Chinese for Pebble Time 2

Episode 13 with six animated moments, 23 emotional shots per route, and Hearth Garden completion sync: [install and setup](EPISODE-13.md). Reusable portraits and generation notes: [reaction library](art/REACTIONS.md).

Private learning reader for Super Supportive, adapted from existing Chunky Chinese Story 2 packages. The latest installer bundles **Episode 13: What Do You Want?**; Episode 11 remains supported. Original story: [Super Supportive by Sleyca](https://www.royalroad.com/fiction/63759/super-supportive). Source text, annotations, four decisions, distinct responses, and rejoins are preserved. Phone-app code and saves are untouched.

## Install on Android

1. Install the current [official Pebble Android app](https://repebble.com/app), pair your **new Pebble Time 2 (Emery)**, and update watch firmware.
2. Transfer `release/chunky-chinese-time2-supportive-13-v1.9.1.pbw` to your phone. Open it with Pebble from Downloads or the Android share sheet, then install it on your connected watch. [Official sideloading instructions](https://developer.repebble.com/guides/tools-and-resources/testing-with-the-mobile-app/#sideloading-apps).
3. Launch **Chunky Chinese**. Episode 13 is bundled: no account, audio, network download, or separate Android APK is needed to begin.
4. Use **Back → Library** to browse numbered ranges, see completed episodes, and download or resume one. **Update list** finds newly published episodes. See [the episode catalogue guide](CATALOGUE.md).
5. For future supported packages, use Back → Refresh episode. The companion runs inside the Pebble Android app. Leave both apps open during transfer. The library says **Available offline** after verification. App settings accept an optional HTTPS `raw.githubusercontent.com` episode JSON URL; otherwise the bundled episode's repository feed is used. A failed network fetch leaves the current offline episode intact.

If opening the file does not work, use the [Developer Connection](https://developer.repebble.com/guides/tools-and-resources/developer-connection/): enable Dev Connection in the connected watch's menu; run `pebble login`, then `pebble install release/chunky-chinese-time2-supportive-13-v1.9.1.pbw --cloudpebble`. A trusted local-network connection with `--phone PHONE_IP` is another option.

Only Emery is included. This package is not for the original Pebble Time, Time Steel, or other older Pebbles. Android pairing and physical-watch readability still need testing on David's watch.

## Version 1.8 — all main characters, pinyin-only reading

Downloadable recipes now support Hannah, young Alden and present-day Alden as well
as Gorgon, Boe and Jeremy. All six reuse listen, offer, think and sip timing. New
recipes within those rigs can arrive through Refresh after installing v1.8.1 once.

The watch now reads pinyin above English. Chinese text and its font are omitted from
new watch exports/installers, while the full source and reversible build switch are
retained. See [pinyin mode and restoring Chinese](PINYIN-MODE.md). The default bundle
is Episode 13; previously downloaded episodes and saves remain separate.

## Version 1.6 — animations through Refresh

Install the 1.6 runtime once. Future episodes can then download new head/arm pose
sequences, timing and supported character/setting/background combinations for
Gorgon, Boe and Jeremy, with optional hand-attached cups. Motion travels inside the
episode and remains available offline. Bad or interrupted updates retain the
previous episode. Existing manual controls and background-motion preference remain.

Use [downloadable recipes](scenes/downloadable.md) and the existing episode-review
workflow. New rigs, drawing primitives, unsupported props/actions, fonts and image
assets still require a PBW. This is a bounded motion format, not arbitrary downloaded
programs. The upgrade bundles Episode 12, matching the previous 1.5 release.

## Version 1.3 — reusable cast and looping ambience

Episode 11 keeps the same five animation placements and all story text/choices. Both train scenes now have seamless building/pole parallax; all three restaurant scenes have small, distant passersby with quiet gaps. Foreground actions finish and hold while the background continues. Select still advances deliberately; Down replays.

**Back → Animations** groups the original scenes, Gorgon, Boe, Jeremy and Backgrounds. Each new character has Listen, Offer a cup, Think and Raise/lower cup previews. They are available for future episodes without inserting them into Episode 11. The background sampler includes train scenery, restaurant/consulate walkers, home/classroom foliage and crystal-table light. Rain and a cat are optional samples, not default story events.

**Back → Background motion: On/Off** persists across restarts. Off freezes ambience but still plays deliberate gestures. Text screens remain static. Native timers use approximately 12 fps during actions and 6 fps for background-only playback; scene exit and focus loss stop them. Install the new PBW once; Refresh can subsequently reference the installed catalogue but cannot add native actions or assets.

See `verification/v4/STATUS.md` for this release's measured checks and hardware limitations.

## Existing reading experience

The original five moments remain available; Refresh alone cannot add native renderer capabilities. All five moments are bundled offline: train phone pickup, restaurant seating, Hannah taking a fry, young Alden lowering his milkshake to listen, and the final train-window reflection. Each follows its corresponding completed passage on every story route. Text and animation occupy separate screens. The phone scene waits for Select at “Pick up the phone”; other scenes play for about four seconds. All hold their last pose until Select. Down replays; Up returns to the previous reading screen; Back opens the menu.

**Back → Animations → Episode 11** previews the five original scenes without changing the saved reading position. In previews, Back or Select after completion returns to the preview list. Holding Select does not repeat it.

Existing v1.0/v1.1 saves migrate to the same phrase and selected choices. A known older v1.0/v1.1 feed is rejected so refreshing an unpublished/older feed cannot silently remove the installed animations. Future compatible refreshes can rearrange or reuse the installed named animation IDs; the bounded v1.6 recipe format also supports new pose sequences and scene combinations. New renderer capabilities still require a PBW update. This release is supplied as a sideloaded file; remote feed publication is separate.

Native primitives draw the scene animations at a target 12 fps. Emotional reactions now use the approved 64×64, eight-colour character packs, streamed through the shared 512-byte buffer and enlarged 3× without smoothing. All 40 old static emotion resources are excluded from the PBW; opening/closing cards remain. See [reaction integration](pixel-reactions/INTEGRATION.md). The bundled story uses a generated flash-resource index and reads at most one 2 KiB record through a shared FFI bridge. The JavaScript runtime reserves 32 KiB for slots, 11 KiB for chunks, and 4.5 KiB for its stack. Current emulator checks and limits are in `verification/reactions-v1.10.0/STATUS.md`.

## Reading controls

- Pinyin above English is the default. **Select advances immediately** through pages/phrases; there is no compulsory Chinese encounter.
- **Down (bottom-right) opens reading controls**. Chinese view is currently disabled.
- The speaker's name appears in small blue text at the bottom left.
- Up revisits the previous screen (24 recent screens, also retained across restarts).
- At choices, **Up cycles options**, Down opens controls, Select requests confirmation, and **Select: choose** commits.
- Back opens Resume / Refresh episode / Animations / Background motion / Restart / Library. Hold Back to exit.
- Portraits fill 200 × 228 pixels, without emotion labels. There are 24 portrait beats, up from 12; the same cast artwork is reused. They are static and advance with Select.
- The default path needs 269 Select presses in the layout model, versus 500 in version 1.0 (46% fewer), including the additional portraits.
- The 24-pixel pinyin and 20-pixel English fonts remain. Both stay visible on continuation pages; the 28-pixel Chinese setup is retained for future re-enabling.
- Upgrade migration retains the current phrase and selected route from version 1.0, switching the current view to English. Reordered portrait cues do not force a restart. Recent back-history resets on a content-version change.
- No audio or timed choices. Animated moments finish on a held pose; story progression always requires Select.

## Refresh and future integration

**Back → Refresh episode** fetches the latest exported story through the phone. The phone's app settings also have **Refresh watch story**; keep the watch app open. A failed fetch says it kept the offline story, instead of quietly treating a cached copy as an update.

Refresh handles text, pinyin, glosses, decisions, and placement of already-installed portraits. New image files, new font glyphs, or changes to button behavior require a new PBW. Install version 1.3 once for the expanded animation renderer; later compatible content edits can use Refresh.

The live feed is the JSON export in this existing Chunky Chinese GitHub repository. Author the source episode → export → commit/push → Refresh. No separate database or API key is required. A future Chunky Chinese frontend can serve the same versioned JSON from a static endpoint, or a backend can select a learner's episode and vocabulary; moving to that endpoint would require adding its domain to the phone companion's permissions and URL validation. No private backend credentials are embedded in the watch app, and watch progress remains separate from phone progress.

## Build and export

Requires Node.js, Pebble CLI 5.2.0, SDK 4.44, and the SDK Python environment for the compiled-font audit. See the [SDK installer](https://developer.repebble.com/sdk/); the local commands are `uv tool install pebble-tool --python 3.12` and `pebble sdk install 4.44`. [SDK / Alloy documentation](https://developer.repebble.com/guides/alloy/). On David's Mac the CLI is in `~/.local/bin`, and the SDK tool Python is `~/.local/share/uv/tools/pebble-tool/bin/python`.

```sh
cd pebble
PATH="$HOME/.local/bin:$PATH" \
PEBBLE_PYTHON="$HOME/.local/share/uv/tools/pebble-tool/bin/python" \
sh scripts/build.sh --dev supportive-11
```

Pass an episode ID to select the bundle (`npm run build -- supportive-10`, `npm run check -- supportive-10`, or `npm run release -- supportive-10` from `pebble/`). Omitting it defaults to Episode 11. This checks generated scene data, runs the regression suite, builds incrementally and audits the compiled font. Development builds stay in `reader/build/`. Use `--release <episode-id>` for a clean build and immutable packaging named `chunky-chinese-time2-<episode-id>-v<app-version>.pbw`. Reports verify the native story inside the built PBW and record its episode/version; the default Refresh URL follows the selected bundle. See [repeatable scene authoring and verification](scenes/README.md) for shared definitions, stable story anchors, browser tests and integrated emulator checks.

`node scripts/export.mjs supportive-11` exports existing reviewed annotations. It never generates substitute pinyin. IDs are stable and versions derive from content. Unsupported script commands or glyphs fail the export. The exporter supports the same Story 2 command subset for future episodes; new cast, scenes, and artwork need explicit adaptation before shipping another episode.

`content/glyphs.txt` freezes 640 series Chinese characters plus Latin, punctuation and all pinyin tones, including ü/ǖ/ǘ/ǚ/ǜ. To expand intentionally: export with `--refresh-font`, obtain Noto Sans SC variable font from the [Google Fonts source](https://github.com/google/fonts/tree/main/ofl/notosanssc) as `reader/src/embeddedjs/assets/NotoSansSC.ttf`, run `scripts/prepare-fonts.py`, `node scripts/prepare-art.mjs`, and `scripts/measure-fonts.py`, then rebuild. Font preparation requires fontTools; metrics require freetype-py; artwork preparation requires Sharp (`npm install` in `pebble/`). Tested with Sharp 0.35.3, fontTools 4.68.0, and FreeType 2.13.2. The source NotoSansSC.ttf SHA-256 is `a3041811a78c361b1de50f953c805e0244951c21c5bd412f7232ef0d899af0da`. Redistributed subsets carry the SIL OFL in `reader/src/embeddedjs/assets/OFL.txt`.

## Architecture

Alloy/Poco reader with native C animation and streamed portrait layers. Twenty-five native scene IDs are exposed through a single shared FFI instance. Story records and static portraits load incrementally from resources; animation frames are drawn from coordinates. Phone JSON becomes ASCII NDJSON, transferred in acknowledged 600-character chunks with per-chunk and complete-file Adler-32 checks. Adler-32 detects transfer corruption; it is not an authentication signature. The URL is HTTPS and restricted to raw.githubusercontent.com.

The exporter and receiver limit packages to 64 KiB, 160 nodes and 2 KiB per wire record; split larger stories before exporting. Downloads write to the inactive A/B file. Only complete, checksum-valid content with valid graph, glyphs, and already bundled artwork activates. A failed/interrupted transfer retains the previous episode and progress. Reconnect and select Refresh episode to restart an abandoned transfer. This release stores the bundled episode and one active downloaded episode; it is not a multi-episode bookshelf. New art/fonts require a PBW update. Watch reading positions are separate from Chunky Chinese phone saves.

## Verification

See `verification/v4/STATUS.md` for actual test coverage and remaining hardware checks. Screenshots are native 200 × 228 emulator captures, not mockups. `art/` holds generated source artwork; `reader/resources/images/` contains both 64 × 64 and 48 × 48 portraits and opening/closing images. No public app-store submission was made.

## Image budget

Emery supports 64 display colors; these portraits use a 16-color palette. Pixel art compresses well in storage, but decoded memory depends mainly on dimensions and bit depth, not how simple the drawing looks. A full 200 × 228 image at 4 bits per pixel is 22,800 bytes before headers/palette. Version 1.2 draws colour runs directly from a 512-byte input buffer; repeating a portrait costs no extra stored image.

The Chinese PBF is about 65 KB in the resource package. Removing it could free storage for some images, but it is not all held in working memory and is not required to make the full-screen portraits work. Version 1.1 retained optional Chinese; v1.8 omits it at David’s request (see PINYIN-MODE.md). Enlarging and reusing existing artwork makes no image-generation calls.

[Official Pebble image formats](https://developer.repebble.com/guides/app-resources/images/). New AI artwork uses image-model tokens; pixel styling alone is not a cheaper billing setting. Model, generated dimensions, quality, references, and retries matter; the later 200 × 228 watch conversion is separate. See [OpenAI image-generation cost guidance](https://developers.openai.com/api/docs/guides/image-generation#calculating-costs). Exact built-in-tool token/billing totals are not exposed by this project.
