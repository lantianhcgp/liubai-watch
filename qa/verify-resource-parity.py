"""Audit actual .app raw image pixels against the exact source PNGs."""
from pathlib import Path
import json, hashlib, struct, zipfile, io
from PIL import Image
REPO=Path(__file__).resolve().parent.parent
APP=Path((REPO/'qa/.parity-artifact-path').read_text().strip())
SOURCE=REPO/'entry/src/main/js/MainAbility'
ROOT=Path('/storage/emulated/0/Documents/liubai-watch-delivery/ui-restoration')
outer=zipfile.ZipFile(APP)
hap=zipfile.ZipFile(io.BytesIO(outer.read('entry-default.hap')))
records=[]
for name in hap.namelist():
    if not name.endswith('.png.bin') or not name.startswith('assets/js/MainAbility/'):
        continue
    relative=name[len('assets/js/MainAbility/'):-4]
    source=SOURCE/relative
    assert source.is_file(), ('Missing corresponding PNG',relative)
    raw=hap.read(name)
    width,height=struct.unpack('<HH',raw[4:8])
    assert len(raw)==8+width*height*4,(name,'unexpected image payload')
    actual=Image.frombytes('RGBA',(width,height),raw[8:],'raw','BGRA')
    expected=Image.open(source).convert('RGBA')
    assert actual.size==expected.size,(name,'wrong dimensions')
    assert actual.tobytes()==expected.tobytes(),(name,'compiled image differs from source pixels')
    records.append({'resource':relative,'dimensions':[width,height],'rgbaBytes':width*height*4,
                    'pixelsSha':hashlib.sha256(actual.tobytes()).hexdigest()})
assert records
result={'status':'PASS','artifactSha':hashlib.sha256(APP.read_bytes()).hexdigest(),
        'images':len(records),'pixelMismatchCount':0,'sourceToCompiledPixelIdentity':True,
        'totalDecodedRgbaBytes':sum(r['rgbaBytes'] for r in records),
        'scope':'all packaged MainAbility PNGs, including approved title/icon assets and original crab keyboard sheets; not a runtime image-pool measurement',
        'resources':records}
(ROOT/'resource-parity.json').write_text(json.dumps(result,indent=2))
print(json.dumps({k:v for k,v in result.items() if k!='resources'}))
