import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import vm from 'node:vm';
import {fileURLToPath} from 'node:url';
import {FileHost} from './file-host.mjs';

const base = new URL('../entry/src/main/js/MainAbility/common/', import.meta.url);
const resourceRoot = fileURLToPath(new URL('../entry/src/main/resources/', import.meta.url));
const flash = 'internal://app/rawfile/pinyinDictV5_flash1001';
const scale = 141/180;
const geom = {keyX:37, keysY:209, keyW:280};
const event = (x,y) => ({globalX:x, globalY:y});
const key = (row,col,offset=0) => event(geom.keyX+offset+(col*57+row*29+28)*scale, geom.keysY+(row*60+30)*scale);

async function load(host = new FileHost(resourceRoot), timeout = 100) {
  host.offsets=[];
  const realRead=host.readText.bind(host);
  host.readText=o => {host.offsets.push({uri:o.uri,position:o.position,length:o.length}); realRead(o);};
  const context=vm.createContext({console,setTimeout:(fn,ms)=>host.clock.setTimeout(fn,ms),clearTimeout:id=>host.clock.clearTimeout(id)});
  const file=new vm.SyntheticModule(['default'],function(){this.setExport('default',host);},{context});
  const cache=new Map();
  async function source(name) {
    const url=new URL(name.endsWith('.js')?name:name+'.js',base), id=url.href;
    if(cache.has(id)) return cache.get(id);
    let text;
    try { text=await fs.readFile(url,'utf8'); } catch(e) { if(e.code!=='ENOENT')throw e; text='export default {};'; }
    const mod=new vm.SourceTextModule(text,{context,identifier:id});cache.set(id,mod);
    await mod.link(spec=>spec==='@system.file'?file:source(new URL(spec,url).href));
    return mod;
  }
  const keyboard=await source('keyboard.js'), lookup=await source('lookupDictV5.js');
  await keyboard.evaluate();if(lookup.status!=='evaluated')await lookup.evaluate();
  return {keyboard:keyboard.namespace.default,lookup:lookup.namespace.default,host};
}
async function until(fn, limit=1500) {const start=Date.now();while(!fn()){if(Date.now()-start>limit)assert.fail('async result did not arrive');await new Promise(r=>setTimeout(r,5));}}
function tap(c,row,col,g=geom) { const e=key(row,col,c.snapshot().sheetOffset);c.touchStart(e,g);c.touchEnd(e,g); }
function inputPinyin(c,s) { const rows=['qwertyuiop','asdfghjkl','zxcvbnm,'];const wide={keyX:geom.keyX,keysY:geom.keysY,keyW:620}; for(const ch of s){let row=rows.findIndex(r=>r.includes(ch));tap(c,row,rows[row].indexOf(ch),wide);} }
function lookup(l,key) {return new Promise(resolve=>l.lookupDict(flash,key,(match,value,error)=>resolve({match,value,error})));}

test('RED contract: factory and all parent methods must exist',async()=>{
  const {keyboard}=await load();assert.equal(typeof keyboard.create,'function','missing keyboard controller factory');
  const c=keyboard.create({text:''});for(const name of ['snapshot','setCursor','insert','typeNext','choose','backspace','move','home','end','space','newline','touchStart','touchMove','touchEnd','longPress','dispose','copy','paste'])assert.equal(typeof c[name],'function',name);c.dispose();
});
test('negative: whole literal insertion respects 3072 UTF8 byte ceiling',async()=>{
  const {keyboard}=await load(), errors=[];const c=keyboard.create({text:'a'.repeat(3070),onError:e=>errors.push(e)});
  assert.equal(c.insert('\u4f60\u597d'),false);assert.equal(c.snapshot().text,'a'.repeat(3070));assert.equal(c.snapshot().cursor,3070);assert.equal(errors.at(-1),'LIMIT');c.dispose();
});
test('negative: existing oversized content is never truncated and cannot grow',async()=>{
  const {keyboard}=await load();const s='\u4f60'.repeat(1100);const c=keyboard.create({text:s});assert.equal(c.snapshot().text,s);assert.equal(c.insert('a'),false);assert.equal(c.backspace(),true);assert.equal(c.snapshot().text,s.slice(0,-1));c.dispose();
});
test('Unicode cursor, delete and middle insert preserve clusters and newline',async()=>{
  const {keyboard}=await load();const s='A\ud83d\ude00e\u0301\ud83d\udc69\u200d\ud83d\udcbb\ud83c\udde8\ud83c\uddf3\nZ';const c=keyboard.create({text:s});
  c.setCursor(2);assert.equal(c.snapshot().cursor,1);c.move(1);assert.equal(c.snapshot().cursor,3);c.move(1);assert.equal(c.snapshot().cursor,5);c.move(1);assert.equal(c.snapshot().cursor,10);c.move(1);assert.equal(c.snapshot().cursor,14);c.backspace();assert.equal(c.snapshot().text,s.slice(0,10)+s.slice(14));c.setCursor(4);assert.equal(c.snapshot().cursor,3);c.backspace();assert.equal(c.snapshot().text,'Ae\u0301\ud83d\udc69\u200d\ud83d\udcbb\nZ');c.home();c.insert('\u4f60');c.end();c.newline();c.space();assert.equal(c.snapshot().text,'\u4f60Ae\u0301\ud83d\udc69\u200d\ud83d\udcbb\nZ\n ');c.dispose();
});
test('negative: malformed surrogate is rejected atomically',async()=>{
  const {keyboard}=await load(),errors=[];const c=keyboard.create({text:'x',onError:e=>errors.push(e)});assert.equal(c.insert('a\ud800'),false);assert.equal(c.snapshot().text,'x');assert.equal(errors[0],'UNICODE');c.dispose();
});
test('real flash longest prefix and partial-pinyin consumption',async()=>{
  const {keyboard,lookup:l,host}=await load();const result=await lookup(l,'nihaox');assert.equal(result.match,'nihao');assert.ok(result.value.split(' ').includes('\u4f60\u597d'));
  const c=keyboard.create({text:'L|R',cursor:2,pinyin:'nihaox'});await until(()=>c.snapshot().candidates.some(v=>v.text==='\u4f60\u597d'));const idx=c.snapshot().candidates.findIndex(v=>v.text==='\u4f60\u597d');assert.equal(c.snapshot().candidates[idx].matchLength,5);assert.equal(c.choose(idx),true);assert.equal(c.snapshot().text,'L|\u4f60\u597dR');assert.equal(c.snapshot().pinyin,'x');assert.equal(c.snapshot().cursor,4);assert.ok(host.offsets.some(v=>v.position>0));assert.ok(host.offsets.every(v=>v.length>0&&v.length<=192));c.dispose();
});
test('negative: candidate over budget leaves entire composition/candidate intact',async()=>{
  const {keyboard}=await load(),errors=[];const c=keyboard.create({text:'a'.repeat(3068),pinyin:'nihao',onError:e=>errors.push(e)});await until(()=>c.snapshot().candidates.some(v=>v.text==='\u4f60\u597d'));const before=c.snapshot(),idx=before.candidates.findIndex(v=>v.text==='\u4f60\u597d');assert.equal(c.choose(idx),false);assert.equal(c.snapshot().text,before.text);assert.equal(c.snapshot().pinyin,before.pinyin);assert.deepEqual(c.snapshot().candidates,before.candidates);assert.equal(errors.at(-1),'LIMIT');c.dispose();
});
test('negative: stale candidate response cannot overwrite newer typing',async()=>{
  const host=new FileHost(resourceRoot);host.inject('readText',/key0/,'stall');const {keyboard}=await load(host),c=keyboard.create({pinyin:'ni'});await until(()=>host.pending.length===1);inputPinyin(c,'hao');await until(()=>c.snapshot().candidates.some(v=>v.text==='\u4f60\u597d'));const before=c.snapshot();await host.release();await new Promise(r=>setTimeout(r,15));assert.equal(c.snapshot().pinyin,'nihao');assert.deepEqual(c.snapshot().candidates,before.candidates);c.dispose();
});
test('negative: pending lookup is cancelled and disposal suppresses all callbacks',async()=>{
  const host=new FileHost(resourceRoot);host.inject('readText',/key0/,'stall');const {keyboard}=await load(host),changes=[],errors=[],c=keyboard.create({pinyin:'ni',onChange:s=>changes.push(s),onError:e=>errors.push(e)});await until(()=>host.pending.length===1);c.dispose();const n=host.calls.length;await host.release();await new Promise(r=>setTimeout(r,130));assert.equal(host.calls.length,n);assert.equal(changes.length,0);assert.equal(errors.length,0);assert.equal(c.insert('x'),false);assert.equal(c.touchStart(key(0,0),geom),false);c.dispose();
});
test('negative: dict I/O, malformed node, timeout, duplicate callbacks are controlled',async()=>{
  for(const mode of ['fail','throw','stall','double']) {const host=new FileHost(resourceRoot);host.inject('readText',/key0/,mode);const {keyboard}=await load(host,35),changes=[],errors=[],c=keyboard.create({pinyin:'ni',onChange:s=>changes.push(s),onError:e=>errors.push(e)});if(mode==='stall'){await host.waitForStall();host.clock.advance(10000);}await until(()=>mode==='double'?c.snapshot().candidates.length>0:errors.length>0);if(mode==='double')assert.equal(changes.length,1);else assert.equal(errors[0],mode==='stall'?'DICT_TIMEOUT':'DICT_IO');c.dispose();await host.release();}
  const host=new FileHost(resourceRoot);host.readText=o=>o.success({text:'aBROKEN'});const {keyboard}=await load(host);const errors=[],c=keyboard.create({pinyin:'ni',onError:e=>errors.push(e)});await until(()=>errors.length>0);assert.equal(errors[0],'DICT_DATA');c.dispose();
});
test('original 4 mappings; upper-row long press and trailing tap suppressed',async()=>{
  const {keyboard}=await load();const c=keyboard.create({text:'',type:1});tap(c,0,0);assert.equal(c.snapshot().text,'q');c.typeNext();tap(c,0,0);assert.equal(c.snapshot().text,'qQ');c.typeNext();tap(c,0,0);assert.equal(c.snapshot().text,'qQ`');const e=key(1,0);c.touchStart(e,geom);c.longPress(e,geom);c.touchEnd(e,geom);assert.equal(c.snapshot().text,'qQ`{');c.typeNext();const num=key(0,1);c.touchStart(num,geom);c.longPress(num,geom);c.touchEnd(num,geom);assert.equal(c.snapshot().text,'qQ`{2');c.dispose();
});
test('upward swipe enters shift exactly once, horizontal drag never taps',async()=>{
  const {keyboard}=await load();const c=keyboard.create({type:1});const e=key(0,0),up=event(e.globalX,e.globalY-30);c.touchStart(e,geom);c.touchMove(up,geom);c.touchEnd(up,geom);assert.equal(c.snapshot().text,'1');const down=event(e.globalX,e.globalY+30);c.touchStart(e,geom);c.touchMove(down,geom);c.touchEnd(down,geom);assert.equal(c.snapshot().text,'1');c.touchStart(e,geom);c.touchMove(event(e.globalX-70,e.globalY),geom);c.touchEnd(event(e.globalX-70,e.globalY),geom);assert.equal(c.snapshot().text,'1');assert.ok(c.snapshot().sheetOffset<0);c.dispose();
});
test('edge overscroll cycles types; actual geometry only; original scaled sheets',async()=>{
  const {keyboard}=await load(),errors=[];const c=keyboard.create({type:1,onError:e=>errors.push(e)});assert.equal(c.snapshot().sheetWidth,570*scale);assert.equal(c.touchStart(key(0,0),{keyW:0}),false);assert.equal(errors[0],'GEOMETRY');const e=key(0,0);c.touchStart(e,geom);const right=event(e.globalX+150,e.globalY);c.touchMove(right,geom);c.touchEnd(right,geom);assert.equal(c.snapshot().type,0);assert.ok(c.snapshot().sheetOffset<=0);
  c.typeNext();const start=key(0,0);c.touchStart(start,geom);const left=event(start.globalX-400,start.globalY);c.touchMove(left,geom);c.touchEnd(left,geom);assert.equal(c.snapshot().type,2);assert.equal(c.snapshot().sheetOffset,0);c.typeNext();assert.equal(c.snapshot().sheetWidth,741*scale);assert.equal(c.snapshot().image,'/common/keyboard/common/3.png');c.dispose();
});
test('all reference rows and shifted punctuation select by real scaled coordinates',async()=>{
  const {keyboard}=await load();const rows=[['qwertyuiop','asdfghjkl','zxcvbnm,'],['qwertyuiop','asdfghjkl','zxcvbnm,'],['QWERTYUIOP','ASDFGHJKL','ZXCVBNM,'],['`~@#%&*-^+=$\u00d7','()[]<>\\|/_\u00b1\u2248',';:\"\u2018\u201c?!,.\u221e\u03c0']];
  // Use a wide *test* device viewport to make every original key reachable.
  const wide={...geom,keyW:620};for(let type=0;type<4;type++){const c=keyboard.create({type});for(let row=0;row<3;row++)for(let col=0;col<rows[type][row].length;col++){const before=c.snapshot(),e=key(row,col);c.touchStart(e,wide);c.touchEnd(e,wide);if(type===0&&!(row===2&&col===7))assert.equal(c.snapshot().pinyin,before.pinyin+rows[type][row][col]);else assert.ok(c.snapshot().text.endsWith(type===0?'\uff0c':rows[type][row][col]));}c.dispose();}
});
test('negative: pending composition commit is atomic across space/newline/type',async()=>{
  const {keyboard}=await load(),c=keyboard.create({text:'a'.repeat(3071),pinyin:'ni'});assert.equal(c.space(),false);assert.equal(c.newline(),false);assert.equal(c.typeNext(),false);assert.equal(c.snapshot().type,0);assert.equal(c.snapshot().pinyin,'ni');c.backspace();assert.equal(c.snapshot().pinyin,'n');assert.equal(c.space(),true);assert.equal(c.snapshot().text,'a'.repeat(3071)+'n');assert.equal(c.snapshot().pinyin,'');c.dispose();
});
test('clipboard is application-local, bounded/deduped; paste at Unicode cursor',async()=>{
  const {keyboard}=await load();for(let i=0;i<12;i++){const c=keyboard.create({text:'item'+i});assert.equal(c.copy(),true);c.dispose();}const c=keyboard.create({text:'\ud83d\ude00X',cursor:0});assert.equal(c.clipboard().length,8);assert.equal(c.paste(0),true);assert.equal(c.snapshot().text,'item11\ud83d\ude00X');assert.equal(c.snapshot().cursor,6);assert.equal(c.paste(99),false);assert.equal(c.copy(),true);assert.equal(c.copy(),true);assert.equal(c.clipboard().length,8);c.dispose();for(let i=0;i<8;i++){const big=keyboard.create({text:String(i)+'b'.repeat(3070)});big.copy();big.dispose();}const q=keyboard.create({text:'a'.repeat(3072)});assert.ok(q.clipboard().reduce((n,s)=>n+Buffer.byteLength(s),0)<=8192);assert.equal(q.paste(0),false);q.dispose();
});
test('snapshot is detached and cursor motion does not drop composition',async()=>{
  const {keyboard}=await load();const c=keyboard.create({text:'AB',pinyin:'ni'});await until(()=>c.snapshot().candidates.length>0);const s=c.snapshot(),word=s.candidates[0].text;s.candidates[0].text='bad';s.candidates.push({text:'bad',matchLength:99});assert.equal(c.snapshot().candidates[0].text,word);c.home();assert.equal(c.snapshot().pinyin,'ni');c.end();assert.equal(c.snapshot().cursor,2);assert.equal(c.choose(99),false);c.dispose();
});
test('assets and flash are exact MIT reference copies; ASCII watch sources only',async()=>{
  const ref=fileURLToPath(new URL('../../crabKeyboard/entry/src/main/',import.meta.url));const actual=fileURLToPath(new URL('../entry/src/main/',import.meta.url));for(const dir of ['resources/rawfile/pinyinDictV5_flash1001','js/default/common/keyboard/common']){const target=dir.replace('js/default/','js/MainAbility/');const names=await fs.readdir(path.join(ref,dir));for(const name of names){if(!/\.dat$|\.png$/.test(name))continue;assert.deepEqual(await fs.readFile(path.join(actual,target,name)),await fs.readFile(path.join(ref,dir,name)));}}
  for(const name of ['keyboard.js','lookupDictV5.js']){const s=await fs.readFile(new URL(name,base),'utf8');assert.ok(/^[\x00-\x7f]*$/.test(s));assert.ok(!/\basync\s|\bawait\s|\?\.|\?\?|\bPromise\b|\bMap\b|\bBuffer\b|\.\.\./.test(s));}
  assert.match(await fs.readFile(new URL('keyboard/LICENSE',base),'utf8'),/MIT License/);
});
