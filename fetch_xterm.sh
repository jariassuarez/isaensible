#!/usr/bin/env bash
set -euo pipefail

XTERM_VERSION="5.3.0"
BASE="https://cdn.jsdelivr.net/npm/xterm@${XTERM_VERSION}/lib"
CSS_BASE="https://cdn.jsdelivr.net/npm/xterm@${XTERM_VERSION}/css"
FIT_BASE="https://cdn.jsdelivr.net/npm/xterm-addon-fit@0.8.0/lib"

echo "Downloading xterm.js ${XTERM_VERSION}..."
curl -fsSL "${BASE}/xterm.js"               -o app/static/js/xterm.js
curl -fsSL "${CSS_BASE}/xterm.css"          -o app/static/css/xterm.css
curl -fsSL "${FIT_BASE}/xterm-addon-fit.js" -o app/static/js/xterm-addon-fit.js
echo "Done."
