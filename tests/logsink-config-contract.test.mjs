import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import vm from 'node:vm';
import {execFileSync} from 'node:child_process';
const repo=new URL('../',import.meta.url);
test('real generated config enables the pinned logger and queues its first page marker',()=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'liubai-logger-config-'));
 try{
  execFileSync('python3',[new URL('scripts/prepare-logsink.py',repo).pathname,'--project',dir]);
  const common=path.join(dir,'entry/src/main/js/MainAbility/common');
  const configContext={config:null};
  vm.runInNewContext(fs.readFileSync(path.join(common,'log-config.js'),'utf8').replace('export default','config='),configContext);
  const timers=[],logger={L:null,console:{},setTimeout(fn,ms){timers.push({fn,ms});return timers.length;},clearTimeout(){}};
  vm.runInNewContext(fs.readFileSync(path.join(common,'logsink.js'),'utf8').replace('export default L;','this.L=L;'),logger);
  const config=configContext.config;
  assert.equal(typeof config.key,'string');assert.equal(config.write_key,undefined);
  logger.L.init(config);logger.L.page('MainAbility');
  assert.equal(logger.L.status().seq,1);assert.equal(logger.L.status().pending,1);
  assert.equal(timers.length,1);assert.equal(timers[0].ms,5000);
  logger.L.stop();assert.equal(logger.L.status().pending,0);
 }finally{fs.rmSync(dir,{recursive:true,force:true});}
});
