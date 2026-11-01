import fs from 'node:fs';import assert from 'node:assert/strict';import {connect} from './parity-cdp.mjs';
const b=await connect('/__baseline'),a=await connect('app');
const out='/storage/emulated/0/Documents/liubai-watch-delivery/ui-restoration';
try{
 await a.send('Emulation.setTimezoneOverride',{timezoneId:'Asia/Shanghai'});
 await a.wait('DeviceFeaturePageNav.getCurrentPage()?.data.ready&&!DeviceFeaturePageNav.getCurrentPage().data.loading');
 const records=await b.eval('records.map(n=>({id:n.id,body:n.body,date:n.date,time:n.time,pinned:n.pinned,deleted:n.deleted}))');
 const payload=records.map(n=>({id:n.id,body:n.body,created:Date.parse(n.date+'T'+n.time+':00+08:00'),pinned:n.pinned,deleted:n.deleted}));
 const verified=await a.eval(`(async()=>{const app=DeviceFeaturePageNav.getCurrentPage().data.$vm.$app.$def,store=app.getStore(),records=${JSON.stringify(payload)},done=[];for(const n of records){await new Promise((ok,fail)=>store.save(n,(e,r)=>e?fail(e):ok(r)));const saved=await new Promise((ok,fail)=>store.load(n.id,(e,r)=>e?fail(e):ok(r)));if(saved.body!==n.body||saved.created!==n.created||saved.pinned!==n.pinned||saved.deleted!==n.deleted)throw Error('Fixture readback mismatch '+n.id);done.push({id:saved.id,date:saved.date,time:saved.time,bytes:saved.bytes,revision:saved.revision,preview:saved.preview});}app.setLiubaiParams({});await DeviceFeaturePageNav.navigateTo('pages/index/index',{});return done;})()`);
 assert.equal(verified.length,records.length);
 fs.mkdirSync(out,{recursive:true});fs.writeFileSync(out+'/fixture-readback.json',JSON.stringify({purpose:'approved V3 demo records only; written through actual app Store callbacks to isolated simulator disk',production_user_records:false,recordCount:verified.length,records:verified},null,2));
 console.log(JSON.stringify({fixtureCount:verified.length,readbackVerified:true,records:verified.map(x=>({id:x.id,date:x.date,time:x.time,bytes:x.bytes}))}));
}finally{a.close();b.close();}
