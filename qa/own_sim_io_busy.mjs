import fs from 'node:fs';
const out=process.env.OWN_SIM_OUT;if(!out)throw Error('OWN_SIM_OUT required');fs.mkdirSync(out,{recursive:true});
const targets=await(await fetch('http://127.0.0.1:9262/json/list')).json(),target=targets.find(x=>x.type==='page'&&x.url.startsWith('http://127.0.0.1:8798/'));if(!target)throw Error('own sim target missing');
const ws=new WebSocket(target.webSocketDebuggerUrl);await new Promise((r,j)=>{ws.onopen=r;ws.onerror=j});let next=0,pending=new Map();
ws.onmessage=e=>{const v=JSON.parse(e.data),p=pending.get(v.id);if(p){clearTimeout(p.timer);pending.delete(v.id);v.error?p.reject(Error(JSON.stringify(v.error))):p.resolve(v.result)}};
function send(method,params={}){return new Promise((resolve,reject)=>{const id=++next,timer=setTimeout(()=>{pending.delete(id);reject(Error(method+' timed out'))},20000);pending.set(id,{resolve,reject,timer});ws.send(JSON.stringify({id,method,params}))})}
async function evaluate(expression){const r=await send('Runtime.evaluate',{expression,awaitPromise:true,returnByValue:true});if(r.exceptionDetails)throw Error(JSON.stringify(r.exceptionDetails));return r.result.value}
async function wait(expression){return evaluate('sim.wait(()=>('+expression+'))')}
async function shot(name){const clip=await evaluate("(()=>{const r=document.getElementById('screen').getBoundingClientRect();return{x:r.x,y:r.y,width:r.width,height:r.height,scale:1}})()");const r=await send('Page.captureScreenshot',{format:'png',clip});fs.writeFileSync(out+'/'+name+'.png',Buffer.from(r.data,'base64'))}
const checks=[];function check(name,value){checks.push({name,pass:!!value});if(!value)throw Error(name)}
try{
 await send('Runtime.enable');await send('Page.enable');for(let i=0;i<100;i++){if(await evaluate("typeof sim!=='undefined'"))break;await new Promise(r=>setTimeout(r,100))}
 await wait("sim.fault.held.length===1&&sim.page.name==='pages/index/index'");
 await evaluate("sim.page.callHook('onHide');sim.page.callHook('onShow')");await evaluate('sim.sleep(120)');await shot('00-reactivated-pending-init');
 check('reactivation while initialization is pending does not route to IO_BUSY error',await evaluate("sim.page.name==='pages/index/index'&&!sim.page.error&&!sim.page.ready"));
 await evaluate('sim.fault.held.shift()()');await wait("sim.page.name==='pages/index/index'&&sim.page.ready");await shot('01-initialized-home');
 check('latest lifecycle activation receives completed actual startup',await evaluate('sim.page.total===0&&sim.page.rows.length===0'));
 check('only one initialization I/O chain was run',await evaluate("sim.fsCalls.filter(x=>x.method==='mkdir').length===1"));
 await evaluate('sim.page.newNote()');await wait("sim.page.name==='pages/edit/edit'&&sim.page.ready");
 await evaluate("sim.page.insert('延迟初始化完成后保存一次。');sim.page.save()");await wait("sim.page.name==='pages/read/read'&&sim.page.ready");await shot('02-real-saved-body');
 check('after delayed startup the actual saved text reads back',await evaluate("sim.page.record.text==='延迟初始化完成后保存一次。'"));
 await evaluate("sim.mount('pages/index/index')");await wait("sim.page.name==='pages/index/index'&&sim.page.ready");
 check('saved body is listed once',await evaluate('sim.page.total===1'));
 const detail=await evaluate('({state:sim.state(),entries:sim.entries,fsCalls:sim.fsCalls,storeSha256:sim.source.storeSha256})');check('no source/runtime exception',detail.state.errors.length===0);
 fs.writeFileSync(out+'/result.json',JSON.stringify({ok:true,scope:'Own lite-sim original source and real temporary disk; explicit first mkdir callback hold and actual onHide/onShow hooks. Not proof of FIT3 lifecycle or callback delivery.',checks,...detail},null,2)+'\n');console.log(JSON.stringify({ok:true,checks:checks.length,out}));
}catch(error){const detail=await evaluate("typeof sim==='undefined'?{}:({state:sim.state(),entries:sim.entries,fsCalls:sim.fsCalls,storeSha256:sim.source.storeSha256,errorCode:sim.page.dialogHint2})");fs.writeFileSync(out+'/failure.json',JSON.stringify({ok:false,error:String(error),checks,...detail},null,2)+'\n');throw error}finally{ws.close()}
