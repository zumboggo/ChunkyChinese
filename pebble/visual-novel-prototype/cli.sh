#!/bin/sh
set -eu
exec "${PEBBLE_PYTHON:-/Users/david.hepting/.local/share/uv/tools/pebble-tool/bin/python}" "$(dirname "$0")/isolated_cli.py" "$@"
