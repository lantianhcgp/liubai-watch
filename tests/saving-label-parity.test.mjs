import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';
test('approved V3 completion control visibly distinguishes saving from idle completion',()=>{
 const h=fs.readFileSync('entry/src/main/js/MainAbility/pages/edit/edit.hml','utf8');
 assert.match(h,/saving\s*\?\s*\$t\('strings\.saving'\)\s*:\s*\$t\('strings\.done'\)/);
 assert.match(h,/width:\{\{saving\?66:46\}\}px/);
 const strings=JSON.parse(fs.readFileSync('entry/src/main/js/MainAbility/i18n/zh-CN.json','utf8')).strings;
 assert.equal(strings.saving,'保存中');assert.equal(strings.done,'完成');
});
