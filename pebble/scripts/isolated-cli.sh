#!/bin/sh
set -eu
exec "${PEBBLE_PYTHON:-$HOME/.local/share/uv/tools/pebble-tool/bin/python}" "$(dirname "$0")/isolated-cli.py" "$@"
