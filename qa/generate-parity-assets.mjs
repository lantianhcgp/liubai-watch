import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {connect} from './parity-cdp.mjs';
const c=await connect('/__baseline');
try{
 const output=await c.eval(`(async()=>{
  await document.fonts.ready;
  const out={};
  const icons=[
   ['book_nav_gold','book',20,'#e6c78c',1.7],['book_nav_muted','book',20,'#adb1a9',1.7],
   ['calendar_nav_gold','calendar',20,'#e6c78c',1.7],['calendar_nav_muted','calendar',20,'#adb1a9',1.7],
   ['pin_row_gold','pin',17,'#e6c78c',1.7],['plus_cta_ink','plus',27,'#232923',1.7],
   ['dots_header_warm','dots',23,'#f1f0e8',1.7],['dots_reader_gold','dots',26,'#e6c78c',2.5],
   ['dots_editor_warm','dots',23,'#f1f0e8',1.7],['back_editor_muted','back',23,'#f1f0e8',1.7,-90],
   ['back_nav_muted','back',23,'#adb1a9',1.7],['right_nav_muted','right',23,'#adb1a9',1.7],
   ['delete_key_warm','delete',23,'#f1f0e8',1.7],['enter_key_warm','enter',23,'#f1f0e8',1.7]
  ];
  for(const [name,ic,size,color,stroke,angle]of icons){
   const src='<svg xmlns="http://www.w3.org/2000/svg" width="'+size+'" height="'+size+'" viewBox="0 0 24 24" fill="none" stroke="'+color+'" stroke-width="'+stroke+'" stroke-linecap="round" stroke-linejoin="round">'+symbols[ic]+'</svg>';
   const image=new Image();image.src='data:image/svg+xml;base64,'+btoa(src);await image.decode();
   const canvas=document.createElement('canvas');canvas.width=canvas.height=size;const ctx=canvas.getContext('2d');
   if(angle){ctx.translate(size/2,size/2);ctx.rotate(angle*Math.PI/180);ctx.drawImage(image,-size/2,-size/2);}else ctx.drawImage(image,0,0);
   out['icons/'+name+'.png']=canvas.toDataURL();
  }
  for(const [name,selector,label,width,height,font,space,color]of [
   ['app_name','.app-name','留白',58,37,26,3,'#f1f0e8'],
   ['write_note','.new-note strong','写一条',69,34,23,0,'#232923']
  ]){
   const family=getComputedStyle(document.querySelector(selector)).fontFamily;
   const canvas=document.createElement('canvas');canvas.width=width;canvas.height=height;
   const ctx=canvas.getContext('2d');ctx.font='600 '+font+'px '+family;ctx.letterSpacing=space+'px';ctx.fillStyle=color;
   const metrics=ctx.measureText(label),ascent=metrics.fontBoundingBoxAscent,descent=metrics.fontBoundingBoxDescent;
   const baseline=(height-ascent-descent)/2+ascent;ctx.fillText(label,0,baseline);
   out['type/'+name+'.png']=canvas.toDataURL();
  }
  return out;
 })()`);
 const report=[];
 for(const [name,data]of Object.entries(output)){
  const p=path.join('entry/src/main/js/MainAbility/common',name),bytes=Buffer.from(data.split(',')[1],'base64');
  fs.mkdirSync(path.dirname(p),{recursive:true});fs.writeFileSync(p,bytes);
  report.push({path:p,bytes:bytes.length,sha256:crypto.createHash('sha256').update(bytes).digest('hex')});
 }
 const dir='/storage/emulated/0/Documents/liubai-watch-delivery/ui-restoration';
 fs.writeFileSync(dir+'/approved-raster-assets.json',JSON.stringify({source:'unmodified approved-v3 HTML symbols and actual rendered font metrics',assets:report},null,2));
 console.log('Generated approved exact-size raster assets='+report.length);
}finally{c.close();}
