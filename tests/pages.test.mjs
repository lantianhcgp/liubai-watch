import {readFileSync,existsSync} from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';
const root=new URL('../entry/src/main/js/MainAbility/',import.meta.url);
const load=(name,mocks)=>{let code=readFileSync(new URL('pages/'+name+'/'+name+'.js',root),'utf8');code=code.replace(/^import (\w+) from ['"]([^'"]+)['"];?$/gm,(_,n,p)=>'var '+n+'=mocks['+JSON.stringify(p)+'];').replace('export default','result ='); const ctx={mocks,result:null,console,setTimeout,clearTimeout,setInterval,clearInterval,Date,Math,JSON};vm.runInNewContext(code,ctx);let p=ctx.result;Object.assign(p,p.data);return p;};
let count=0;
function check(name,fn){fn();count++;console.log('PASS '+name);}
check('all approved native pages exist',()=>{for(const n of ['index','read','edit','menu','history','day','trash'])assert.ok(existsSync(new URL('pages/'+n+'/'+n+'.hml',root)),n);});
const shell={init(p,cb){p.ready=false;p.message='device unavailable';},params(){return{};},clear(){},nav(){},focus(){},markVisible(){}};
check('invalid device does not fake dimensions',()=>{const p=load('index',{'../../common/shell':shell,'../../common/list-page':{init(){}}});p.onInit();assert.equal(p.ready,false);assert.ok(!p.w);});
check('no WebView / localStorage / browser DOM in native source',()=>{for(const n of ['index','read','edit','menu','history','day','trash']){const js=readFileSync(new URL('pages/'+n+'/'+n+'.js',root),'utf8');assert.doesNotMatch(js,/localStorage|document\.|window\.|WebView/);}});
check('editor uses real keyboard and not system IME',()=>{const js=readFileSync(new URL('pages/edit/edit.js',root),'utf8');const hml=readFileSync(new URL('pages/edit/edit.hml',root),'utf8');assert.match(js,/keyboard\.create/);assert.doesNotMatch(hml,/<input[^>]+type=["']text/);assert.match(hml,/key-mode/);assert.doesNotMatch(hml,/中\/英/);});
console.log(JSON.stringify({passed:count,failed:0}));
