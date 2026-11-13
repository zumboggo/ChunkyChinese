#!/bin/sh
set -eu
cd "$(dirname "$0")/.."
node scripts/export.mjs
node --test tests/*.test.mjs
cd reader
# Font/resource definition changes need a clean build: Waf can otherwise reuse a stale glyph subset.
pebble clean
pebble build
cd ..
"${PEBBLE_PYTHON:-python3}" scripts/verify-compiled-fonts.py
mkdir -p release
cp reader/build/reader.pbw release/chunky-chinese-time2.pbw

version=$(node -p "require('./reader/package.json').version")
cp reader/build/reader.pbw "release/chunky-chinese-time2-v${version}.pbw"
shasum -a 256 release/chunky-chinese-time2.pbw "release/chunky-chinese-time2-v${version}.pbw" > release/SHA256SUMS
