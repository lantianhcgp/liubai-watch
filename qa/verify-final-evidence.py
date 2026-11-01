"""Verify final capture identity, all requested states and decoded screenshot structure."""
import json
import hashlib
from pathlib import Path
from PIL import Image

ROOT = Path('/storage/emulated/0/Documents/liubai-watch-delivery/ui-restoration')
QA = Path(__file__).resolve().parent
APP = Path((QA/'.parity-artifact-path').read_text().strip())
SHA = hashlib.sha256(APP.read_bytes()).hexdigest()
DIMS = {'fit3':(412,484),'round454':(454,454),'round390':(390,390),'rect336':(336,480)}
STATES = {'home','home-pinned','history','day','trash','read','read-compact','read-large','menu-read','menu-record','menu-app','menu-confirm','new-folded','new-open','tools','clipboard-empty','edit-folded','edit-open','edit-candidates','edit-saving','menu-error','menu-exit','clipboard-populated','home-empty','history-empty','trash-empty'}
geometry = json.loads((ROOT/'final-matrix/geometry-all.json').read_text())
functional = json.loads((ROOT/'functional/functional-result.json').read_text())
assert geometry['artifactSha']==SHA==functional['artifactSha'], 'Evidence belongs to different .app'
assert functional['status']=='PASS'
scenes=geometry['scenes']
keys=[(s['window'],s['scene']) for s in scenes]
assert len(keys)==len(set(keys))==len(DIMS)*len(STATES), 'Missing or duplicate state'
assert set(keys)=={(d,s) for d in DIMS for s in STATES}
checks=[]
for scene in scenes:
    name,state=scene['window'],scene['scene']
    n=scene['native']
    assert n['ready'] and not n.get('message'), (name,state,'not ready/error')
    assert (n['w'],n['h'])==DIMS[name]
    assert n['nodes'] and all(x['w']>0 and x['h']>0 for x in n['nodes']), (name,state,'zero-size')
    for role in ['actual','approved']:
        path=Path(scene[role])
        im=Image.open(path).convert('RGB')
        assert im.size==DIMS[name], (name,state,role,im.size)
        # Real decoding, not PNG filter bytes. A missing render has almost no near-white ink.
        white=sum(1 for r,g,b in im.getdata() if min(r,g,b)>125 and max(r,g,b)-min(r,g,b)<70)
        assert white>60,(name,state,role,'no readable foreground')
    if state=='edit-candidates':
        assert n['open'] and any(x.get('cls')=='candidate-text' and x.get('t') for x in n['nodes']), (name,state,'no real candidates')
    if state=='edit-saving':
        assert n['saving'] and any(x.get('t')=='保存中' for x in n['nodes']), (name,state,'no saving label')
    if state=='menu-error':
        assert n['mode']=='error' and any(x.get('t')=='重试保存' for x in n['nodes'])
    checks.append({'window':name,'scene':state,'dimensions':list(DIMS[name]),'rendered':True})
result={'artifactSha':SHA,'scope':'decoded pixels + actual compiler .app + real callback host; not a device renderer or subjective pixel-parity proof',
        'functionalChecks':len(functional['checks']),'statesPerWindow':len(STATES),'totalPairs':len(scenes),
        'zeroSizeNodes':sum(x['w']<=0 or x['h']<=0 for s in scenes for x in s['native']['nodes']),
        'perWindow':{k:sum(s['window']==k for s in scenes) for k in DIMS},'checked':checks}
(ROOT/'final-matrix/verified.json').write_text(json.dumps(result,ensure_ascii=False,indent=2))
print(json.dumps({k:v for k,v in result.items() if k!='checked'},ensure_ascii=False))
