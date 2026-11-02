#!/usr/bin/env python3
"""Same SDK and host: isolate whitespace, local names and safe compression."""
import argparse
import hashlib
import json
from pathlib import Path
import importlib.util

_spec = importlib.util.spec_from_file_location('native_probe', Path(__file__).with_name('probe-native.py'))
assert _spec and _spec.loader
native = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(native)

p = argparse.ArgumentParser()
p.add_argument('--sdk', type=Path, required=True)
p.add_argument('--out', type=Path, required=True)
p.add_argument('--compact', type=Path, required=True)
a = p.parse_args()
engines = [f for f in a.sdk.rglob('jerry') if f.is_file() and f.parent.name == 'bin' and 'ace-loader' in str(f)]
assert len(engines) == 1
engine = engines[0]
a.out.mkdir(parents=True, exist_ok=True)
def file(name, text):
    f = a.out / name
    f.write_text(text)
    return f
host = file('host.js', native.HOST)
create = file('create.js', native.CREATE)
boot = file('boot.js', native.BOOT)
route = file('route.js', native.ROUTE)
drop = file('drop.js', '__boot=null;__last=null;__point("boot-ref-dropped");')
index = file('index.js', native.INDEXEXPORT)
finish = file('finish.js', native.FINISH)
rows = []
for mode in ['format', 'locals', 'compress']:
    for part in ['app', 'boot', 'index']:
        f = a.out / (mode + '-' + part + '.js')
        f.write_bytes((a.compact / mode / ('r16-' + part + '.js')).read_bytes())
        rows.append(native.run_case(engine, [f], 'parse-' + mode + '-' + part, a.out, parse=True))
    full = [host, a.out / (mode + '-app.js'), create, a.out / (mode + '-boot.js'), boot, route, drop,
            a.out / (mode + '-index.js'), index, finish]
    rows.append(native.run_case(engine, full, mode + '-full-startup', a.out))
report = {'scope': 'Same real SDK CLI engine and bounded doubles as the red baseline, with build-side formatting/local-name/safe-compress variants; not native FIT3 UI or storage.',
          'engineSha256': hashlib.sha256(engine.read_bytes()).hexdigest(), 'rows': rows,
          'provenance': json.loads((a.compact / 'compact-provenance.json').read_text())}
(a.out / 'compact-report.json').write_text(json.dumps(report, indent=2) + '\n')
print('REPORT ' + str(a.out / 'compact-report.json'))
assert all(r['returncode'] == 0 for r in rows if r['case'].startswith('parse-')), 'Compressed output rejected by SDK parser'
