"""Merge completed per-window captures only; never infer completion from loose PNGs."""
from pathlib import Path
import json,hashlib
ROOT=Path('/storage/emulated/0/Documents/liubai-watch-delivery/ui-restoration/final-matrix')
APP=Path((Path(__file__).resolve().parent/'.parity-artifact-path').read_text().strip())
sha=hashlib.sha256(APP.read_bytes()).hexdigest()
allscenes=[]
for w in ['fit3','round454','round390','rect336']:
    data=json.loads((ROOT/('geometry-'+w+'.json')).read_text())
    assert data['artifactSha']==sha,(w,'wrong build')
    s=[s for s in data['scenes'] if s['window']==w]
    assert len(s)==len({r['scene'] for r in s})==26,(w,'not complete')
    allscenes.extend(s)
assert len(allscenes)==104
(ROOT/'geometry-all.json').write_text(json.dumps({'artifactSha':sha,'scopes':{'combined':'only complete per-window records from same real .app','fixtures':'approved sample records only, isolated native disk','failure':'explicit injected write failure only'},'scenes':allscenes},ensure_ascii=False,indent=2))
print(json.dumps({'sha':sha,'pairs':len(allscenes),'windows':4}))
