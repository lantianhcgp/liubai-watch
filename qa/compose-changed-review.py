"""Compose only final changed states for component-level visual re-review."""
from pathlib import Path
import json
from PIL import Image,ImageDraw,ImageFont
ROOT=Path('/storage/emulated/0/Documents/liubai-watch-delivery/ui-restoration/final-matrix')
change=json.loads((ROOT/'reviewed-pixel-comparison.json').read_text())
by={(r['window'],r['scene']):r for r in change['scenes']}
sets={'empty':['clipboard-empty','history-empty','trash-empty'],'keyboard':['new-open','edit-open','edit-candidates'],'confirm':['menu-confirm','menu-error','menu-exit']}
out=ROOT/'changed-review';out.mkdir(exist_ok=True)
font=ImageFont.truetype('/system/fonts/Roboto-Regular.ttf',18)
records=[]
for window in ['fit3','round454','round390','rect336']:
 for group,names in sets.items():
  pairs=[]
  for name in names:
   item=by[(window,name)]
   assert not item['identicalDecodedPixelsToPreviouslyReviewedFrame']
   pairs.append(Image.open(item['pair']).convert('RGB'))
  width=max(p.width for p in pairs);height=sum(p.height for p in pairs)+40
  sheet=Image.new('RGB',(width,height),'#1e2321');d=ImageDraw.Draw(sheet)
  d.text((10,10),window+' / FINAL '+change['artifactSha'][:12]+' / '+group,font=font,fill='#e6c78c')
  y=40
  for im in pairs:sheet.paste(im,(0,y));y+=im.height
  p=out/(window+'-'+group+'.png');sheet.save(p);records.append({'window':window,'group':group,'states':names,'image':str(p)})
(ROOT/'changed-review.json').write_text(json.dumps({'artifactSha':change['artifactSha'],'sets':records},ensure_ascii=False,indent=2))
print(json.dumps({'sets':len(records),'changedStates':sum(len(r['states']) for r in records),'artifactSha':change['artifactSha']}))
