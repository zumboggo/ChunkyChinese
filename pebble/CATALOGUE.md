# Watch episode catalogue

Install the catalogue PBW over the current Chunky Chinese app. Do not uninstall:
reading saves, completed markers and the Hearth Garden connection key must remain.

From a reading screen, press **Back → Library**. It opens the numbered range containing
your current episode. **Choose range** lists 1–10, 11–20, and so on; **Next page** and
**Previous page** move through five titles or five ranges at a time. This avoids
scrolling through the whole series. A 150-episode catalogue is covered by tests.

`[x]` marks completed episodes; `[ ]` means not yet completed on this watch. Select
a title for its detail screen and completion status, then choose **Resume offline**,
**Read offline**, or **Download / resume**. The download opens automatically after
validation. Returning to an unchanged episode restores its saved position and route.
Completion stays marked when you restart an episode; finishing another full run
still follows the existing Hearth Garden credit rules.

The watch keeps the included episode and one active download, plus small saved
positions and completion records for other episodes. Selecting an older download
fetches its content again and restores its save. The current episode and included
episode remain readable offline. A cached catalogue page remains available on the watch. With the phone connected,
you can also browse its last saved catalogue without internet. Updating the list or
downloading another episode needs internet.
Failed or interrupted downloads keep the current episode intact.

The initial catalogue contains the existing watch adaptations, Episodes 11–13.
Unpublished future episodes are not shown. The metadata format supports up to 2,000
published entries, but the watch receives only five titles at a time. Episodes are
grouped by their actual numbers, including gaps. Existing pre-catalogue completions
are recovered when a retained save contains a completion date; earlier completion
history that was already discarded cannot be inferred.

## Publishing more episodes

1. Create and validate the watch adaptation with the current authoring workflow.
2. Publish its compatible, pinyin-only package as `content/<episode-id>.json`.
3. Add its ID to `content/catalogue-source.json`, then run
   `node scripts/publish-catalogue.mjs` (or `--check` to detect stale metadata).
4. Publish the feed and `content/catalogue.json` together. **Update list** on the
   watch fetches new entries without another PBW, provided assets/rigs/fonts remain
   compatible with the installed runtime.

Catalogue loads use canonical published IDs; no URL entry is needed. Legacy phone
settings retain their explicit custom-URL refresh operation. Refresh on the watch
updates the current catalogue episode.

## Implementation and verification

The phone validates and caches the catalogue, pages it in groups of five, and fetches
only the selected canonical feed. The watch rejects stale list responses and checks
the selected episode ID before activation. Full transfers retain checksum, version,
content, artwork and scene validation. Metadata never grants completion credits.

`tests/catalogue*.test.mjs` exercise large-list paging, wrong identity/version,
offline cache, asynchronous selection races, actual reader menu navigation, separate
saves and durable completion markers. `scripts/test-catalogue-emulator.py` uses a
dedicated emulator and synthetic future entries; it does not publish future stories
or contact a real Garden account.

The build bundles and minifies private JavaScript identifiers with Rolldown, reducing
XS symbol memory. Editable modules, state/property names and the external Pebble APIs
remain intact. `scripts/export.mjs` regenerates `embeddedjs/compiled/main.js`; never
edit that file directly. Chinese source/font assets remain available for restoration;
pinyin-only builds omit unused Han glyph validation data.

Install the latest catalogue release rather than an earlier Episode 13 installer:
this release also retains pinyin-only reading, the reusable pixel portraits, and
all six main-character downloadable rigs from v1.8.
