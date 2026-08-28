# Chunky Chinese

A private, offline-first Chinese study PWA for flashcards, sentence listening,
graded readers, and generated stories.

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

Do not commit private reader text, comic pages, generated audio, SSML output,
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
