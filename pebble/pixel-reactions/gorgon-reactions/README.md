# Gorgon — six restrained reactions

Approved existing neutral, attentive, thoughtful, skeptical, serious and amused
expressions, preserved at 64×64 with one shared eight-colour palette. Near-white
background pixels are consolidated before quantization. Original PNGs are retained
in source/. No paid image or video generation was used.

[Interactive replay](preview/index.html) · [Held poses](preview/held-poses.png)

Neutral is deliberately still. The other five reactions start neutral, change to
the existing authored pose after 350 ms, and hold. These are limited pose-change
animations, not interpolated facial acting. There are no invented blinks, eye
rolls, human mouth cycles or automatic direct eye contact. Use amused only where
the story supports it. Individual GIFs play once; the comparison GIF loops for
review. The HTML embeds all artwork and provides individual/all replay controls.

Complete poses preserve Gorgon's changing head angles and nonhuman anatomy more
faithfully than transplanting human eye/mouth patches. The compact resource shares
identical 8×8 pixel tiles across all six poses instead.

## Measured storage

- Artwork including palette, tile dictionary and six pose maps: **7,664 bytes**.
- Finite timing table: **66 bytes**.
- Total: **7,730 bytes** (7.55 KiB).
- Six independent uncompressed 3-bit pixel planes alone: 9,216 bytes.

This is larger than the approximately 2.6–2.8 KB human facial-patch packs, but
retains all six approved full-pose silhouettes. These are resource-storage counts,
not measured RAM or watch performance. Decoder code is excluded.

GT64 v1 stores magic, version byte, pose-count byte, little-endian uint16 tile
count, eight RGB palette entries, 24 bytes per 8×8 tile (three bytes per row,
most-significant pixel first), then six row-major arrays of 64 uint16 tile IDs.
GM64 v1 stores magic, version, reaction count, then step-count/hold bytes and
little-endian uint16 milliseconds plus uint8 pose ID for every step.

Run `python3 pebble/pixel-reactions/gorgon-reactions/build.py` then `verify.py`
from the app repository. Verification independently decodes the packed tiles and
timing data, compares all 16 exported timeline frames pixel-for-pixel, checks the
eight-colour limit and ensures individual GIFs have no looping extension.

**Asset previews only:** this format requires a native decoder and hardware-palette
conversion before installation. No reader code, PBW, saved progress or episode
content was changed. The eventual reader must hold the last pose until a fresh
Select press. Browser previews do not test native memory or performance.
