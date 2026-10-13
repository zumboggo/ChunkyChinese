# Before the First Bid

First small installment of a personal Mandarin adaptation of NAM Heesung's *The Legendary Moonlight Sculptor*. Source boundary: Book 1, Chapter 1, from adult identification/homecoming to listing Weed for sale and going to bed. Stop before the online response. The supplied EPUB and vocabulary export remain outside the repository.

The opening promise: as Lee Hyun, give up a treasured escape to support his family, then discover that selling the character may be better than deleting it. Preserve the grandmother's illness, absent sister, old computer, max-level character, paid access to comparable listings, 50,000-won opening price and one-day deadline. The prose is simplified adaptation, not a quotation or official translation. Local thoughts and choice replies are connective fiction. The illustration compresses the small home's layout; grandmother speaks offstage, still in bed. New polished SVG artwork is provisional.

| Choice | Distinct response | Later callback | Rejoin |
| --- | --- | --- | --- |
| answer | Promise responsibility / gently express confidence in his sister | Medicine branch recalls the promise | Family and work |
| goodbye | Equipment/clothes joke / quiet reflection on expenses | Clothes branch recalls the game-master joke | Delete confirmation, then sale idea |
| hope | Clothes / medicine | Uses the relevant earlier memory | Listing posted, sleep |

All eight routes end at the same canonical boundary. These choices do not persist into later episodes. No quiz or points.

## Vocabulary audit

The 2026-10-13 user export contains 804 active words meeting the app dashboard's FSRS known threshold: interval at least 14 days with a review history. This uses the user's allowed “known in the app” definition, not the alternative next-review-in-three-weeks definition. The CSV has no reading-exposure column, so no reading-only mastery is inferred.

All eight routes measure **95.316–95.561% familiar Chinese word occurrences** (425–430 occurrences, depending on route). Count every displayed choice option once, plus the dialogue/narration actually encountered. Use the app-style longest dictionary match up to eight characters, then Chinese word segmentation. The small episode lexicon keeps terms such as 身份证 and 韩元 intact without declaring them known. Punctuation, Latin proper names and Arabic numerals are excluded. This is a vocabulary estimate; grammar difficulty still needs learner feedback.

Run `node scripts/check-story-vocabulary.mjs stories/animated/moonlight-01.json PRIVATE_WORDS.json stories/animated/source/moonlight-01.lexicon.json`. Private input is an array of `{word, known}` records; keep it in ignored `.local/`. The command enumerates deterministic routes and fails if a route falls outside 95–98%. It deliberately rejects chance scripts rather than claiming exhaustive coverage of them.

## Delivery and future installments

The package includes 50 Mandarin lines/options with pinyin, optional English meanings and cached Tingting audio. Decoded package: 1,100,111 bytes; ZIP round-trip checked. Open Game → Moonlight Sculptor 01 → Play / resume episode. Bundled stories are listed in `public/stories/animated/catalog.json`; future entries need no React change. Keep each released ID and file immutable; use a new ID and file for revisions. Progress remains scoped to account and device.

The readable `.story` source must match the packaged script. Edit both, then run `npm run game:audio -- --episode=moonlight-01`, `npm run game:check`, vocabulary audit and applicable browser checks. Do not regenerate images or audio for unchanged material.

Verified: all eight routes terminate through the shared engine; phone/desktop tests cover two contrasting routes, audible playback state, meanings, resume and both callbacks; existing player tests, ZIP round-trip, unit suite, production build and shared-animation parity pass. Manual phone framing checked at 390 × 844. No new shared renderer features or cloud progress writes.
