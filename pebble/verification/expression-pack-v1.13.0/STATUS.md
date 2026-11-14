# Expression and hand pack — v1.13.0

Verified Emery PBW: `release/chunky-chinese-time2-supportive-13-v1.13.0.pbw` (238,851 bytes).
SHA-256: `f26407e154292d69917a5ec3f6c829afb4084b80b2713fa9fe6e27ecf7443235`.
Source branch: `codex/pebble-expression-pack`, based on the approved v1.12 reader at `8267558c`.

## Scope and compatibility

- 18 added facial performances: 53 total, across six approved pixel profiles. IDs 1000–1034, all original aliases, six palettes and 69 original artwork parts are unchanged. New IDs are 1035–1052.
- 12 added installed scenes: protective cover and cover-and-peek for five human profiles, plus Alden's folded-arm chin rest and interrupted sip. Scene IDs 1–30 retain their bindings; additions are 31–42.
- Gorgon retains open, averted eyes. Young Alden and Gorgon use sparse overlays rather than duplicate portraits. All reactions finish and hold; no per-frame allocation or full-frame art buffer. The shared cache remains 512 bytes.
- Existing story content, placements and save mappings are unchanged. The bundle remains Episode 13, content version `6b319cc93962`.
- Download recipe schema 1 is unchanged. Two-hand performances arrive as installed scene references, not new downloadable channels.

## Measured acceptance budgets

| Measurement | v1.12 baseline | v1.13 expression pack | Change / acceptance |
| --- | ---: | ---: | ---: |
| Resource package | 136,122 B | 140,277 B | +4,155 B; limit +8,192 B |
| Native code + static RAM | 17,390 B | 18,358 B | +968 B; limit +2,048 B |
| Native static data (data/GOT/BSS) | 1,216 B | 1,232 B | +16 B |
| Shared art and timings | 29,256 B | 31,949 B | +2,693 B |
| Minimum measured live free heap | — | 13,376 B | minimum required 12,288 B |

The remaining 952 bytes of native growth are code. Native footprint is not the whole application's runtime RAM use; free heap was sampled in the combined reader and transferred-scene tests. All byte/heap gates pass in `metrics.json` and are enforced by `scripts/verify-expression-release.py`.

Scene draw averages span 24–45 ms; maximum observed scene draw is 178 ms. The 12-fps target is about 83 ms, so some individual emulator frames exceed it. The suite bounds stalls at 250 ms and retains every maximum. Reaction maximum is 74 ms. These are emulator wall-clock measurements, not physical-watch timing or battery certification.

## Verification

- 96 unit tests passed; authoring preview controls passed.
- 570 exact native-C/browser frame comparisons: 42 scenes and 53 reactions, including transition/held frames and both reaction display scales.
- All 53 emulator final portraits match independent decoding with a consistent hardware display-colour mapping. Original parts, timelines, palettes and aliases pass the legacy fingerprint oracle.
- All 42 installed scenes pass movement/final holds, sampled replays, independent background motion, saved motion preference and reading-position/reinstall checks.
- 26 schema-1 recipe transfers cover all six actors and their four supported gestures, plus update fixtures. Focus clocks, offline playback, invalid/interrupted update recovery and repeated holds pass. One bounded transport retry occurred and is retained in the report.
- All 12 new installed hand scenes were additionally referenced by transferred episodes and played/held successfully; each held with 13,572 B free heap.
- The 21,489-byte full episode transfer passed interrupted restart, bad/incomplete data rejection, duplicate END handling, title/reaction overlays and restored reading position with zero transport retries.
- Faces were visually reviewed at 64px, 2× and 3×. Both palms cover the eyes on every human; final peek exposes one eye. The interrupted cup stays upright below the mouth and lowers without a drink. Folded arms visibly support Alden's chin.

## Delivery and separate offline-library work

The v1.12 PBW is preserved with SHA-256 `e4ffd4bf2feb6fbec7265ebf370acedb1283e6c831e234b55b1366c5699865f9`.
This release was isolated from concurrent unfinished offline-library changes, whose combined prototype did not meet this task's 12 KiB heap gate. It does not claim the offline queue. Check the exact PBW hash, not version alone: another chat prepared a separate v1.13 variant. These share the app UUID, so installing one replaces the other; installation order does not combine their features.

See [native previews](../../preview/expressions/index.html) and [authoring guide](../../scenes/EXPRESSION-PACK.md). Future food-container, writing and phone-call ideas remain spoiler-contained notes, not implemented actions or new episode placements. Physical-watch installation and testing remain David's separate action.
