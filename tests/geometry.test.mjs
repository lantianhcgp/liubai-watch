import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import vm from 'node:vm';

const url = new URL('../entry/src/main/js/MainAbility/common/geometry.js', import.meta.url);
const geometry = existsSync(url) ? (await import(url.href)).default : null;
function need(name) {
  assert.ok(geometry && typeof geometry[name] === 'function', 'missing geometry behavior: ' + name);
  return geometry[name];
}
const approved = new URL('../docs/approved-v3/approved.html',import.meta.url);
const html = readFileSync(approved, 'utf8');
function source(name, next) {
  const start = html.indexOf('function ' + name + '(');
  const end = html.indexOf('function ' + next + '(', start);
  assert.ok(start >= 0 && end > start, 'approved V3 function exists: ' + name);
  return html.slice(start, end);
}
const deviceSource = html.slice(html.indexOf('const devices='), html.indexOf('\n', html.indexOf('const devices=')));
const originals = vm.runInNewContext(`
${deviceSource}
const ui={device:'fit3',page:'home',readFont:'normal',keyboardOpen:false};
const READER_SIZES={compact:22,normal:24,large:28};
let css={};
const node={style:{setProperty(k,v){css[k]=parseFloat(v)}},className:''};
const $=()=>node;
function fitFrame(){}
${source('layoutV2', 'fitFrame')}
${source('shapeBand', 'readerGeometry')}
${source('readerGeometry', 'readerHeading')}
${source('editorGeometry', 'editCharIndex')}
({devices,shapeBand,
 home(key){ui.device=key;ui.page='home';css={};layoutV2();return css},
 reader(key,size){ui.device=key;ui.readFont=size;return readerGeometry()},
 editor(key,open){ui.device=key;ui.keyboardOpen=open;return editorGeometry()}
})`);
const windows = [
  ['fit3', {windowWidth:412,windowHeight:484,screenShape:'rect'}],
  ['round454', {windowWidth:454,windowHeight:454,screenShape:'circle'}],
  ['round390', {windowWidth:390,windowHeight:390,screenShape:'circle'}],
  ['rect336', {windowWidth:336,windowHeight:480,screenShape:'rect'}]
];
function close(actual, expected, message) {
  assert.equal(typeof actual, 'number', message + ': numeric');
  assert.ok(Number.isFinite(actual), message + ': finite');
  assert.ok(Math.abs(actual - expected) < 1e-9, message + ': ' + actual + ' vs V3 ' + expected);
}
function sameFields(actual, expected, fields, label) {
  for (const field of fields) {
    if (typeof expected[field] === 'number') close(actual[field], expected[field], label + '.' + field);
    else assert.equal(actual[field], expected[field], label + '.' + field);
  }
}

test('valid: no zero, missing shape, non-number or non-finite device dimensions are disguised', () => {
  const valid = need('valid');
  for (const [, info] of windows) assert.equal(valid(info), true);
  const invalid = [null, {}, {windowWidth:412,windowHeight:484},
    {windowWidth:0,windowHeight:484,screenShape:'rect'},
    {windowWidth:412,windowHeight:0,screenShape:'circle'},
    {windowWidth:-1,windowHeight:484,screenShape:'rect'},
    {windowWidth:'412',windowHeight:484,screenShape:'rect'},
    {windowWidth:NaN,windowHeight:484,screenShape:'rect'},
    {windowWidth:412,windowHeight:Infinity,screenShape:'rect'},
    {windowWidth:412,windowHeight:484,screenShape:''},
    {windowWidth:412,windowHeight:484,screenShape:'round'}];
  for (const info of invalid) {
    assert.equal(valid(info), false, JSON.stringify(info));
    for (const method of ['home', 'reader', 'editor']) {
      assert.throws(() => need(method)(info), /dimension|screen|device|window/i);
    }
  }
});

test('band: approved V3 full-height safe chord including rectangular rounded corners', () => {
  const band = need('band');
  for (const [key, info] of windows) {
    const {w,h,round} = originals.devices[key];
    for (const [y0,y1,pad] of [[0,31,8],[63,91,12],[h*.19,h*.19+34,17],[h*.50,h*.50+35,10],[h*.81,h*.91,24]]) {
      const actual = band(info.windowWidth, info.windowHeight, round, y0, y1, pad);
      const expected = originals.shapeBand(w,h,round,y0,y1,pad);
      sameFields(actual, expected, ['x','width'], key + '.band');
      if (round && actual.width > 0) {
        const radius = Math.min(w,h)/2;
        for (const y of [y0,y1]) {
          assert.ok((actual.x - pad - w/2)**2 + (y - h/2)**2 <= radius**2 + 1e-7);
        }
      }
    }
  }
});

test('band: invalid dimensions or inverted line ranges fail instead of returning a fake screen', () => {
  const band = need('band');
  for (const args of [[0,484,false,10,20,8],[412,NaN,false,10,20,8],[412,484,undefined,10,20,8],[412,484,false,30,20,8],[412,484,false,10,20,-1]]) {
    assert.throws(() => band(...args));
  }
});

for (const [key, info] of windows) {
  test('home: ' + key + ' exact approved layoutV2, row slots and navigation', () => {
    const actual = need('home')(info);
    const css = originals.home(key);
    const mapping = {hy:'header-y',hx:'header-x',hw:'header-w',hit:'hit',newY:'new-y',newH:'new-h',sectionY:'section-y',listY:'list-y',listH:'list-h',rowH:'row-h',contentX:'content-x',contentW:'content-w',dockX:'dock-x',dockY:'dock-y',dockW:'dock-w',historyY:'history-y',historyH:'history-h'};
    sameFields(actual, {w:info.windowWidth,h:info.windowHeight,round:info.screenShape==='circle'}, ['w','h','round'], key);
    for (const [field, name] of Object.entries(mapping)) close(actual[field], css['--'+name], key+'.'+field);
    assert.equal(actual.slots, Math.round(css['--list-h']/css['--row-h']));
    close(actual.slots*actual.rowH, actual.listH, key+'.complete slots');
  });
  test('reader: ' + key + ' all three V3 fonts and absolute content bounds', () => {
    const reader = need('reader');
    for (const size of ['compact','normal','large']) {
      const actual = reader(info,size), expected = originals.reader(key,size);
      sameFields(actual, expected, ['w','h','round','hy','hx','hw','hit','top','bottom','footerY','font','lineHeight','pad'], key+'.reader.'+size);
    }
  });
  test('editor: ' + key + ' open/closed exact V3 141px key region and 44px footer', () => {
    const editor = need('editor');
    for (const open of [false,true]) {
      const actual = editor(info,open), expected = originals.editor(key,open);
      sameFields(actual, expected, ['w','h','round','open','hy','hx','hw','hit','top','bottom','footY','footerBottom','footX','footW','keysY','keyX','keyW','font','lineHeight','pad'], key+'.editor.'+open);
      close(actual.footerBottom-actual.footY,44,key+'.footer height');
      close(actual.footY-4-actual.keysY,141,key+'.keys height');
      assert.ok(actual.top + actual.lineHeight <= actual.bottom);
    }
  });
}

test('FIT3: critical controls end at or before 410, preserving original .847 footer', () => {
  const info = windows[0][1];
  const home = need('home')(info), closed = need('editor')(info,false), open = need('editor')(info,true);
  assert.ok(home.dockY + home.hit <= 410);
  assert.ok(home.hy + home.hit <= 410);
  assert.ok(closed.footerBottom <= 410);
  assert.ok(open.footerBottom <= 410);
  close(open.footerBottom,409.948,'FIT3 approved open footer');
  assert.ok(open.footX >= 24 && open.footX + open.footW <= 412-24);
});
