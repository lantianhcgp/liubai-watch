import fs from 'node:fs';
const out=process.env.OWN_SIM_OUT;if(!out)throw Error('OWN_SIM_OUT required');fs.mkdirSync(out,{recursive:true});
const targets=await(await fetch('http://127.0.0.1:9262/json/list')).json(),target=targets.find(t=>t.type==='page'&&t.url.startsWith('http://127.0.0.1:8798/'));if(!target)throw Error('Source diagnostic target missing');
const ws=new WebSocket(target.webSocketDebuggerUrl);await new Promise((r,j)=>{ws.onopen=r;ws.onerror=j});let next=0;const pending=new Map(),checks=[];
ws.onmessage=e=>{const v=JSON.parse(e.data),p=pending.get(v.id);if(p){clearTimeout(p.timer);pending.delete(v.id);v.error?p.reject(Error(JSON.stringify(v.error))):p.resolve(v.result);}};
function send(method,params={}){return new Promise((resolve,reject)=>{const id=++next,timer=setTimeout(()=>{pending.delete(id);reject(Error('CDP deadline '+method));},25000);pending.set(id,{resolve,reject,timer});ws.send(JSON.stringify({id,method,params}));});}
async function evaluate(expression){const r=await send('Runtime.evaluate',{expression,awaitPromise:true,returnByValue:true});if(r.exceptionDetails)throw Error(JSON.stringify(r.exceptionDetails));return r.result.value;}
async function wait(expression,timeout=7000){return evaluate('sim.wait(()=>('+expression+'),'+timeout+')');}
async function shot(name){const clip=await evaluate("(()=>{const r=document.getElementById('screen').getBoundingClientRect();return{x:r.x,y:r.y,width:r.width,height:r.height,scale:1};})()");const r=await send('Page.captureScreenshot',{format:'png',clip,captureBeyondViewport:false});fs.writeFileSync(out+'/'+name+'.png',Buffer.from(r.data,'base64'));}
function check(name,value){checks.push({name,pass:!!value});if(!value)throw Error(name);}
async function click(selector){const p=await evaluate('(()=>{const e=document.querySelector('+JSON.stringify(selector)+');if(!e)throw Error("Missing click target");const r=e.getBoundingClientRect();return{x:r.x+r.width/2,y:r.y+r.height/2};})()');await send('Input.dispatchMouseEvent',{type:'mousePressed',button:'left',clickCount:1,...p});await send('Input.dispatchMouseEvent',{type:'mouseReleased',button:'left',clickCount:1,...p});}
try{
 await send('Runtime.enable');await send('Page.enable');await send('Network.enable');await send('Network.setCacheDisabled',{cacheDisabled:true});
 for(let i=0;i<100;i++){if(await evaluate("typeof sim!=='undefined'"))break;await new Promise(r=>setTimeout(r,100));}
 await wait("sim.fault.held.length===1&&sim.page.name==='pages/index/index'");
 check('held startup reports native mkdir call',await evaluate("typeof sim.shared.store.initState==='function'&&JSON.stringify(sim.shared.store.initState())===JSON.stringify({pending:true,phase:'MK_DIR_CALL',waiters:1})"));
 await evaluate("(async()=>{for(let i=0;i<24;i++){sim.page.callHook('onHide');sim.page.callHook('onShow');await sim.sleep(40);}})()");
 check('24 hide/show cycles keep exactly one active observer and one native chain',await evaluate("sim.shared.store.initState().waiters===1&&sim.fsCalls.filter(x=>x.method==='mkdir').length===1&&!sim.page.error"));
 await shot('00-pending-phase');
 await wait("sim.page.name==='pages/menu/menu'&&sim.page.ready&&sim.page.isError",18000);
 check('real 15 second observation deadline routes exact phase',await evaluate("sim.page.dialogHint2==='INIT_WAIT_MK_DIR_CALL'"));
 check('deadline releases observer but not underlying busy I/O',await evaluate("sim.shared.store.initState().pending&&sim.shared.store.initState().waiters===0&&sim.fsCalls.filter(x=>x.method==='mkdir').length===1"));
 await shot('01-mkdir-call-timeout');
 await evaluate('void(window.previousErrorPage=sim.page)');await click('#screen .dock-control:last-child');
 await wait("sim.page!==window.previousErrorPage&&sim.page.name==='pages/index/index'&&sim.shared.store.initState().waiters===1");
 check('retry joins original chain without new native calls',await evaluate("sim.fault.held.length===1&&sim.fsCalls.filter(x=>x.method==='mkdir').length===1"));
 await evaluate('sim.fault.held.shift()()');await wait("sim.page.name==='pages/index/index'&&sim.page.ready");
 check('late native callback completes retry with no observer or initialization timer',await evaluate("sim.shared.store.initState().phase==='DONE'&&sim.shared.store.initState().waiters===0&&sim.page.initTimer===null&&sim.page.initCancel===null"));
 await shot('02-recovered-home');
 await evaluate('sim.page.newNote()');await wait("sim.page.name==='pages/edit/edit'&&sim.page.ready");
 await evaluate("sim.page.insert('诊断观察不改变原存储链。')");await click('#screen .done');
 await wait("sim.page.name==='pages/read/read'&&sim.page.ready");
 check('actual temporary disk save and readback remain valid',await evaluate("sim.page.record.text==='诊断观察不改变原存储链。'"));await shot('03-saved-readback');
 await evaluate("sim.mount('pages/index/index')");await wait("sim.page.name==='pages/index/index'&&sim.page.ready");
 check('saved record exists exactly once',await evaluate('sim.page.total===1&&sim.page.rows.length===1'));
 const detail=await evaluate('({state:sim.state(),fsCalls:sim.fsCalls,entries:sim.entries,storeSha256:sim.source.storeSha256,init:sim.shared.store.initState()})');check('no source or host exception',detail.state.errors.length===0);
 fs.writeFileSync(out+'/result.json',JSON.stringify({ok:true,scope:'Original source Page/ModuleLoader with real temporary disk. First mkdir callback held deliberately; real 15-second observation. Not FIT3 firmware or hardware fault proof.',checks,...detail},null,2)+'\n');console.log(JSON.stringify({ok:true,checks:checks.length,out}));
}catch(error){try{const detail=await evaluate("typeof sim==='undefined'?{}:({state:sim.state(),fsCalls:sim.fsCalls,entries:sim.entries,storeSha256:sim.source.storeSha256})");fs.writeFileSync(out+'/failure.json',JSON.stringify({ok:false,error:String(error),checks,...detail},null,2)+'\n');}catch(ignored){}throw error;}finally{for(const p of pending.values())clearTimeout(p.timer);ws.close();}
