# An Impossible Number

Second small installment of the personal Mandarin adaptation of NAM Heesung’s *The Legendary Moonlight Sculptor*. Source: the user-supplied first-compilation EPUB, `OEBPS/Text/LMS_B01_Chapter_01.xhtml`. Continues from episode 1’s auction listing and stops after Lee Hyun and his grandmother share the hope of a better life, before moving house and hospital treatment. The EPUB and private vocabulary export are not published.

## Story and source fidelity

Promise: as Hyun, discover whether an unbelievable phone call could mean relief for the family. A brief retrospective montage compresses online skepticism, image verification, recognition of Weed and competitive bidding. Preserve the day of work for 30,000 won; the following morning’s CTS Media call; the 3,090,000,000-won result; disbelief and hanging up; website verification; bank confirmation the next day; showing Grandmother the bankbook; her suspicion of theft and their shared relief. The original caller, president’s secretary Yoon Nahee, is reported as a telephone voice rather than depicted standing in Hyun’s home.

Reuse the provisional polished SVG Hyun and illustrated home from episode 1. Grandmother remains offstage resting; no standing or recovery is depicted. Wide and medium shots support fatigue, shock, frustrated disbelief and relief. Quiet close shots carry the realization and family exchange. This is simplified Mandarin adaptation, not an official translation; local thoughts and choice-specific replies are connective fiction.

| Choice | Immediate response | Callback | Rejoin |
| --- | --- | --- | --- |
| hope | Imagine treatment / affordable work clothes | The earlier modest hope returns after Grandmother’s tears | Ask the sale price |
| disbelief | Game-money joke / wrong-person suspicion | The game king said goodbye to real money / Hyun admits his own mistake | Hang up, then check the website |
| reassure | Imagine a home / returning to school | Immediate elaboration only | Water/electricity bills and shared relief |

All eight routes preserve the same events and ending. Two hidden booleans remember choices within this episode; no cross-episode memory, quiz or score is implied. The opening supplies enough context to play independently.

## Language and delivery

The same private 2026-10-13 export supplies 804 known words, using the app’s reviewed-word/FSRS interval-at-least-14-days threshold. All eight routes measure **95.207–95.279% familiar Chinese word occurrences**, with 459–466 occurrences per route. The audit includes every visible option once and the actual route’s narration/dialogue. It uses longest dictionary matching followed by Chinese segmentation; unfamiliar lexicon terms stay unfamiliar. Arabic figures and Latin names are excluded, as in episode 1. Coverage is a vocabulary estimate, not a guarantee that every grammar pattern is familiar.

Run:

```sh
node scripts/check-story-vocabulary.mjs stories/animated/moonlight-02.json PRIVATE_WORDS.json stories/animated/source/moonlight-02.lexicon.json
npm run game:audio -- --episode=moonlight-02
npm run game:check
```

All 57 distinct Mandarin lines/options have natural phrase chunks, contextual glosses, reviewed pinyin, full English meanings and cached Tingting audio. Number chunks include explicit pronunciation, including `30亿9千万韩元` → `sān shí yì jiǔ qiān wàn hán yuán`. Choice chunks remain inside one large selectable button, with separate audio. Decoded package: **1,196,481 bytes**. Catalog ID: `moonlight-02-v1`; no carry-over from episode 1. The previous episode’s files and saved attempts remain unchanged.

Verified: eight routes and replay at every step, remembered callbacks, complete metadata, ZIP round-trip, all 57 audio clips decoded to non-silent PCM (1.1–8.4 seconds), two contrasting routes on phone and desktop, audio/option speaking state, keyboard choices, resume, readable amount and phone framing. Unit suite, existing episode/player browser checks, production build and shared-animation parity pass.
