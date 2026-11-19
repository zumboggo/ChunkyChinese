# Phone Pebble reader

Run `node pebble/scripts/build-web-reader.mjs` from the app root after changing the HTML or player. Commit the generated `public/pebble-reader.html` with the source changes. The page is self-contained, without network media dependencies. The normal app build also runs this generator. It includes every Super Supportive release from the main public catalogue, retaining the watch-directed snapshots for 11–13 and using reviewed language/choices for the other reading editions.

`assets.json` and `visual-novel-renderer.js` snapshot the approved combined watch renderer, reaction resource, scene catalogue, and released Super Supportive 11–13 packages on 2026-11-18. This deliberately keeps phone publication independent of unreleased native watch changes. Update both snapshots together when publishing another watch library/content snapshot; do not hand-edit story text or generated artwork. The master renderer remains `pebble/scenes/visual-novel-renderer.js` in the watch development checkout.

Phone bookmarks are account-scoped and versioned in localStorage, separate from watch and full-phone-story saves. The service worker caches the complete page under `chunky-pebble-trip-v1`. Save for trip explicitly awaits service worker readiness before storing the complete page.

With Vite running on 127.0.0.1:5190, run `node pebble/web/reader.test.mjs` for full first-choice routes, visuals and bookmarks, and `node pebble/web/offline.test.mjs` for offline reload and episode switching.

Run `node --test pebble/web/phone-episodes.test.mjs` for every converted route and `node pebble/web/catalogue.test.mjs` for full browser playback of the added reading editions. Both browser catalogue/offline checks accept `READER_URL` for live verification.

## Super Supportive phone pixel performances

Episodes 17 and 18 use reviewed direction. The regular player uses the shared exported `visualNovel` renderer and `assets.json` for a separate pixel performance after encounter three. `src/game/animation/pixel/supportive-<number>.json` directs every readable passage by an existing label and offset within that label. Its script fingerprint prevents applying these shots to an unreviewed revision. Story packages and branching indices remain unchanged; progress records additionally save the encounter and animation phase. Pixel animation never automatically advances the story, including in automatic audio mode, and its final pose waits for a fresh Next press.

The pocket-reader generator attaches the same direction as visual-only metadata to the corresponding episode's passages. It retains its content version and indices for old bookmarks; the watch-style pocket reader still uses one reading pass. Rebuild the generated HTML after edits, and test both players. Full phone pilot coverage lives in `tests/episode-pixel.spec.ts` and the episode-authoring suite; all-route shot coverage is in `src/game/animation/pixel/direction.test.ts`.

Register new reviewed episode directions in `src/game/animation/pixel/direction.ts`; the pocket generator discovers numbered direction files for catalogued episodes. Both readers retain Alden’s browser-only light skin and tan shadows; native watch palettes remain unchanged.
