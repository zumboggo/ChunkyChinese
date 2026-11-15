# Reading controls v1.14.2 evidence

All current-build reports reference the SHA-256 in `build-report.json`. `metrics.json` aggregates the five current-build logs; `upgrade-watch.log` includes the older v1.14.0 installer and is excluded from current-build heap statistics.

The dedicated Emery fixtures use `scripts/isolated-cli.py` and the controlled companion. Remote SDK update checks are disabled only for fixture runs so their shutdown delay cannot make a moving-frame capture arrive after an animation ends. The installed PBW is unchanged.

Screenshot comparisons mask only the clock rectangle for replay/hold checks. The upgrade comparison uses the reading body because the header and footer intentionally changed. The original PNGs in `previews/` retain the clock and controls. Full local capture sets are available in the frozen build's `.local/` folder.

Run `python3 scripts/verify-reading-controls-release.py verification/reading-controls-v1.14.2`. See `../../READING-CONTROLS.md` for controls, measured sizes, limits and test coverage. The emulator's existing Bluetooth reconnect limitation still requires relaunching its Moddable channel in the downloaded-recipe test. No physical-watch installation is claimed.
