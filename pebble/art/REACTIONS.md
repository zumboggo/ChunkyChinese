# Reusable pixel reaction library

New: [32 × 32 five-color Chibi Alden animations](../pixel-reactions/README.md), based on David’s approved hoodie design. Six finite reactions, per-frame assets, previews and a separate Time 2 demo are available for visual review. They are not yet substituted for the released reader’s full-screen portraits.

Generated with the built-in ImageGen tool on 2026-11-14 for David’s Pebble reader. These are original adaptation assets, not official novel artwork. Source masters, crops and palette-packed resources are retained in this repository.

`reaction-atlases.json` is the machine-readable catalogue. Each sheet is a 3 × 2 grid in reading order:

| Actor | Expressions |
| --- | --- |
| Boe (Bo) | neutral, amused, skeptical, thoughtful, worried, surprised |
| Jeremy | neutral, warm, excited, thoughtful, worried, surprised |
| Gorgon | neutral, attentive, thoughtful, skeptical, serious, amused |
| Alden | worried, surprised, embarrassed, warm, curious, skeptical |

Boe’s glasses, dark bowl haircut, teal coat and tan scarf follow the existing cast interpretation. Jeremy retains his dark hair and off-white sleeveless outfit; that costume is scene-specific. Gorgon follows `stories/characters/super-supportive/gorgon-seated-v1.png`: gray skin, black averted open eyes, four-slit nose, no ears and swept horn collar. Alden follows the present-day charcoal-coat identity in `cast-atlas.png`. His older neutral, thoughtful, sad and determined portraits remain installed.

Machine-readable generation briefs and references: `reaction-generation-briefs.json`.

## Generation briefs

Four separate built-in ImageGen requests used the existing pixel atlas as a style reference. Gorgon additionally used his approved full-body image as an identity reference. Each requested six equally sized head-and-shoulder cells on white, no text or borders, consistent costume and identity, hard pixel clusters, a limited palette and readability at 64 × 64. The actor-specific features and expressions are listed above. Gorgon’s brief explicitly excluded human ears, hair, blinking, direct viewer gaze, fangs and a threatening interpretation. Alden’s brief explicitly selected the sixteen-year-old coat-and-sweater identity rather than young Alden.

## Reuse

Run `node scripts/prepare-reactions.mjs` from `pebble/` after deliberate atlas changes. It crops 64/48-pixel previews, fits each whole portrait into a 200 × 228 white canvas without cropping the horn collar, and calls the shared bounded-row RLE packer. It preserves reader permissions/version and the original atlas. Native drawing streams rows through a 512-byte buffer; no full decoded bitmap is allocated. The packer also emits `art-native.js`, a compact name lookup that avoids allocating one XS property/key per portrait. `art.js` remains the host-side resource catalogue.

Resource key: `<Actor>-<emotion>-full`. Direct an episode with `reactions: [{anchor, actor, emotion}]` in its direction file. Anchors are persistent labels following complete passages. Explicit direction replaces the older automatic portrait cadence only for that episode. Invalid artwork, absent cast members, duplicate anchors and invalid passage boundaries fail export. New resources require installing the new PBW once; future compatible content uses the same asset names.

Boe/Jeremy are retained for future episodes, not inserted into Episode 13’s private conversation. Gorgon’s amused portrait is a future source-supported option; Episode 13 uses restrained neutral, attentive, skeptical and serious reactions.
