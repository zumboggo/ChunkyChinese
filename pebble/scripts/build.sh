#!/bin/sh
set -eu
cd "$(dirname "$0")/.."
mode=${1:---dev}
case "$mode" in --check|--dev|--release) ;; *) echo 'Usage: build.sh [--check|--dev|--release]' >&2; exit 2;; esac
# Regenerate only explicitly with npm run scenes; stale artifacts must fail CI.
node scripts/generate-scenes.mjs --check
node scripts/export.mjs
node --test tests/*.test.mjs
[ "$mode" != --check ] || exit 0
cli=${PEBBLE_CLI:-pebble}
cd reader
# Release builds always clean; development builds use Waf dependency tracking.
if [ "$mode" = --release ]; then "$cli" clean; fi
"$cli" build
cd ..
"${PEBBLE_PYTHON:-python3}" scripts/verify-compiled-fonts.py
node scripts/build-report.mjs
if [ "$mode" = --release ]; then
 node preview/train-scene.test.mjs
 python3 scripts/test-emulator.py --install --cli "$cli"
 node scripts/package-release.mjs
fi
