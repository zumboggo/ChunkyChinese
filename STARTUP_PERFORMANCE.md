# Startup performance contract

Startup work belongs to one of four lanes:

1. **Synchronous:** choose the saved destination and render the shell.
2. **Essential:** open IndexedDB and load only vocabulary, hotkeys, settings, and records required by the resumed mode.
3. **Idle deferred:** versioned repairs, reader reconciliation, dashboard history, hosted indexes, and cloud authentication/sync.
4. **On demand:** dictionary, comics, visual novels, AI generation, imports, charts, and optional reader content.

Do not add network requests or whole-store scans to lanes 1 or 2 without measuring a realistic established database. Startup marks are emitted for shell render, destination selection, essential data, interaction readiness, and background completion. Development builds log these durations.

The service worker installs only the application shell and core recall seeds. Optional content is cached when requested. `npm run build` enforces gzip budgets for the initial JavaScript and CSS assets.
