# Episode 13 — What Do You Want?

Adapted from the existing reviewed `supportive-13` script, with all prose, contextual pinyin, English annotations and four binary choices preserved. Public phone releases are untouched. Only stable watch labels were added to private editable/annotated scripts.

Every one of the 16 routes contains six animated moments and 23 emotional portrait shots, excluding opening and ending cards. The conversation remains between Alden and Gorgon; Boe and Jeremy’s new assets are available for future episodes.

| Passage anchor | Motion | Narrative purpose |
| --- | --- | --- |
| watch_13_beat_6 | gorgon-listen | Acknowledge Alden placing the drink while keeping gaze averted |
| watch_13_beat_13 | gorgon-think | Pause over accepting the food |
| watch_13_beat_22 | gorgon-think | Consider Alden’s motives |
| watch_13_beat_24 | gorgon-listen | Let the observation about class settle |
| watch_13_beat_40 | gorgon-think | Pause over preparing for disappointment |
| watch_13_beat_44 | gorgon-listen | Listen to Alden’s tentative hope |

These reuse two verified consulate gestures in six story-supported moments. No invented sipping, handoff, eye contact or blinking. Explicit emotional shots use Alden’s warm, curious, thoughtful, surprised, determined, embarrassed, worried and sad portraits, and Gorgon’s restrained states. The complete shot list is in `direction/supportive-13.json`.

The new reaction atlas pack adds 24 expressions across Boe, Jeremy, Gorgon and Alden. Older expressions, episodes and saves remain supported. New native speaker codes label portraits correctly; cards remain separate from character portraits. Garden completion queuing and deduplication are preserved.

## Runtime integration

The release retains schema-1 downloadable motion support from the shared reader work. The new atlas uses a compact native resource-name lookup rather than one JS object property per expression. Final allocation is 34 KiB slots, 13 KiB chunks and 4 KiB stack; startup, reading and transfer must be measured together. Old source art remains available to host tooling.

The native reading check waits for each scene’s actual held-pose event, then a fresh-press guard, and verifies a new Episode 13 completion in the phone’s persistent outbox. Advancing an estimated number of button presses is not sufficient evidence of completion.
