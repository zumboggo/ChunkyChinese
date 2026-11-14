# Alden facial reactions — first prototype

A separate, offline Pebble Time 2 (Emery) app with its own UUID. Install
`alden-reactions-v1.0.0.pbw` through the Pebble phone app. It does not replace
Chunky Chinese or read/write its progress. No phone service or account is needed.

- Up: cycle Smile → Raised eyebrow → Surprise.
- Select: replay the selected expression.
- Down: toggle the original still portrait for comparison.
- Back: exit.

Each reaction establishes a neutral face, moves the features, then holds. The
960 ms sequence requests updates every 80 ms; no timer remains once held.
Losing focus cancels the timer, and returning resumes the remaining motion.

## Artwork and reuse

The existing Alden warm portrait is reused unchanged as a 2,144-byte RLE resource.
Interior skin patches cover the baked-in facial features before drawing brows,
eyes and mouth. Hair, clothing, silhouette and most facial shading stay intact.
The drawing and timing are native C; there are no full-screen animation frames,
decoded bitmap allocations, network assets, or paid image/video requests.
All three expressions reuse the same base and 512-byte streaming buffer.
Repeating a reaction adds no artwork. This is one fixed head pose; adding another
pose requires its own feature placement and potentially another base portrait.

This first pass deliberately uses procedural shapes rather than polished feature
sprites. The next visual decision is whether this is expressive enough at actual
watch size; more detailed eye/mouth patches remain possible.

## Measured costs

SDK 4.44 / Emery, see `verification/size-report.json`:

| Measurement | Animated | Static control |
| --- | ---: | ---: |
| Raw portrait payload | 2,144 bytes | 2,144 bytes |
| SDK resource package including overhead | 6,252 bytes | 6,252 bytes |
| SDK RAM footprint, including loaded code/static data | 3,888 bytes | 2,637 bytes |

Animation adds **1,251 bytes** to that build footprint, not 1,251 bytes of decoded
frames. Both variants retain the 512-byte streaming buffer. The control removes
facial drawing and timer scheduling while retaining the same app shell/controls.
This is a standalone comparison, not the marginal cost inside the Alloy reader.
The reader's peak heap still needs measurement when integrating.

Emulator checks passed for all three expressions, deterministic replay, unchanged
held screens, original-image comparison and repeated controls. Observed minimum
free heap was 126,876 bytes; maximum logged draw time was 6 ms. These are emulator
measurements, not battery life, physical-watch performance or reader headroom.
Final poses are in `verification/`. No physical-watch testing has been done.

## Reproduce

With the Pebble SDK installed:

```
pebble build
python3 measure.py
python3 verify.py
```

The Python helpers currently use David's installed CLI path. `measure.py` cleans
and rebuilds only this prototype and a disposable static control. `verify.py`
installs only this app into the existing Emery emulator; it never resets flash or
changes reader saves. Focus pause is implemented but not automated in that suite.
The verification report records the exact tested PBW SHA-256.
