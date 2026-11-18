# Phone Pebble reader

Run `node pebble/scripts/build-web-reader.mjs` from the app root after changing the HTML or player. Commit the generated `public/pebble-reader.html` with the source changes. The page is self-contained, without network media dependencies.

`assets.json` and `visual-novel-renderer.js` snapshot the approved combined watch renderer, reaction resource, scene catalogue, and released Super Supportive 11–13 packages on 2026-11-18. This deliberately keeps phone publication independent of unreleased native watch changes. Update both snapshots together when publishing another watch library/content snapshot; do not hand-edit story text or generated artwork. The master renderer remains `pebble/scenes/visual-novel-renderer.js` in the watch development checkout.

Phone bookmarks are account-scoped and versioned in localStorage, separate from watch and full-phone-story saves. The service worker caches the complete page under `chunky-pebble-trip-v1`. Save for trip explicitly awaits service worker readiness before storing the complete page.

With Vite running on 127.0.0.1:5188, run `node pebble/web/reader.test.mjs` for full first-choice routes, visuals and bookmarks, and `node pebble/web/offline.test.mjs` for offline reload and episode switching.
