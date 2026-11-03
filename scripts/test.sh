#!/data/data/com.termux/files/usr/bin/bash
set -euo pipefail
cd /data/data/com.termux/files/home/liubai-watch-elcton-rebuild
mkdir -p /storage/emulated/0/Documents/liubai-rebuild-2026-11-03/core-tests
node --test --test-concurrency=1 tests/*.test.mjs
