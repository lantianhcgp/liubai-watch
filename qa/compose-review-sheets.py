"""Make one-column actual/approved contact sheets at native pixel size for visual review."""
from pathlib import Path
from PIL import Image,ImageDraw,ImageFont
import json
ROOT=Path('/storage/emulated/0/Documents/liubai-watch-delivery/ui-restoration/final-matrix')
LABEL=ImageFont.truetype('/system/fonts/Roboto-Regular.ttf',16)
GROUPS={
 'lists':['home','home-pinned','history','day','trash','home-empty','history-empty','trash-empty'],
 'read-and-menus':['read','read-compact','read-large','menu-read','menu-record','menu-app','menu-confirm'],
 'editor-and-tools':['new-folded','new-open','edit-folded','edit-open','edit-candidates','edit-saving','tools','clipboard-empty','clipboard-populated','menu-error','menu-exit']}
manifest=json.loads((ROOT/'evidence-manifest.json').read_text())
by={(x['window'],x['scene']):x for x in manifest['pairs']}
out=ROOT/'review-sheets';out.mkdir(exist_ok=True)
files=[]
for window in ['fit3','round454','round390','rect336']:
 for group,names in GROUPS.items():
  # Small batches keep each component legible at native pixel resolution.
  for start in range(0,len(names),3):
   batch=names[start:start+3];pairs=[Image.open(by[(window,n)]['pair']).convert('RGB') for n in batch]
   w=max(p.width for p in pairs);h=sum(p.height for p in pairs)+24
   im=Image.new('RGB',(w,h),'#1e2321');y=24
   ImageDraw.Draw(im).text((8,3),window+' / '+group+' / part '+str(start//3+1),font=LABEL,fill='#f0ece3')
   for p in pairs:im.paste(p,(0,y));y+=p.height
   path=out/(window+'-'+group+'-'+str(start//3+1)+'.png');im.save(path);files.append(str(path))
(ROOT/'review-sheets.json').write_text(json.dumps(files,indent=2))
print(json.dumps({'review_sheets':len(files),'path':str(out)}))
