# Alden — three animation techniques

Open `index.html` for a synchronized 1.8-second reaction: neutral → surprised →
embarrassed → held. Replay all, inspect either expression, or scrub the timeline.
`three-styles.gif` loops for comparison; the three individual GIFs are one-shot.

1. **48px pixel:** the approved five-color Chibi artwork with discrete pose changes.
2. **Flat cutout:** editable SVG shapes; eyebrow/eye/mouth parameters and head rotation.
3. **Detailed portrait:** a new ImageGen portrait based on the approved full-app
   hoodie reference. Its hair, clothes and head stay still while local facial
   deformation, mouth opening and cheek color convey the reaction.

All three retain pale skin, a charcoal hoodie and a grey T-shirt. Pixel and cutout
share the same design color roles; detailed art deliberately retains its shading.
The variants share a 200×228 presentation canvas and timeline. Head proportions
still differ with the style, so this is an art-direction comparison, not a controlled
rendering benchmark. SVG previews are rasterized for frame matching; a final cutout
watch implementation would animate reusable parts instead of shipping these PNGs.

These are local/browser design previews, not a PBW, hardware palette conversion,
or a measurement of watch memory/CPU/battery use. No reader or watch saves changed.

Reproduce with Pillow and Sharp:

```
python3 make.py
node render.mjs
python3 package.py
```

`validation.json` verifies dimensions, distinct neutral/surprised/embarrassed poses,
and identical held frames. Browser checks confirmed Replay returns from the held
pose to the start and then holds again, and both expression buttons select the
matching timeline time. Source artwork and per-frame SVGs are retained.
