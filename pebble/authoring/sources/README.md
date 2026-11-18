# Watch-only episode authoring sources

These compact packages retain all reviewed Mandarin/pinyin/English annotations, story choices and attribution needed to regenerate watch feeds. They deliberately omit phone assets and audio. They are not phone releases.

To regenerate in an isolated checkout, copy the desired JSON to `stories/animated/<id>.json` and its `.story` to `stories/animated/source/<id>.story`. Keep `pebble/direction/<id>.json` alongside the existing runtime. From `pebble/`, run `npm run preflight -- <id>` then `npm run content -- <id>`. The native baseline guard must pass unchanged; never edit fingerprints to force an export.

The corresponding all-route tests verify the compact source exports exactly the same package as the full local authoring source. Watch titles may be supplied through the direction file's validated ASCII `watchTitle` property. Never overwrite an existing phone source without checking for independent changes.

Read `../continuation.json` for watch-only continuation after the last published watch episode. The separate phone series tracker may be behind.
