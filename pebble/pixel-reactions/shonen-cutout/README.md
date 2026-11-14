# Alden — six Shōnen cutout animations

David selected option 2 from the retained expression reference: a slim youthful
face, neater brown hair, pale skin, charcoal hoodie and light-grey T-shirt.
The neck is shortened by seating the head lower in the collar.

Animations: blink/idle, surprised, thinking, talking, laughing, worried/confused.
Each runs for 1.8 seconds at ten preview frames per second and holds its final pose.
The blink and talking actions settle back to their resting face; the other four
hold the expression. There is no continuous idle animation.

## View

Open `preview/index.html` for individual Replay buttons and Replay all.
`preview/six-shonen-reactions.gif` loops for comparison only.
Each individual GIF and animated SVG in `preview/` plays once, then holds.
The SVG uses time-based visibility changes between vector poses for a portable
preview. It is not the format to ship unchanged on Pebble.

## Reuse

`rig.py` owns the shared geometry and animation parameters. `master.svg` is the
resting design; `manifest.json` contains the six motion parameter sequences.
Per-emotion folders retain editable SVG poses and rendered PNGs.

There are five design-color roles: outline, hair, hoodie, shirt, skin. White eyes
are transparent apertures through both the face and rear hair shapes; use a white
background for the intended appearance. SVG antialiasing produces intermediate
raster colors. These previews are not yet quantized to Pebble's hardware palette.

```
python3 rig.py
node render.mjs
python3 package.py
```

Requires Pillow and Sharp (available through the parent Pebble tooling package).
`package.py` validates every SVG, checks dimensions, verifies motion changes the
rendered frame and verifies that the ending frames remain identical. Browser QA
confirmed all six play and hold, individual replay leaves other cards held, and
Replay all restarts and finishes all six. Frame selection clamps to zero to handle
requestAnimationFrame timestamps slightly preceding the play callback's timestamp.

## Watch status

These are actual animated GIF/SVG assets and a reusable vector rig, not static
expression concept art. They are **not yet a native Pebble app or reader update**.
For native conversion, store base shapes once, animate feature parameters, cancel
timers after the final pose and measure inside the reader. Do not ship all these
rendered PNG frames or parse arbitrary SVG at runtime. Existing story text, saves,
catalogue and installed PBWs remain untouched. No new Replicate generations were
used for these animations.
