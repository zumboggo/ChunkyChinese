# Authoring tools verification — 2026-11-14

Validated against a frozen v1.3 source snapshot (455bf243) with the new authoring
files overlaid; concurrent reader development was excluded from this baseline.

- Node regression suite: 63 passed, including four new authoring checks.
- Browser review: all 25 baseline recipes; source order, indefinite phone wait,
  fresh Enter handling, frozen holds, replay, pause, search, cue-plan download,
  narrow layout and explicit unsupported-setting fallback passed.
- Episode 11 content-only output exactly matched its existing exported JSON.
  One measured validation/review/export run took approximately 127 ms. This is
  tooling time, not a prediction of complete episode authoring time.
- Integration checks confirmed content export leaves native bundles, migration
  files and source prose unchanged. Runtime drift blocked export; invalid plans
  left direction unchanged; valid plans changed only direction.
- Four authoring checks also passed in the active checkout after integration.
- Episode 11 reported 10,400 unused portrait resource bytes. These are storage
  bytes, not measured heap savings. No selective native packaging was introduced.

The recorded baseline is v1.3. Newer runtime changes require native verification
and a new profile before the guarded content export can use them. Review and
preflight remain usable during native development. No physical-watch performance
or heap measurement was performed by this authoring-tools task.
