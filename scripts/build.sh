#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
BUILD_MODE="${BUILD_MODE:-release}"
case "$BUILD_MODE" in
  debug|release) ;;
  *) printf '%s\n' "Invalid BUILD_MODE: $BUILD_MODE" >&2; exit 2 ;;
esac
for tool in ohpm hvigorw python3; do
  command -v "$tool" >/dev/null || { printf '%s\n' "Missing compiler prerequisite: $tool" >&2; exit 127; }
done
python3 scripts/verify-source.py
ohpm install --all
hvigorw assembleApp --mode project -p product=default -p buildMode="$BUILD_MODE" --no-daemon --accept-license
VERIFY_FLAGS=(--sanitize)
if [ "${DIAGNOSTIC:-0}" = 1 ]; then VERIFY_FLAGS+=(--diagnostic); fi
python3 scripts/verify-app.py "${VERIFY_FLAGS[@]}" build/outputs/default/*.app
