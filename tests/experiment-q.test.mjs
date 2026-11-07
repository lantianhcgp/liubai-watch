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
 const business=[];let input,tail,stored;
 const output=options.output===undefined?'11 / 07':options.output;
 tail={};Object.defineProperty(tail,'replace',{get(){business.push(['replace.get']);if(options.throwAt==='replace-get')throw sentinel;return options.missingReplace?undefined:function(search,replacement){business.push(['replace.call',this===tail,search,replacement,arguments.length]);if(options.throwAt==='replace-call')throw sentinel;return output;};}});
 input={};Object.defineProperty(input,'slice',{get(){business.push(['slice.get']);if(options.throwAt==='slice-get')throw sentinel;return options.missingSlice?undefined:function(start){business.push(['slice.call',this===input,start,arguments.length]);if(options.throwAt==='slice-call')throw sentinel;return Object.prototype.hasOwnProperty.call(options,'sliceResult')?options.sliceResult:tail;};}});
 const p={};Object.defineProperty(p,'dateLabel',{set(value){business.push(['dateLabel.set',value===output,typeof value]);if(options.throwAt==='set')throw sentinel;stored=value;},get(){throw Error('the diagnostic must not re-read dateLabel');}});
 return {p,input,tail,business,sentinel,stored:()=>stored,output};
}
function compare(options={},traceFail){
 const sentinel=new Error('Expected a function.'),old=fixture(options,sentinel),cur=fixture(options,sentinel),module=build(traceFail);let oc,cc;
 try{module.oracle(old.p,old.input);}catch(e){oc=e;}
 try{module.actual(cur.p,cur.input);}catch(e){cc=e;}
 assert.deepEqual(cur.business,old.business,'all method gets/calls/receiver/args/set events remain exact original-expression order');
 assert.equal(cur.stored(),old.stored());
 if(options.throwAt)assert.equal(cc,oc,'same original injected error object, not wrapped/swallowed');
 else if(oc){assert.ok(cc);assert.equal(cc.name,oc.name);assert.equal(cc.name,'TypeError','noncallable/null cases fail at the same original operation; source-derived V8 callee text is not a portable error oracle');}
 else assert.equal(cc,undefined);
 return {...cur,caught:cc,records:module.records};
}
const stages=result=>result.records.map(r=>r.stage);
function failed(result,operation){
 assert.ok(result.caught);
 const report=result.records.filter(r=>r.stage==='L/probe.q.g6c.'+operation+'.throw');assert.equal(report.length,1);assert.equal(report[0].error,result.caught);
 const original=result.records.filter(r=>r.stage==='L/probe.o.g6c.throw');assert.equal(original.length,1);assert.equal(original[0].error,result.caught);
 assert.ok(!stages(result).includes('L/probe.o.g6c.ok'));
}
test('Q normal RHS marks one slice then one replace before original single dateLabel write',()=>{
 const r=compare();assert.deepEqual(stages(r),['L/probe.q.g6c.slice.ok t=object','L/probe.q.g6c.replace.ok t=string','L/probe.o.g6c.ok']);assert.equal(r.stored(),'11 / 07');
});
test('Q slice method getter failure is isolated and the identical original error stops later operations',()=>{const r=compare({throwAt:'slice-get'});failed(r,'slice');assert.deepEqual(r.business,[['slice.get']]);});
test('Q slice method call failure preserves receiver and one call before the original error rethrow',()=>{const r=compare({throwAt:'slice-call'});failed(r,'slice');assert.deepEqual(r.business,[['slice.get'],['slice.call',true,5,1]]);});
test('Q noncallable slice reports the original TypeError without attempting replace or setter',()=>{const r=compare({missingSlice:true});failed(r,'slice');assert.deepEqual(r.business,[['slice.get']]);});
test('Q replace method getter failure follows one completed slice and rethrows the same original object',()=>{const r=compare({throwAt:'replace-get'});failed(r,'replace');assert.ok(stages(r).includes('L/probe.q.g6c.slice.ok t=object'));assert.deepEqual(r.business,[['slice.get'],['slice.call',true,5,1],['replace.get']]);});
test('Q replace method call failure keeps original arguments receiver and no dateLabel assignment',()=>{const r=compare({throwAt:'replace-call'});failed(r,'replace');assert.deepEqual(r.business,[['slice.get'],['slice.call',true,5,1],['replace.get'],['replace.call',true,'-',' / ',2]]);});
test('Q noncallable replace distinguishes the completed slice from the original failed call',()=>{const r=compare({missingReplace:true});failed(r,'replace');assert.ok(stages(r).includes('L/probe.q.g6c.slice.ok t=object'));assert.ok(!stages(r).some(s=>s.startsWith('L/probe.q.g6c.replace.ok')));});
test('Q dateLabel setter failure follows exact RHS and reports the same error without rereading field',()=>{const r=compare({throwAt:'set'});failed(r,'set');assert.deepEqual(stages(r),['L/probe.q.g6c.slice.ok t=object','L/probe.q.g6c.replace.ok t=string','L/probe.q.g6c.set.throw','L/probe.o.g6c.throw']);assert.equal(r.business.filter(x=>x[0]==='dateLabel.set').length,1);});
test('Q primitive and null slice results retain original second-operation failure boundary',()=>{
 for(const sliceResult of [null,false,1,Symbol('tail'),undefined]){
  const r=compare({sliceResult});failed(r,'replace');assert.ok(stages(r).includes('L/probe.q.g6c.slice.ok t='+typeof sliceResult));
 }
});
test('Q opaque replace result is type-only diagnostic and assigned unchanged without conversion',()=>{
 let conversions=0;const output={toString(){conversions++;throw Error('private conversion');},valueOf(){conversions++;throw Error('private coercion');}};
 const r=compare({output});assert.equal(r.stored(),output);assert.equal(conversions,0);assert.ok(stages(r).includes('L/probe.q.g6c.replace.ok t=object'));
});
test('Q diagnostic forwarding exceptions never become business failures or skip the next original operation',()=>{
 for(const stage of ['L/probe.q.g6c.slice.ok','L/probe.q.g6c.replace.ok']){const r=compare({},stage);assert.equal(r.caught,undefined);assert.equal(r.stored(),'11 / 07');assert.ok(stages(r).includes('L/probe.o.g6c.ok'));}
 for(const [throwAt,stage] of [['slice-call','L/probe.q.g6c.slice.throw'],['replace-call','L/probe.q.g6c.replace.throw'],['set','L/probe.q.g6c.set.throw']]){const r=compare({throwAt},stage);assert.equal(r.caught,r.sentinel);assert.ok(stages(r).includes('L/probe.o.g6c.throw'));}
});
test('Q fixed stages fit raw40 and never include arbitrary date or formatted user strings',()=>{
 const r=compare({output:'synthetic-sensitive-result-0123456789'});
 for(const s of stages(r).filter(s=>s.startsWith('L/probe.q.'))){assert.ok(s.length<=40,s);assert.ok(!s.includes('synthetic-sensitive'));}
 assert.deepEqual(stages(r),['L/probe.q.g6c.slice.ok t=object','L/probe.q.g6c.replace.ok t=string','L/probe.o.g6c.ok']);
});
test('Q exact original expression oracle covers date domains Unicode and first-hyphen semantics without normalization',()=>{
 const m=build();
 const samples=['','short','2026-11-07','0001-01-01','0099-02-28','9999-12-31','-000001-01-01','100000-01-01','2026-11-07-extra-hyphen','2026-11/07','2026-\uD800-\uDC00','2026-😀-07','2026-\u0000-07'];
 for(let year=1;year<=9999;year+=137)for(const month of ['01','02','12'])samples.push(String(year).padStart(4,'0')+'-'+month+'-31');
 for(const input of samples){const old={},cur={};m.oracle(old,input);m.actual(cur,input);assert.equal(cur.dateLabel,old.dateLabel);}
 const old={},cur={};for(let code=0;code<=65535;code++){const input='2026-'+String.fromCharCode(code)+'-07';m.oracle(old,input);m.actual(cur,input);assert.equal(cur.dateLabel,old.dateLabel,'UTF16 code unit '+code);}
});
test('Q only g6c instrumentation changes while g6a b d e handlers and original error boundaries remain',()=>{
 const qBody=source.slice(c.start,c.end);for(const op of ['slice','replace','set'])assert.ok(qBody.includes('L/probe.q.g6c.'+op+'.throw'));
 assert.ok(source.slice(c.handler.start,c.handler.end).includes("trace(p,'L/probe.o.g6c.throw',e);throw e;"));
 assert.ok(source.slice(g6.handler.start,g6.handler.end).includes("trace(p,'L/probe.o.g6.throw',e);throw e;"));
 assert.equal(source.slice(g6.block.body[8].start,g6.block.body[8].end),"try{p.monthLabel=monthValue.replace('-',' \\u5e74 ')+' \\u6708';}catch(e){trace(p,'L/probe.o.g6e.throw',e);throw e;}");
});
