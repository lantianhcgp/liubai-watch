#!/usr/bin/env bash
# Foreground process owner. Invoke with Hermes background=true; no nohup/hidden jobs.
set -euo pipefail
cd "$(dirname "$0")/.."
QA="$PWD/qa"
case "${1:-host}" in
  host)
    mkdir -p "$QA/vendor"
    for spec in 'jszip@3.10.1/dist/jszip.min.js' 'html2canvas@1.4.1/dist/html2canvas.min.js'; do
      name="${spec##*/}"
      if [ ! -s "$QA/vendor/$name" ]; then
        curl --fail --location --connect-timeout 15 --max-time 90 --retry 2 "https://cdn.jsdelivr.net/npm/$spec" -o "$QA/vendor/$name.part"
        mv "$QA/vendor/$name.part" "$QA/vendor/$name"
      fi
    done
    exec python3 "$QA/serve-sim.py" --port 8791
    ;;
  chrome)
    # Refuse an unrelated process on dedicated port, reuse only this profile via explicit caller.
    python3 -c "import urllib.request; r=urllib.request.urlopen('http://127.0.0.1:8791/__health',timeout=5); assert b'liubai' in r.read()"
    exec proot-distro login alpine -- /usr/bin/chromium --headless --no-sandbox --disable-dev-shm-usage --disable-gpu --remote-debugging-address=127.0.0.1 --remote-debugging-port=9247 --user-data-dir="$QA/.profile" --window-size=900,900 http://127.0.0.1:8791/
    ;;
  *) printf '%s\n' 'Usage: bash qa/start-sim.sh [host|chrome]' >&2; exit 2 ;;
esac
