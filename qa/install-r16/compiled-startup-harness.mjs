import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import crypto from 'node:crypto';
import {FileHost} from '../../tests/file-host.mjs';

// Executes exact compiler bundles. Native APIs are test doubles backed by real
// temporary disk. This is not a native renderer or a device-heap proof.
export async function runStartup(directory, appShape='native-global') {
  const host=await FileHost.temporary();
  const timers=new Map(); let timerId=0;
  const pages=[],errors=[],routes=[]; let current,app,context;
  const files={app:fs.readFileSync(path.join(directory,'liubai-app.js'),'utf8'),
    boot:fs.readFileSync(path.join(directory,'liubai-boot.js'),'utf8'),
    index:fs.readFileSync(path.join(directory,'liubai-index.js'),'utf8')};
  function setTimer(fn,ms){const id=++timerId,real=setTimeout(()=>{timers.delete(id);try{fn();}catch(e){errors.push(String(e.stack||e));}},ms);timers.set(id,real);return id;}
  function clearTimer(id){clearTimeout(timers.get(id));timers.delete(id);}
  function ViewModel(options){const model=Object.assign({},options.data||{});
    for(const key of Object.keys(options))if(key!=='data')model[key]=options[key];
    model.$t=key=>key;return model;}
  function load(name){return vm.runInContext(files[name],context,{filename:'exact-'+name+'.js',timeout:3000});}
  function lifecycle(page,name){try{if(typeof page[name]==='function')page[name].call(page);}catch(e){errors.push(name+': '+String(e.stack||e));}}
  function navigate(uri){const name=uri.split('/')[1];if(!files[name])throw Error('Unregistered page '+uri);
    current=load(name);if(appShape==='historical-injected')current.$vm={$app:{$def:app}};
    pages.push({uri,page:current});lifecycle(current,'onInit');lifecycle(current,'onReady');lifecycle(current,'onShow');}
  const router={replace(o){routes.push(o.uri);setTimer(()=>navigate(o.uri),0);}};
  context=vm.createContext({console,ViewModel,requireNative(name){
    if(name==='system.file')return host;
    if(name==='system.router')return router;
    if(name==='system.device')return {getInfo(o){setTimer(()=>o.success({windowWidth:412,windowHeight:484,screenShape:'rect',deviceType:'liteWearable'}),0);}};
    throw Error('Unexpected native module '+name);
  },setTimeout:setTimer,clearTimeout:clearTimer,setInterval,clearInterval});
  try{
    app=load('app'); context.$app=appShape==='native-global'?app:{$def:app};
    lifecycle(app,'onCreate');navigate('pages/boot/boot');
    const end=Date.now()+1800;
    while(Date.now()<end){await new Promise(r=>setTimeout(r,10));if(current?.empty||current?.errorDetail||errors.length)break;}
    await host.idle();
    const output={scope:'Exact bundles in Node with real on-disk file host; not device runtime',appShape,
      sourceHashes:Object.fromEntries(Object.entries(files).map(([k,v])=>[k,crypto.createHash('sha256').update(v).digest('hex')])),
      routes,pageUri:pages.at(-1)?.uri,storeState:app.getLiubaiStoreState(),ready:current?.ready,
      empty:current?.empty,loading:current?.loading,message:current?.message,errorDetail:current?.errorDetail,
      errors,fileCalls:host.calls.length,rows:current?.rows?.length};
    return output;
  }finally{
    for(const {page} of pages){lifecycle(page,'onHide');lifecycle(page,'onDestroy');}
    if(app)lifecycle(app,'onDestroy');
    for(const id of timers.keys())clearTimer(id);
    await host.cleanup();
  }
}
if(process.argv[1]===new URL(import.meta.url).pathname){const result=await runStartup(process.argv[2],process.argv[3]);console.log(JSON.stringify(result,null,2));}
