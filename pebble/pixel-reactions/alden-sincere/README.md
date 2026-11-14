# Alden — Gentle Sincerity: six animations

User-selected direction: **Gentle Sincerity** is the character baseline and
laugh; **Bright Curiosity** provides the shocked eyes and mouth. Both approved
64px reference images are preserved under `source/`. No new paid generation
or new face design was used. The same hoodie, haircut and warm peach RGB palette
are shared across all reactions.

[Open the interactive preview](preview/index.html) or [six-animation GIF](preview/six-animations.gif).

| Animation | Action | Final hold |
|---|---|---|
| Blink | Two brief blinks | Attentive resting face |
| Surprised | Eyes widen, small upward recoil, open mouth | Selected curious shock |
| Thinking | Sideward gaze, slight head dip, blink | Thoughtful gaze |
| Talking | Small, open and closed mouth shapes | Warm resting face |
| Laughing | Eyes soften shut, two gentle laugh bounces | Selected sincere laugh |
| Worried | Concerned mouth, glance, blink and slight dip | Earnest concern |

All six play once and hold. The overview GIF loops for comparison only; individual
GIFs and HTML players are finite. Every individual frame is **64×64**, with no
more than **eight RGB colours including white**. The canvas preview enlarges
pixels without smoothing. No reading text or story progression is part of these
assets.

## Reuse and storage

One cropped fixed body, one cropped head with a 1-bit transparency mask, and small
3-bit indexed facial tiles. The selected laugh tiles are exact reference crops;
the selected shocked features are aligned to the baseline head. Resting eyes
retain the selected iris shapes. The other actions change eye/mouth patches and
integer head offsets, without duplicating full head/hoodie frames in the packed
library. The eight-colour palette contains white for eye whites and backdrop;
the head mask is separate, so transparency does not consume a ninth colour.

Measured files:

- `alden-sincere.bin`: **2,421 bytes** including RGB palette, headers, offsets,
  head mask, body and facial patches.
- `alden-sincere.motion`: **216 bytes** for all six timelines (31 steps).
- **Combined packed assets: 2,637 bytes.** PNG/GIF/HTML file sizes are unrelated
  to this resource measurement. Runtime decoder code/stack are not included.

The compact binary format is a design-asset format, not the previous lab's
on-watch resource format. The warm source RGB colours have deliberately not been
remapped to Pebble's hardware palette. **No new PBW is installed or supplied in
this pack, and native memory/performance have not been measured for this pack.**
Hardware palette handling and renderer integration remain a separate step; do not
claim these colours or the full packed cost are already reproduced on the watch.
The current watch reader, episode assets, progress and releases are unchanged.

Future characters can reuse facial shapes and timing recipes with appropriate
anchors and palette mapping. Character bases stay separate. These assets are not
proof of correct anatomy/expressions for another cast member.

## Verification and regeneration

Run `python3 build.py`, then `python3 verify.py` in this folder. Verification:

- Independently decodes every packed tile and reconstructs all **31 frames**.
- Confirms pixel equality with authored PNGs, 64×64 bounds and colour limits.
- Checks all six motion tables, durations and final-hold flags.
- Checks individual GIFs have no looping extension.
- Generation asserts the lower torso does not move between frames.

Browser review verified all six reach Held, Replay All restarts all six and
returns them to Held, and individual Laughing replay leaves the other five held.
`verification.json` records machine-checked asset results. Each animation folder
contains numbered native frames; `preview/` contains GIFs, an offline HTML player
and a held-pose contact sheet. Source references and generator are retained for
future adjustments without extra image generation.
