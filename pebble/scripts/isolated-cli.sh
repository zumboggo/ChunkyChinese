#!/bin/sh
set -eu
: "${PEBBLE_PYTHON:?Set PEBBLE_PYTHON to the Pebble SDK Python}"
exec "$PEBBLE_PYTHON" "$(dirname "$0")/isolated-cli.py" "$@"
