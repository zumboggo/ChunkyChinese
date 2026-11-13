#!/bin/sh
set -eu
cd "$(dirname "$0")/.."
mode=--dev
episode=supportive-11
case "${1:-}" in --check|--dev|--release) mode=$1; shift;; esac
if [ "$#" -gt 0 ]; then episode=$1; shift; fi
if [ "$#" -gt 0 ]; then echo 'Usage: build.sh [--check|--dev|--release] [episode-id]' >&2; exit 2; fi
export PEBBLE_EPISODE_ID="$episode"
# Regenerate only explicitly with npm run scenes; stale artifacts must fail CI.
node scripts/generate-scenes.mjs --check
node scripts/generate-ensemble-preview.mjs --check
node scripts/export.mjs "$episode"
node --test tests/*.test.mjs
[ "$mode" != --check ] || exit 0
cli=${PEBBLE_CLI:-pebble}
cd reader
# Release builds always clean; development builds use Waf dependency tracking.
if [ "$mode" = --release ]; then "$cli" clean; fi
"$cli" build
cd ..
"${PEBBLE_PYTHON:-python3}" scripts/verify-compiled-fonts.py
node scripts/build-report.mjs "$episode"
if [ "$mode" = --release ]; then
 node preview/train-scene.test.mjs
 node preview/ensemble.test.mjs
 if [ -n "${PEBBLE_TEST_SCENES:-}" ]; then
  python3 scripts/test-episode-scenes.py --install --cli "${PEBBLE_EMULATOR_CLI:-$cli}" --episode "$episode" --scenes "$PEBBLE_TEST_SCENES"
 else
  python3 scripts/test-emulator.py --install --cli "${PEBBLE_EMULATOR_CLI:-$cli}" --episode "$episode"
 fi
 node scripts/package-release.mjs "$episode"
fi
