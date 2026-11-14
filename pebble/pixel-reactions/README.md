# Alden: approved Chibi reactions

The approved 32×32 Chibi Alden is the master for six finite reactions: blink,
surprise, thinking, talking, happy/laughing, and worried/confused. They use five
visible colors plus binary transparency. His hoodie, grey T-shirt, hair and
silhouette remain consistent. Each reaction holds its last frame until Select;
there is no continuous idle or animation on a reading screen.

## Review and install

- `preview/index.html`: six previews with individual Replay buttons; animations play
  once and hold. Open locally in a browser.
- `preview/alden-six-reactions.gif`: combined preview that loops **for comparison only**.
- `preview/*.gif`: individual one-shot development previews, not watch resources.
- `alden-chibi-reactions-v1.0.1.pbw`: separate Time 2 / Emery demo. Select advances
  to the next emotion; Up goes back; Down replays. Back exits.

The separate demo has its own UUID and does not replace Chunky Chinese or access
its saves, catalogue or Garden account. Reader integration follows review of these
animations. Only Alden has been created in this style; do not expand the cast before
that review. Frames are displayed at 4× with an additional native-size preview.

## Artwork and palette

`style-review/chibi-five/alden-chibi-32-five-colors.png` is David's approved master.
`characters/alden-chibi/` contains that master, individual PNGs and timing manifest.
The design palette retains pale peach skin and the light-grey T-shirt.
`characters/alden-chibi/watch/` contains an explicitly separate hardware-palette
approximation, including pale cream skin. It uses five colors from Pebble's RGB
levels 0,85,170,255. Original design colors are never silently overwritten.

The ImageGen style study superseded earlier RD Plus experiments. Reactions use
small deterministic facial overlays and integer-pixel bounce/recoil, preserving
that approved identity. Earlier pilot outputs remain in `characters/alden/originals`
for provenance; they are not bundled or used for the approved Chibi animations.

## Measured storage and runtime

22 timing frames share **11 distinct images**. The complete watch resource is
**5,732 bytes**, including 100 bytes of palette/timing metadata. Four-bit indices
include a transparent index; five colors plus transparency fit in this format.
Each unique image is 512 bytes. The renderer reads a **16-byte row buffer** and
never allocates a decoded bitmap or spritesheet. Switching characters clears its
state and selects the new resource.

`verification/report.json` records emulator heap, drawing time and the exact PBW
hash. Build footprint includes code/static data and is separate from live heap.
Most draw samples were 6–10 ms, but wall-clock timing also recorded occasional approximately one-second outliers, including without screenshots. Their cause is unresolved; no hardware responsiveness or battery-life claim is made. These are standalone demo measurements, not the marginal cost inside the reader.
Before integration, measure the same reader baseline and modified build through
long reading, episode downloads, resume, switching and completion tracking.

The packer reports a base-plus-pixel-patch estimate as well as indexed full-frame
storage. The current bounded row renderer favors predictable memory and simpler
validation; patch indices and render costs are not represented in that estimate.
The provisional resource ceiling is 16 KiB per character. GIFs are never bundled.

## Reproduce

Python 3.9+ and Pillow; Pebble SDK 4.44 for the demo:

```
python3 animate_chibi.py
python3 prepare_watch.py
python3 previews.py
python3 pack.py characters/alden-chibi/watch/manifest.json characters/alden-chibi/watch/packed
python3 -m unittest discover -s . -p 'test_*.py'
cp characters/alden-chibi/watch/packed/character.px32 demo/resources/alden.px32
(cd demo && pebble build)
python3 verify.py
```

`verify.py` and `isolated_cli.py` use only `.local/emulator/`; they do not reset or
use the normal emulator. Set `PEBBLE_PYTHON` for another SDK Python installation.
Source frames with wrong size, partial alpha, out-of-palette colors, invalid timing
or excess resource size fail validation. No automatic resizing or recoloring occurs
inside the packer. `prepare_watch.py` owns the explicit palette conversion.

## Generation spending

The original pilot used three RD Plus Classic 32×32 outputs at $0.025 each and one
RD Animation `small_sprites` output at $0.07: **$0.145 at the verified published
rates**, within the $1 Alden cap. These are calculated charges, not an invoice.
No additional Replicate calls were needed to animate the approved Chibi design.
Built-in ImageGen produced the later user-requested style studies; this ledger only
tracks Replicate requests. Tokens are never committed or printed.

Prices were verified 2026-11-14 on [RD Plus](https://replicate.com/retro-diffusion/rd-plus#pricing)
and [RD Animation](https://replicate.com/retro-diffusion/rd-animation#pricing).
`generate.py` reserves charges before each explicit request and never retries a
paid request automatically. Recheck prices on later dates; ambiguous failures stay
reserved. Read-only polling can recover existing results without buying variants.

## 48 × 48 comparison

`preview-48/32-vs-48.gif` compares all six reactions at the same displayed size: 32px enlarged 6× and 48px enlarged 4×. The comparison GIF loops; the individual 48px GIFs play once. `characters/alden-chibi-48/` retains the 22 exact 48×48 five-color frames and timing manifest. `compare48.py` derives new pixels from the original high-resolution source, then edits facial clusters at the target resolution. This is a design comparison, not a new watch installer. Four-bit raw pixels would occupy 1,152 bytes per unique frame (2.25× the 32px version); actual packed storage and runtime performance require a separate build.
