import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import path from 'node:path';

const root=path.resolve(new URL('../entry/src/main/js/MainAbility/',import.meta.url).pathname);
const frozen=path.resolve(new URL('./fixtures/regexp-baseline/',import.meta.url).pathname);
function load(source,imports={},ban=false){
  const code=source.replace(/^import (\w+) from ['"]([^'"]+)['"];?$/gm,(_,name,p)=>'var '+name+'=imports['+JSON.stringify(p)+'];').replace('export default','result=');
  const context=vm.createContext({imports,result:null});
  if(ban)vm.runInContext('RegExp.prototype.test=function(){throw new Error("Forbidden RegExp.test in actual product");};',context);
  vm.runInContext(code,context);
  return context;
}
function pair(file,snapshot,imports={}){
  return {actual:load(fs.readFileSync(path.join(root,file),'utf8'),imports,true),old:load(fs.readFileSync(path.join(frozen,snapshot),'utf8'),imports)};
}
function outcome(fn){try{return {value:fn()};}catch(e){return {error:e.name+': '+e.message};}}
function equalCall(a,b,label){assert.deepEqual(outcome(a),outcome(b),label);}

const dates=pair('common/list-page.js','list-page.txt');
test('date validators retain full-token, non-string and calendar semantics without regexp',()=>{
  const common=['',null,undefined,123,{},[],['2026-11'],new String('2026-11'),{toString(){throw new Error('must not coerce');}}];
  const months=['2026-11','2026-1','2026-11-1234','2026-11\n','2026-11\r','2026-11\u2028','0000-11','0001-01','9999-12','2026-00','2026-13','２０２６-１１'];
  const days=['2026-11-06','2026-1-06','2026-11-0600','2026-11-06\n','2026-11-06\r','2026-11-06\u2029','2026-02-29','2024-02-29','2000-02-29','1900-02-29','2026-04-31','2026-00-01','0000-01-01','2026-11-00','2026-11-32'];
  for(const [name,values] of [['validMonth',months],['validDay',days]])for(const s of [...values,...common])
    equalCall(()=>dates.actual.result[name](s),()=>dates.old.result[name](s),name+' type '+typeof s);
  assert.equal(dates.actual.result.validMonth('2026-11'),'2026-11');
  assert.equal(dates.actual.result.validDay('2026-11-06'),'2026-11-06');
  for(const s of ['2026-1','2026-11-1234'])assert.throws(()=>dates.actual.result.validMonth(s),/Invalid month/);
});
test('date digit and separator positions match frozen validators over every UTF16 code unit',()=>{
  for(const [name,base] of [['validMonth','2026-11'],['validDay','2026-11-06']]){
    for(let at=0;at<base.length;at++)for(let code=0;code<65536;code++){
      const s=base.slice(0,at)+String.fromCharCode(code)+base.slice(at+1);
      equalCall(()=>dates.actual.result[name](s),()=>dates.old.result[name](s),name+' position '+at+' code '+code);
    }
  }
});

const layout=load(fs.readFileSync(path.join(root,'common/layout.js'),'utf8')).result;
const readers=pair('common/reader.js','reader.txt',{'./layout':layout});
function normalized(fn){const o=outcome(fn);return o.error?o:JSON.parse(JSON.stringify(o));}
test('reader preserves whitespace, Latin wrapping, title and CRLF pagination without regexp',()=>{
  const geometries=[layout.reader({windowWidth:412,windowHeight:484,screenShape:'rect'}),layout.reader({windowWidth:390,windowHeight:390,screenShape:'circle'}),{w:412,h:484,round:false,top:130,bottom:190,font:20,lineHeight:30,pad:170},{w:412,h:484,round:false,top:130,bottom:160,font:20,lineHeight:30,pad:170}];
  const bodies=['',' ','\t','\n','\r','\r\n','\u3000','\u2003','\u200a','Title\n\n \t\u3000','Title\n\nbody','alpha beta gamma delta epsilon','alpha\tbeta\u3000gamma delta','abcdefghijk'.repeat(12),'tail\n','tail\r','tail\r\n','tail\r\n\r\n','tail\r\u2028','\n\n\r\n','a\u0301 \ud83d\udc69\u200d\ud83d\udcbb end'];
  for(const s of bodies)for(const g of geometries)for(const editor of [false,true]){
    const o={editor};
    assert.deepEqual(normalized(()=>readers.actual.result.count(s,g,o)),normalized(()=>readers.old.result.count(s,g,o)),'count '+JSON.stringify(s));
    for(const anchor of [0,Math.floor(s.length/2),Math.max(0,s.length-1),s.length])for(const name of ['page','locate'])
      assert.deepEqual(normalized(()=>readers.actual.result[name](s,anchor,g,o)),normalized(()=>readers.old.result[name](s,anchor,g,o)),name+' '+JSON.stringify(s)+' '+anchor);
  }
});
test('reader classifications match ECMAScript over all UTF16 code units including every U2000-U200A space',()=>{
  for(let code=0;code<65536;code++){
    const ch=String.fromCharCode(code);
    assert.equal(readers.actual.ws(ch),/\s/.test(ch),'ws '+code);
    assert.equal(readers.actual.isAZ(ch),/[A-Za-z]/.test(ch),'isAZ '+code);
    assert.equal(readers.actual.crlfEnd('prefix'+ch),/[\r\n]$/.test('prefix'+ch),'crlfEnd '+code);
    assert.equal(readers.actual.hasNonWs(ch),/[^\s]/.test(ch),'hasNonWs '+code);
  }
  for(const s of ['',' \t\r\n\u3000\ufeff','\u2003\u200a','\u0085','\u180e','\u200b','a \n',' \nZ','x\r\u2028']){
    assert.equal(readers.actual.hasNonWs(s),/[^\s]/.test(s));
    assert.equal(readers.actual.crlfEnd(s),/[\r\n]$/.test(s));
  }
});

function menuRunner(source,ban){
  const calls=[];
  const session={get(){return {id:'note'};},clipboardGet(ix){calls.push(['get',ix]);return ix>=0&&ix<=7?'body':'';}};
  const shell={nav(p,name,params){calls.push(['nav',name,params]);},markVisible(){}};
  const p=load(source,{'../../common/session':session,'../../common/shell':shell},ban).result;
  return action=>{
    calls.length=0;
    Object.assign(p,{allowed:true,busy:false,alive:true,gen:1,params:{},mode:'clipboard',id:'note',message:''});
    const result=outcome(()=>p.choose(action));
    return JSON.parse(JSON.stringify({result,calls,message:p.message}));
  };
}
const menuActual=menuRunner(fs.readFileSync(path.join(root,'pages/menu/menu.js'),'utf8'),true);
const menuOld=menuRunner(fs.readFileSync(path.join(frozen,'menu.txt'),'utf8'),false);
test('menu clipboard indices preserve one ASCII digit 0-7 and navigation without regexp',()=>{
  for(const s of ['3','8','','03','7\n','3\r\n','３','-1','0','7',...Array.from({length:65536},(_,i)=>String.fromCharCode(i))])
    assert.deepEqual(menuActual('paste:'+s),menuOld('paste:'+s),'clipboard '+JSON.stringify(s));
  assert.equal(menuActual('paste:3').calls.at(-1)[0],'nav');
  for(const s of ['8',''])assert.equal(menuActual('paste:'+s).calls.length,0);
});
