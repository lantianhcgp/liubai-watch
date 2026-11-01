import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import vm from 'node:vm';
// Minimal DOM boundary: executes the actual isolated hmlwsim _i/ViewModel source.
// No production page/store/mock record or application business fields are touched.
class DomNode{
 constructor(tag=''){this.tagName=tag;this.childNodes=[];this.parentNode=null;this.style={};this.attrs={};this.classList={add(){}};}
 appendChild(n){if(n.tagName==='#fragment'){for(const c of [...n.childNodes])this.appendChild(c);return n;}if(n.parentNode)n.parentNode.removeChild(n);this.childNodes.push(n);n.parentNode=this;return n;}
 insertBefore(n,ref){if(n.tagName==='#fragment'){for(const c of [...n.childNodes])this.insertBefore(c,ref);return n;}if(n.parentNode)n.parentNode.removeChild(n);let i=ref?this.childNodes.indexOf(ref):-1;if(i<0)i=this.childNodes.length;this.childNodes.splice(i,0,n);n.parentNode=this;return n;}
 removeChild(n){this.childNodes.splice(this.childNodes.indexOf(n),1);n.parentNode=null;return n;}
 get nextSibling(){if(!this.parentNode)return null;return this.parentNode.childNodes[this.parentNode.childNodes.indexOf(this)+1]||null;}
 setAttribute(k,v){this.attrs[k]=v;}addEventListener(){}
}
function harness(){
 const ctx={console,Node:DomNode,document:{createElement:t=>new DomNode(t),createTextNode:t=>Object.assign(new DomNode('#text'),{textContent:t}),createComment:t=>new DomNode('#comment'),createDocumentFragment:()=>new DomNode('#fragment')},setTimeout,clearTimeout,setInterval,clearInterval,requestAnimationFrame:f=>f(),ApiSimWearengine:{},ApiRegistry:{resolve(){return{}}},DeviceFeatureDisplay:{getDeviceInfo(){return{windowWidth:412,windowHeight:484}}}};ctx.window=ctx;vm.createContext(ctx);vm.runInContext(fs.readFileSync('/data/data/com.termux/files/home/liubai-watch-ui-sim/js/runtime/sandbox.js','utf8'),ctx);return ctx;
}
test('short-circuit conditional observes new hasPinyin dependency after open becomes true',()=>{
 const c=harness();const page=c.Sandbox.initPage('(function(){return new ViewModel({data:{open:false,hasPinyin:false},render:function(){var p=this;return _c("stack",{},[_i(function(){return p.open&&!p.hasPinyin},function(){return _c("div",{staticClass:["keys"]});}),_i(function(){return p.open&&p.hasPinyin},function(){return _c("list",{staticClass:["candidates"]});})]);}});})()','probe/probe',{modules:{}});
 const root=page.render();let tags=()=>root.childNodes.filter(x=>x.tagName!=='#comment').map(x=>x.tagName);
 assert.deepEqual(tags(),[]);page.data.open=true;assert.deepEqual(tags(),['div']);page.data.hasPinyin=true;assert.deepEqual(tags(),['list']);page.data.hasPinyin=false;assert.deepEqual(tags(),['div']);page.data.open=false;assert.deepEqual(tags(),[]);page.data.hasPinyin=true;assert.deepEqual(tags(),[]);page.data.open=true;assert.deepEqual(tags(),['list']);c.Sandbox.destroy();
});
