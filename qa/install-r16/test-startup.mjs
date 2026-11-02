import {test} from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import {runStartup} from './compiled-startup-harness.mjs';
const directory=process.env.R16_BUNDLES || path.join(process.env.HOME,'liubai-watch-r16-startup/qa/install-r16/variants');
test('exact compiled boot/index attach store through native application object',async()=>{
 const r=await runStartup(directory,'native-global');
 console.log(JSON.stringify(r));
 assert.deepEqual(r.errors,[]);
 assert.equal(r.pageUri,'pages/index/index');
 assert.equal(r.storeState,'ready','store must not remain idle after boot');
 assert.equal(r.ready,true);
 assert.equal(r.empty,true,'real empty file sandbox must reach empty home');
 assert.equal(r.loading,false);
 assert.equal(r.message,'');
 assert.equal(r.rows,0);
 assert.ok(r.fileCalls>0);
});
