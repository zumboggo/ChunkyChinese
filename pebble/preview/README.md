# Train scene preview

Open `train-scene.html` in a browser, or display the same self-contained fragment inline in Codex. No server, network, generated artwork, or watch installation is required.

Select (or Enter) advances the opening text into a three-second establishing shot. The scene then waits indefinitely at “Pick up the phone”. Select starts a four-second pickup, followed by a frozen final pose. A fresh Select opens the closing text. Replay restarts the preview. The optional native-pixel view is 200 × 228 CSS pixels; its physical size depends on the display.

The `POSES`, `KEYS`, and `TIMING` records are separate from drawing and interaction logic within the fragment. Rendering targets 12 fps, uses joint coordinates and primitive shapes, and draws both views from one 200 × 228 canvas. Character design references the existing cast atlas (present-day Alden: swept brown hair, dark coat, grey collar). Colour constants use Pebble's four-level RGB channels; browser antialiasing is not an exact hardware rasterizer. Reduced-motion preference suppresses scenery movement, idle sway, and blinking while retaining the requested pickup action.

This is an isolated visual prototype, not a watch-memory or performance benchmark. Existing reader code, content, and saves are unaffected. Story text is temporary English test copy. The phone prompt is the sole text shown within an animated scene.

## Verification

From the app directory: `node pebble/preview/train-scene.test.mjs`.

The Playwright check covers mouse and Enter progression, a 15-second waiting period, held Enter across completion, accidental boundary clicks, frozen final pixels, replay cancelling an active timer, the native-size toggle, 320px layout, and browser errors. It writes review screenshots into ignored `verification/`.
