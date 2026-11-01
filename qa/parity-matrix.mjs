import fs from 'node:fs';import assert from 'node:assert/strict';import {connect} from './parity-cdp.mjs';
const c=await connect('app'),b=await connect('/__baseline');
const out='/storage/emulated/0/Documents/liubai-watch-delivery/ui-restoration';const report=[];
const dims=[['fit3',412,484,false],['round454',454,454,true],['round390',390,390,true],['rect336',336,480,false]];
const requested=process.argv[2]?dims.filter(d=>d[0]===process.argv[2]):dims;
async function ready(page){await c.wait(`DeviceFeaturePageNav.getCurrentPage()?.uri==='pages/${page}/${page}'&&DeviceFeaturePageNav.getCurrentPage().data.ready&&!DeviceFeaturePageNav.getCurrentPage().data.loading`);if(page==='edit')await c.wait('!!DeviceFeaturePageNav.getCurrentPage().data.kb');if(page==='read')await c.wait('!!DeviceFeaturePageNav.getCurrentPage().data.page');}
async function nav(page,params={}){await c.eval(`(()=>{const app=DeviceFeaturePageNav.getCurrentPage().data.$vm.$app.$def;app.setLiubaiParams(${JSON.stringify(params)});return DeviceFeaturePageNav.navigateTo('pages/${page}/${page}',${JSON.stringify(params)});})()`);await ready(page);}
async function capture(name,scene){
 await c.wait('Array.from(document.getElementById("watch-content").shadowRoot.querySelectorAll("img")).every(i=>i.complete&&i.naturalWidth>0)');
 await b.wait('Array.from(document.querySelectorAll("#watch img")).every(i=>i.complete&&i.naturalWidth>0)');
 await c.send('Page.bringToFront');
 await c.eval('document.fonts.ready.then(()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r))))');
 await b.send('Page.bringToFront');
 await b.eval('document.fonts.ready.then(()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r))))');
 const aPath=out+'/matrix/'+name+'-'+scene+'-actual.png',bPath=out+'/matrix/'+name+'-'+scene+'-approved.png';
 await c.shot(aPath,'#watch-content');await b.shot(bPath,'#watch');
 const g=await c.eval(`(()=>{const root=document.getElementById('watch-content'),sr=root.shadowRoot,r=root.getBoundingClientRect(),p=DeviceFeaturePageNav.getCurrentPage(),d=p.data;return{page:p.uri,ready:d.ready,message:d.message,mode:d.mode,w:d.w,h:d.h,open:d.open,id:d.id,fonts:d.font,lines:Array.from(d.lines||[]).map(l=>({text:l.text,start:l.start,end:l.end,x:l.x,y:l.y,width:l.width,height:l.height,font:l.font,bold:l.bold})),rows:Array.from(d.rows||[]).map(m=>({id:m.id,title:m.title,meta:m.meta})),nodes:Array.from(sr.querySelectorAll('text,img,.header,.dock,.new-note,.section,.row-divider,.key-viewport,.keybar,.folded-bar,.body-hit')).map(e=>{let b=e.getBoundingClientRect(),s=getComputedStyle(e);return{tag:e.tagName,cls:e.className,t:e.tagName==='TEXT'?e.textContent:undefined,x:b.x-r.x,y:b.y-r.y,w:b.width,h:b.height,font:s.fontSize,line:s.lineHeight,image:e.tagName==='IMG'?{complete:e.complete,natural:[e.naturalWidth,e.naturalHeight]}:undefined}})}})()`);
 const bg=await b.eval(`(()=>{const r=document.querySelector('#watch').getBoundingClientRect();return{page:ui.page,device:ui.device,open:ui.keyboardOpen,nodes:Array.from(document.querySelector('#watch').querySelectorAll('.header,.head-title,.reader-date,.new-note,.dock,.menu-row,.reading-line,.editor-line,.reader-progress,.editor-nav,.source-toolbar,.keyboard-viewport,.keyboard-foot,.quiet-empty')).map(e=>{const b=e.getBoundingClientRect(),s=getComputedStyle(e);return{cls:e.className,text:e.childElementCount?undefined:e.textContent,x:b.x-r.x,y:b.y-r.y,w:b.width,h:b.height,font:s.fontSize,weight:s.fontWeight}})}})()`);
 assert.ok(!g.message,'native error '+g.message);report.push({window:name,scene,actual:aPath,approved:bPath,native:g,baseline:bg});
 console.log('captured',name,scene);
}
async function baseline(name,page,extra={}){await b.eval(`(()=>{Object.assign(ui,{device:${JSON.stringify(name)},page:${JSON.stringify(page)},id:'n1',month:'2026-11',day:'2026-11-01',empty:false,filter:false,notice:'',saving:false,readFont:'normal',readId:null,readRevision:null,readAnchor:0,...${JSON.stringify(extra)}});render();return true})()`);}
try{
 await c.send('Emulation.setTimezoneOverride',{timezoneId:'Asia/Shanghai'});
 for(const [name,w,h,circle]of requested){
  await c.eval(`(()=>{SensorPanel.setConfig({width:${w},height:${h},isCircle:${circle}});DeviceFeatureDisplay.configure(${w},${h},${circle});DeviceFeaturePageNav.getCurrentPage().data.$vm.$app.$def.getSession().clear();})()`);
  await nav('index');await baseline(name,'home');await capture(name,'home');
  await nav('history',{month:'2026-11'});await baseline(name,'history');await capture(name,'history');
  await nav('day',{day:'2026-11-01',month:'2026-11'});await baseline(name,'day');await capture(name,'day');
  await nav('trash');await baseline(name,'trash');await capture(name,'trash');
  await nav('read',{id:'n1',font:'normal',anchor:0,fromStart:true});await baseline(name,'read');await capture(name,'read');
  for(const [mode,page]of [['read','read-options'],['record','menu'],['app','appmenu'],['confirm','confirm']]){await nav('menu',{mode,id:'n1',font:'normal',anchor:0,pinned:false,revision:3});await baseline(name,page);await capture(name,'menu-'+mode);}
  await c.eval('DeviceFeaturePageNav.getCurrentPage().data.$vm.$app.$def.getSession().clear()');
  await nav('edit',{action:'new'});await baseline(name,'edit',{id:null,text:'',original:'',cursor:0,pinyin:'',mode:0,keyboardOpen:false,editorAnchor:0,editorFollow:true});await capture(name,'new-folded');
  await c.tap('.expand',true);await c.wait('DeviceFeaturePageNav.getCurrentPage().data.open');await baseline(name,'edit',{id:null,text:'',original:'',cursor:0,pinyin:'',mode:0,keyboardOpen:true,editorAnchor:0,editorFollow:true});await capture(name,'new-open');
  await c.tap('.header .icon:nth-child(3)',true);await ready('menu');await baseline(name,'editor-tools',{text:'',mode:0});await capture(name,'tools');
  await c.tap('.tool-hit:nth-of-type(3)',true);await ready('menu');await baseline(name,'clipboard',{clipboard:[]});await capture(name,'clipboard-empty');
 }
 fs.mkdirSync(out+'/matrix',{recursive:true});fs.writeFileSync(out+'/matrix/geometry-'+(process.argv[2]||'all')+'.json',JSON.stringify({artifactSha:await c.eval('window.__parityArtifactSha'),scenes:report},null,2));
 console.log('PASS matrix actual captures',report.length);
}catch(e){fs.mkdirSync(out+'/matrix',{recursive:true});fs.writeFileSync(out+'/matrix/FAIL-'+(process.argv[2]||'all')+'.json',JSON.stringify({error:String(e),lastState:await c.state(),captured:report},null,2));console.error(e);console.error(await c.state());process.exitCode=1;}finally{c.close();b.close();}
