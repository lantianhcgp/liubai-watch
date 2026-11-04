import fs from 'node:fs';
const out=process.env.OWN_SIM_OUT;fs.mkdirSync(out,{recursive:true});
const targets=await(await fetch('http://127.0.0.1:9262/json/list')).json();const target=targets.find(x=>x.type==='page'&&x.url.startsWith('http://127.0.0.1:8798/'));if(!target)throw Error('own simulator target missing');
const ws=new WebSocket(target.webSocketDebuggerUrl);await new Promise((r,j)=>{ws.onopen=r;ws.onerror=j});let next=0,pending=new Map();
ws.onmessage=e=>{const v=JSON.parse(e.data),p=pending.get(v.id);if(p){clearTimeout(p.timer);pending.delete(v.id);v.error?p.reject(Error(JSON.stringify(v.error))):p.resolve(v.result)}};
function send(method,params={}){return new Promise((resolve,reject)=>{const id=++next,timer=setTimeout(()=>{pending.delete(id);reject(Error(method+' timed out'))},15000);pending.set(id,{resolve,reject,timer});ws.send(JSON.stringify({id,method,params}))})}
async function evaluate(expression){const v=await send('Runtime.evaluate',{expression,awaitPromise:true,returnByValue:true});if(v.exceptionDetails)throw Error(JSON.stringify(v.exceptionDetails));return v.result.value}
async function wait(expression){return evaluate('sim.wait(()=>('+expression+'))')}
async function shot(name){const clip=await evaluate("(()=>{const r=document.getElementById('screen').getBoundingClientRect();return{x:r.x,y:r.y,width:r.width,height:r.height,scale:1}})()");const v=await send('Page.captureScreenshot',{format:'png',clip});fs.writeFileSync(out+'/'+name+'.png',Buffer.from(v.data,'base64'))}
const checks=[];function check(name,value){checks.push({name,pass:!!value});if(!value)throw Error(name)}
try{
 await send('Runtime.enable');await send('Page.enable');for(let i=0;i<100;i++){if(await evaluate("typeof sim!=='undefined'"))break;await new Promise(r=>setTimeout(r,100))}
 await wait("sim.page.name==='pages/menu/menu'&&sim.page.ready&&sim.page.isError");await shot('00-initial-read-error');
 // A synthetic retained/new editor seam after a failed init. This is a recovery-gap test, not proof of device cause.
 await evaluate("sim.mount('pages/edit/edit',{id:null,open:true})");await wait("sim.page.name==='pages/edit/edit'&&sim.page.ready");
 await evaluate("sim.page.insert('初始化读取失败后仍保留这段文字。');sim.page.save()");await wait("sim.page.ready&&(sim.page.name==='pages/read/read'||sim.page.name==='pages/menu/menu')");await shot('01-first-save-after-init-error');
 check('failed-init retained editor recovers on first save',await evaluate("sim.page.name==='pages/read/read'&&sim.page.record.text==='初始化读取失败后仍保留这段文字。'"));
 await evaluate("sim.mount('pages/index/index')");await wait('sim.page.ready');check('recovered save appears exactly once',await evaluate('sim.page.total===1'));
 await evaluate('sim.page.newNote()');await wait("sim.page.name==='pages/edit/edit'&&sim.page.ready");await evaluate("sim.page.insert('永久读取故障仍保留文字。');sim.fault.failReads=true;sim.page.save()");await wait("sim.page.name==='pages/menu/menu'&&sim.page.ready");await shot('02-persistent-read-error-code');check('save failure code visible',await evaluate("sim.page.dialogHint2==='IO_300'&&sim.shared.editor.text==='永久读取故障仍保留文字。'"));
 await evaluate("window.__retryOrigin=sim.page;sim.page.action('retry-save')");await wait("sim.page!==window.__retryOrigin&&sim.page.name==='pages/menu/menu'&&sim.page.ready");check('persistent error does not create infinite retry or discard text',await evaluate("sim.page.dialogHint2==='IO_300'&&sim.shared.editor.text==='永久读取故障仍保留文字。'"));
 await evaluate("sim.fault.failReads=false;sim.page.action('retry-save')");await wait("sim.page.name==='pages/read/read'&&sim.page.ready");check('actual read error cleared retry reaches exact saved body',await evaluate("sim.page.record.text==='永久读取故障仍保留文字。'"));await shot('03-retry-success');
 const result=await evaluate('({state:sim.state(),entries:sim.entries,fsCalls:sim.fsCalls,storeSha256:sim.source.storeSha256})');fs.writeFileSync(out+'/result.json',JSON.stringify({scope:'Our lite-sim real app source with real isolated disk. Explicit init/read fault injection; not hardware cause proof.',checks,...result},null,2)+'\n');console.log(JSON.stringify({ok:true,checks:checks.length,out}));
}catch(error){const result=await evaluate("typeof sim==='undefined'?{}:({state:sim.state(),entries:sim.entries,fsCalls:sim.fsCalls,storeSha256:sim.source.storeSha256})");fs.writeFileSync(out+'/failure.json',JSON.stringify({scope:'Explicit failed-init/read fault injection, original app source, actual isolated disk',error:String(error),checks,...result},null,2)+'\n');throw error}finally{ws.close()}
