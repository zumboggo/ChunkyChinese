# Bo and Jeremy — selected 64px reactions

**Reader v1.10.0:** these selected assets now feed the installed-animation build.
See [native integration](../INTEGRATION.md) and the new PBW release evidence.
The older standalone-preview limitations below describe the source packs.

Twelve completed animation assets, six for each character, in the same
64×64/eight-colour format as Alden's Gentle Sincerity set.

- **Bo (Boe):** Keen Curiosity is the base, shock and laugh reference. Round
  glasses, shaggy dark hair, tan scarf and teal jacket remain recognizable.
- **Jeremy:** Playful Spark is the base and shock reference; Big-hearted Energy
  supplies the laughing facial regions. The base haircut, freckles and sleeveless
  shirt stay fixed rather than swapping to another whole-character drawing.

[Open the comparison page](index.html), [Bo's replay controls](bo/preview/index.html)
or [Jeremy's replay controls](jeremy/preview/index.html).

Each character has **blink, surprised, thinking, talking, laughing and worried**.
All play once and hold. The overview GIFs loop solely for review; individual GIFs
and interactive players are finite. No emotion plays behind reading text or
advances story progress. These are asset previews, not a reader integration.

The selected reference PNGs are retained under each `source/` folder. There were
no new paid image/video generation calls. Resting eyes retain the approved iris
shapes; small look offsets remain within the eye/lens regions. Nose/freckles stay
in the character head rather than being replaced with Alden's features. Head/body,
facial patches, PNG frames, palette, timing manifest, finite GIFs and a compact
resource are included for each character.

## Measured asset storage

| Character | Packed art | Motion table | Independent total |
|---|---:|---:|---:|
| Bo | 2,581 B | 216 B | **2,797 B** |
| Jeremy | 2,544 B | 216 B | **2,760 B** |

The two motion files are byte-identical. `shared.motion` provides that table once;
using it with the two artwork files totals **5,341 bytes**, versus 5,557 bytes
for two independent packs. Standalone copies remain available for convenience.
These counts include palettes, offsets, crop bounds, head masks and timing data,
but exclude native renderer code and runtime overhead. No RAM or performance
measurement is claimed for these new packs.

Eight-colour RGB design palettes are preserved. White is one palette entry; the
head has a separate one-bit transparency mask. This is the existing `AS64`/`MS64`
asset format from `../alden-sincere`, not a drop-in resource for the old watch
renderer. **Hardware palette conversion, native integration, a new PBW and watch
installation are still pending.** Existing reader code, releases, saved reading
positions and phone episodes have not been modified.

## Verification

`build.py` reuses Alden's generation/packaging/playback stage and supplies the
selected character-specific head/body masks and facial regions. `verify.py` reuses
its independent packed-resource decoder. Run both from the repository root:

```sh
python3 pebble/pixel-reactions/cast-reactions/build.py
python3 pebble/pixel-reactions/cast-reactions/verify.py
```

All **62 frames** were independently reconstructed from packed assets and compared
pixel-for-pixel with the exported PNGs. Checks cover bounds, eight-colour limits,
timings, hold flags, finite GIFs and fixed lower torso. Each character's
`verification.json` records resource hashes and measured sizes.

Browser review confirmed all twelve players reach Held, Replay All restarts and
holds each character's six animations, and individual Bo shock/Jeremy laugh replay
leaves the other five players held. The HTML files embed their images and work
offline. No physical-watch or emulator playback test applies to these source-colour
packs yet.
