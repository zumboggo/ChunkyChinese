# Alden layered Shōnen prototype

One review sequence: **neutral → shocked → embarrassed → small smile**. It lasts
4.34 seconds and holds until a fresh Select; Down replays and Back returns.
This is a prototype, not the replacement emotion library.

## Artwork

The source is the bottom-right Shōnen portrait in
`../shonen-cutout/approved-expression-reference.png`. No new image-generation or
paid API requests were made. The original hoodie and hair artwork are extracted;
face cleanup and reusable eyes, brows, mouth and jaw pieces are processed
procedurally. This retains the approved illustration rather than redrawing a
different vector character. Neutral/embarrassed/smile features are adapted, so
visual review is still needed.

Thirteen reusable layers, at 200×228 native resolution: fixed torso/neck;
face; shock jaw overlay; eye variants; nose; brow/mouth expression overlays;
foreground hair. The entire head moves together by at most 3 pixels. No side
turns or independent hair movement. The torso remains byte-identical across all
frames below the neck. The lower jaw extends for shock; hair renders last.

- `preview/index.html`: large one-shot source-colour preview with Replay.
- `preview/reaction.gif`: looping preview for chat (the watch does not loop).
- `preview/emulator-colors.gif`: watch palette with measured emulator colour mapping.
- `preview/storyboard.png`: the four expressions.
- `layers/`: full-resolution transparent reusable pieces.
- `manifest.json`: source hash, layer inventory, timings and resource sizes.

The polished source is not restricted to five colours. The watch version uses
Pebble's 64-colour palette with ordered dithering to retain pale peach skin and
brown hair. Plain nearest-colour conversion made the skin pink. Dithering is a
visible quality/storage tradeoff; compare the two previews before expanding.

## Full-reader experiment

`alden-hybrid-lab-v1.9.2.pbw` is a separate **Alden Lab** app with its own UUID.
It contains a staged copy of the full Episode 13 reader. Back opens its menu;
**Alden prototype** is the first item. It does not replace the normal app, its
UUID, release PBW, progress, catalogue, or existing portraits. Its bundled
companion code is the reader's; this experiment exercised offline preview and
reading only, not network/catalogue/completion sync.

The prototype is exposed through the menu for review; story reactions have not
yet been replaced. Final deployment is deliberately deferred until visual review.

## Measurements and limits

Measured on the isolated Emery emulator with the full reader loaded:

| Item | Bytes |
|---|---:|
| All 13 reusable art layers and offsets | 45,244 |
| Existing shared streaming buffer | 512 |
| Additional compiled native code/data footprint | 2,044 |
| Minimum observed free heap | 4,020 |
| Total app resources | 246,332 |
| Remaining 256 KiB resource budget | 15,812 |

No whole decoded frame, bitmap sheet, or SVG parser is allocated. Art is read
one row at a time, choosing RLE or literal bytes per row. Flash is currently the
main expansion constraint: this lab retains all existing portraits as well.
Before a large library, replace superseded resources and compress/reuse the
base layers further. More facial pieces are cheaper than another full portrait,
but this build does not establish capacity for 20–25 expressions or the cast.

Finite playback, stable hold, three deterministic replays, return to menu,
unchanged opening position, and preview after entering the story passed.
`validate.py` independently decodes every resource and verifies the native
screenshot matches its pixel geometry and colour mapping. Physical hardware and
focus interruptions were not tested in this pass.

**Timing remains unresolved.** Ordinary draw samples are 31–55 ms (median 39 ms), but
the SDK wall clock produced ±1-second discontinuities and unsigned underflow.
Raw samples are retained in `verification/watch.log` and `report.json`; do not
interpret its raw maximum as CPU draw time or claim certified smoothness.
The earlier non-dithered prototype had the same clock issue. Playback needs a
physical-watch check or a reliable monotonic profiler before production rollout.

## Reproduce

From the application repository root:

```sh
python3 pebble/pixel-reactions/hybrid-prototype/build.py
python3 pebble/pixel-reactions/hybrid-prototype/stage.py
node pebble/pixel-reactions/hybrid-prototype/compile.mjs
```

Then run `pebble build` inside `pebble/pixel-reactions/.local/hybrid-reader`.
Run `verify.py` from this directory with the SDK configured; it uses only
`../isolated-cli.sh`, never a physical watch or the normal emulator profile.
Then run `validate.py` and `package.py`. The staged source is disposable; the
normal reader source remains unchanged. Never overwrite a previously shared
versioned PBW with different bytes.
