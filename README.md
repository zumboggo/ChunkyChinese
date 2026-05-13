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

## Publish to GitHub Pages

This repository is configured to publish the PWA app shell to GitHub Pages from the `main` branch. The GitHub Actions workflow builds with `GITHUB_PAGES=true`, which sets the Vite base path to `/ChunkyChinese/`.

Expected Pages URL:

```text
https://<your-github-name>.github.io/ChunkyChinese/
```

Do not commit clip packs, MP3 files, or local backups. The PWA should be installed from GitHub Pages, then the private Azure clip pack should be imported locally on the phone.

## LMS Seed

The app automatically seeds 188 target words on first run from:

```text
public/seed/lms-vocab-188.csv
```

That file was converted from:

```text
C:\Users\LENOVO\Documents\LearnChinese\LMS\Glossika\input\target_words_full.csv
```

If IndexedDB already has words, the seed is not applied again. Use the Import screen to reimport `examples/lms-vocab-188.csv`; reimports merge by word and preserve progress/audio links.

## Clip Pack Workflow

1. Choose about 200 target words on the PC.
2. Generate one clip pack from the LMS Glossika folder.
3. Transfer the pack folder to the phone.
4. Open the PWA, go to Import and Backup, and import the whole clip pack folder.
5. Use Pocket Mode for normal listening. It renders one continuous local audio track and plays it through one `<audio>` element.

Pocket Mode is meant for earbuds and a sleeping phone. It uses only imported MP3 blobs plus generated silence/ding sounds. It also sets Media Session metadata and play/pause handlers where the browser supports them, which helps Android Chrome expose lock-screen and earbud controls.

The older step-by-step lesson player is still available as Live Debug Mode. It is useful while checking clip coverage, but Pocket Mode is the intended daily listening path.

## Generate a Clip Pack

The LMS exporter lives here:

```text
C:\Users\LENOVO\Documents\LearnChinese\LMS\Glossika\export_clip_pack.py
```

From the Glossika folder:

```powershell
cd C:\Users\LENOVO\Documents\LearnChinese\LMS\Glossika
py export_clip_pack.py --targets input\target_words_full.csv --out clip_packs\lms_188 --synthesize
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

## Import and Backup

The Import and Backup screen supports:

- whole clip pack folder import
- standalone vocab CSV import
- standalone sentences CSV import
- standalone MP3 folder/multi-file import
- JSON backup export
- JSON backup import

The clip pack import reports coverage for word clips, meaning clips, sentence clips, sentence meaning clips, and prompt clips. Reimports merge by word/sentence key and preserve status, counts, and existing progress where possible.

## Screens

- Dashboard: counts, daily listening stats, and quick Pocket Mode launch.
- Word Manager: search/filter words, play word clips, and mark status individually or in bulk.
- Import and Backup: clip pack import, CSV import, MP3 import, JSON backup/export.
- Micro Lesson Player: Pocket Mode continuous lesson rendering plus Live Debug Mode.

## Offline

The PWA caches the app shell and seed/static assets. Imported records and audio blobs are stored in IndexedDB. After the app has loaded and the clip pack is imported, lessons continue to work locally.

For best phone behavior, install the PWA in Android Chrome, import the clip pack, start a Pocket Mode lesson, then use the system lock-screen or earbud controls. Browser background audio policy is ultimately controlled by the phone/browser, but one continuous local `<audio>` track is the most reliable PWA-friendly approach.
