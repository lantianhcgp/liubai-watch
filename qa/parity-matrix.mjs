import fs from 'node:fs';import assert from 'node:assert/strict';import {connect} from './parity-cdp.mjs';
const c=await connect('app'),b=await connect('/__baseline');
const out='/storage/emulated/0/Documents/liubai-watch-delivery/ui-restoration/final-matrix',report=[];
const dims=[['fit3',412,484,false],['round454',454,454,true],['round390',390,390,true],['rect336',336,480,false]];
const requested=process.argv[2]?dims.filter(d=>d[0]===process.argv[2]):dims;
const D='DeviceFeaturePageNav.getCurrentPage().data';let fixture,originalBaseline;
async function ready(page){await c.wait(`DeviceFeaturePageNav.getCurrentPage()?.uri==='pages/${page}/${page}'&&${D}.ready&&!${D}.loading`);if(page==='edit')await c.wait(`!!${D}.kb`);if(page==='read')await c.wait(`!!${D}.page`);}
async function nav(page,params={}){await c.eval(`(()=>{const app=${D}.$vm.$app.$def;app.setLiubaiParams(${JSON.stringify(params)});return DeviceFeaturePageNav.navigateTo('pages/${page}/${page}',${JSON.stringify(params)});})()`);await ready(page);}
async function tap(selector){await c.send('Page.bringToFront');await c.eval(`document.getElementById('watch-content').shadowRoot.querySelector(${JSON.stringify(selector)}).scrollIntoView({block:'center'})`);await c.tap(selector,true);}
async function originalKey(row,col){
 await c.send('Page.bringToFront');
 const g=await c.eval(`(()=>{const d=${D},r=document.getElementById('watch-content').getBoundingClientRect();return{x:r.x+d.keyX,y:r.y+d.keysY,keyW:d.keyW,offset:d.kb.snapshot().sheetOffset,sheetW:d.sheetWidth}})()`);
 const keyX=(col*57+row*29+28)*(141/180),targetOffset=Math.max(Math.min(0,g.keyW-g.sheetW),Math.min(0,g.keyW/2-keyX));
 if(keyX+g.offset<22||keyX+g.offset>g.keyW-22){const move=targetOffset-g.offset,sx=g.x+g.keyW*(move<0?.75:.25),sy=g.y+70;await c.send('Input.dispatchMouseEvent',{type:'mousePressed',x:sx,y:sy,button:'left',clickCount:1});await c.send('Input.dispatchMouseEvent',{type:'mouseMoved',x:sx+move,y:sy,button:'left',buttons:1});await c.send('Input.dispatchMouseEvent',{type:'mouseReleased',x:sx+move,y:sy,button:'left',clickCount:1});await c.wait(`Math.abs(${D}.kb.snapshot().sheetOffset-(${targetOffset}))<1`);}
 const p=await c.eval(`(()=>{const d=${D},r=document.getElementById('watch-content').getBoundingClientRect();return{x:r.x+d.keyX+${keyX}+d.kb.snapshot().sheetOffset,y:r.y+d.keysY+${(row*60+30)*(141/180)}}})()`);await c.send('Input.dispatchMouseEvent',{type:'mousePressed',...p,button:'left',clickCount:1});await c.send('Input.dispatchMouseEvent',{type:'mouseReleased',...p,button:'left',clickCount:1});
}

async function capture(name,scene){
 await c.wait('Array.from(document.getElementById("watch-content").shadowRoot.querySelectorAll("img")).every(i=>i.complete&&i.naturalWidth>0)');
 await b.wait('Array.from(document.querySelectorAll("#watch img")).every(i=>i.complete&&i.naturalWidth>0)');
 await c.send('Page.bringToFront');
 await c.eval('document.fonts.ready.then(()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r))))');
 await b.send('Page.bringToFront');
 await b.eval('document.fonts.ready.then(()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r))))');
 const aPath=out+'/'+name+'-'+scene+'-actual.png',bPath=out+'/'+name+'-'+scene+'-approved.png';
 await c.shot(aPath,'#watch-content');await b.shot(bPath,'#watch');
 const g=await c.eval(`(()=>{const root=document.getElementById('watch-content'),sr=root.shadowRoot,r=root.getBoundingClientRect(),p=DeviceFeaturePageNav.getCurrentPage(),d=p.data;return{page:p.uri,ready:d.ready,message:d.message,mode:d.mode,w:d.w,h:d.h,open:d.open,id:d.id,font:d.font,saving:d.saving,lines:Array.from(d.lines||[]).map(l=>({text:l.text,start:l.start,end:l.end,x:l.x,y:l.y,width:l.width,height:l.height,font:l.font,bold:l.bold})),rows:Array.from(d.rows||[]).map(m=>({id:m.id,title:m.title,meta:m.meta})),nodes:Array.from(sr.querySelectorAll('text,img,.header,.dock,.new-note,.section,.row-divider,.key-viewport,.keybar,.folded-bar,.body-hit,.empty,.font,.menu-row')).map(e=>{let b=e.getBoundingClientRect(),s=getComputedStyle(e);return{tag:e.tagName,cls:e.className,t:e.tagName==='TEXT'?e.textContent:undefined,x:b.x-r.x,y:b.y-r.y,w:b.width,h:b.height,font:s.fontSize,line:s.lineHeight,image:e.tagName==='IMG'?{complete:e.complete,natural:[e.naturalWidth,e.naturalHeight]}:undefined}})}})()`);
 const bg=await b.eval(`(()=>{const r=document.querySelector('#watch').getBoundingClientRect();return{page:ui.page,device:ui.device,open:ui.keyboardOpen,saving:ui.saving,nodes:Array.from(document.querySelector('#watch').querySelectorAll('.header,.head-title,.reader-date,.new-note,.dock,.menu-row,.reading-line,.editor-line,.reader-progress,.editor-nav,.source-toolbar,.keyboard-viewport,.keyboard-foot,.quiet-empty')).map(e=>{const b=e.getBoundingClientRect(),s=getComputedStyle(e);return{cls:e.className,text:e.childElementCount?undefined:e.textContent,x:b.x-r.x,y:b.y-r.y,w:b.width,h:b.height,font:s.fontSize,weight:s.fontWeight}})}})()`);
 assert.ok(!g.message,'native error '+g.message);assert.equal(g.w,dims.find(x=>x[0]===name)[1]);assert.equal(g.h,dims.find(x=>x[0]===name)[2]);
 assert.ok(g.nodes.every(n=>n.w>0&&n.h>0),'zero-size node');report.push({window:name,scene,actual:aPath,approved:bPath,native:g,baseline:bg});console.log('captured',name,scene);
}
async function baseline(name,page,extra={}){await b.eval(`(()=>{Object.assign(ui,{device:${JSON.stringify(name)},page:${JSON.stringify(page)},id:'n1',month:'2026-11',day:'2026-11-01',empty:false,filter:false,notice:'',saving:false,fault:false,readFont:'normal',readId:null,readRevision:null,readAnchor:0,...${JSON.stringify(extra)}});render();return true})()`);}
async function flags(values){await c.eval(`(async()=>{const store=${D}.$vm.$app.$def.getStore();for(const n of ${JSON.stringify(values)})await new Promise((r,j)=>store.flag(n.id,{deleted:n.deleted},(e,v)=>e?j(e):r(v)));})()`);}
async function startDevice(w,h,circle){
 await c.send('Page.reload',{ignoreCache:true});await c.wait('document.readyState==="complete"&&typeof Unpacker!=="undefined"&&typeof JSZip!=="undefined"');
 await c.eval(`(async()=>{SensorPanel.setConfig({width:${w},height:${h},isCircle:${circle}});DeviceFeatureDisplay.configure(${w},${h},${circle});const v=await(await fetch('/__artifact',{cache:'no-store'})).arrayBuffer();window.__parityArtifactSha=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',v))).map(x=>x.toString(16).padStart(2,'0')).join('');const transfer=new DataTransfer();transfer.items.add(new File([v],'liubai-final.app',{type:'application/zip'}));const input=document.getElementById('file-input');input.files=transfer.files;input.dispatchEvent(new Event('change',{bubbles:true}));})()`);await ready('index');
 await c.eval(`(async()=>{const app=${D}.$vm.$app.$def;app.getSession().clear();await new Promise((r,j)=>app.getStore().draftClear(e=>e?j(e):r()));})()`);
}
try{
 fs.mkdirSync(out,{recursive:true});for(const target of [c,b]){await target.send('Network.enable');await target.send('Network.setCacheDisabled',{cacheDisabled:true});await target.send('Emulation.setDeviceMetricsOverride',{width:1440,height:1100,deviceScaleFactor:1,mobile:false});await target.send('Emulation.setTimezoneOverride',{timezoneId:'Asia/Shanghai'});await target.send('Emulation.setUserAgentOverride',{userAgent:await target.eval('navigator.userAgent'),acceptLanguage:'zh-CN,zh;q=0.9'});}
 originalBaseline=await b.eval('records.map(n=>({...n}))');fixture=originalBaseline.map(n=>({id:n.id,deleted:n.deleted}));
 for(const [name,w,h,circle]of requested){
  await startDevice(w,h,circle);await flags(fixture);await b.eval(`records=${JSON.stringify(originalBaseline)};draft=null;ui.clipboard=[];`);
  await nav('index');await baseline(name,'home');await capture(name,'home');
  await tap('.section .hit');await c.wait(`${D}.filter==='pinned'&&!${D}.loading`);await baseline(name,'home',{filter:true});await capture(name,'home-pinned');
  await nav('history',{month:'2026-11'});await baseline(name,'history');await capture(name,'history');
  await nav('day',{day:'2026-11-01',month:'2026-11'});await baseline(name,'day');await capture(name,'day');
  await nav('trash');await baseline(name,'trash');await capture(name,'trash');
  for(const size of ['normal','compact','large']){await nav('read',{id:'n1',font:size,anchor:0,fromStart:true});await baseline(name,'read',{readFont:size});await capture(name,size==='normal'?'read':'read-'+size);}
  for(const [mode,page]of [['read','read-options'],['record','menu'],['app','appmenu'],['confirm','confirm']]){await nav('menu',{mode,id:'n1',font:'normal',anchor:0,pinned:false,revision:3});await baseline(name,page);await capture(name,'menu-'+mode);}
  await c.eval(`${D}.$vm.$app.$def.getSession().clear()`);
  await nav('edit',{action:'new'});await baseline(name,'edit',{id:null,text:'',original:'',cursor:0,pinyin:'',mode:0,keyboardOpen:false,editorAnchor:0,editorFollow:true});await capture(name,'new-folded');
  await tap('.expand');await c.wait(`${D}.open`);await baseline(name,'edit',{id:null,text:'',original:'',cursor:0,pinyin:'',mode:0,keyboardOpen:true,editorAnchor:0,editorFollow:true});await capture(name,'new-open');
  await tap('.header .icon:nth-child(3)');await ready('menu');await baseline(name,'editor-tools',{text:'',mode:0});await capture(name,'tools');
  await tap('.tool-hit:nth-of-type(3)');await ready('menu');await baseline(name,'clipboard',{clipboard:[]});await capture(name,'clipboard-empty');
  await c.eval(`${D}.$vm.$app.$def.getSession().clear()`);await nav('edit',{id:'n2',anchor:0});const body=originalBaseline.find(n=>n.id==='n2').body;
  const edit={id:'n2',text:body,original:body,cursor:0,pinyin:'',mode:0,keyboardOpen:false,editorAnchor:0,editorFollow:true};
  await baseline(name,'edit',edit);await capture(name,'edit-folded');
  await tap('.expand');await c.wait(`${D}.open`);await baseline(name,'edit',{...edit,keyboardOpen:true});await capture(name,'edit-open');
  // Visual input fixture through the actual keyboard engine, not synthetic candidates/data.
  await originalKey(2,5);await originalKey(0,7);await c.wait(`${D}.pinyin==='ni'&&${D}.candidates.length>0`);await baseline(name,'edit',{...edit,pinyin:'ni',keyboardOpen:true});await capture(name,'edit-candidates');
  await c.eval(`${D}.kb.backspace();${D}.kb.backspace()`);await c.wait(`!${D}.pinyin`);await tap('.header .icon:nth-child(2)');await c.wait(`!${D}.open`);
  // Hold genuine native write callbacks for an observable saving state, then execute them.
  await c.eval(`window.__matrixWrite=ApiSimFile.writeText;window.__matrixPending=[];ApiSimFile.writeText=p=>window.__matrixPending.push(p)`);
  await tap('.command:last-child');await c.wait(`${D}.saving`);await baseline(name,'edit',{...edit,saving:true});await capture(name,'edit-saving');
  await c.eval(`(()=>{ApiSimFile.writeText=window.__matrixWrite;const writes=window.__matrixPending;delete window.__matrixWrite;delete window.__matrixPending;for(const p of writes)ApiSimFile.writeText(p);})()`);await ready('read');
  await c.eval(`${D}.$vm.$app.$def.getSession().clear()`);await nav('edit',{id:'n2',anchor:0});await c.eval(`${D}.kb.insert(${JSON.stringify('给明天留一点空白。\n')})`);const unsaved=await c.eval(`${D}.text`);
  await c.eval(`window.__matrixWrite=ApiSimFile.writeText;ApiSimFile.writeText=p=>{p.fail?.('QA matrix explicit failure',202);p.complete?.()}`);
  await tap('.command:last-child');await ready('menu');await c.wait(`${D}.mode==='error'`);await c.eval('ApiSimFile.writeText=window.__matrixWrite;delete window.__matrixWrite');await baseline(name,'error',{text:unsaved,original:body,fault:false});await capture(name,'menu-error');
  await tap('.dock-control:first-child');await ready('edit');await tap('.command:first-child');await ready('menu');await c.wait(`${D}.mode==='exit'`);await baseline(name,'cancel',{text:unsaved,original:body});await capture(name,'menu-exit');
  const clip='给明天留一点空白。\n不必马上写完。';await c.eval(`${D}.$vm.$app.$def.getSession().clipboardPut(${JSON.stringify(clip)})`);await nav('menu',{mode:'clipboard',id:'n2'});await baseline(name,'clipboard',{clipboard:[clip]});await capture(name,'clipboard-populated');
  await flags(fixture.map(n=>({id:n.id,deleted:true})));await nav('index');await baseline(name,'home',{empty:true});await capture(name,'home-empty');
  await nav('history',{month:'2026-12'});await baseline(name,'history',{month:'2026-12'});await capture(name,'history-empty');
  await flags(fixture.map(n=>({id:n.id,deleted:false})));await nav('trash');await b.eval('records=records.map(n=>({...n,deleted:false}))');await baseline(name,'trash');await capture(name,'trash-empty');
  await flags(fixture);await b.eval(`records=${JSON.stringify(originalBaseline)};`);
 }
 fs.writeFileSync(out+'/geometry-'+(process.argv[2]||'all')+'.json',JSON.stringify({artifactSha:await c.eval('window.__parityArtifactSha'),scopes:{fixtures:'approved sample records only, isolated native callback disk; no user records',inputs:'keyboard fixture for screenshots; separate functional run uses real pointer/tap/wheel',saving:'held native write calls, released to genuine write implementation after capture',error:'explicit native write failure only'},scenes:report},null,2));console.log('PASS matrix actual captures',report.length);
}catch(e){fs.writeFileSync(out+'/FAIL-'+(process.argv[2]||'all')+'.json',JSON.stringify({error:String(e),lastState:await c.state(),captured:report},null,2));console.error(e);process.exitCode=1;
}finally{try{await c.eval('if(window.__matrixWrite){ApiSimFile.writeText=window.__matrixWrite;delete window.__matrixWrite}');if(fixture)await flags(fixture);if(originalBaseline)await b.eval(`records=${JSON.stringify(originalBaseline)}`);}catch{}c.close();b.close();}
