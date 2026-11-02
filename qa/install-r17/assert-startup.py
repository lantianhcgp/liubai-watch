#!/usr/bin/env python3
"""Acceptance: engine must actually reach the final startup assertions."""
import argparse
import json
from pathlib import Path

p = argparse.ArgumentParser()
p.add_argument('report', type=Path)
p.add_argument('--case', default='r16-full-drop-boot')
a = p.parse_args()
r = json.loads(a.report.read_text())
rows = r.get('executionRows', r.get('rows', []))
found = [v for v in rows if v['case'] == a.case]
assert len(found) == 1, ('case missing or duplicate', a.case)
v = found[0]
assert v['returncode'] == 0, ('STARTUP_DID_NOT_COMPLETE', a.case, v.get('lastPoint'), v.get('output'))
results = [json.loads(s[len('RESULT '):]) for s in v['output'].splitlines() if s.startswith('RESULT {')]
assert len(results) == 1, ('no final runtime assertions', v)
out = results[0]
assert out['test'] == 'full-startup' and out['route'] == 'pages/index/index'
assert out['store'] == 'ready' and out['ready'] is True and out['empty'] is True
assert out['message'] == '' and out['fileCalls'] > 0
print('PASS verified native startup assertions: ' + a.case)
