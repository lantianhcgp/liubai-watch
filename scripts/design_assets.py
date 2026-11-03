#!/usr/bin/env python3
"""Reuse only verified V3-derived icon pixels; never copies any old application code."""
from pathlib import Path
import hashlib,json,shutil
from PIL import Image,ImageDraw,ImageFont
# Pillow's PixelAccess typing does not expose RGBA tuple indexing correctly.
ROOT=Path(__file__).resolve().parents[1]
SOURCE=Path('/data/data/com.termux/files/home/liubai-watch-ui-restoration')
MANIFEST=Path('/storage/emulated/0/Documents/liubai-watch-delivery/ui-restoration/approved-raster-assets.json')
EXPECTED_MANIFEST='819139bd34fe0ec8c3a6f0afa950a33a2fee2ed3e509538e3e2cb25f13d21480'
MAP={'book-gold':'book_nav_gold','book-muted':'book_nav_muted','calendar-gold':'calendar_nav_gold','calendar-muted':'calendar_nav_muted','dots-warm':'dots_header_warm','dots-gold':'dots_reader_gold','back-muted':'back_nav_muted','right-muted':'right_nav_muted','pin-gold':'pin_row_gold','plus-ink':'plus_cta_ink','delete-warm':'delete_key_warm','enter-warm':'enter_key_warm','collapse-muted':'back_editor_muted'}
DEST=ROOT/'entry/src/main/js/MainAbility/common/ui'
def sha(b):return hashlib.sha256(b).hexdigest()
def main():
 assert sha(MANIFEST.read_bytes())==EXPECTED_MANIFEST
 manifest=json.loads(MANIFEST.read_text());known={r['path']:r['sha256'] for r in manifest['assets']};rows=[];DEST.mkdir(parents=True,exist_ok=True)
 names={**{name:'entry/src/main/js/MainAbility/common/icons/'+src+'.png' for name,src in MAP.items()},'app-name':'entry/src/main/js/MainAbility/common/type/app_name.png','write-note':'entry/src/main/js/MainAbility/common/type/write_note.png'}
 for name in ['back','edit','copy','restore','check','alert']:names[name+'-warm']='entry/src/main/js/MainAbility/common/icons/'+name+'_warm.png'
 names['trash-danger']='entry/src/main/js/MainAbility/common/icons/trash_warm.png'
 names['trash-warm']='entry/src/main/js/MainAbility/common/icons/trash_warm.png'
 names['empty-copy-gold']='entry/src/main/js/MainAbility/common/icons/empty_copy_gold.png'
 for name,relative in names.items():
  raw=(SOURCE/relative).read_bytes()
  if relative in known:assert sha(raw)==known[relative]
  image=Image.open(SOURCE/relative).convert('RGBA');assert image.getbbox() is not None
  if name=='trash-danger':
   pixels=image.load()
   for y in range(image.height):
    for x in range(image.width):
     r,g,b,a=pixels[x,y];pixels[x,y]=(236,161,139,a)
   image.save(DEST/(name+'.png'))
  else:shutil.copyfile(SOURCE/relative,DEST/(name+'.png'))
  result=Image.open(DEST/(name+'.png')).convert('RGBA');rows.append({'file':name+'.png','source':relative,'sourceSha256':sha(raw),'size':list(result.size),'pixelSha256':sha(result.tobytes()),'sha256':sha((DEST/(name+'.png')).read_bytes())})
 toolbar=Image.open(ROOT/'entry/src/main/js/MainAbility/common/keyboard/common/toolBar.png').convert('RGBA')
 for name,crop in [('tool-prev',(30,14,68,46)),('tool-clipboard',(173,14,214,47)),('tool-next',(242,14,280,46))]:
  part=toolbar.crop(crop);out=Image.new('RGBA',part.size);src=part.load();dst=out.load()
  for y in range(part.height):
   for x in range(part.width):
    r,g,b,a=src[x,y];v=max(r,g,b);dst[x,y]=(241,240,232,max(0,min(255,round((v-55)*255/180))))
  out=out.crop(out.getbbox());out.thumbnail((23,23),Image.Resampling.LANCZOS);out.save(DEST/(name+'.png'));rows.append({'file':name+'.png','source':'original CrabKeyboard toolBar.png icon region','size':list(out.size),'sha256':sha((DEST/(name+'.png')).read_bytes())})
 media=ROOT/'entry/src/main/resources/base/media';media.mkdir(parents=True,exist_ok=True)
 icon=Image.new('RGBA',(456,456));d=ImageDraw.Draw(icon);d.ellipse((0,0,455,455),fill='#e6c78c');d.rounded_rectangle((116,88,338,367),radius=28,outline='#292d27',width=13);d.line((161,91,161,367),fill='#292d27',width=12);d.line((199,165,300,165),fill='#292d27',width=10);d.line((199,211,300,211),fill='#292d27',width=10);d.line((199,257,264,257),fill='#292d27',width=10)
 for name,size in [('icon',114),('icon_small',32)]:icon.resize((size,size),Image.Resampling.LANCZOS).save(media/(name+'.png'))
 panel=Image.new('RGB',(840,440),'#060808');d=ImageDraw.Draw(panel);font=ImageFont.truetype('/data/data/com.termux/files/usr/share/fonts/TTF/DejaVuSans.ttf',15) if Path('/data/data/com.termux/files/usr/share/fonts/TTF/DejaVuSans.ttf').exists() else ImageFont.load_default()
 for i,row in enumerate(rows):
  x=(i%6)*140+18;y=(i//6)*88+10;im=Image.open(DEST/row['file']).convert('RGBA');im.thumbnail((100,48));panel.paste(im,(x,y),im);d.text((x,y+53),row['file'][:19],font=font,fill='#adb1a9')
 target=Path('/storage/emulated/0/Documents/liubai-rebuild-2026-11-03/asset-components.png');target.parent.mkdir(parents=True,exist_ok=True);panel.save(target)
 proof={'scope':'verified original V3-derived assets only, no old runtime code copied','baselineHtmlSha256':'afc5fcb14d47a83be90dc71f9f2682a5d9eb95d19f55643328a05cf9f2fd5d6a','manifestSha256':EXPECTED_MANIFEST,'assets':rows,'appIconSizes':[114,32]};(ROOT/'docs/design-assets.json').write_text(json.dumps(proof,indent=2)+'\n');print(json.dumps({'assets':len(rows),'brandSize':next(r['size'] for r in rows if r['file']=='app-name.png'),'writeSize':next(r['size'] for r in rows if r['file']=='write-note.png'),'panel':str(target)}))
if __name__=='__main__':main()
