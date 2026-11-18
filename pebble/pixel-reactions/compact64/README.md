# Alden 64 × 64 facial-patch comparison

Same approved artwork and reaction as the larger prototype:
**neutral → shocked → embarrassed → small smile**. The hoodie stays fixed;
the head moves at most one native pixel. Playback holds on the final smile.
The GIF loops only to make comparison convenient; the HTML and watch play once.

Open [the synchronized preview](index.html), [two-way GIF](comparison.gif), or
[three-way GIF including the previous prototype](three-way.gif).
The previews use the emulator's measured display-colour lookup table, so pale
skin and brown hair are represented more faithfully than raw RGB channel values.
Both designs use flat colours with no dithering. Small mouth/blush marks that
would disappear during reduction are restored as deliberate pixel clusters.
The native image is 64×64, displayed at 192×192 on the watch using nearest-neighbour
3× scaling; the comparison preview enlarges to 256×256 per character.

## Actual storage

| Version | Artwork resource, including palette/headers | Reduction from previous |
|---|---:|---:|
| Previous 200×228 layered prototype | 45,244 bytes | — |
| 64×64, 16 palette entries | 3,872 bytes | 91.44% |
| 64×64, 8 palette entries | 2,990 bytes | 93.39% |

The 8-entry version saves another **882 bytes (22.8%)** compared with 16 entries.
Counts include transparent index zero: up to 15 or 7 visible colours. The current
16-entry art actually uses 10 visible colours; the 8-entry art uses all 7.
Unused entries reserve palette roles, not extra image data beyond the fixed 4-bit
format. Both versions contain the same 13 layers and four expression poses.
These are measured resource bytes, not PNG/GIF sizes or six-reaction estimates.

Each cropped patch stores x/y/width/height plus packed rows. The 16-entry version
really uses 4 bits per pixel, and the 8-entry version really uses 3 bits per pixel;
it is not an 8-colour image retained in a 4-bit container. Rows are padded to whole
bytes. Offset tables and palettes are included in the figures above.

## RAM and execution

The reader still reuses its existing **512-byte streaming buffer**, and allocates
no decoded frame or sheet. The palette uses a small local array on the already
reserved native stack. Smaller artwork saves flash, not that existing buffer.
Both final lab builds have a measured native code/data footprint of **27,876 bytes**,
the same as the previous prototype. Runtime minimum free heap and actual PBW
hashes are recorded in `measurements.json` and each variant's verification report.
All final runtime passes left **4,020 bytes free**, matching the prior prototype.
The 16-entry build has **57,184 bytes** of resource budget remaining; the 8-entry
build has **58,066 bytes**, versus 15,812 bytes previously. The build-time free-heap
estimate is not the running reader's available heap.

The full-reader lab retains the old portraits, fonts, Episode 13 and animation
engine, so this is not a lightweight standalone renderer benchmark. Each variant
has a separate lab UUID; the normal reader and its release PBWs remain unchanged.
Back opens the menu; **Alden prototype** starts the test. Down replays, Select
returns once held, Back leaves at any time. The lab does not yet replace story
reaction cues. Physical watch, network/catalogue operations and focus interruption
are not certified by these tests.

Tests verify resource round-trip decoding, palette limits, fixed torso, finite
hold, three identical replays, returning without advancing the reading position,
and preview after reading. A separate comparison proves native pixel geometry
matches the decoded expected image, allowing the emulator's display colour table.
Timing uses the SDK wall clock, which has previously shown second-boundary errors;
reports retain raw readings and flag anomalies rather than treating them as CPU time.

## Sharing with Jeremy and Bo

Yes: the same **nose, mouth poses, blinks and eye shapes** can be shared as indexed
patches. Use character-specific placement and palette mappings. Keep head shape,
hair, outfit, eyebrow character and distinctive details in each character's base.
For different eye spacing, split the current eye-pair patches into individual eyes;
don't duplicate the complete sheet or stretch the whole face.

The current prototype has a shared-ready one-pixel nose, eye pairs, and combined
brow/mouth overlays. The latter should be split into independently positioned
mouth/brow pieces when adding another character. This may also remove empty space
inside patch bounds. Skin/tongue/ink indices need consistent semantic roles before
cross-character reuse; unique palettes can then recolour the same packed data.

This is a feasible library design, not a claim that Jeremy/Bo have already been
adapted or visually tested. Their distinctive expression variants can remain
character-specific. The nose alone saves almost nothing; reusable eyes/mouths
and a shared native renderer provide the useful savings.

## Reproduce

From the app root, run `python3 pebble/pixel-reactions/compact64/build.py`.
This derives both variants from the retained approved hybrid source layers;
there are no new image-generation calls or paid API requests.

For each COUNT (16 or 8):

1. Run `python3 pebble/pixel-reactions/compact64/native.py` to generate the decoder.
2. Run `python3 pebble/pixel-reactions/compact64/stage.py COUNT`.
3. Run `node pebble/pixel-reactions/compact64/compile.mjs COUNT`.
4. Run `pebble build` inside `pebble/pixel-reactions/.local/compactCOUNT-reader`.
5. Run `python3 pebble/pixel-reactions/compact64/verify.py COUNT`.

Run emulator verification sequentially. It synchronizes emulator startup before
attaching logs; it exclusively uses the existing isolated CLI/profile, never the
normal emulator or physical watch. The staging and verification helpers reuse the
prior hybrid prototype's checked-in scripts. Run `package.py` after both pass to
verify native pixels, record measurements and freeze the two lab PBWs. Packaging
refuses to replace a versioned PBW with different bytes.

Run `compare.py` to regenerate the three-way native-size GIF. Final 16-entry draw
samples were 3–10 ms (median 8); ordinary 8-entry samples were 2–10 ms (median 7),
with four clock anomalies retained in its log. These are emulator observations.
