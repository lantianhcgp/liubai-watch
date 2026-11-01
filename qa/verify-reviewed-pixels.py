"""Preserve decoded pixels from reviewed contact pairs, then compare the final raw frames."""
from pathlib import Path
from PIL import Image
import json,hashlib,sys
REPO=Path(__file__).resolve().parent.parent
ROOT=Path('/storage/emulated/0/Documents/liubai-watch-delivery/ui-restoration/final-matrix')
SNAP=REPO/'qa/.state/reviewed-pixels.json'
def digest(im): return hashlib.sha256(im.convert('RGB').tobytes()).hexdigest()
if sys.argv[1:] == ['snapshot']:
    m=json.loads((ROOT/'evidence-manifest.json').read_text())
    rows=[]
    for r in m['pairs']:
        w,h=r['dimensions']
        pair=Image.open(r['pair']).convert('RGB')
        assert pair.size==(w*2+20,h+72)
        rows.append({'window':r['window'],'scene':r['scene'],'pixelsSha':digest(pair.crop((0,62,w,62+h)))})
    SNAP.parent.mkdir(parents=True,exist_ok=True)
    SNAP.write_text(json.dumps({'previousArtifactSha':m['artifactSha'],'reviewedMethod':'prior component-level inspection of all 104 actual/approved pairs','scenes':rows},indent=2))
    print(json.dumps({'snapshot':len(rows),'previousArtifactSha':m['artifactSha']}))
else:
    old=json.loads(SNAP.read_text());m=json.loads((ROOT/'evidence-manifest.json').read_text())
    by={(r['window'],r['scene']):r for r in old['scenes']}
    rows=[]
    for r in m['pairs']:
        im=Image.open(ROOT/(r['window']+'-'+r['scene']+'-actual.png')).convert('RGB')
        equal=digest(im)==by[(r['window'],r['scene'])]['pixelsSha']
        rows.append({'window':r['window'],'scene':r['scene'],'identicalDecodedPixelsToPreviouslyReviewedFrame':equal,'pair':r['pair'],'componentCrops':r['componentCrops']})
    result={'artifactSha':m['artifactSha'],'previousArtifactSha':old['previousArtifactSha'],'scope':'exact decoded RGB identity for unchanged states; every changed state still requires component-level visual inspection','unchangedStates':sum(r['identicalDecodedPixelsToPreviouslyReviewedFrame'] for r in rows),'changedStates':sum(not r['identicalDecodedPixelsToPreviouslyReviewedFrame'] for r in rows),'scenes':rows}
    (ROOT/'reviewed-pixel-comparison.json').write_text(json.dumps(result,ensure_ascii=False,indent=2))
    print(json.dumps({k:v for k,v in result.items() if k!='scenes'}))
