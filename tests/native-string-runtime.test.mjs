import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
const root='entry/src/main/js/MainAbility/';
const nativeOff='String.prototype.replace=function(){throw new TypeError("native String.replace unavailable");};RegExp.prototype.test=function(){throw new TypeError("native RegExp unavailable");};';
function load(name,globals={}){
 const source=fs.readFileSync(root+name,'utf8').replace(/^import .*$/gm,'').replace('export default','result=');
 const ctx=vm.createContext({result:null,console,setTimeout,clearTimeout,...globals});
 vm.runInContext(nativeOff,ctx);vm.runInContext(source,ctx,{filename:name});
 return {api:ctx.result,ctx};
}
const layout=load('common/layout.js').api;
const U=load('common/utf8.js').api;
function store(){const loaded=load('common/store.js',{File:{},U});vm.runInContext('result._qa={validKey:validKey,metadata:metadata};',loaded.ctx);return loaded.api._qa;}
test('real application source never relies on String.replace or RegExp methods',()=>{
 const files=[];function visit(d){for(const n of fs.readdirSync(d)){const f=d+'/'+n;if(fs.statSync(f).isDirectory())visit(f);else if(f.endsWith('.js'))files.push(f);}}visit(root);
 const bad=[];for(const f of files){const code=fs.readFileSync(f,'utf8').replaceAll('Router.replace(','Router.navigation(');if(/\.replace\s*\(|\.test\s*\(|\.match\s*\(|\bRegExp\b/.test(code))bad.push(f);}
 assert.deepEqual(bad,[],'all pages, not only the diagnostic index, must be native-compatible');
});
test('date validators and rollover work with unavailable native regexp',()=>{
 const list=load('common/list-page.js',{layout,store:{},shell:{}}).api;
 for(const m of ['0001-01','2026-11','9999-12'])assert.equal(list.validMonth(m),m);
 for(const d of ['2024-02-29','2000-02-29','2026-11-02'])assert.equal(list.validDay(d),d);
 for(const m of ['2026-00','2026-13','0000-01','2026-1','2026-11\n','２０２６-１１'])assert.throws(()=>list.validMonth(m));
 for(const d of ['1900-02-29','2026-02-29','2026-04-31','2026-11-00','2026-11-2','2026-11-02\n'])assert.throws(()=>list.validDay(d));
 assert.equal(list.shiftMonth('2026-12',1),'2027-01');assert.equal(list.shiftMonth('2026-01',-1),'2025-12');
});
test('index labels preserve exact month/day formatting without native replace',()=>{
 const list=load('common/list-page.js',{layout,store:{},shell:{params(){return{};},init(){}}}).api;
 const p={};list.init(p,'index');assert.match(p.dateLabel,/^\d{2} \/ \d{2}$/);assert.match(p.monthLabel,/^\d{4} 年 \d{2} 月$/);
});
test('record IDs reject traversal, newlines, Unicode and excessive length',()=>{
 const s=store();for(const k of ['n1','n_t1-2','A'.repeat(40)])assert.equal(s.validKey(k),true);
 for(const k of ['',null,123,'A'.repeat(41),'../app','n1\n','记录','a.b'])assert.equal(s.validKey(k),false);
});
test('title/preview preserve Unicode whitespace semantics and do not mutate body',()=>{
 const s=store();const whites=['\t','\n','\v','\f','\r',' ','\u00a0','\u1680','\u2000','\u2001','\u2002','\u2003','\u2004','\u2005','\u2006','\u2007','\u2008','\u2009','\u200a','\u2028','\u2029','\u202f','\u205f','\u3000','\ufeff'];
 for(const w of whites){const body=w+'\n'+w+'Title'+w+'\n'+w+'Body'+w+w+'tail'+w;const m=s.metadata('n1',body,0,1,false,false);assert.equal(m.title,'Title');assert.equal(m.preview,'Body tail');assert.equal(body,w+'\n'+w+'Title'+w+'\n'+w+'Body'+w+w+'tail'+w);}
 const m=s.metadata('n1','\u200bTitle\u200b\n正文\u0085后文',0,1,false,false);assert.equal(m.title,'\u200bTitle\u200b');assert.equal(m.preview,'正文\u0085后文');
});
test('reader handles title, English words and trailing newline without regexp',()=>{
 const r=load('common/reader.js',{layout}).api,g=layout.reader({windowWidth:412,windowHeight:484,screenShape:'rect'},'normal');
 const body='标题\n\nalpha beta gamma delta epsilon\n中文正文。';const p=r.page(body,0,g,{});assert.equal(p.end,body.length);assert.equal(p.lines[0].text,'标题');assert.ok(p.lines[0].bold);
 const edit=layout.editor({windowWidth:412,windowHeight:484,screenShape:'rect'},false);assert.ok(r.count('alpha\n',edit,{editor:true,cursor:6})>=1);assert.ok(r.locate('alpha\n',6,edit,{editor:true,cursor:6}).page.lines.some(l=>l.start===6));
});
test('editor rejects whitespace-only save without losing text or invoking storage',()=>{
 let saves=0;const p=load('pages/edit/edit.js',{store:{save(){saves++;}},shell:{},layout,reader:{},keyboard:{},session:{},utf8:U}).api;
 Object.assign(p,p.data,{kb:{},saving:false,text:' \t\n\u3000\ufeff',message:''});assert.doesNotThrow(()=>p.save());assert.equal(p.message,'内容不能为空');assert.equal(saves,0);assert.equal(p.text,' \t\n\u3000\ufeff');
});
