# Compact reactions — v1.11.0

Hannah’s approved Gentle Warmth artwork supplies six finite 64×64, eight-colour animations. The native library contains 35 presets across Alden, Hannah, Boe, Jeremy, Gorgon and Young Alden. All 40 previous full-size static emotion resources are excluded from the PBW; title-card artwork remains. Source masters are preserved.

The final streamed art/timing resource is 29,256 bytes, including exterior transparency masks for reusable bodies. Compared with 93,884 bytes of static emotion resources, this saves 64,628 bytes (68.8%). Hannah’s source art/timing pack alone is 2,976 bytes. These are resource-storage figures, not free-RAM measurements.

The reader shares two 256-byte resource cache blocks and does not allocate a decoded full frame. Animations pause on focus loss, finish and hold, require a fresh Select, and replay with Down. Opening/closing overlays, episode downloads and saved reading positions are retained.

Release was built in an isolated snapshot because concurrent scene-renderer development changed the shared build. This installer retains the existing scene renderer. Only evidence matching the isolated PBW is used here; earlier reports with changing artifact hashes are excluded.

Physical watch installation/testing: **not performed**. A one-time PBW installation is required; Refresh alone cannot install native artwork or renderer changes.

Frozen installer SHA-256: `0705c165efc54cdda59f9c08ec40d4076e6902e8573e9513d52ac111c833a69c`. PBW size: 245,032 bytes. SDK resource size: 136,122 bytes; native RAM footprint: 28,744 bytes. SDK heap estimate excludes subsequent JavaScript allocations; actual playback measurements are in the emulator reports.

Validation: 93 unit tests; Hannah’s 31 source frames independently reconstructed; Hannah HTML finish/hold/replay tests; existing train and ensemble browser suites. Native scene/download/reaction evidence is attached separately.

Native validation passed: all 30 existing scenes, background motion and preference persistence; 14 downloadable recipes with all six actors; transfer/title-card regression; all 35 reactions with stable holds, replay, focus interruption and restored reading position. Native final-pose geometry matches all 35 decoded poses. Minimum measured reaction free heap: 4,520 bytes. Maximum measured reaction draw: 59 ms. All five artifact reports match the frozen PBW SHA-256.
