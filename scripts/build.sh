#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
for tool in ohpm hvigorw python3; do
  command -v "$tool" >/dev/null || { printf '%s\n' "Missing compiler prerequisite: $tool" >&2; exit 127; }
done
python3 scripts/verify-source.py
ohpm install --all
hvigorw assembleApp --mode project -p product=default -p buildMode=release --no-daemon --accept-license
python3 scripts/verify-app.py --sanitize build/outputs/default/*.app
