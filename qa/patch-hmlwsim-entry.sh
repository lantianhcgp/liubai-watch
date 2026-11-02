#!/data/data/com.termux/files/usr/bin/bash
# Make hmlwsim start at the app's declared entry page (config module.js[0].pages[0])
# instead of a hard-coded pages/index/index, so the simulator matches the FA device
# behavior that loads the first configured page. Idempotent: re-running changes nothing.
# Usage: bash qa/patch-hmlwsim-entry.sh [path-to-hmlwsim]   (default ~/hmlwsim)
set -euo pipefail
SIM="${1:-$HOME/hmlwsim}"
TARGET="$SIM/js/app.js"
[ -f "$TARGET" ] || { echo "hmlwsim app.js not found: $TARGET" >&2; exit 1; }
python3 - "$TARGET" <<'PY'
import sys
from pathlib import Path
p = Path(sys.argv[1])
s = p.read_text()
old = "DeviceFeaturePageNav.navigateTo('pages/index/index', {})"
new = "DeviceFeaturePageNav.navigateTo((appData.pages && appData.pages[0]) || 'pages/index/index', {})"
if new in s:
    print('already patched:', p)
else:
    n = s.count(old)
    if n == 0:
        raise SystemExit('entry navigation pattern not found; hmlwsim changed upstream')
    p.write_text(s.replace(old, new))
    print(f'patched {n} entry navigations to honor config pages[0]:', p)
PY
node --check "$TARGET" >/dev/null
echo "PASS hmlwsim entry page honors config pages[0]"
