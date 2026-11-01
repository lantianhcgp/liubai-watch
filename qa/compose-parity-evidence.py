"""Build labelled same-state evidence and component crops, never alter source PNGs."""
import json
import hashlib
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont

ROOT = Path('/storage/emulated/0/Documents/liubai-watch-delivery/ui-restoration/final-matrix')
FONT = ImageFont.truetype('/system/fonts/Roboto-Regular.ttf', 18)
SMALL = ImageFont.truetype('/system/fonts/Roboto-Regular.ttf', 13)
reports = list(ROOT.glob('geometry-*.json'))
assert reports, 'No completed capture report'
scenes = []
for p in reports:
    data = json.loads(p.read_text())
    for s in data['scenes']:
        s['artifactSha'] = data['artifactSha']
        scenes.append(s)
# Per-window runs may coexist with an all run. Require identical data, dedupe by pair.
unique = {}
for s in scenes:
    unique[(s['window'], s['scene'])] = s
scenes = list(unique.values())
assert len({s['artifactSha'] for s in scenes}) == 1, 'Mixed artifacts in evidence'
out = ROOT / 'labelled-pairs'
components = ROOT / 'component-crops'
out.mkdir(exist_ok=True)
components.mkdir(exist_ok=True)
records = []
for s in scenes:
    actual = Image.open(s['actual']).convert('RGB')
    approved = Image.open(s['approved']).convert('RGB')
    assert actual.size == approved.size, (s['window'], s['scene'], actual.size, approved.size)
    w, h = actual.size
    assert (w, h) == (s['native']['w'], s['native']['h'])
    sha_a = hashlib.sha256(Path(s['actual']).read_bytes()).hexdigest()
    sha_b = hashlib.sha256(Path(s['approved']).read_bytes()).hexdigest()
    canvas = Image.new('RGB', (w*2+20, h+72), '#1e2321')
    canvas.paste(actual, (0, 62))
    canvas.paste(approved, (w+20, 62))
    d = ImageDraw.Draw(canvas)
    d.text((8, 4), s['window']+' / '+s['scene'], fill='#f0ece3', font=FONT)
    d.text((8, 30), 'ACTUAL .app '+s['artifactSha'][:12], fill='#d9b867', font=SMALL)
    d.text((w+28, 30), 'APPROVED FINAL V3', fill='#d9b867', font=SMALL)
    p = out / (s['window']+'-'+s['scene']+'.png')
    canvas.save(p)
    # Header, body and controls examined separately at 2x; preserve unscaled originals.
    cuts = [('header', 0, min(h, int(h*.25))),
            ('body', int(h*.23), int(h*.76)),
            ('controls', int(h*.7), h)]
    cps = []
    for name, y0, y1 in cuts:
        ah = actual.crop((0, y0, w, y1)).resize((w*2,(y1-y0)*2),Image.Resampling.NEAREST)
        bh = approved.crop((0, y0, w, y1)).resize((w*2,(y1-y0)*2),Image.Resampling.NEAREST)
        sheet = Image.new('RGB',(w*4+20,ah.height+42),'#1e2321')
        sheet.paste(ah,(0,42));sheet.paste(bh,(w*2+20,42))
        dd=ImageDraw.Draw(sheet)
        dd.text((8,4),s['window']+' / '+s['scene']+' / '+name+'  ACTUAL | V3',font=FONT,fill='#f0ece3')
        cp=components/(s['window']+'-'+s['scene']+'-'+name+'.png');sheet.save(cp);cps.append(str(cp))
    records.append({'window':s['window'],'scene':s['scene'],'dimensions':[w,h], 'artifactSha':s['artifactSha'],
                    'actualSha':sha_a,'approvedSha':sha_b,'pair':str(p),'componentCrops':cps})
manifest=ROOT/'evidence-manifest.json'
manifest.write_text(json.dumps({'artifactSha':scenes[0]['artifactSha'],'pairs':records},ensure_ascii=False,indent=2))
print(json.dumps({'pairs':len(records),'componentCrops':len(records)*3,'perWindow':{k:sum(r['window']==k for r in records) for k in sorted({r['window'] for r in records})},'manifest':str(manifest)}))
