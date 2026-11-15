# Reading controls — v1.14.2

This update combines the existing 53 reactions, 42 installed scenes and five-episode offline queue with three reading improvements:

- The current watch time appears at the bottom right on reading pages, choices, menus, portraits and scenes. It updates each minute without advancing the story and follows the watch's 12/24-hour preference.
- Choices show both English options together: **A — press Up** and **B — press Down**. These are the top-right and bottom-right buttons. A short Select press never commits a choice. For unusually long options, Select shows more text. Existing three/four-option downloaded content displays a second pair, C/D, with Select.
- **Hold the middle-right Select button for 0.6 seconds** to turn on the backlight for 30 seconds. This does not advance a page, choose an option, replay an animation, or open a menu. Another hold restarts the 30 seconds. Short Select presses retain their normal behavior. The light returns to automatic control when the timer ends or the app closes.

Back still opens the reader menu. Up still returns to the previous passage when reading ordinary text. Down retains the Chinese/English toggle where Chinese is installed, or opens the menu in the pinyin-only reader. Reading saves and cached episodes are retained when installing this PBW over v1.14.0.

## Implementation and verification

The clock uses a small native overlay and a minute subscription, with no per-frame artwork allocation. The light uses Pebble's long-click recognizer, so releasing a long press does not also fire the normal Select action. The native timer always returns light control to the system on shutdown.

Offline loading, validation and save restoration run after module initialization, so their temporary objects do not overlap the loader's peak allocation. Text validation avoids per-character iterators and collects between streamed records. Existing resource formats, IDs and the shared 512-byte art cache are unchanged.

Screenshots and measured acceptance results belong in `verification/reading-controls-v1.14.2/`. Screenshot comparisons mask only the clock rectangle; unmodified screenshots are retained for visual inspection. Emulator evidence does not measure physical backlight brightness or physical-watch battery use.

## Verified build

- PBW: `release/chunky-chinese-time2-supportive-13-v1.14.2.pbw`, 255,561 bytes.
- SHA-256: `a3186270d94fff0f18e7d74bb53e074b617bfdc72d33c80a8b0e725b3a978de8`.
- Minimum free native heap: **12,448 bytes** across 2,588 samples; the offline-queue suite alone measured 12,512 bytes. The acceptance floor remains 12,288 bytes.
- Resources: 156,939 bytes, **652 bytes more** than v1.14.0. Native code plus static RAM: 15,279 bytes, **531 bytes more**; static RAM accounts for 1,036 bytes of that total.
- VM pools: stack 4,224 bytes, slots 34,816 bytes, strings/chunks 9,216 bytes. Measured peaks: 3,744 / 34,800 / 9,132 bytes respectively. The shared artwork cache remains 512 bytes.
- Worst scene average/max frame time: 48/139 ms; worst reaction frame: 99 ms. All 42 scenes and 53 reactions passed, with 53 independently decoded final poses and 570 native/browser frame comparisons.
- Five 21,029-byte cached episodes survived update, restart, interrupted refill and offline continuation. Upgrading from v1.14.0 retained the reading position and all five cached episodes. All 26 downloaded recipe checks and 12 installed-hand transfers passed.
- 110 unit checks passed. Clock ticking, 12/24-hour appearance, direct choices, saved choices, long-press isolation, repeated light activation and automatic release were checked in Emery. Physical-watch installation and backlight brightness remain user checks.

Run `python3 scripts/verify-reading-controls-release.py` to verify the package against the retained reports. Earlier versioned installers are preserved.
