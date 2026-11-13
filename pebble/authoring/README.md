# Fast episode authoring

From `pebble/`, reuse the verified reader for content-only episodes. No compiler,
image generation or full-library emulator tour is needed for unchanged native
capabilities. These commands do not publish a feed or change the installed reader.

```
npm run preflight -- supportive-11 supportive-12
npm run catalogue
npm run review -- supportive-11
npm run content -- supportive-11
```

- **Preflight** reports all missing portraits/glyphs, script/anchor problems, native
  layout and package limits, and recurring asset needs across the supplied episodes.
  Prepare those recurring assets together rather than discovering them one episode
  at a time. A character animation profile is not automatically a static portrait.
- **Catalogue** creates a searchable offline page of recipe thumbnails and replayable
  previews. It shows the fixed actor/action/setting binding and recipe ID. It does
  not invent arbitrary downloadable combinations. Unsupported browser settings are
  explicitly marked for native review.
- **Review** creates one shot list in script order with stable anchors, source section,
  preceding passage, direction notes, and native/enlarged previews. Story context is
  outside the watch screen. Branch-specific moments are labelled; this is not a
  claim that every path contains every cue. Nothing advances past a held gesture
  without Select; the phone waits indefinitely for its action. Background motion
  is optional. Browser rasterization remains an approximation of the watch.
- **Content** runs readiness checks and exports the exact versioned JSON for Refresh
  under `.local/content/<id>/<version>.json`. It never replaces the generated native
  bundle, migration files or compiled resources. It also creates the review page and
  a timed report. Publishing this JSON to the established feed is a separate action.

Review/catalogue pages are printed as absolute paths under `.local/authoring/` and
open locally without a server. Preview one selected animation at a time; static
catalogue thumbnails do not keep 25 timers running.

## Batch the direction

Choose the story's meaningful moments first. Add persistent Story 2 labels and a
`direction/<id>.json` using the existing scene-authoring guide. In the review, select
one moment, preview recipes in the catalogue, and explicitly choose **Use recipe for
selected moment**. Add an acting note if helpful. **Download cue plan** stages those
choices as JSON; it does not silently edit source files.

Apply a completed plan with:

```
npm run direct -- supportive-11 /absolute/path/to/supportive-11-direction.json
```

The command validates every anchor and scene before replacing that episode's
watch-only direction file, then regenerates its review. Prose, annotations and phone
releases are not touched. Review the complete direction together: at least five animated moments and a target of 20–25 reaction shots on every route. Reuse fitting assets and actions; no new-animation quota is imposed.

## Content path versus native path

`authoring/runtime-profile.json` pins the last recorded native baseline, with package
hash, app version, all verified scene IDs and runtime/resource source fingerprints.
The initial profile is the verified v1.3 snapshot, not a claim that David has installed
it. A content-only export requires matching runtime files. Changed geometry, poses,
fonts, portraits, runtime JS or companion code block that fast path and identify
which files changed. Review and preflight still work while native development is
in progress. Newer parallel reader changes must finish native verification before
refreshing the baseline; do not hand-edit fingerprints to bypass the guard.

After a native release and its full emulator verification, record it once:

```
npm run runtime:record -- verification/<release-directory>
```

This requires matching build/emulator report hashes, the immutable versioned PBW,
matching scene-library data, and native verification entries for every installed
scene. Run it against the same frozen source checkout used for that verified build.
Reports do not reconstruct historical source: use a retained release snapshot when
recording an older version. The existing full `build`/`release` workflow and native
stress checks remain unchanged. Recording a baseline does not certify physical-watch
performance. Ensure the watch has that runtime before publishing compatible content.

## Memory and verification

Reports include wire bytes, largest story record, native resource limits and used/
unused portrait storage. These are **storage figures, not inferred heap savings**.
The workflow adds no watch code or bitmap assets. Selective native packaging is
intentionally not implemented here: it would require a separately verified PBW and
reduce future Refresh flexibility. Existing compact poses and streamed assets remain.

`npm run test:review` checks all supported browser recipes, source-order shot selection,
indefinite wait, fresh-key guards, frozen holds, replay, pause, catalogue search,
cue-plan download and narrow layout. Node tests cover readiness and runtime drift.
Keep the existing fast content/route/save/transfer regression suite for exporter or
runtime changes; use the full native suite when native capabilities change. Ordinary
content review never masquerades as a new full-library or hardware certification.

## New motion through Refresh

With a verified 1.6+ runtime, a cue may carry an inline [downloadable recipe](../scenes/downloadable.md).
Review renders its actual keyframes and preserves them when downloading the cue plan.
Content export accepts new `download-` IDs when the recorded runtime has schema-1
capability. Existing catalogue IDs keep their installed bindings. A supported new
pose sequence or scene combination is content; a new rig, drawing primitive,
font or asset is still a native change. Recording capability requires the matching
`downloadable-report.json`, not a manually edited version number.

## Pixel reactions and route counts

Use `art/reaction-atlases.json` for named pixel expressions, with `node scripts/prepare-reactions.mjs` to prepare deliberately changed atlases. A native update installs new assets; later compatible episodes reuse them. Add `reactions: [{anchor, actor, emotion}]` to the direction file at persistent labels after complete passages. Explicit reactions replace the legacy automatic cadence for that episode. Animation cue-plan downloads preserve these shots and the cover selection.

Preflight reports minimum/maximum animation and reaction counts across complete choice routes. Aim for 20–25 full-screen emotional shots and require at least five animated moments, using only characters and actions supported by the source. Opening/ending cards do not count. Episode 13 supplies a 16-route example with six animations and 23 reactions on every route.
