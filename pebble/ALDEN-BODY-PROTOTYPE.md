# Alden matching-body prototype — v1.15.1

Based on the verified reading-controls v1.14.2 branch (`c581f7c5`). This isolated
prototype retains the offline queue, clock, reading controls, story IDs and saves.
It does not replace or merge concurrent reader work automatically.

Review `preview/alden-body/index.html`: before is left, prototype is right. The
three comparisons show resting, interrupted sip, and protective eye cover at
200 × 228 per watch and at 3× nearest-neighbour enlargement. GIFs play once, then
hold; Replay starts them again. The cup still shows the sip pause rather than the
lowered final cup. The watch retains its original timing, replay and Select guard.

## Artwork and storage

Alden's original face, hair, facial patches, palette and close-up artwork are
unchanged. The torso continues the last visible hoodie row on the same logical
pixel grid. Reusable sleeve, cuff, palm and grip pieces match that grid at 2× scene
scale. Shoulders remain in the original portrait; cuffs hide the hand joins.

`pixel-reactions/alden-body/` contains the eight-colour source pieces, packed data,
manifest, builder, and built-in imagegen reference and exact prompt. The reference
informs the clothing extension; it does not replace the original face pixels.
Sleeve rotations are pre-rasterized into 16 directions and three lengths, with
small proximal overlap concealed by the torso. Wrist anchors and cup attachment
retain existing timelines; positions snap to the scene's logical pixel grid.

The appended artwork is **13,195 bytes**. Original resource bytes remain an exact
prefix. Packed pieces use the existing 512-byte resource cache, plus an eight-byte
cached palette; no full-frame buffer or per-frame allocation is added. Repeated
identical rows are stored once and drawn as taller runs. The extended flags are an
internal PBW resource detail, not a new downloadable-episode format.

For RAM headroom, fixed and hand-relative geometry commands/vertices stream from
flash. Their native/browser pixels are tested for equality. The compiler uses
GCC's size optimization `-Oz` with the existing LTO setup. JavaScript pool sizes are
unchanged. Connection suspension explicitly collects discarded status strings,
so repeated reconnect callbacks do not leave those temporary allocations pending. Measured release numbers and exact installer hash are recorded under
`verification/alden-body-v1.15.1/`.

## Scope and compatibility

Other characters and every close-up reaction are unchanged. The prototype applies
Alden's shared torso and single-hand pieces wherever his installed/downloaded
scenes use them, and pixel palms to his eye-cover/peek poses. The separate folded-
arms performance retains its existing arm geometry pending visual review.
No new story placements, scene IDs, actor IDs or episode schema are introduced.

This is emulator-verified artwork, not a claimed physical-watch memory fix.
Install the prototype only to review this branch; preserve any newer memory-fix
installer supplied by the other work. Existing QEMU Bluetooth reconnect tests
require an app relaunch, as documented by the base build.

## Rebuild and verify

1. `npm run art` and `npm run scenes` regenerate packed assets.
2. `npm run build -- supportive-13` builds and runs unit/source checks.
3. `node scripts/test-visual-novel-preview.mjs` verifies 570 exact frames.
4. `python3 scripts/preview-alden-body.py --baseline <v1.14.2-pebble-checkout>`
   builds comparisons and verifies 243 unchanged close-up/other-character frames.
5. Run native scene and download suites on dedicated emulator stores. The offline
   suite's `--exercise-body` option completes a prefetch during eye-cover playback
   and exercises all three prototypes with five episodes cached.

Acceptance retains at least 12,288 bytes measured free heap and no increase over
v1.14.2's measured VM pool peaks (strings 9,132; slots 34,800; stack 3,744 bytes).
Prototype scene averages must fit the 12 fps target (83 ms rounded); individual emulator stalls are retained in the reports (250 ms regression ceiling). Raw timing reports
remain available; this is not a guarantee of physical-watch frame rate.

## Final size measurements

The installer is 269,422 bytes. Resources grow by 13,818 bytes (including 13,195
bytes of body artwork); native code plus static data grows by 53 bytes, of which
eight bytes are the palette cache. VM pool reservations are unchanged. Run
`python3 scripts/verify-alden-body-release.py` to check the retained evidence and
recompute the measured heap and VM peaks.
