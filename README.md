# Chunky Chinese Vocab

A private offline-first PWA for reusable Chinese vocabulary audio lessons.

The app is now built around pre-generated clip packs: Azure TTS runs once on the PC, the phone imports the resulting MP3 folder into IndexedDB, and daily lessons reuse local audio only. There is no login, backend, cloud sync, or required API call during phone use.

## Run

```bash
npm install
npm run dev
npm run build
```

On Windows PowerShell, if script execution blocks `npm`, use:

```powershell
npm.cmd install
npm.cmd run dev
npm.cmd run build
```

## Comic Reader

Comic Reader opens locally prepared Chinese comic packs and shows the artwork above a clickable Chinese transcript. Transcript lines reuse ChunkyChinese Adaptive Mode, saved vocabulary identities, CC-CEDICT lookup, and the existing word popover, so tapping a Chinese word works like Reader and Visual Novel text.

Comic files stay local in the browser. The app does not upload comics, run OCR, scrape websites, download comics from URLs, or automatically translate pages in this first version.

Comic packs use a ZIP file with the extension `.comicpack.zip`:

```text
my-comic.comicpack.zip
  manifest.json
  chapters/
    chapter-01.json
  images/
    chapter-01-page-001.webp
    chapter-01-page-002.webp
```

`manifest.json` must be at the ZIP root, not inside an extra wrapping folder. A minimal manifest looks like:

```json
{
  "format": "chunky-comic-pack",
  "formatVersion": 1,
  "id": "my-comic",
  "title": "My Comic",
  "titleChinese": "我的漫画",
  "language": "zh-CN",
  "coverImage": "images/page-001.webp",
  "chapters": [
    {
      "id": "chapter-01",
      "title": "Chapter One",
      "file": "chapters/chapter-01.json"
    }
  ]
}
```

Each chapter JSON lists pages, image paths, and manually prepared bubbles in reading order. Coordinates are normalized `0` to `1` values and are preserved for future overlay tooling, even though v1 renders translations below the image.


It also includes a manual template under:

```text
examples/comicpack-template
```

To zip a copied template folder in PowerShell, run this from inside the folder:

```powershell
Compress-Archive -Path manifest.json,chapters,images -DestinationPath my-comic.comicpack.zip
```

Only import material you are legally permitted to use. Do not distribute processed comic packs or transcript files for copyrighted works without permission.

### Desktop Comic Pack Builder

Phase 2 adds a private local OCR/review/export workflow under:

```text
tools/comic-pack-builder
```

See [tools/comic-pack-builder/README.md](tools/comic-pack-builder/README.md) for setup, PaddleOCR installation, review-server usage, long-page splitting, optional local translation, and export commands.

## Publish to GitHub Pages

This repository is configured to publish the PWA app shell to GitHub Pages from the `main` branch. The GitHub Actions workflow builds with `GITHUB_PAGES=true`, which sets the Vite base path to `/ChunkyChinese/`.

Expected Pages URL:

```text
https://<your-github-name>.github.io/ChunkyChinese/
```

The LMS 1000 Azure clip pack is intentionally committed under `public/clip-packs/` so GitHub Pages can serve it to your phone. Anna's Reading Deck MP3 files are still kept in the repo for now, but that pack is hidden from the app's hosted-pack list. Delete old hosted packs when they are no longer useful to avoid repository bloat. Do not commit local backups or unrelated generated audio.

## PWA Installation

Android Chrome testing steps:

1. Open `https://zumboggo.github.io/ChunkyChinese/`.
2. Tap the Chrome three-dot menu.
3. Choose **Install app** or **Add to Home screen**.
4. Launch Chunky from the home screen or app drawer.

The app uses `public/manifest.webmanifest` and `public/service-worker.js`, both written for the GitHub Pages subpath `/ChunkyChinese/`. The manifest is linked from `index.html` with a relative link, and the service worker is registered with `navigator.serviceWorker.register("./service-worker.js")`.

## Optional OpenRouter Story Generation

AI-generated Reader stories are optional and run through a Supabase Edge Function so the OpenRouter key is never exposed in the browser. Apply `supabase-sync-schema.sql`, deploy `supabase/functions/generate-story`, and set these function secrets:

```bash
OPENROUTER_API_KEY=...
CHUNKY_STORY_MODEL=moonshotai/kimi-k2.6
CHUNKY_AI_STORY_DAILY_LIMIT=5
CHUNKY_AI_STORIES_ENABLED=true
CHUNKY_APP_URL=https://your-site.example
```

Use a dedicated OpenRouter API key with a small credit limit, such as `$5`, before enabling this on the hosted app. Generated stories are saved locally into the Reader library under Generated Stories.

Troubleshooting:

- If an old version keeps loading, clear site data for `zumboggo.github.io` in Chrome and reopen the app.
- Visit `https://zumboggo.github.io/ChunkyChinese/?fresh=1` to force a fresh navigation while debugging cached state.
- Confirm `https://zumboggo.github.io/ChunkyChinese/manifest.webmanifest` loads and contains `start_url` and `scope` set to `/ChunkyChinese/`.
- Confirm `https://zumboggo.github.io/ChunkyChinese/service-worker.js` loads.
- On desktop Chrome, check DevTools -> Application -> Manifest and Service Workers.

To force users onto a new cached app shell after future updates, change `CACHE_VERSION` near the top of `public/service-worker.js`, commit, and deploy. The activate handler deletes older `chunky-chinese-*` caches.

## RenPy Visual Novel Prototype

The first RenPy spike targets the `just-friends` Visual Novel world while keeping the existing React VN as the fallback. Generate the RenPy project source from the current Chunky VN JSON with:

```powershell
npm.cmd run vn:renpy:convert
```

This writes the prototype project to:

```text
renpy/just-friends
```

Build that project as a RenPy web export, then copy the generated web files into:

```text
public/renpy/just-friends
```

Verify the hosted web-export shape before publishing:

```powershell
npm.cmd run vn:renpy:verify-web
```

The app exposes the prototype from Reading Texts as **RenPy** / **RenPy Prototype**. If the web export is missing, the screen stays in a clear missing-export state and the existing React Scene Mode still works.

## LMS Seed

The app automatically seeds the LMS 1000 word list on first run from:

```text
public/seed/lms-vocab-1000.csv
```

That file was converted from:

```text
C:\Users\LENOVO\Documents\LearnChinese\LMS\Glossika\input\Future_Known_1000.csv
```

If IndexedDB already has words, the seed is not applied again. Use the Settings screen to reimport `public/seed/lms-vocab-1000.csv`; reimports merge by word and preserve progress/audio links.

## Clip Pack Workflow

1. Choose a target word list on the PC.
2. Generate one clip pack from the LMS Glossika folder.
3. Either commit the selected pack under `public/clip-packs/` for GitHub Pages hosting, or transfer the pack folder to the phone.
4. Open the PWA, go to Settings, and use **Download hosted clip pack** or import the whole clip pack folder.
5. Use Listening mode for normal listening. It renders one continuous local audio track and plays it through one `<audio>` element.

Listening mode is meant for earbuds and a sleeping phone. It uses only imported MP3 blobs plus generated silence/ding sounds. It also sets Media Session metadata and play/pause handlers where the browser supports them, which helps Android Chrome expose lock-screen and earbud controls.

Active Recall pauses only for answer input and keeps generated wait time tiny so practice stays fast. It focuses on words with recent and repeated Again ratings, lapses, relearning state, and wrong answers so review time is spent on the hardest cards. At the end of each lesson, rate each word with Again, Hard, Good, or Easy; the app stores FSRS due date, interval, stability, difficulty, repetitions, and lapses locally and uses those fields to choose future lessons.

The dashboard emphasizes the daily queue: due words first, then new words when the queue is light. Settings CSV export includes the scheduler fields, so review state can be backed up or moved into your main vocabulary spreadsheet. JSON backup/export is the safest full-fidelity progress format.

## Generate a Clip Pack

The LMS exporter lives here:

```text
C:\Users\LENOVO\Documents\LearnChinese\LMS\Glossika\export_clip_pack.py
```

From the Glossika folder:

```powershell
cd C:\Users\LENOVO\Documents\LearnChinese\LMS\Glossika
py export_clip_pack.py --targets input\Future_Known_1000_enriched.csv --out clip_packs\lms_1000 --synthesize
```

Azure synthesis requires:

```powershell
$env:AZURE_SPEECH_KEY="your key"
$env:AZURE_SPEECH_REGION="your region"
```

Optional voices:

```powershell
$env:AZURE_SPEECH_VOICE="zh-CN-XiaochenNeural"
$env:AZURE_SPEECH_EN_VOICE="en-US-JennyNeural"
```

If Azure credentials or the Azure Speech SDK are missing, the exporter still writes `vocab.csv`, `sentences.csv`, `clips_manifest.json`, and matching SSML files. Add `--synthesize` when you want the command to fail instead of producing a manifest-only pack.

For a small test pack:

```powershell
py export_clip_pack.py --targets input\target_words_full.csv --out clip_packs\test_5 --limit 5 --synthesize
```

## Generate the LMS Reader Pack

Reader Mode is built from the LMS StoryEditor source data:

```text
C:\Users\LENOVO\Documents\LearnChinese\LMS\StoryEditor\source-data
```

The hosted reader pack lives in:

```text
public/reader-packs/lms-books
```

To rebuild the four LMS reader books and synthesize per-sentence Azure MP3 clips:

```powershell
npm.cmd run generate:reader-pack -- --synthesize
```

The generator reads `AZURE_SPEECH_KEY` / `AZURE_SPEECH_REGION` when set, or falls back to:

```text
C:\Users\LENOVO\Documents\azure-tts-ssml\config.json
```

After generation, verify the expected 40 stories, 4 books, and 1114 sentences:

```powershell
npm.cmd run verify:reader-pack
```

## Clip Pack Format

```text
clip_pack/
  vocab.csv
  sentences.csv
  clips_manifest.json
  audio/
    words/
      紧张.mp3
    meanings/
      nervous.mp3
    sentences/
      他有点紧张。.mp3
    sentence_meanings/
      He-is-a-little-nervous.mp3
    prompts/
      listen.mp3
      meaning.mp3
      which-chinese-means.mp3
```

`clips_manifest.json` is the source of truth for linking. Filename matching is still used as a fallback.

## Import Formats

### Vocab CSV

```csv
word,meaning,status,lessonNumber,tags,partOfSpeech,audioWordFilename,audioMeaningFilename,pinyin,source,notes
紧张,nervous,new,1,emotion;LMS,adjective,audio/words/紧张.mp3,audio/meanings/nervous.mp3,jin zhang,example,Useful for reactions.
```

The importer also accepts the LMS full format:

```csv
Hanzi,Pinyin,English,Bucket,Reason,Example,Source
```

And a simple flashcard format:

```csv
Front,Back
紧张,jin zhang - nervous
```

List fields use semicolons inside a cell.

### Sentences CSV

```csv
chinese,english,targetWords,audioSentenceFilename,audioEnglishFilename,tags,difficulty
他有点紧张。,He is a little nervous.,紧张,audio/sentences/他有点紧张。.mp3,audio/sentence_meanings/He-is-a-little-nervous.mp3,emotion;LMS,2
```

`targetWords` and `tags` use semicolon-separated values.

## Settings

The Settings screen supports:

- whole clip pack folder import
- hosted LMS clip pack download from GitHub Pages into IndexedDB
- standalone vocab CSV import
- standalone sentences CSV import
- standalone MP3 folder/multi-file import
- JSON backup export
- JSON backup import
- progress CSV export
- flashcard queue, daily goal, and hotkey settings

The clip pack import reports coverage for word clips, meaning clips, sentence clips, sentence meaning clips, and prompt clips. Reimports merge by word/sentence key and preserve status, counts, and existing progress where possible.

## Screens

- Dashboard: due-card queue, FSRS counts, progress charts, daily listening stats, hotkey reminders, and quick launches for Reading, Active Recall, Listening, and Flashcards.
- Settings: hosted clip pack download, clip pack import, CSV import/export, MP3 import, JSON backup/export, dictionary refresh, and controls.
- Lesson: 5 word continuous lesson rendering, pinyin/English toggles, Listening mode, and Active Recall.
- Flashcards: minimalist FSRS word cards for fast sorting, with Anki-style short learning loops, queue choice in Settings, and Choice A = Again / Choice B = Good after flipping.

## Offline

The PWA caches the app shell and seed/static assets. Imported records and audio blobs are stored in IndexedDB. After the app has loaded and the clip pack is imported, lessons continue to work locally.

For best phone behavior, install the PWA in Android Chrome, download/import the clip pack, start Listening mode, then use the system lock-screen or earbud controls. Browser background audio policy is ultimately controlled by the phone/browser, but one continuous local `<audio>` track is the most reliable PWA-friendly approach.
