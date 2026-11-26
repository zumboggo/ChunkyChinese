# Chunky Chinese Project Notes

- The user primarily studies on a phone and often controls Active Recall with an 8BitDo Micro controller.
- All controller buttons work reliably; keyboard numbers `1`–`4` map to Choice A through Choice D.
- In Flashcards, swiping is the primary rating method; do not show Again, Hard, Good, or Easy rating buttons.
- Flashcard keyboard ratings follow Choice A through Choice D in order: Again, Hard, Good, Easy.
- After implementing user-requested code changes, commit and push to GitHub unless the user explicitly asks not to.

- Every new episode opening teaser includes one cool or epic spoken phrase by Jon or another character that foreshadows the highest-tension moment. Generate ImageGen artwork first, then verify exact video pricing within the $0.15 total clip cap. For Chinese episodes, use Mandarin-only speech for both teasers and lessons; retain written English glosses. Never generate English audio unless David explicitly requests it.

# Episode creation and publication

When David requests “create an episode” (including a new episode in an existing series), this explicitly authorizes creating, validating, and publishing the completed episode to its established destination, including the normal commit, push, deployment, live verification, and series-continuation updates. Do not ask for a separate publication confirmation. Draft-only, brainstorming, and explicit requests not to publish remain unpublished. This does not authorize classroom assignment or Canvas posting. Preference explicitly confirmed on October 27, 2026.

# Efficient episode authoring

Start episode work with `game:preflight` and the compact private brief in `.local/authoring/`; use verified paths and current runtime cue options. Audit a short opening before drafting the full episode. Never dump full packages, embedded media, or continuity tables into tool output. Follow `docs/episode-quickstart.md` for compact continuity, shared browser helpers, and incremental publishing. Use the plan-driven freeze/assembly/review flow in that guide instead of per-episode helper scripts. Preserve exhaustive engine checks and the complete selected phone/desktop suite, and integrate directed playback review into it. Preflight must check dependency paths and concurrent work; use the isolated release helper when appropriate. Let the publisher own the final build.

# Jedi storyline convergence

From Episode 9 onward, keep one main storyline. Close the earlier voice and western-water threads in Episode 9, while retaining memory of choices, deaths, injuries, equipment losses, water totals and promises. Later choices may change conversations and callbacks, but should rejoin the common plot rather than multiply persistent story branches. David explicitly requested this on October 28, 2026.

# Pebble episode authoring

For watch episodes, start with `pebble/scenes/README.md`. Edit shared motion in `pebble/scenes/library.json`, regenerate with `npm run scenes` from `pebble/`, and use `pebble/direction/<episode>.json` to bind installed recipes to persistent Story 2 labels. Never match full prose to place a cue. Run the documented fast checks before native/browser/emulator verification. Development builds must not overwrite versioned release PBWs; preserve phone releases and reading saves.

# Chinese episode format names

David’s requested names (2026-11-19): **Comic Episode** uses ImageGen comic panels revealed after the text, with varied framing, angles, zoom, action and gently exaggerated humorous reactions where appropriate. Six panels per generated sheet may share one story beat; retain native text/pinyin/English and Mandarin audio. **SVG Episode** uses the established SVG character animation style. **Pebble style Episode** uses the approved close-up pixel character performances. These names select the in-app presentation, not physical-watch installation. Explicit format requests override earlier presentation defaults; preserve each reader’s bookmarks. For Super Supportive, default to regular Comic Episodes only. Create or update in-app Pebble or physical-watch episodes only when David specifically requests them (preference updated 2026-11-22). Preserve the existing Pebble backlog and bookmarks. For new illustrated episodes, apply the shared episode-art-variety skill reference: randomized medium, storytelling treatment and specific artistic influence, one consistent style per episode, about two-thirds comic-oriented, recognizable characters and clear action.

# Episode efficiency preference (2026-11-20)

For routine next episodes, use a fresh chat with the compact continuation prompt in `docs/super-supportive-next-prompt.md` and the live preflight brief. Follow the batching and recovery checklist in `docs/episode-quickstart.md`. Keep Mandarin-only audio, full required validation, and the regular comic reader. Pebble delivery is opt-in. David approved updating the episode skills with this art-variety preference on 2026-11-23.

# Chinese text-first presentation (2026-11-26)

Default all newly authored Chinese phone episodes to `presentation: {mode: "reading", layout: "intertitles", animationLabels: [...]}`. Center large Chinese on white with pinyin above and English below, two to three reviewed chunks per text page. Several text pages may precede a separate artwork/animation reveal; hold that reveal until a fresh Next action. Preserve Back/resume at page level and Mandarin-only audio. This supersedes simultaneous comic captions and mandatory three encounters for new episodes; do not retrofit other released episodes or change watch/pocket-reader formats without a request.

Future Chinese phone episodes also show a thin black progress line at the top, tracking text pages and visual reveals, restoring on resume and reaching full width at completion. This is built into the intertitles player; released Super Supportive Episodes 19–27 use it too.
