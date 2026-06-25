# Legendary Moonlight Sculptor — Ren'Py build

The main LMS story as a linear, chapter-select Ren'Py game with automatic ruby
pinyin and toggleable English. Embedded in the React app under the "Moonlight
Sculptor (RenPy)" library tile (`public/renpy/lms`).

## Layout

```
game/
  script.rpy            entry: start -> chapter-select menu
  options.rpy           project config (name, save dir, optional CJK font)
  pinyin_map.json       GENERATED tone-marked pinyin (npm run renpy:pinyin)
  chunky/               reusable framework (HAND-WRITTEN — edit freely)
    pinyin.rpy          ruby pinyin via say_menu_text_filter + show_pinyin toggle
    english.rpy         {en} custom tag + show_english toggle
    screens.rpy         chapter-select menu, live P/E toggles, key shortcuts
    endings.rpy         romance/wealth/strength tracking + finale + 3 ending stubs
    bridge.rpy          postMessage events to the React app
    stage.rpy           far_left / far_right positions
    characters.rpy      GENERATED Character() defines
    images.rpy          GENERATED image defines
    chapters.rpy        GENERATED chapter registry (titles drive the menu)
  story/                GENERATED-then-hand-edited chapters (source of truth)
    ch01_sell_account.rpy ... ch05_sculptor_path.rpy
  images/               GENERATED copies of backgrounds/characters/cinematics
```

## Authoring

Write plain Chinese say statements — pinyin appears automatically:

```renpy
char_lee_hyun "我没事。\n{en}{size=24}{color=#bcd0e8}I'm fine.{/color}{/size}{/en}"
```

- Ruby pinyin is added at runtime from `pinyin_map.json`. After adding/editing
  any Chinese, run `npm run renpy:pinyin` to refresh the map.
- English goes inside `{en}...{/en}`; the reader toggles it with the menu button
  or the `e` key. Pinyin toggles with `p`. Both default on.

## Endings

Add `$ track("romance")`, `$ track("wealth")`, or `$ track("strength")` at the
choices that should lean toward each ending (the converter leaves TODO comments
at every choice). When the final chapter is ready, end it with
`jump chunky_finale` instead of `jump chunky_menu`, and flesh out the three
`ending_*` labels in `chunky/endings.rpy`.

## Regenerating from JSON (optional)

`npm run renpy:convert` re-seeds `story/*.rpy` and the generated `chunky/*.rpy`
from the original world JSON. This OVERWRITES hand edits to those files, so only
do it to start over. The framework files in `chunky/` (except the three marked
GENERATED) are never touched.

## Build & embed

1. `npm run renpy:convert` (first time only) then `npm run renpy:pinyin`.
2. Open `renpy/lms` in the Ren'Py launcher and **Build → Web**.
3. Copy the web export into `public/renpy/lms/` (so `public/renpy/lms/index.html`
   exists).
4. The React tile detects the build and embeds it; the "not found" help shows
   until the export is present.

If your Ren'Py build doesn't render Chinese, drop a CJK font at
`game/fonts/chinese.ttf` and uncomment the font lines in `options.rpy`.
```
