# Expression and hand-performance authoring

The installed library has 53 reactions. IDs 1000–1034 and every previous alias retain their meaning. New IDs append in actor order (Alden, Hannah, Boe, Jeremy, Gorgon, YoungAlden), three per actor, starting at 1035. `pixel-reactions/native-catalogue.json` is the authoritative list; never calculate actor offsets.

| Actor | New emotion names |
| --- | --- |
| Alden | `exhausted`, `holding-back-sadness`, `quietly-determined` |
| Hannah | `sheepish`, `strained-smile`, `reassuring` |
| Boe | `deadpan-disbelief`, `uncomfortable-concern`, `grudging-approval` |
| Jeremy | `sleepy`, `awkward-concern`, `sincere-encouragement` |
| Gorgon | `weary-patience`, `restrained-disapproval`, `reluctant-softening` |
| YoungAlden | `tearful`, `frightened`, `small-brave-resolve` |

Reaction direction uses the existing `{ "type": "reaction", "actor": "Alden", "emotion": "exhausted" }` form. The exact names above are also accepted in visual-novel action keys. Give a named action its `actor` (lowercase, `young-alden` for the child); keys remain `[milliseconds, wristX, wristY, emotion, headY]`. Example:

```json
{"actor":"alden","prop":0,"keys":[[0,150,223,"exhausted",0],[4000,150,223,"quietly-determined",0]]}
```

Numeric emotion cues 0–5 keep their original per-character semantics. Cues 6–8 select each actor's three additions. Old broad aliases such as `sad` and `determined` have not been redirected.

New installed scene IDs 31–40 are protective cover and cover-and-peek pairs for Alden, Hannah, Boe, Jeremy and young Alden, respectively. IDs 41 and 42 are `alden-folded-arms` and `alden-interrupted-sip`. Use the textual scene IDs in authoring; generated native IDs are the installed ABI. These are reusable library performances, not new story placements.

Both cover performances require empty hands. Their mirrored palms share geometry and use each profile's `coverEyes` anchors. Protective cover finishes with both eyes hidden. Cover-and-peek lowers the viewer-left palm and holds one eye exposed. Gorgon has no cover-hand binding. His added face overlays never blink or change his averted gaze.

`hands` is installed renderer metadata, not part of downloadable recipes. Schema 1 is unchanged. A future episode may reference these installed scenes; it cannot download a new two-hand performance. Existing props continue to attach to the single active wrist. Background clocks remain independent after the foreground holds.

All reaction transitions are finite and finish in a stable pose. The artwork decoder retains its shared 512-byte cache; no frame allocation or full portrait buffers are introduced. Rebuild with `npm run art` and `npm run scenes`. Validate original-art fingerprints with `python3 scripts/test-expression-expansion.py` and compare browser/native output with `node scripts/test-visual-novel-preview.mjs`.

<details>
<summary>Future story preparation — source spoilers, no placements implemented</summary>

Source: Sleyca, *Super Supportive*, local EPUB used by the series manifest. Upcoming context spans chapters 7–10. Hannah and young Alden belong to memories or earlier scenes; these reusable gestures do not imply present-day meetings.

- Chapter 7 supports Alden resting his chin on folded arms at his school desk. Keep the tired hold modest and the body cropped above the waist.
- Upcoming food offers can use a spare hand supporting a small container while the other offers it. Author the container's ownership, approach and held contact explicitly before adding a performance. No container action is implemented here.
- Writing would need a table-anchored paper and pen tip with a short wrist stroke. The spare hand can steady the page. Keep the writing abstract; don't imply source dialogue or completed homework.
- A future phone-call pose can reuse the existing phone artwork and wrist attachment, holding it near the ear with an empty spare hand. Do not equate the existing phone-reading animation with a completed call.
- Chapter 10 supports an interrupted drink: the cup approaches, stops below the mouth, and lowers upright. This performance has no contact, tilt, swallowing or liquid-level change.
- Chapter 9's direct-eye-contact moment is narratively specific. Do not reuse it as a routine Gorgon reaction; his new overlays retain open, averted eyes.

These are preparation notes only. Existing episode files and placements remain unchanged.
</details>
