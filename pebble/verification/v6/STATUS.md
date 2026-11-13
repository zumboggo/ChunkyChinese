# Downloadable animation recipes — v1.6.0

Candidate bundles Episode 12, content version `8c071e11b3d4`. Episode 11 and the
existing phone releases remain unchanged. Install this PBW once; subsequent
compatible story packages can deliver new bounded motion through Refresh.

## Capability

Inline recipes control the head and right arm of the installed Gorgon, Boe and
Jeremy rigs, with cup/no prop and supported setting/ambience combinations.
They are single-character data records, not executable code or arbitrary rigs.
New characters, drawing channels, unsupported props, fonts and bundled images
still need a native release. See `../../scenes/downloadable.md` for the schema.

## Automated and browser checks

- Clean Episode 12 build: 70 reader/exporter/route/save/transfer tests passed.
- Font audit: all 139 required Latin glyphs and 779 Chinese-font glyphs
  (640 Han plus punctuation/Latin) present.
- Native C decoder and host validator agree across malformed, setting/ambience
  and arm-reach cases. Old runtimes reject unknown downloadable scenes.
- Train, ensemble, episode review and downloadable-recipe browser suites passed.
  The changed recipe preview moves, holds, replays, pauses and exports losslessly.
- Source prose, reviewed annotations and all 16 routes remain covered.

## Native verification

- All 30 compiled scenes passed held-pose, menu and frame-budget checks.
  Sampled held native heap was 3388 bytes; maximum sampled draw was 62 ms
  (within the 83 ms gesture-frame budget). Saved position and motion preference
  survived reinstalling the exact candidate.
- Two previously uncompiled recipes transferred and played without rebuilding.
  Repeated playback held at 3388 bytes free; the second recipe held at 3452 bytes.
- Downloaded motion paused both clocks during notification focus loss, resumed,
  and replayed. A same-ID recipe update replaced the on-screen held motion.
- Invalid recipe rejection and interrupted-transfer reinstall retained the prior
  episode and exact text position. Downloaded motion played with Bluetooth off.
- One complete Episode 12 route reached the ending with Bluetooth disabled,
  including all six source-directed animations, without runtime or save errors.
- Native 200 × 228 screenshots were inspected for character silhouette and cup contact.

Reports and screenshots accompany this document. The first full catalogue run
stopped because a scene-start log arrived after its 8-second harness timeout;
its log showed normal playback. The rerun used a 20-second default and passed.
Emulator evidence is separate from physical-watch verification: no connected
physical watch was used. Battery impact and real-watch readability remain for
David's installation feedback.

The runtime reserves 34 KiB slots, 14 KiB chunks and 4 KiB stack. Numeric FFI
transfers bounded recipe integers; an SDK string-handle bridge failed during
prototyping and is not used in this release. Legacy index maps use compact strings
to avoid transient array allocation during startup.

## Skill workflows

The Chinese Episode skill routes unchanged recipes to catalogue reuse; supported
new movement to inline recipe review/content export; unsupported movement to a
scoped native extension. Export still requires a matching verified runtime and
complete glyph/art/graph coverage. Ordinary phone episodes keep their audio and
art defaults. The newer five-moment and reaction-shot preferences are preserved.
Skill frontmatter validation and local reference-link checks passed.

Installer SHA-256: `4f414adcc2d5a0b1d52696713066dd5daf801544e022e197a919933d475ef3d9`.
