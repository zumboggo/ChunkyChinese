# Compact reaction integration

**Visual-novel reuse (v1.12):** the same decoder and 512-byte cache now draw both 3× reaction shots and 2× characters over scene backgrounds. Exterior-only body masks preserve the original portrait pixels on white and make backgrounds visible around the silhouettes. The combined artwork/timing resource is now 29,256 bytes; the 23,959-byte figure below describes the original v1.10 integration. No second scene artwork resource is installed.


The reader replaces all 40 full-size static emotion resources with one streamed
29,256-byte reaction library. Original portrait masters remain in the repository;
they are not in the PBW. Opening and closing title-card artwork remains installed.

The library contains six reactions each for Alden, Hannah, Boe and Jeremy, the six
existing restrained Gorgon expressions, and five pose changes for Young Alden.
Young Alden preserves his existing child silhouette and yellow clothing. Gorgon's
neutral pose remains still; his eyes do not automatically blink or roll.

`build-native.py` compiles the approved source packs, timing tables, stable alias
map, native descriptors and preview catalogue. `hannah-sincere/build.py` generates
Hannah's selected Gentle Warmth pack using the established six-reaction timeline.
Keep source RGB palettes; native drawing maps to the nearest Pebble 2-bit/channel
colour, with Hannah's navy shirt explicitly mapped to Oxford Blue rather than
the nearest teal. Some source colours merge on hardware. Sprites display at integer 3× size
(192×192), with no smoothing or temporal dithering.

Human animation cues are blink, surprised, thinking, talking, laughing and worried.
Legacy warm/calm/neutral cues use the smiling resting/blink sequence; excited/amused
use laughing; thoughtful/skeptical/determined use thinking; sad/embarrassed/worried
use worried; curious/surprised use surprised. Legacy Gorgon and Young Alden cues
retain their own named expressions. These aliases preserve existing downloaded
content and its node indices; they do not rewrite episode text or saves.

The native renderer reads small packed rows and draws opaque runs and masked head
pieces directly. No full-frame image or per-frame allocation is needed. Timers stop
on the final pose and scene exit, pause on focus loss, and resume with the remaining
step duration. Select is ignored until completion plus a short fresh-press guard;
Down replays. The existing scene previews leave story progress untouched. New character reaction
previews are supplied as offline HTML/GIF files; the watch plays them within episodes.

Rebuild assets with `python3 pixel-reactions/build-native.py` from pebble/, then use
the maintained build/check/release commands. Native tests: SDK Python `scripts/test-reaction-emulator.py
--cli <isolated-cli> --emulator-info <isolated-emulator-info.json>` checks every reaction through a downloaded episode, holds, replay, focus pause, heap
and restoration of the original reading position.
The old scene suite and transfer tests must also pass for a release.

The artwork/timing resource is 64,628 bytes (68.8%) smaller than the removed emotion
resources. This is flash-resource savings, not a claim of that much extra RAM.
A new PBW is required once; Refresh alone cannot install this renderer or artwork.

Gorgon and Young Alden pose packs are normalized to cropped AS64 tiles for the
watch, so all six characters share one decoder. Native descriptors use bounded
16-bit offsets. Scene catalogue lookups use compact strings instead of persistent
JavaScript property tables; supported scene IDs and names remain unchanged.
