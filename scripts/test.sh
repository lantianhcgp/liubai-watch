#!/data/data/com.termux/files/usr/bin/bash
set -euo pipefail
cd -- "$(dirname -- "${BASH_SOURCE[0]}")/.."
node --test --test-concurrency=1 tests/*.test.mjs
python3 -m unittest discover -s tests -p 'test_*.py'
python3 scripts/secret_audit.py
