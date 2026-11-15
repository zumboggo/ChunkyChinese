# v1.14.3 verification

All current reports refer to the installer hash in build-report.json. Metrics aggregate the final download, controls and scene logs; upgrade logs include the older installer and are excluded from current heap measurements. Native minimum: 9,520 bytes across 668 samples, below the historical 12 KiB target and above the revised 8 KiB reserve.

The native light test waits through the entire 120-second timeout and checks renewal and no page/choice progression. The published fixtures retain their exact source bytes; the test changes only versions to force fresh transfers, and creates a fifth test-only copy. It completes a synthetic current episode with 24 history entries and four choices first, then reopens all five downloads offline and after reinstalls.

114 unit tests passed. Representative scenes 1,26,31,42 passed final holds, replay, menu return and a 55 ms maximum frame. PNG comparisons mask only the live clock rectangle. Earlier diagnostic runs exposed memory failures and a timing failure under concurrent emulator stress; the retained final runs passed. Full-library art verification is inherited from v1.14.2, with source/art hashes checked in unchanged-artwork.json. No physical-watch test is claimed.

See ../../DOWNLOAD-MEMORY.md for the memory tradeoff, regression command and compatibility details.
