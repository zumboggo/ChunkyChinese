# Chunky Chinese

A private, offline-first Chinese study PWA for flashcards, sentence listening,
graded readers, generated stories, and slow phrase-by-phrase Scripture meditation.

Meditate mode presents simple Chinese with pinyin above each phrase, a direct
contextual gloss below it, and natural English available on demand. Its fresh
study adaptation uses the public-domain World English Bible as a reference.

## Run locally

```bash
npm ci
npm run dev
```

Production verification:

```bash
npm test
npm run build
```

## Short listening lessons

The first five content-first lessons are in `src/content/listening-pilot.json`.
They move from a familiar phrase through five focus items, a controlled sentence
ladder, delayed retrieval, changed meanings, and a Chinese-first conversation.
`src/listeningPilot.ts` compiles this content into an explicit playback timeline.
It does not update vocabulary, FSRS, or listening-mastery records.

The target is **240 seconds, with an inclusive 210–270 second window**, measured
from decoded audio plus intentional pauses. Missing or empty clips cannot pass.
The Listen menu opens twenty public lessons. Lessons 6–20 use the user-supplied
MiniMax Audio “Standup Guy” recordings in download order, with measured durations recorded in the audio manifest.
They provide untimed study phrases and resume at the saved audio position. Original MP3 recordings use an
English narrator and two Mandarin voices from Replicate MiniMax Speech 02 HD.
Measured lengths are 3:58–4:24. The player provides phrase-boundary resume,
transcripts, MP3 downloads, and explicit offline downloads. Previous word and
sentence modes remain accessible under “Previous listening modes”. Listening
completion records a lesson event; it never changes vocabulary recall ratings.

Regenerate public audio with `node scripts/generate-listening-course.mjs`.
Set `FFMPEG_PATH` to your local ffmpeg executable. The script reads
`REPLICATE_API_TOKEN` or `~/.claude/replicate-token` privately, caches clips outside
the repository, and writes only original course MP3s and their timing manifest to
`public/listening/`. Never commit credentials or private prediction metadata.

Generate private previews on macOS with Node 24 and Python 3:

```bash
node scripts/prepare-listening-pilot.mjs ../.local/listening-pilot
python3 scripts/render-listening-pilot.py ../.local/listening-pilot
```

The renderer uses installed Tingting and Samantha voices without an external API.
Both Mandarin dialogue roles currently use Tingting. These are timing prototypes;
production audio needs a pronunciation/listening review and distinct dialogue
voices. It creates WAV files, an HTML listening page with timed scripts, and
measured timing reports. Keep these outputs outside `public/` and Git.

The declared-inventory check catches undeclared characters via greedy word
segmentation. It does not establish grammar mastery or validate word senses.
Prerequisites must also be compared with the learner's actual vocabulary before
enabling adaptive playback. A word can retain a legacy `new` status despite a
long FSRS interval; use review and reading evidence as well as that status.

For a read-only first-pass source-list audit (requires `pdfplumber`):

```bash
python3 scripts/audit-listening-vocabulary.py official.pdf known-words.json private-audit.json
```

The snapshot is an array of records with `word`, `meaning`, `status`,
`repetitions`, `last_reviewed`, `interval_days`, `reading_exposures`, and
`archived_at`. No identifiers, credentials, or audio are needed. The extractor
targets the official four-page 2014 alphabetical PDF. Its printed entries
include grouped concepts; do not equate the extracted row count with 625
individually verified concepts. Gloss matches are candidates pending sense
review, and a missing gloss match does not prove the concept is unknown.

Next implementation stages:

1. Review candidate mappings and resolve source concepts into Mandarin senses;
   explicitly expand number groups and one-to-many translations.
2. Evaluate the five previews for pace, Mandarin naturalness, and comprehension.
3. Validate the public player on physical phones, including screen-off playback
   and headset/controller controls.
4. Personalize introductions and prerequisite support from current evidence;
   keep exposure distinct from tested listening recall.
5. Expand in ten-lesson batches toward the 100-lesson course. Use supplementary
   bridge lessons if uncovered concepts exceed the new-material budget.

Acceptance checks for the player migration: interrupted lessons resume at a
phrase boundary; replay does not award recall credit; unavailable audio reports
an error rather than silently shortening a lesson; existing Flashcards and
Active Recall interactions remain covered by their regression tests.

## Deployment

Pushes to `main` deploy the app shell to GitHub Pages at:

```text
https://zumboggo.github.io/ChunkyChinese/
```

The Git repository intentionally contains only application code and small,
redistributable seed/index files. Private books and generated audio are not
published through GitHub Pages.

## Private study content

Books and audio are stored as versioned ZIP archives in the private Supabase
Storage bucket `study-content`. Access requires the owner's authenticated
Supabase session and is enforced by Storage RLS.

Expected objects are declared in `src/contentCatalog.ts`:

```text
study-content/
  clip-packs/lms-1000-azure-v1.zip
  reader-packs/<pack-id>-v1.zip
  reader-packs/john-gospel-{core,audio-1,audio-2}-v1.zip
  sentence-audio/lms-sentence-audio-v1.zip
  sentence-audio/china-life-audio-v1.zip
```

After sign-in, the app downloads reader archives into IndexedDB/Cache Storage.
Sentence audio is installed into the PWA's offline cache. Content remains
available locally after installation.

To publish a content update:

1. Create a new archive with a bumped version, such as `-v2.zip`.
2. Upload it to the private `study-content` bucket.
3. Update the matching `storagePath` in `src/contentCatalog.ts`.
4. Build, commit, and push the app.

Do not commit private reader text, comic pages, private generated audio, SSML output,
local backups, API keys, or Supabase secret/service-role keys.

## Supabase

Supabase provides:

- authentication;
- per-user vocabulary, review-event, and reader-progress sync;
- private Storage for study-content archives;
- the optional generated-story Edge Function.

The browser uses only the public/publishable client key. RLS restricts database
rows and Storage objects. Server credentials remain in Supabase-managed secrets.

## Offline behavior

The app shell, dictionary, seed vocabulary, and sentence metadata are served by
GitHub Pages. Private audio and readers are downloaded once after sign-in and
stored locally. Study progress is written to IndexedDB immediately and synced to
Supabase whenever the authenticated device is online.

Lesson 20 intentionally retains the supplied 4:45 taxi destination recording,
including its recall pauses; its duration is flagged outside the original target.
