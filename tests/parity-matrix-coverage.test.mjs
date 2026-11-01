import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';
const s=fs.readFileSync('qa/parity-matrix.mjs','utf8');
test('final capture includes every V3 menu mode and state-dependent editor/empty variants',()=>{
 for(const scene of ['menu-exit','menu-error','clipboard-populated','edit-folded','edit-open','edit-candidates','edit-saving','home-empty','history-empty','trash-empty'])assert.ok(s.includes("'"+scene+"'"),'missing final scene '+scene);
 assert.match(s,/setDeviceMetricsOverride/);assert.match(s,/Network\.setCacheDisabled/);
});
