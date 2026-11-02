import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import os from 'node:os';import path from 'node:path';import vm from 'node:vm';import {execFileSync} from 'node:child_process';
const script=path.resolve('qa/install-r18/compact.mjs');
test('compaction preserves the native evaluated ViewModel return, not only construction side-effects',()=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'liubai-iife-'));const input=path.join(dir,'in'),out=path.join(dir,'out');
 const files=['app.js',...['boot','index','read','edit','menu','history','day','trash'].map(p=>`pages/${p}/${p}.js`)];
 try{
  for(const file of files){const p=path.join(input,file);fs.mkdirSync(path.dirname(p),{recursive:true});fs.writeFileSync(p,'(function(){var modules={258:function(module){module.exports=new ViewModel({data:{message:"native-vm"}});}},cache={};function require(id){var existing=cache[id];if(existing!==undefined)return existing.exports;var module=cache[id]={exports:{}};modules[id](module);return module.exports;}var exports=require(258);return exports;})()');fs.writeFileSync(p+'.map',JSON.stringify({version:3,sources:[file],names:[],mappings:''}));}
  execFileSync('node',[script,input,out],{stdio:'pipe'});
  for(const file of files){let constructions=0;const ctx={ViewModel:function(o){constructions++;Object.assign(this,o);}};const value=vm.runInNewContext(fs.readFileSync(path.join(out,file),'utf8'),ctx);assert.equal(constructions,1);assert.ok(value&&value.data&&value.data.message==='native-vm',file+' must yield its ViewModel to native loader');}
 }finally{fs.rmSync(dir,{recursive:true,force:true});}
});
