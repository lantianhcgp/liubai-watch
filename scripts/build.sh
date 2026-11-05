#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
for tool in ohpm hvigorw python3; do
  command -v "$tool" >/dev/null || { printf '%s\n' "Missing compiler prerequisite: $tool" >&2; exit 127; }
done
python3 scripts/verify-source.py
ohpm install --all
export LIUBAI_JS_ONLY=1
export LIUBAI_JS_ONLY_REPORT="$PWD/build/js-only-compiler.jsonl"
mkdir -p build
rm -f "$LIUBAI_JS_ONLY_REPORT"
export NODE_OPTIONS="${NODE_OPTIONS:+$NODE_OPTIONS }--require=$PWD/scripts/js-only-compiler.cjs"
hvigorw assembleApp --mode project -p product=default -p buildMode=release --no-daemon --accept-license
python3 scripts/verify-js-only-compiler.py "$LIUBAI_JS_ONLY_REPORT"
python3 scripts/verify-app.py --sanitize build/outputs/default/*.app
