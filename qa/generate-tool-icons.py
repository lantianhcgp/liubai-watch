#!/usr/bin/env python3
"""Original line icons for cursor, endpoints, clipboard and return; no font glyphs."""
from pathlib import Path
from PIL import Image, ImageDraw
ROOT=Path(__file__).resolve().parents[1]/'entry/src/main/js/MainAbility/common/icons'
S=4

def draw(name,color):
    im=Image.new('RGBA',(32*S,32*S));d=ImageDraw.Draw(im)
    def line(points):
        pts=[(round(x*S),round(y*S)) for x,y in points]
        d.line(pts,fill=color,width=2*S,joint='curve')
        for x,y in [pts[0],pts[-1]]:d.ellipse((x-S,y-S,x+S,y+S),fill=color)
    if name=='clipboard':
        d.rounded_rectangle((8*S,7*S,25*S,28*S),radius=2*S,outline=color,width=2*S)
        d.rounded_rectangle((12*S,4*S,21*S,10*S),radius=S,fill='#060808',outline=color,width=2*S)
        line([(12,16),(21,16)]);line([(12,21),(19,21)])
    elif name=='cursor_left':
        line([(25,16),(7,16)]);line([(13,10),(7,16),(13,22)])
    elif name=='cursor_right':
        line([(7,16),(25,16)]);line([(19,10),(25,16),(19,22)])
    elif name=='document_start':
        line([(6,7),(6,25)]);line([(26,16),(11,16)]);line([(17,10),(11,16),(17,22)])
    elif name=='document_end':
        line([(26,7),(26,25)]);line([(6,16),(21,16)]);line([(15,10),(21,16),(15,22)])
    elif name=='return_arrow':
        line([(26,9),(26,19),(7,19)]);line([(13,13),(7,19),(13,25)])
    else:raise ValueError(name)
    return im.resize((32,32),Image.Resampling.LANCZOS)

if __name__=='__main__':
    ROOT.mkdir(parents=True,exist_ok=True)
    for n in ['clipboard','cursor_left','cursor_right','document_start','document_end','return_arrow']:
        for tone,color in ([('warm','#f1f0e8'),('muted','#adb1a9')] if n=='return_arrow' else [('warm','#f1f0e8')]):
            p=ROOT/(n+'_'+tone+'.png')
            if p.exists():raise FileExistsError(p)
            draw(n,color).save(p)
            print(p.name,p.stat().st_size)
