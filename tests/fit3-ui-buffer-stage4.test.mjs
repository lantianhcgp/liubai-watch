import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import vm from 'node:vm';
import {execFileSync} from 'node:child_process';
const ROOT=new URL('../',import.meta.url);
test('V configured diagnostic buffer retains a 48-event user-path burst before network dispatch',()=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'liubai-v-log-buffer-'));
 try{
  execFileSync('python3',[new URL('scripts/prepare-logsink.py',ROOT).pathname,'--project',dir]);
  const common=path.join(dir,'entry/src/main/js/MainAbility/common');
  let seq=0;const timers=new Map(),sent=[];
  const c={config:null,L:null,console:{},Date,setTimeout(fn,ms){const id=seq++;timers.set(id,{fn,ms});return id;},clearTimeout(id){timers.delete(id);},require(){return {fetch(o){sent.push(...JSON.parse(o.data).logs);o.success({code:200,data:'{"ok":true}'});}}}};
  vm.runInNewContext(fs.readFileSync(path.join(common,'log-config.js'),'utf8').replace('export default','config='),c);
  vm.runInNewContext(fs.readFileSync(path.join(common,'logsink.js'),'utf8').replace('export default L;','this.L=L;'),c);
  assert.ok(c.config.capacity<=64,'bounded memory, not an unlimited forensic buffer');
  c.L.init(c.config);const markers=[];for(let i=0;i<48;i++){const s='V/menu.click.'+i;markers.push(s);c.L.i('stage',s);}
  assert.equal(c.L.status().dropped,0,'key user-path evidence must survive one offline burst');
  for(let step=0;step<100&&c.L.status().pending;step++){const row=[...timers][0];assert.ok(row);timers.delete(row[0]);row[1].fn();}
  assert.deepEqual(sent.map(x=>x.msg),markers);assert.equal(c.L.status().pending,0);c.L.stop();
 }finally{fs.rmSync(dir,{recursive:true,force:true});}
});
