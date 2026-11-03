import fs from 'node:fs';import test from 'node:test';import assert from 'node:assert/strict';
const root=new URL('../entry/src/main/js/MainAbility/',import.meta.url);
test('menu native dividers are real child strips not unsupported border-bottom-width',()=>{const h=fs.readFileSync(new URL('pages/menu/menu.hml',root),'utf8'),c=fs.readFileSync(new URL('pages/menu/menu.css',root),'utf8');assert.ok(h.includes('class="row-divider"'));assert.ok(!c.includes('border-bottom-width'));});
test('home empty state matches original quiet-status at list origin and omits extra subtitle',()=>{const h=fs.readFileSync(new URL('pages/index/index.hml',root),'utf8');assert.ok(h.includes('class="quiet-status"'));assert.ok(!h.includes('class="empty-hint"'));});
test('space image keeps original intrinsic geometry instead of stretching its rounded frame',()=>{const h=fs.readFileSync(new URL('pages/edit/edit.hml',root),'utf8');assert.ok(h.includes('width:{{spaceImageW}}'));});
