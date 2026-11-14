# Cutout feasibility — 2026-11-14

The head is lowered by eight screen pixels in every pose, so it overlaps the neck rather than appearing detached. Rebuilt previews retain stable final poses.

Current evidence (art data excludes renderer code, SDK resource headers and runtime allocations):

- The existing six 48px pixel reactions have ten unique images: 11,520 bytes of 4-bit pixels, or approximately 11,620 including the prior format's 100-byte metadata header. A native 48px build is still pending. The single comparison reaction could reuse three poses plus an offset for the recoil: approximately 3,456 pixel bytes, with timing metadata additional; baking the recoil as a fourth image would be 4,608.
- The cutout neutral SVG is 1,910 bytes of source and about fifteen shape elements. This is NOT a compiled Pebble resource size. Store the shapes once and change feature positions, angles and a few paths; do not store the rendered PNG/GIF frames on the watch. A few kilobytes of character shape/motion data is a planning estimate, not a measured native result.
- The detailed comparison's 200×228 neutral base calculates to 14,328 bytes using the reader's 64-color row-run resource format (white compositing, two-byte run pairs and repeated-row compression). Facial assets/animation data would be additional. Its current browser deformation pipeline is not a native Pebble implementation.

RAM is separate from storage. A 48px indexed row is 24 bytes; its timing metadata and controls are additional. Existing static portraits stream through a 512-byte buffer. A native cutout needs working path/pose data and renderer code; it is not guaranteed to use less RAM than the streaming sprite approach. Detailed animation can stream a base and use small feature overlays, but the current full-image browser warp should not be ported directly.

A native cutout running around 10–12 frames/second for a short reaction, then cancelling its timer, is a reasonable target. Pebble provides native path/primitive drawing and interpolated animation. The full reader's available heap, drawing time and button response must be measured before calling this smooth or memory-safe on hardware. Larger/path-heavy artwork is not automatically cheaper to draw.

Official references:
- https://developer.repebble.com/guides/graphics-and-animations/vector-graphics/
- https://developer.repebble.com/guides/graphics-and-animations/animations/
