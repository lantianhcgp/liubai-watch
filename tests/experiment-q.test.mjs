import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import {createRequire} from 'node:module';
import {fileURLToPath} from 'node:url';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const require=createRequire(import.meta.url),acorn=require(path.join(root,'scripts/node_modules/acorn'));
const source=fs.readFileSync(path.join(root,'entry/src/main/js/MainAbility/common/list-page.js'),'utf8');
const tree=acorn.parse(source,{ecmaVersion:2022,sourceType:'module'});
const init=tree.body.find(n=>n.type==='FunctionDeclaration'&&n.id.name==='init');
const g6=init.body.body.find(n=>n.type==='TryStatement'&&source.slice(n.handler.start,n.handler.end).includes('L/probe.o.g6.throw'));
const c=g6.block.body[4],ok=g6.block.body[5];
assert.equal(c.type,'TryStatement');assert.ok(source.slice(c.handler.start,c.handler.end).includes('L/probe.o.g6c.throw'));
const currentGroup=source.slice(c.start,c.end)+'\n'+source.slice(ok.start,ok.end);
const originalExpression="p.dateLabel=todayStr.slice(5).replace('-',' / ');";
function build(traceFail){
 const records=[];
 const shell={trace(p,stage,error){records.push({stage,error,arity:arguments.length});if(traceFail&&stage.startsWith(traceFail))throw new Error('diagnostic-only');}};
 const imports={'./store-page':{},'./shell':shell,'./layout':{}};
 const translated=source.replace(/^import (\w+) from ['"]([^'"]+)['"];?$/gm,(_,n,s)=>'var '+n+'=imports['+JSON.stringify(s)+'];').replace('export default','result=');
 const ctx={imports,result:null,console};vm.createContext(ctx);
 vm.runInContext(translated+'\nresult.__qActual=function(p,todayStr){'+currentGroup+'};\nresult.__qOracle=function(p,todayStr){'+originalExpression+'};',ctx);
 return {actual:ctx.result.__qActual,oracle:ctx.result.__qOracle,records};
}
function fixture(options={},sentinel=new Error('Expected a function.')){
 const business=[];let input,tail,stored,formatSliceGets=0,formatSliceCalls=0;
 // R authorized rebase: primitive host replace oracle and new method seam are separate proofs.
 const rawTail=options.tailText===undefined?'11-07':options.tailText;
 const output=rawTail.replace('-',' / ');
 tail={};Object.defineProperty(tail,'replace',{get(){business.push(['replace.get']);if(options.throwAt==='replace-get')throw sentinel;return options.missingReplace?undefined:function(search,replacement){business.push(['replace.call',this===tail,search,replacement,arguments.length]);if(options.throwAt==='replace-call')throw sentinel;return options.output===undefined?output:options.output;};}});
 Object.defineProperty(tail,'indexOf',{get(){business.push(['indexOf.get']);if(options.throwAt==='indexOf-get')throw sentinel;return function(search){business.push(['indexOf.call',this===tail,search,arguments.length]);if(options.throwAt==='indexOf-call')throw sentinel;return rawTail.indexOf(search);};}});
 Object.defineProperty(tail,'slice',{get(){business.push(['format.slice.get']);formatSliceGets++;if(options.throwAt==='format-slice-get-'+formatSliceGets)throw sentinel;return function(start,end){business.push(['format.slice.call',this===tail,start,end,arguments.length]);formatSliceCalls++;if(options.throwAt==='format-slice-call-'+formatSliceCalls)throw sentinel;return rawTail.slice(start,end);};}});
 input={};Object.defineProperty(input,'slice',{get(){business.push(['slice.get']);if(options.throwAt==='slice-get')throw sentinel;return options.missingSlice?undefined:function(start){business.push(['slice.call',this===input,start,arguments.length]);if(options.throwAt==='slice-call')throw sentinel;return Object.prototype.hasOwnProperty.call(options,'sliceResult')?options.sliceResult:options.oracle?rawTail:tail;};}});
 const p={};Object.defineProperty(p,'dateLabel',{set(value){business.push(['dateLabel.set',value===output,typeof value]);if(options.throwAt==='set')throw sentinel;stored=value;},get(){throw Error('the diagnostic must not re-read dateLabel');}});
 return {p,input,tail,business,sentinel,stored:()=>stored,output,rawTail};
}
function expectedBusiness(options,rawTail,oracle){
 const events=[['slice.get']];if(options.throwAt==='slice-get'||options.missingSlice)return events;
 events.push(['slice.call',true,5,1]);if(options.throwAt==='slice-call'||Object.prototype.hasOwnProperty.call(options,'sliceResult'))return events;
 if(!oracle){
  events.push(['indexOf.get']);if(options.throwAt==='indexOf-get')return events;
  events.push(['indexOf.call',true,'-',1]);if(options.throwAt==='indexOf-call')return events;
  const at=rawTail.indexOf('-');assert.ok(at>=0,'these object method seams model primitive tails with a hyphen');
  for(let i=1;i<=2;i++){
   events.push(['format.slice.get']);if(options.throwAt==='format-slice-get-'+i)return events;
   events.push(i===1?['format.slice.call',true,0,at,2]:['format.slice.call',true,at+1,undefined,1]);
   if(options.throwAt==='format-slice-call-'+i)return events;
  }
 }
 events.push(['dateLabel.set',true,'string']);return events;
}
function compare(options={},traceFail){
 const sentinel=new Error('Expected a function.'),old=fixture({...options,oracle:true},sentinel),cur=fixture(options,sentinel),module=build(traceFail);let oc,cc;
 try{module.oracle(old.p,old.input);}catch(e){oc=e;}
 try{module.actual(cur.p,cur.input);}catch(e){cc=e;}
 assert.deepEqual(old.business,expectedBusiness(options,old.rawTail,true),'independent original primitive-string replace expression event order');
 assert.deepEqual(cur.business,expectedBusiness(options,cur.rawTail,false),'entire new method-seam event order is strict: original first slice, indexOf/two slices, single setter; no filtered events');
 const formatFailure=options.throwAt==='indexOf-get'||options.throwAt==='indexOf-call'||(options.throwAt||'').startsWith('format-slice-');
 if(formatFailure){assert.equal(cc,sentinel,'new method failure keeps the exact original injected error');assert.equal(cur.stored(),undefined);}
 else{
  assert.equal(cur.stored(),old.stored(),'real formatted string output equals independent old host replace expression');
  if(['slice-get','slice-call','set'].includes(options.throwAt))assert.equal(cc,oc,'same original injected error object, not wrapped/swallowed');
  else if(oc){assert.ok(cc);assert.equal(cc.name,oc.name);assert.equal(cc.name,'TypeError','noncallable/null cases fail at the actual formatting operation; V8 callee text is not a portable error oracle');}
  else assert.equal(cc,undefined);
 }
 return {...cur,caught:cc,records:module.records};
}
const stages=result=>result.records.map(r=>r.stage);
function failed(result,operation){
 assert.ok(result.caught);
 const prefix=operation==='format'?'L/probe.r.g6c.':'L/probe.q.g6c.';
 const report=result.records.filter(r=>r.stage===prefix+operation+'.throw');assert.equal(report.length,1);assert.equal(report[0].error,result.caught);
 const original=result.records.filter(r=>r.stage==='L/probe.o.g6c.throw');assert.equal(original.length,1);assert.equal(original[0].error,result.caught);
 assert.ok(!stages(result).includes('L/probe.o.g6c.ok'));
}
test('Q rebased normal RHS marks original slice then R first-hyphen formatter before single dateLabel write',()=>{
 const r=compare();assert.deepEqual(stages(r),['L/probe.q.g6c.slice.ok t=object','L/probe.r.g6c.format.ok t=string','L/probe.o.g6c.ok']);assert.equal(r.stored(),'11 / 07');
});
test('Q slice method getter failure is isolated and the identical original error stops later operations',()=>{const r=compare({throwAt:'slice-get'});failed(r,'slice');assert.deepEqual(r.business,[['slice.get']]);});
test('Q slice method call failure preserves receiver and one call before the original error rethrow',()=>{const r=compare({throwAt:'slice-call'});failed(r,'slice');assert.deepEqual(r.business,[['slice.get'],['slice.call',true,5,1]]);});
test('Q noncallable slice reports the original TypeError without attempting replace or setter',()=>{const r=compare({missingSlice:true});failed(r,'slice');assert.deepEqual(r.business,[['slice.get']]);});
test('Q rebased hostile replace getter is untouched and new indexOf getter failure rethrows the exact error',()=>{
 const safe=compare({throwAt:'replace-get'});assert.equal(safe.caught,undefined);assert.equal(safe.stored(),'11 / 07');assert.ok(!safe.business.some(e=>e[0]==='replace.get'));
 const r=compare({throwAt:'indexOf-get'});failed(r,'format');assert.ok(stages(r).includes('L/probe.q.g6c.slice.ok t=object'));assert.deepEqual(r.business,[['slice.get'],['slice.call',true,5,1],['indexOf.get']]);
});
test('Q rebased hostile replace call is untouched and new indexOf call keeps receiver arguments and original error',()=>{
 const safe=compare({throwAt:'replace-call'});assert.equal(safe.caught,undefined);assert.ok(!safe.business.some(e=>e[0]==='replace.get'||e[0]==='replace.call'));
 const r=compare({throwAt:'indexOf-call'});failed(r,'format');assert.deepEqual(r.business,[['slice.get'],['slice.call',true,5,1],['indexOf.get'],['indexOf.call',true,'-',1]]);
});
test('Q rebased missing replace is irrelevant while both formatter slice getter call failures stop before setter',()=>{
 const safe=compare({missingReplace:true});assert.equal(safe.caught,undefined);assert.equal(safe.stored(),'11 / 07');assert.ok(!safe.business.some(e=>e[0]==='replace.get'));
 for(const throwAt of ['format-slice-get-1','format-slice-call-1','format-slice-get-2','format-slice-call-2']){
  const r=compare({throwAt});failed(r,'format');assert.ok(stages(r).includes('L/probe.q.g6c.slice.ok t=object'));assert.ok(!stages(r).some(s=>s.startsWith('L/probe.r.g6c.format.ok')));assert.ok(!r.business.some(e=>e[0]==='dateLabel.set'));
 }
});
test('Q rebased dateLabel setter failure follows full R RHS and reports same error without field reread',()=>{const r=compare({throwAt:'set'});failed(r,'set');assert.deepEqual(stages(r),['L/probe.q.g6c.slice.ok t=object','L/probe.r.g6c.format.ok t=string','L/probe.q.g6c.set.throw','L/probe.o.g6c.throw']);assert.equal(r.business.filter(x=>x[0]==='dateLabel.set').length,1);});
test('Q rebased non-string and null slice results retain second-operation failure boundary without coercion',()=>{
 for(const sliceResult of [null,false,1,Symbol('tail'),undefined]){
  const r=compare({sliceResult});failed(r,'format');assert.ok(stages(r).includes('L/probe.q.g6c.slice.ok t='+typeof sliceResult));
 }
});
test('Q rebased opaque replace result is never obtained or converted and R assigns the independent string oracle',()=>{
 let conversions=0;const output={toString(){conversions++;throw Error('private conversion');},valueOf(){conversions++;throw Error('private coercion');}};
 const r=compare({output});assert.equal(r.stored(),'11 / 07');assert.equal(conversions,0);assert.ok(!r.business.some(e=>e[0]==='replace.get'||e[0]==='replace.call'));assert.ok(stages(r).includes('L/probe.r.g6c.format.ok t=string'));
});
test('Q rebased diagnostic forwarding exceptions never become business failures or skip the next actual operation',()=>{
 for(const stage of ['L/probe.q.g6c.slice.ok','L/probe.r.g6c.format.ok']){const r=compare({},stage);assert.equal(r.caught,undefined);assert.equal(r.stored(),'11 / 07');assert.ok(stages(r).includes('L/probe.o.g6c.ok'));}
 for(const [throwAt,stage] of [['slice-call','L/probe.q.g6c.slice.throw'],['indexOf-call','L/probe.r.g6c.format.throw'],['format-slice-call-2','L/probe.r.g6c.format.throw'],['set','L/probe.q.g6c.set.throw']]){const r=compare({throwAt},stage);assert.equal(r.caught,r.sentinel);assert.ok(stages(r).includes('L/probe.o.g6c.throw'));}
});
test('Q rebased Q slice and R format fixed stages fit raw40 and never include date or formatted user strings',()=>{
 const r=compare({tailText:'synthetic-sensitive-result-0123456789'});
 for(const s of stages(r).filter(s=>s.startsWith('L/probe.q.')||s.startsWith('L/probe.r.'))){assert.ok(s.length<=40,s);assert.ok(!s.includes('synthetic-sensitive'));}
 assert.deepEqual(stages(r),['L/probe.q.g6c.slice.ok t=object','L/probe.r.g6c.format.ok t=string','L/probe.o.g6c.ok']);
});
test('Q exact original expression oracle covers date domains Unicode and first-hyphen semantics without normalization',()=>{
 const m=build();
 const samples=['','short','2026-11-07','0001-01-01','0099-02-28','9999-12-31','-000001-01-01','100000-01-01','2026-11-07-extra-hyphen','2026-11/07','2026-\uD800-\uDC00','2026-😀-07','2026-\u0000-07'];
 for(let year=1;year<=9999;year+=137)for(const month of ['01','02','12'])samples.push(String(year).padStart(4,'0')+'-'+month+'-31');
 for(const input of samples){const old={},cur={};m.oracle(old,input);m.actual(cur,input);assert.equal(cur.dateLabel,old.dateLabel);}
 const old={},cur={};for(let code=0;code<=65535;code++){const input='2026-'+String.fromCharCode(code)+'-07';m.oracle(old,input);m.actual(cur,input);assert.equal(cur.dateLabel,old.dateLabel,'UTF16 code unit '+code);}
});
test('Q rebased four date format sites retain g6a b d e handlers and original error boundaries',()=>{
 const qBody=source.slice(c.start,c.end);for(const op of ['slice','set'])assert.ok(qBody.includes('L/probe.q.g6c.'+op+'.throw'));assert.ok(qBody.includes('L/probe.r.g6c.format.throw'));
 assert.ok(source.slice(c.handler.start,c.handler.end).includes("trace(p,'L/probe.o.g6c.throw',e);throw e;"));
 assert.ok(source.slice(g6.handler.start,g6.handler.end).includes("trace(p,'L/probe.o.g6.throw',e);throw e;"));
 assert.equal(source.slice(g6.block.body[8].start,g6.block.body[8].end),"try{p.monthLabel=formatDate(monthValue,' \\u5e74 ')+' \\u6708';}catch(e){trace(p,'L/probe.o.g6e.throw',e);throw e;}");
});
