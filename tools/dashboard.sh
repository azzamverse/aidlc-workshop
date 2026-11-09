#!/bin/sh
# Start the live workshop dashboard and open it in a browser window (macOS).
# Windows: use tools\dashboard.cmd instead.
# Usage: tools/dashboard.sh [workspace] [--port 8787]
root="$(cd "$(dirname "$0")/.." && pwd)"
command -v python3 >/dev/null || { echo "Python 3 is needed: install it from https://www.python.org/downloads/"; exit 1; }
echo "Drag the browser window to the second screen and press Cmd+Ctrl+F for full screen."
echo "Leave this window open while the dashboard is in use. Press Ctrl+C here to stop it."
exec python3 -I "$root/tools/dashboard/server.py" "$@" --open
