import fs from 'node:fs';
const port=process.env.PARITY_CDP_PORT||'9257';
export async function connect(match='/__baseline'){
 const targets=await(await fetch('http://127.0.0.1:'+port+'/json/list')).json();
 const t=targets.find(t=>t.type==='page'&&t.url.includes(match));
 if(!t)throw Error('Missing isolated target '+match);
 const ws=new WebSocket(t.webSocketDebuggerUrl);await new Promise((r,j)=>{ws.onopen=r;ws.onerror=j;});
 let serial=0;const pending=new Map();
 ws.onmessage=e=>{const x=JSON.parse(e.data),p=pending.get(x.id);if(!p)return;clearTimeout(p.timer);pending.delete(x.id);x.error?p.reject(Error(JSON.stringify(x.error))):p.resolve(x.result);};
 function send(method,params={}){return new Promise((resolve,reject)=>{const id=++serial,timer=setTimeout(()=>{pending.delete(id);reject(Error('CDP timeout '+method));},30000);pending.set(id,{resolve,reject,timer});ws.send(JSON.stringify({id,method,params}));});}
 async function evaluate(expression){const r=await send('Runtime.evaluate',{expression,returnByValue:true,awaitPromise:true});if(r.exceptionDetails)throw Error(JSON.stringify(r.exceptionDetails));return r.result.value;}
 async function wait(expression,timeout=30000){const end=Date.now()+timeout;while(Date.now()<end){if(await evaluate(expression))return;await new Promise(r=>setTimeout(r,80));}throw Error('Wait timeout '+expression);}
 async function point(selector,shadow=false){return evaluate(`(()=>{const root=${shadow?'document.getElementById("watch-content").shadowRoot':'document'};const e=root.querySelector(${JSON.stringify(selector)});if(!e)throw Error('Missing '+${JSON.stringify(selector)});const r=e.getBoundingClientRect();return {x:r.x+r.width/2,y:r.y+r.height/2,width:r.width,height:r.height}})()`);}
 async function tap(selector,shadow=false){const {x,y,width,height}=await point(selector,shadow);if(width<=0||height<=0)throw Error('Invisible '+selector);await send('Input.dispatchMouseEvent',{type:'mousePressed',x,y,button:'left',clickCount:1});await send('Input.dispatchMouseEvent',{type:'mouseReleased',x,y,button:'left',clickCount:1});}
 async function shot(path,selector='#watch'){
  await send('Page.bringToFront');await evaluate(`document.querySelector(${JSON.stringify(selector)}).scrollIntoView({block:'center'})`);
  const clip=await evaluate(`(()=>{const r=document.querySelector(${JSON.stringify(selector)}).getBoundingClientRect();return {x:r.x,y:r.y,width:r.width,height:r.height,scale:1}})()`);
  const r=await send('Page.captureScreenshot',{format:'png',clip,captureBeyondViewport:true});fs.mkdirSync(new URL('.', 'file://'+path).pathname,{recursive:true});fs.writeFileSync(path,Buffer.from(r.data,'base64'));return clip;
 }
 async function state(){return evaluate(`(()=>{const p=DeviceFeaturePageNav.getCurrentPage();if(!p)return null;const d=p.data;return {uri:p.uri,ready:d.ready,w:d.w,h:d.h,message:d.message,errorDetail:d.errorDetail,id:d.id,text:d.text,open:d.open,anchor:d.anchor,pinyin:d.pinyin,rows:d.rows,lines:d.lines}})()`);}
 return {send,eval:evaluate,wait,tap,point,shot,state,close(){for(const p of pending.values()){clearTimeout(p.timer);p.reject(Error('Connection closed'));}pending.clear();ws.close();}};
}
if(process.argv[1]?.endsWith('/parity-cdp.mjs')){const [op,match,...args]=process.argv.slice(2),c=await connect(match||'/__baseline');try{const result=op==='eval'?await c.eval(args[0]):op==='shot'?await c.shot(args[0],args[1]||'#watch'):op==='tap'?await c.tap(args[0],args[1]==='shadow'):await c.state();console.log(JSON.stringify(result));}finally{c.close();}}
